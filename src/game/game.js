// 게임 루프, 점수, 레벨 (PRD G-04 ~ G-10)
import { COLS, HIDDEN_ROWS, createGrid, collides, merge, clearLines } from './board.js';
import { Randomizer, cloneShape, rotateCW } from './pieces.js';

export const LINE_SCORES = [0, 100, 300, 500, 800];
export const LINES_PER_LEVEL = 10;
export const PREVIEW_COUNT = 3;

/** 레벨별 자동 낙하 간격(ms) */
export function gravityInterval(level) {
  return Math.max(60, Math.round(1000 * Math.pow(0.82, level - 1)));
}

export class Game {
  /**
   * @param {object} opts
   * @param {(name: string, payload?: any) => void} [opts.onEvent] 사운드 등 이벤트 알림
   * @param {(game: Game) => void} [opts.onChange] 점수/레벨/상태 변경 알림
   * @param {() => number} [opts.rng]
   */
  constructor({ onEvent = () => {}, onChange = () => {}, rng = Math.random } = {}) {
    this.onEvent = onEvent;
    this.onChange = onChange;
    this.rng = rng;
    this.state = 'idle'; // idle | playing | paused | over
    this.grid = createGrid();
    this.piece = null;
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.randomizer = new Randomizer(rng);
  }

  start() {
    this.grid = createGrid();
    this.randomizer = new Randomizer(this.rng);
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.dropTimer = 0;
    this.state = 'playing';
    this.spawn();
    this.onChange(this);
  }

  get next() {
    return this.randomizer.peek(PREVIEW_COUNT);
  }

  spawn() {
    const type = this.randomizer.next();
    const shape = cloneShape(type);
    const x = Math.floor((COLS - shape[0].length) / 2);
    const y = HIDDEN_ROWS - 1; // 블록 아랫부분이 보이는 첫 줄에 걸치도록
    this.piece = { type, shape, x, y };
    this.dropTimer = 0;
    if (collides(this.grid, shape, x, y)) this.gameOver();
  }

  move(dx) {
    if (this.state !== 'playing') return false;
    const { shape, x, y } = this.piece;
    if (collides(this.grid, shape, x + dx, y)) return false;
    this.piece.x += dx;
    this.onEvent('move');
    return true;
  }

  rotate() {
    if (this.state !== 'playing') return false;
    const { type, shape, x, y } = this.piece;
    if (type === 'O') return false;
    const rotated = rotateCW(shape);
    // 간단한 wall kick: 제자리 → 좌우 1칸 → (I 블록만) 좌우 2칸
    const kicks = type === 'I' ? [0, -1, 1, -2, 2] : [0, -1, 1];
    for (const dx of kicks) {
      if (!collides(this.grid, rotated, x + dx, y)) {
        this.piece.shape = rotated;
        this.piece.x = x + dx;
        this.onEvent('rotate');
        return true;
      }
    }
    return false;
  }

  softDrop() {
    if (this.state !== 'playing') return false;
    const { shape, x, y } = this.piece;
    if (collides(this.grid, shape, x, y + 1)) {
      this.lock();
      return false;
    }
    this.piece.y += 1;
    this.score += 1;
    this.dropTimer = 0;
    this.onChange(this);
    return true;
  }

  hardDrop() {
    if (this.state !== 'playing') return 0;
    const { shape, x } = this.piece;
    let distance = 0;
    while (!collides(this.grid, shape, x, this.piece.y + 1)) {
      this.piece.y += 1;
      distance++;
    }
    this.score += distance * 2;
    this.onEvent('hardDrop');
    this.lock({ silent: true });
    return distance;
  }

  lock({ silent = false } = {}) {
    const { type, shape, x, y } = this.piece;
    const rows = merge(this.grid, shape, x, y, type);
    const { grid, cleared } = clearLines(this.grid);
    this.grid = grid;

    if (cleared > 0) {
      const prevLevel = this.level;
      this.score += LINE_SCORES[cleared] * this.level;
      this.lines += cleared;
      this.level = Math.floor(this.lines / LINES_PER_LEVEL) + 1;
      this.onEvent(cleared === 4 ? 'tetris' : 'clear', cleared);
      if (this.level > prevLevel) this.onEvent('levelUp', this.level);
    } else if (!silent) {
      this.onEvent('lock');
    }

    // 블록 전체가 숨김 영역에 고정되면 게임 오버 (lock out)
    if (cleared === 0 && rows.every((r) => r < HIDDEN_ROWS)) {
      this.gameOver();
      return;
    }

    this.spawn();
    this.onChange(this);
  }

  update(dt) {
    if (this.state !== 'playing') return;
    this.dropTimer += dt;
    const interval = gravityInterval(this.level);
    while (this.state === 'playing' && this.dropTimer >= interval) {
      this.dropTimer -= interval;
      const { shape, x, y } = this.piece;
      if (collides(this.grid, shape, x, y + 1)) {
        this.lock();
        break;
      }
      this.piece.y += 1;
    }
  }

  togglePause() {
    if (this.state === 'playing') this.state = 'paused';
    else if (this.state === 'paused') this.state = 'playing';
    else return;
    this.onChange(this);
  }

  gameOver() {
    this.state = 'over';
    this.onEvent('gameOver');
    this.onChange(this);
  }
}
