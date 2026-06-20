// js/sound.js - 효과음 모듈 (Web Audio API, 외부 파일 없음)

const Sound = (() => {
  let ctx = null;
  let enabled = true;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // 브라우저 자동재생 정책: 사용자 인터랙션 후에 resume
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /** 단순 비프음 */
  function beep({ freq = 440, type = 'sine', duration = 0.15, volume = 0.3, delay = 0 }) {
    if (!enabled) return;
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);

      osc.type = type;
      osc.frequency.setValueAtTime(freq, c.currentTime + delay);
      gain.gain.setValueAtTime(0, c.currentTime + delay);
      gain.gain.linearRampToValueAtTime(volume, c.currentTime + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);

      osc.start(c.currentTime + delay);
      osc.stop(c.currentTime + delay + duration + 0.05);
    } catch (e) { /* 소리 실패는 무시 */ }
  }

  return {
    setEnabled(v) { enabled = v; },
    isEnabled() { return enabled; },

    /** 볼 하나 등장할 때 (딸각딸각) */
    ballPop(index = 0) {
      const freqs = [880, 932, 988, 1047, 1109, 1175];
      beep({ freq: freqs[index % freqs.length], type: 'triangle', duration: 0.12, volume: 0.25, delay: index * 0.08 });
    },

    /** 번호 생성 완료 팡파레 */
    generateComplete() {
      // 짧은 상승 코드
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => {
        beep({ freq, type: 'sine', duration: 0.2, volume: 0.2, delay: i * 0.1 });
      });
      // 마지막에 반짝
      beep({ freq: 1319, type: 'sine', duration: 0.3, volume: 0.15, delay: 0.45 });
    },

    /** 저장 완료 */
    save() {
      beep({ freq: 600, type: 'sine', duration: 0.1, volume: 0.2 });
      beep({ freq: 800, type: 'sine', duration: 0.15, volume: 0.2, delay: 0.1 });
    },

    /** 삭제 */
    delete() {
      beep({ freq: 300, type: 'sawtooth', duration: 0.15, volume: 0.15 });
    },

    /** 당첨 알림 */
    win(rank) {
      if (rank === 1) {
        // 1등: 화려한 팡파레
        [523, 659, 784, 659, 784, 1047].forEach((f, i) => {
          beep({ freq: f, type: 'sine', duration: 0.25, volume: 0.25, delay: i * 0.12 });
        });
      } else if (rank <= 3) {
        // 2-3등: 상승음
        [523, 784, 1047].forEach((f, i) => {
          beep({ freq: f, type: 'sine', duration: 0.2, volume: 0.2, delay: i * 0.1 });
        });
      } else {
        // 4-5등: 짧은 알림
        beep({ freq: 700, type: 'triangle', duration: 0.2, volume: 0.18 });
        beep({ freq: 900, type: 'triangle', duration: 0.2, volume: 0.18, delay: 0.15 });
      }
    },

    /** 낙첨 */
    lose() {
      beep({ freq: 300, type: 'sine', duration: 0.3, volume: 0.12 });
      beep({ freq: 220, type: 'sine', duration: 0.4, volume: 0.1, delay: 0.2 });
    },

    /** 클릭 */
    click() {
      beep({ freq: 700, type: 'square', duration: 0.05, volume: 0.1 });
    },

    /** 슬라이더 틱 */
    tick() {
      beep({ freq: 500, type: 'triangle', duration: 0.07, volume: 0.12 });
    }
  };
})();
