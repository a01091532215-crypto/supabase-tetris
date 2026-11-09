// 테트로미노 정의와 7-bag 랜덤 생성기 (PRD G-02, G-03)

export const PIECES = {
  I: { color: '#3fd8f2', shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]] },
  O: { color: '#f5cf3a', shape: [[1, 1], [1, 1]] },
  T: { color: '#b660f2', shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]] },
  S: { color: '#4fd56b', shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]] },
  Z: { color: '#f2525d', shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]] },
  J: { color: '#4c7ff5', shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]] },
  L: { color: '#f5973c', shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]] },
};

export const TYPES = Object.keys(PIECES);

/** 정사각 행렬을 시계 방향으로 90도 회전한 새 행렬을 반환 */
export function rotateCW(matrix) {
  const n = matrix.length;
  return matrix.map((row, r) => row.map((_, c) => matrix[n - 1 - c][r]));
}

export function cloneShape(type) {
  return PIECES[type].shape.map((row) => [...row]);
}

/** 7종 블록을 한 묶음으로 섞어 순서대로 내보내는 생성기 */
export class Randomizer {
  constructor(rng = Math.random) {
    this.rng = rng;
    this.queue = [];
  }

  refill() {
    const bag = [...TYPES];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    this.queue.push(...bag);
  }

  next() {
    if (this.queue.length === 0) this.refill();
    return this.queue.shift();
  }

  peek(count = 1) {
    while (this.queue.length < count) this.refill();
    return this.queue.slice(0, count);
  }
}
