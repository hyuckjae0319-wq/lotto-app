// js/generator.js - 번호 생성기 (5가지 모드)

const Generator = (() => {

  // ── 랜덤으로 n개 선택 (Fisher-Yates) ──
  function pickRandom(pool, n) {
    const arr = [...pool];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, n).sort((a, b) => a - b);
  }

  // ── 가중치 기반 랜덤 선택 ──
  function weightedPick(scores, n) {
    const entries = Object.entries(scores).map(([num, score]) => ({
      num: parseInt(num),
      weight: Math.max(score, 1)
    }));
    
    const selected = [];
    const remaining = [...entries];

    while (selected.length < n && remaining.length > 0) {
      const totalWeight = remaining.reduce((s, e) => s + e.weight, 0);
      let rand = Math.random() * totalWeight;
      let idx = 0;
      for (let i = 0; i < remaining.length; i++) {
        rand -= remaining[i].weight;
        if (rand <= 0) { idx = i; break; }
      }
      selected.push(remaining[idx].num);
      remaining.splice(idx, 1);
    }
    return selected.sort((a, b) => a - b);
  }

  // ── 1. 고빈도 (Hot) ──
  function generateHot(draws, count = 6) {
    const hotNums = Analysis.getHotNumbers(draws, 15);
    const pool = hotNums.map(h => h.num);
    return pickRandom(pool, count);
  }

  // ── 2. 저빈도 (Cold) ──
  function generateCold(draws, count = 6) {
    const coldNums = Analysis.getColdNumbers(draws, 15);
    const pool = coldNums.map(c => c.num);
    return pickRandom(pool, count);
  }

  // ── 3. 평균/균형 (Balanced) ──
  function generateBalanced(draws, count = 6) {
    const balanced = Analysis.getBalancedNumbers(draws, 20);
    const pool = balanced.map(b => b.num);
    return pickRandom(pool, count);
  }

  // ── 4. 완전 랜덤 ──
  function generateRandom(count = 6) {
    const all = Array.from({ length: 45 }, (_, i) => i + 1);
    return pickRandom(all, count);
  }

  // ── 5. AI 종합 추천 ──
  function generateAI(draws, count = 6) {
    const scores = Analysis.getCompositeScore(draws);
    return weightedPick(scores, count);
  }

  // ── 여러 줄 생성 (lines: 1~5) ──
  function generateLines(draws, mode, lines = 1) {
    const results = [];
    for (let i = 0; i < lines; i++) {
      let numbers;
      switch (mode) {
        case 'hot':      numbers = generateHot(draws);     break;
        case 'cold':     numbers = generateCold(draws);    break;
        case 'balanced': numbers = generateBalanced(draws); break;
        case 'random':   numbers = generateRandom();       break;
        case 'ai':       numbers = generateAI(draws);      break;
        default:         numbers = generateRandom();
      }
      results.push({ line: i + 1, numbers });
    }
    return results;
  }

  // ── 모드별 설명 ──
  const modeInfo = {
    hot: {
      icon: '🔥',
      name: '고빈도',
      desc: '역대 가장 많이 나온 번호 중 선택',
      color: '#ef4444'
    },
    cold: {
      icon: '❄️',
      name: '저빈도',
      desc: '역대 가장 적게 나온 번호 중 선택',
      color: '#60a5fa'
    },
    balanced: {
      icon: '⚖️',
      name: '평균',
      desc: '평균 출현 빈도에 가까운 번호 선택',
      color: '#22c55e'
    },
    random: {
      icon: '🎲',
      name: '랜덤',
      desc: '완전 무작위 번호 생성',
      color: '#a855f7'
    },
    ai: {
      icon: '🤖',
      name: 'AI 추천',
      desc: '빈도·간격·균형 종합 스코어 기반 추천',
      color: '#ffd700'
    }
  };

  return {
    generateHot,
    generateCold,
    generateBalanced,
    generateRandom,
    generateAI,
    generateLines,
    modeInfo
  };
})();
