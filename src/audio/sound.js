// BGM / 효과음 — Web Audio API로 직접 합성한 오리지널 사운드 (PRD 3.4)

const BGM_VOLUME = 0.16;
const SFX_VOLUME = 0.32;
const STORAGE_KEY = 'tetris.sound';

const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

// 오리지널 루프: 8마디, 8분음표 단위. 코드 진행 Am - F - C - G - Am - F - Dm - E
const _ = null;
const LEAD = [
  69, 72, 76, 72, 71, 72, 69, _,
  72, 74, 76, 77, 76, 74, 72, _,
  67, 72, 76, 79, 76, 72, 74, 76,
  74, 71, 67, 71, 74, _, 71, _,
  76, _, 76, 74, 72, 74, 76, _,
  77, 76, 74, 72, 69, _, 72, _,
  74, 77, 81, 77, 76, 74, 72, 71,
  69, _, 68, _, 71, _, _, _,
];
const BASS_ROOTS = [45, 41, 48, 43, 45, 41, 38, 40];
const STEPS = LEAD.length;

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { bgm: saved?.bgm ?? true, sfx: saved?.sfx ?? true };
  } catch {
    return { bgm: true, sfx: true };
  }
}

class SoundEngine {
  constructor() {
    const s = loadSettings();
    this.bgmOn = s.bgm;
    this.sfxOn = s.sfx;
    this.ctx = null;
    this.bgmTimer = null;
    this.step = 0;
    this.bpm = 132;
  }

  /** 사용자 클릭 이후에 호출해야 함 (자동재생 정책, PRD A-05) */
  init() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.bgmGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.bgmGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);
      this.noiseBuffer = this.createNoise();
      this.applyGains();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  createNoise() {
    const len = this.ctx.sampleRate * 0.5;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ bgm: this.bgmOn, sfx: this.sfxOn }));
  }

  applyGains() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.bgmGain.gain.setTargetAtTime(this.bgmOn ? BGM_VOLUME : 0, t, 0.02);
    this.sfxGain.gain.setTargetAtTime(this.sfxOn ? SFX_VOLUME : 0, t, 0.02);
  }

  setBgm(on) {
    this.bgmOn = on;
    this.applyGains();
    this.save();
  }

  setSfx(on) {
    this.sfxOn = on;
    this.applyGains();
    this.save();
  }

  /** 레벨이 오르면 BGM 템포를 조금씩 올림 */
  setLevel(level) {
    this.bpm = Math.min(132 + (level - 1) * 4, 184);
  }

  // ---------- 기본 음 생성 ----------
  tone({ freq, to, type = 'square', dur = 0.1, vol = 1, when = 0, dest }) {
    const ctx = this.ctx;
    const t = when || ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(dest || this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noise({ dur = 0.1, vol = 0.5, when = 0, freq = 1200, dest }) {
    const ctx = this.ctx;
    const t = when || ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(g).connect(dest || this.sfxGain);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  // ---------- 효과음 (PRD A-02) ----------
  play(name) {
    if (!this.ctx || !this.sfxOn) return;
    const now = this.ctx.currentTime;
    const seq = (notes, gap, opts) =>
      notes.forEach((f, i) => this.tone({ freq: f, when: now + i * gap, ...opts }));

    switch (name) {
      case 'move':
        this.tone({ freq: 240, type: 'square', dur: 0.035, vol: 0.18 });
        break;
      case 'rotate':
        this.tone({ freq: 420, to: 640, type: 'square', dur: 0.06, vol: 0.2 });
        break;
      case 'lock':
        this.tone({ freq: 140, to: 90, type: 'triangle', dur: 0.09, vol: 0.6 });
        break;
      case 'hardDrop':
        this.tone({ freq: 160, to: 45, type: 'triangle', dur: 0.16, vol: 0.9 });
        this.noise({ dur: 0.09, vol: 0.5, freq: 900 });
        break;
      case 'clear':
        seq([523.25, 659.25, 783.99], 0.055, { type: 'square', dur: 0.12, vol: 0.3 });
        this.noise({ dur: 0.25, vol: 0.15, freq: 4000 });
        break;
      case 'tetris':
        seq([523.25, 659.25, 783.99, 1046.5, 1318.5], 0.06, { type: 'square', dur: 0.16, vol: 0.32 });
        this.noise({ dur: 0.4, vol: 0.2, freq: 5000 });
        break;
      case 'levelUp':
        seq([392, 523.25, 659.25, 783.99, 1046.5], 0.07, { type: 'triangle', dur: 0.18, vol: 0.6 });
        break;
      case 'gameOver':
        seq([392, 349.23, 311.13, 261.63], 0.22, { type: 'sawtooth', dur: 0.3, vol: 0.25 });
        this.tone({ freq: 130.81, to: 55, type: 'triangle', dur: 1.2, vol: 0.6, when: now + 0.9 });
        break;
      default:
        break;
    }
  }

  // ---------- BGM (PRD A-01) ----------
  startBgm({ reset = true } = {}) {
    if (!this.ctx) return;
    this.stopBgm();
    if (reset) this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.08;
    this.bgmTimer = setInterval(() => this.scheduleBgm(), 25);
  }

  stopBgm() {
    if (this.bgmTimer) clearInterval(this.bgmTimer);
    this.bgmTimer = null;
  }

  scheduleBgm() {
    const eighth = 60 / this.bpm / 2;
    while (this.nextNoteTime < this.ctx.currentTime + 0.12) {
      this.playStep(this.step, this.nextNoteTime, eighth);
      this.nextNoteTime += eighth;
      this.step = (this.step + 1) % STEPS;
    }
  }

  playStep(step, t, eighth) {
    const dest = this.bgmGain;
    const lead = LEAD[step];
    if (lead) this.tone({ freq: midiToFreq(lead), type: 'square', dur: eighth * 0.9, vol: 0.32, when: t, dest });

    const root = BASS_ROOTS[Math.floor(step / 8)];
    const bassNote = step % 2 === 0 ? root : root + 12;
    this.tone({ freq: midiToFreq(bassNote), type: 'triangle', dur: eighth * 0.85, vol: 0.9, when: t, dest });

    if (step % 2 === 1) this.noise({ dur: 0.03, vol: 0.18, freq: 7000, when: t, dest });
    if (step % 4 === 0) this.tone({ freq: 110, to: 40, type: 'sine', dur: 0.12, vol: 0.8, when: t, dest });
  }
}

export const sound = new SoundEngine();
