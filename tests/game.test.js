import { describe, it, expect } from 'vitest';
import { COLS, ROWS, HIDDEN_ROWS, createGrid, collides, clearLines } from '../src/game/board.js';
import { PIECES, TYPES, Randomizer, rotateCW } from '../src/game/pieces.js';
import { Game, gravityInterval } from '../src/game/game.js';

function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

describe('pieces', () => {
  it('7-bag은 7개마다 모든 블록을 한 번씩 낸다', () => {
    const r = new Randomizer(seeded(42));
    for (let bag = 0; bag < 5; bag++) {
      const got = Array.from({ length: 7 }, () => r.next()).sort();
      expect(got).toEqual([...TYPES].sort());
    }
  });

  it('회전을 4번 하면 원래 모양', () => {
    for (const t of TYPES) {
      let s = PIECES[t].shape;
      for (let i = 0; i < 4; i++) s = rotateCW(s);
      expect(s).toEqual(PIECES[t].shape);
    }
  });

  it('J 블록 시계방향 회전', () => {
    expect(rotateCW(PIECES.J.shape)).toEqual([
      [0, 1, 1],
      [0, 1, 0],
      [0, 1, 0],
    ]);
  });
});

describe('board', () => {
  it('벽과 바닥 충돌', () => {
    const g = createGrid();
    const o = PIECES.O.shape;
    expect(collides(g, o, -1, 5)).toBe(true);
    expect(collides(g, o, COLS - 1, 5)).toBe(true);
    expect(collides(g, o, 0, ROWS - 1)).toBe(true);
    expect(collides(g, o, 0, ROWS - 2)).toBe(false);
  });

  it('가득 찬 줄만 지운다', () => {
    const g = createGrid();
    g[ROWS - 1].fill('I');
    g[ROWS - 2].fill('I');
    g[ROWS - 2][3] = null;
    g[ROWS - 3][0] = 'T';
    const { grid, cleared } = clearLines(g);
    expect(cleared).toBe(1);
    expect(grid).toHaveLength(ROWS);
    expect(grid[ROWS - 1][3]).toBeNull();
    expect(grid[ROWS - 1][0]).toBe('I');
    expect(grid[ROWS - 2][0]).toBe('T');
  });
});

describe('game', () => {
  it('하드 드롭은 칸당 2점', () => {
    const game = new Game({ rng: seeded(7) });
    game.start();
    const startY = game.piece.y;
    const d = game.hardDrop();
    expect(d).toBeGreaterThan(15);
    expect(game.score).toBe(d * 2);
    expect(game.piece.y).toBe(HIDDEN_ROWS - 1);
    expect(startY).toBe(HIDDEN_ROWS - 1);
  });

  it('줄 삭제 점수와 이벤트', () => {
    const events = [];
    const game = new Game({ rng: seeded(3), onEvent: (e) => events.push(e) });
    game.start();
    // 바닥 4줄을 I 블록 자리(가운데 4칸)만 남기고 채운다 → I 세로로 넣으면 테트리스
    for (let r = ROWS - 4; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) game.grid[r][c] = c === 0 ? null : 'O';
    }
    game.piece = { type: 'I', shape: rotateCW(PIECES.I.shape), x: -2, y: 5 };
    game.score = 0;
    game.hardDrop();
    expect(game.lines).toBe(4);
    expect(events).toContain('tetris');
    expect(game.score).toBeGreaterThanOrEqual(800);
  });

  it('10줄마다 레벨업', () => {
    const events = [];
    const game = new Game({ rng: seeded(5), onEvent: (e) => events.push(e) });
    game.start();
    game.lines = 9;
    game.grid[ROWS - 1].fill('Z');
    game.grid[ROWS - 1][0] = null;
    game.piece = { type: 'I', shape: rotateCW(PIECES.I.shape), x: -2, y: 5 };
    game.hardDrop();
    expect(game.level).toBe(2);
    expect(events).toContain('levelUp');
  });

  it('생성 위치가 막히면 게임 오버', () => {
    const game = new Game({ rng: seeded(9) });
    game.start();
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (c !== 0) game.grid[r][c] = 'S';
    game.spawn();
    expect(game.state).toBe('over');
  });

  it('레벨이 오르면 낙하가 빨라진다', () => {
    expect(gravityInterval(1)).toBe(1000);
    expect(gravityInterval(5)).toBeLessThan(gravityInterval(4));
    expect(gravityInterval(50)).toBe(60);
  });

  it('일시정지 중에는 블록이 내려오지 않는다', () => {
    const game = new Game({ rng: seeded(11) });
    game.start();
    game.togglePause();
    const y = game.piece.y;
    game.update(5000);
    expect(game.piece.y).toBe(y);
    game.togglePause();
    game.update(1000);
    expect(game.piece.y).toBe(y + 1);
  });
});
