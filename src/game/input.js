// 키보드 / 터치 입력 (PRD G-04, 조작키 표)

const KEYMAP = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowDown: 'down',
  ArrowUp: 'rotate',
  KeyX: 'rotate',
  Space: 'hardDrop',
  KeyP: 'pause',
  Escape: 'pause',
  KeyM: 'mute',
};

const REPEATABLE = new Set(['left', 'right', 'down']);
const OPPOSITE = { left: 'right', right: 'left' };

/**
 * 누르고 있으면 자동 반복(DAS)되는 입력 처리기.
 * das: 첫 반복까지 대기(ms), arr: 반복 간격(ms)
 */
export class Input {
  constructor(handler, { das = 170, arr = 50 } = {}) {
    this.handler = handler;
    this.das = das;
    this.arr = arr;
    this.held = new Map(); // key: 입력 출처, value: { action, t, charged }
  }

  press(source, action) {
    this.handler(action);
    if (!REPEATABLE.has(action)) return;
    // 반대 방향을 누르면 기존 방향 반복은 멈춤
    for (const [src, h] of this.held) {
      if (h.action === OPPOSITE[action]) this.held.delete(src);
    }
    this.held.set(source, { action, t: 0, charged: false });
  }

  release(source) {
    this.held.delete(source);
  }

  releaseAll() {
    this.held.clear();
  }

  update(dt) {
    for (const h of this.held.values()) {
      h.t += dt;
      if (!h.charged) {
        if (h.t >= this.das) {
          h.charged = true;
          h.t = 0;
          this.handler(h.action);
        }
      } else {
        while (h.t >= this.arr) {
          h.t -= this.arr;
          this.handler(h.action);
        }
      }
    }
  }

  attachKeyboard(target = window) {
    target.addEventListener('keydown', (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const action = KEYMAP[e.code];
      if (!action) return;
      e.preventDefault();
      if (e.repeat) return; // 반복은 직접 처리
      this.press(`key:${e.code}`, action);
    });
    target.addEventListener('keyup', (e) => this.release(`key:${e.code}`));
    target.addEventListener('blur', () => this.releaseAll());
  }

  /** 터치/마우스 버튼 연결. data-action 속성으로 동작 지정 */
  bindButton(el) {
    const action = el.dataset.action;
    const source = `btn:${action}`;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture?.(e.pointerId);
      this.press(source, action);
    });
    const up = () => this.release(source);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}
