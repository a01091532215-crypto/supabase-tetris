// 보드 상태, 충돌 판정, 줄 삭제 (PRD G-01, G-06)

export const COLS = 10;
export const VISIBLE_ROWS = 20;
export const HIDDEN_ROWS = 2;
export const ROWS = VISIBLE_ROWS + HIDDEN_ROWS;

/** grid[row][col] = 블록 타입 문자열 또는 null. 0~1행은 화면에 보이지 않는 숨김 영역 */
export function createGrid() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

export function collides(grid, shape, x, y) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const gx = x + c;
      const gy = y + r;
      if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
      if (gy >= 0 && grid[gy][gx]) return true;
    }
  }
  return false;
}

/** 블록을 보드에 고정. 고정된 칸들의 행 번호 목록을 반환 */
export function merge(grid, shape, x, y, type) {
  const rows = [];
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const gy = y + r;
      if (gy >= 0) grid[gy][x + c] = type;
      rows.push(gy);
    }
  }
  return rows;
}

/** 가득 찬 줄을 지우고 새 grid와 지운 줄 수를 반환 */
export function clearLines(grid) {
  const kept = grid.filter((row) => row.some((cell) => !cell));
  const cleared = ROWS - kept.length;
  while (kept.length < ROWS) kept.unshift(Array(COLS).fill(null));
  return { grid: kept, cleared };
}
