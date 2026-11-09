import './styles.css';
import { Game } from './game/game.js';
import { Input } from './game/input.js';
import { Renderer } from './render/renderer.js';
import { sound } from './audio/sound.js';
import { isSupabaseConfigured, validateNickname } from './api/supabase.js';
import { fetchTopScores, submitScore } from './api/scores.js';
import { fetchFeedback, submitFeedback, validateFeedback, MESSAGE_MAX } from './api/feedback.js';

const $ = (id) => document.getElementById(id);
const NICK_KEY = 'tetris.nickname';
const COOLDOWN_KEY = 'tetris.feedbackCooldownUntil';
const FEEDBACK_COOLDOWN_MS = 30_000;
const NOT_CONFIGURED = 'Supabase가 연결되지 않았습니다. .env 설정 후 다시 실행해 주세요.';

const fmtNum = (n) => n.toLocaleString('ko-KR');
const fmtDate = (s) =>
  new Date(s).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

/** textContent만 사용하는 요소 생성 헬퍼 (XSS 방지, PRD F-05) */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function setStatus(node, text, kind = '') {
  node.textContent = text;
  node.className = `status ${kind}`.trim();
}

// ===================== 게임 =====================
const game = new Game({
  onEvent: (name, payload) => {
    sound.play(name);
    if (name === 'levelUp') sound.setLevel(payload);
    if (name === 'gameOver') handleGameOver();
  },
  onChange: (g) => {
    $('score').textContent = fmtNum(g.score);
    $('level').textContent = g.level;
    $('lines').textContent = g.lines;
  },
});

const renderer = new Renderer($('board'), $('next'));

const input = new Input((action) => {
  if (action === 'mute') return toggleAllSound();
  if (action === 'pause') return togglePause();
  if (game.state !== 'playing') return;
  if (action === 'left') game.move(-1);
  else if (action === 'right') game.move(1);
  else if (action === 'rotate') game.rotate();
  else if (action === 'down') game.softDrop();
  else if (action === 'hardDrop') game.hardDrop();
});
input.attachKeyboard();
document.querySelectorAll('.touch-controls button').forEach((b) => input.bindButton(b));

// ---------- 오버레이 ----------
const overlay = $('overlay');
function showScreen(name) {
  overlay.classList.toggle('is-hidden', !name);
  overlay.querySelectorAll('.overlay-card').forEach((card) => {
    card.hidden = card.dataset.screen !== name;
  });
}

function startGame() {
  sound.init();
  sound.setLevel(1);
  game.start();
  input.releaseAll();
  showScreen(null);
  sound.startBgm();
  document.activeElement?.blur();
}

function togglePause() {
  if (game.state !== 'playing' && game.state !== 'paused') return;
  game.togglePause();
  if (game.state === 'paused') {
    sound.stopBgm();
    input.releaseAll();
    showScreen('paused');
    $('resume-btn').focus();
  } else {
    sound.startBgm({ reset: false });
    showScreen(null);
    document.activeElement?.blur();
  }
}

function handleGameOver() {
  sound.stopBgm();
  input.releaseAll();
  $('final-score').textContent = fmtNum(game.score);
  $('final-level').textContent = game.level;
  $('final-lines').textContent = game.lines;
  $('nickname').value = playerNickname || localStorage.getItem(NICK_KEY) || '';
  setStatus($('save-status'), game.score === 0 ? '0점은 저장할 수 없어요.' : '');
  scoreSaved = false;
  $('save-btn').textContent = '점수 저장';
  updateSaveButton();
  showScreen('over');
  // 하드 드롭(Space) 연타가 닉네임 칸에 입력되지 않도록 바로 포커스하지 않음
}

// ---------- 시작 화면 닉네임 ----------
let playerNickname = '';
const startNick = $('start-nickname');
startNick.value = localStorage.getItem(NICK_KEY) || '';

function updateStartButton() {
  $('start-btn').disabled = !validateNickname(startNick.value).ok;
  setStatus($('start-status'), '');
}
startNick.addEventListener('input', updateStartButton);
updateStartButton();

$('start-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const nick = validateNickname(startNick.value);
  if (!nick.ok) {
    setStatus($('start-status'), nick.message, 'error');
    startNick.focus();
    return;
  }
  playerNickname = nick.value;
  localStorage.setItem(NICK_KEY, playerNickname);
  if (!$('fb-nickname').value.trim()) $('fb-nickname').value = playerNickname;
  startGame();
});

$('again-btn').addEventListener('click', startGame);
$('resume-btn').addEventListener('click', togglePause);
$('restart-btn').addEventListener('click', startGame);

// 탭을 벗어나면 자동 일시정지
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing') togglePause();
});

// ---------- 메인 루프 ----------
let last = performance.now();
function loop(now) {
  const dt = Math.min(now - last, 100);
  last = now;
  if (game.state === 'playing') {
    input.update(dt);
    game.update(dt);
  }
  renderer.draw(game);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
showScreen('start');

// ===================== 사운드 토글 (PRD A-03) =====================
function syncSoundButtons() {
  $('bgm-toggle').setAttribute('aria-pressed', String(sound.bgmOn));
  $('sfx-toggle').setAttribute('aria-pressed', String(sound.sfxOn));
}
function toggleAllSound() {
  const turnOn = !(sound.bgmOn || sound.sfxOn);
  sound.setBgm(turnOn);
  sound.setSfx(turnOn);
  syncSoundButtons();
}
$('bgm-toggle').addEventListener('click', (e) => {
  sound.setBgm(!sound.bgmOn);
  syncSoundButtons();
  e.currentTarget.blur();
});
$('sfx-toggle').addEventListener('click', (e) => {
  sound.setSfx(!sound.sfxOn);
  syncSoundButtons();
  e.currentTarget.blur();
});
syncSoundButtons();

// ===================== 탭 =====================
function selectTab(name) {
  for (const t of ['leaderboard', 'feedback']) {
    $(`tab-${t}`).setAttribute('aria-selected', String(t === name));
    $(`pane-${t}`).hidden = t !== name;
  }
}
$('tab-leaderboard').addEventListener('click', () => selectTab('leaderboard'));
$('tab-feedback').addEventListener('click', () => selectTab('feedback'));
$('goto-feedback').addEventListener('click', () => {
  selectTab('feedback');
  $('pane-feedback').scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('fb-nickname').focus({ preventScroll: true });
});

// ===================== 리더보드 (PRD 3.2) =====================
let myScoreId = null;
let scoreSaved = false;

function renderMessage(container, text, retry) {
  container.replaceChildren();
  const box = el('div', 'empty', text);
  if (retry) {
    const btn = el('button', 'link-btn', '다시 시도');
    btn.type = 'button';
    btn.addEventListener('click', retry);
    box.append(btn);
  }
  container.append(box);
}

async function loadLeaderboard() {
  const box = $('leaderboard');
  if (!isSupabaseConfigured) return renderMessage(box, NOT_CONFIGURED);
  renderMessage(box, '불러오는 중…');
  try {
    const rows = await fetchTopScores(10);
    if (rows.length === 0) return renderMessage(box, '아직 기록이 없어요. 첫 번째 주인공이 되어보세요!');
    const list = el('ol', 'rank-list');
    rows.forEach((row, i) => {
      const li = el('li', row.id === myScoreId ? 'mine' : '');
      li.append(
        el('span', 'rank', String(i + 1)),
        el('span', 'name', row.nickname),
        el('span', 'pts', fmtNum(row.score)),
        el('span', 'meta', `Lv.${row.level} · ${row.lines}줄 · ${fmtDate(row.created_at)}`),
      );
      list.append(li);
    });
    box.replaceChildren(list);
  } catch (err) {
    console.error(err);
    renderMessage(box, '리더보드를 불러오지 못했어요.', loadLeaderboard);
  }
}
$('refresh-scores').addEventListener('click', loadLeaderboard);

function updateSaveButton() {
  const valid = validateNickname($('nickname').value).ok;
  $('save-btn').disabled = scoreSaved || game.score === 0 || !valid;
}
$('nickname').addEventListener('input', updateSaveButton);

$('score-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = $('save-status');
  const btn = $('save-btn');
  if (scoreSaved || game.score === 0) return;
  const nick = validateNickname($('nickname').value);
  if (!nick.ok) return setStatus(status, nick.message, 'error');
  if (!isSupabaseConfigured) return setStatus(status, NOT_CONFIGURED, 'error');

  btn.disabled = true;
  btn.textContent = '저장 중…';
  setStatus(status, '');
  try {
    myScoreId = await submitScore({ nickname: nick.value, score: game.score, level: game.level, lines: game.lines });
    localStorage.setItem(NICK_KEY, nick.value);
    scoreSaved = true;
    btn.textContent = '저장 완료';
    setStatus(status, '점수를 저장했어요! 리더보드를 확인하세요.', 'ok');
    selectTab('leaderboard');
    loadLeaderboard();
  } catch (err) {
    console.error(err);
    btn.textContent = '다시 시도';
    setStatus(status, '저장에 실패했어요. 네트워크를 확인하고 다시 시도해 주세요.', 'error');
  } finally {
    updateSaveButton();
  }
});

// ===================== 피드백 (PRD 3.3) =====================
async function loadFeedback() {
  const box = $('feedback-list');
  if (!isSupabaseConfigured) return renderMessage(box, NOT_CONFIGURED);
  renderMessage(box, '불러오는 중…');
  try {
    const rows = await fetchFeedback(20);
    if (rows.length === 0) return renderMessage(box, '아직 피드백이 없어요.');
    const list = el('ul', 'fb-list');
    for (const row of rows) {
      const li = el('li');
      const head = el('div', 'fb-head');
      head.append(el('strong', '', row.nickname), el('span', 'stars-view', '★'.repeat(row.rating) + '☆'.repeat(5 - row.rating)));
      li.append(head, el('p', 'fb-msg', row.message), el('span', 'fb-date', fmtDate(row.created_at)));
      list.append(li);
    }
    box.replaceChildren(list);
  } catch (err) {
    console.error(err);
    renderMessage(box, '피드백을 불러오지 못했어요.', loadFeedback);
  }
}
$('refresh-feedback').addEventListener('click', loadFeedback);

const fbMessage = $('fb-message');
fbMessage.addEventListener('input', () => {
  $('fb-count').textContent = `${[...fbMessage.value].length} / ${MESSAGE_MAX}`;
});
$('fb-nickname').value = localStorage.getItem(NICK_KEY) || '';

let cooldownTimer = null;
function cooldownRemaining() {
  return Math.max(0, Number(localStorage.getItem(COOLDOWN_KEY) || 0) - Date.now());
}
function updateCooldown() {
  const btn = $('fb-submit');
  const left = cooldownRemaining();
  clearTimeout(cooldownTimer);
  if (left > 0) {
    btn.disabled = true;
    btn.textContent = `${Math.ceil(left / 1000)}초 후 작성 가능`;
    cooldownTimer = setTimeout(updateCooldown, 1000);
  } else {
    btn.disabled = false;
    btn.textContent = '등록';
  }
}

$('feedback-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = $('fb-status');
  const btn = $('fb-submit');
  if (cooldownRemaining() > 0 || btn.disabled) return;
  const form = new FormData(e.currentTarget);
  const v = validateFeedback({
    nickname: form.get('nickname'),
    rating: form.get('rating'),
    message: form.get('message'),
  });
  if (!v.ok) return setStatus(status, v.message, 'error');
  if (!isSupabaseConfigured) return setStatus(status, NOT_CONFIGURED, 'error');

  btn.disabled = true;
  btn.textContent = '등록 중…';
  setStatus(status, '');
  try {
    await submitFeedback(v.value);
    localStorage.setItem(NICK_KEY, v.value.nickname);
    localStorage.setItem(COOLDOWN_KEY, String(Date.now() + FEEDBACK_COOLDOWN_MS));
    fbMessage.value = '';
    $('fb-count').textContent = `0 / ${MESSAGE_MAX}`;
    setStatus(status, '피드백 감사합니다!', 'ok');
    loadFeedback();
  } catch (err) {
    console.error(err);
    setStatus(status, '등록에 실패했어요. 잠시 후 다시 시도해 주세요.', 'error');
  } finally {
    updateCooldown();
  }
});

updateCooldown();
loadLeaderboard();
loadFeedback();
