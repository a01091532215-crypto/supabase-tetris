// Canvas 렌더링 (고스트 피스는 그리지 않음 — PRD G-11)
import { COLS, VISIBLE_ROWS, HIDDEN_ROWS } from '../game/board.js';
import { PIECES } from '../game/pieces.js';

const CELL = 30;
const BG = '#0d1326';
const GRID_LINE = 'rgba(255,255,255,0.045)';

function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp((n >> 16) + amount);
  const g = clamp(((n >> 8) & 0xff) + amount);
  const b = clamp((n & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}

function drawCell(ctx, x, y, size, color) {
  const inset = Math.max(1, size * 0.06);
  ctx.fillStyle = shade(color, -55);
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = color;
  ctx.fillRect(x + inset, y + inset, size - inset * 2, size - inset * 2);
  ctx.fillStyle = shade(color, 60);
  ctx.fillRect(x + inset, y + inset, size - inset * 2, size * 0.14);
}

function setupCanvas(canvas, width, height) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

export class Renderer {
  constructor(boardCanvas, nextCanvas) {
    this.board = setupCanvas(boardCanvas, COLS * CELL, VISIBLE_ROWS * CELL);
    this.nextCanvas = nextCanvas;
    this.nextSize = { w: 4 * 22 + 16, h: 3 * 3 * 22 + 16 };
    this.next = setupCanvas(nextCanvas, this.nextSize.w, this.nextSize.h);
  }

  draw(game) {
    this.drawBoard(game);
    this.drawNext(game);
  }

  drawBoard(game) {
    const ctx = this.board;
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, COLS * CELL, VISIBLE_ROWS * CELL);

    ctx.strokeStyle = GRID_LINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 1; c < COLS; c++) {
      ctx.moveTo(c * CELL + 0.5, 0);
      ctx.lineTo(c * CELL + 0.5, VISIBLE_ROWS * CELL);
    }
    for (let r = 1; r < VISIBLE_ROWS; r++) {
      ctx.moveTo(0, r * CELL + 0.5);
      ctx.lineTo(COLS * CELL, r * CELL + 0.5);
    }
    ctx.stroke();

    for (let r = HIDDEN_ROWS; r < game.grid.length; r++) {
      for (let c = 0; c < COLS; c++) {
        const type = game.grid[r][c];
        if (type) drawCell(ctx, c * CELL, (r - HIDDEN_ROWS) * CELL, CELL, PIECES[type].color);
      }
    }

    const p = game.piece;
    if (p && game.state !== 'idle') {
      const color = PIECES[p.type].color;
      p.shape.forEach((row, r) =>
        row.forEach((v, c) => {
          const gy = p.y + r - HIDDEN_ROWS;
          if (v && gy >= 0) drawCell(ctx, (p.x + c) * CELL, gy * CELL, CELL, color);
        }),
      );
    }
  }

  drawNext(game) {
    const ctx = this.next;
    const { w, h } = this.nextSize;
    ctx.clearRect(0, 0, w, h);
    if (game.state === 'idle') return;
    const size = 22;
    const slotH = (h - 16) / 3;
    game.next.forEach((type, i) => {
      const shape = PIECES[type].shape;
      // 실제로 채워진 영역만 계산해 가운데 정렬
      const cells = [];
      shape.forEach((row, r) => row.forEach((v, c) => v && cells.push([r, c])));
      const minR = Math.min(...cells.map(([r]) => r));
      const maxR = Math.max(...cells.map(([r]) => r));
      const minC = Math.min(...cells.map(([, c]) => c));
      const maxC = Math.max(...cells.map(([, c]) => c));
      const s = i === 0 ? size : size * 0.75;
      const pw = (maxC - minC + 1) * s;
      const ph = (maxR - minR + 1) * s;
      const ox = (w - pw) / 2;
      const oy = 8 + i * slotH + (slotH - ph) / 2;
      ctx.globalAlpha = i === 0 ? 1 : 0.55;
      cells.forEach(([r, c]) => drawCell(ctx, ox + (c - minC) * s, oy + (r - minR) * s, s, PIECES[type].color));
      ctx.globalAlpha = 1;
    });
  }
}
