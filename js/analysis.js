// js/analysis.js - 통계 분석 엔진

const Analysis = (() => {

  // ── 번호별 출현 빈도 맵 { 1: count, 2: count, ... 45: count } ──
  function getFrequencyMap(draws) {
    const map = {};
    for (let i = 1; i <= 45; i++) map[i] = 0;
    draws.forEach(d => {
      (d.numbers || []).forEach(n => { map[n] = (map[n] || 0) + 1; });
    });
    return map;
  }

  // ── 보너스 번호 포함 빈도 ──
  function getBonusFrequencyMap(draws) {
    const map = {};
    for (let i = 1; i <= 45; i++) map[i] = 0;
    draws.forEach(d => {
      if (d.bonus) map[d.bonus] = (map[d.bonus] || 0) + 1;
    });
    return map;
  }

  // ── 고빈도 번호 (빈도 내림차순) ──
  function getHotNumbers(draws, count = 20) {
    const freq = getFrequencyMap(draws);
    return Object.entries(freq)
      .map(([num, cnt]) => ({ num: parseInt(num), count: cnt }))
      .sort((a, b) => b.count - a.count || a.num - b.num)
      .slice(0, count);
  }

  // ── 저빈도 번호 (빈도 오름차순) ──
  function getColdNumbers(draws, count = 20) {
    const freq = getFrequencyMap(draws);
    return Object.entries(freq)
      .map(([num, cnt]) => ({ num: parseInt(num), count: cnt }))
      .sort((a, b) => a.count - b.count || a.num - b.num)
      .slice(0, count);
  }

  // ── 평균 출현 횟수 ──
  function getAverageCount(draws) {
    return (draws.length * 6) / 45;
  }

  // ── 평균에 가까운 번호 (균형 번호) ──
  function getBalancedNumbers(draws, count = 20) {
    const freq = getFrequencyMap(draws);
    const avg = getAverageCount(draws);
    return Object.entries(freq)
      .map(([num, cnt]) => ({ num: parseInt(num), count: cnt, diff: Math.abs(cnt - avg) }))
      .sort((a, b) => a.diff - b.diff || a.num - b.num)
      .slice(0, count)
      .map(({ num, count }) => ({ num, count }));
  }

  // ── 홀짝 비율 분석 ──
  function getOddEvenAnalysis(draws) {
    const ratios = {};
    draws.forEach(d => {
      const odds = d.numbers.filter(n => n % 2 !== 0).length;
      const evens = 6 - odds;
      const key = `${odds}:${evens}`;
      ratios[key] = (ratios[key] || 0) + 1;
    });
    const total = draws.length;
    return Object.entries(ratios)
      .map(([ratio, count]) => ({ ratio, count, pct: (count / total * 100).toFixed(1) }))
      .sort((a, b) => b.count - a.count);
  }

  // ── 번호 합계 분포 ──
  function getSumDistribution(draws) {
    const buckets = {};
    const bucketSize = 10;
    draws.forEach(d => {
      const sum = d.numbers.reduce((a, b) => a + b, 0);
      const bucket = Math.floor(sum / bucketSize) * bucketSize;
      const key = `${bucket}-${bucket + bucketSize - 1}`;
      buckets[key] = (buckets[key] || 0) + 1;
    });
    const total = draws.length;
    return Object.entries(buckets)
      .map(([range, count]) => ({ range, count, pct: (count / total * 100).toFixed(1) }))
      .sort((a, b) => parseInt(a.range) - parseInt(b.range));
  }

  // ── 구간별 분포 (1~10, 11~20, 21~30, 31~40, 41~45) ──
  function getSectionDistribution(draws) {
    const sections = [
      { label: '1-10',  min: 1,  max: 10 },
      { label: '11-20', min: 11, max: 20 },
      { label: '21-30', min: 21, max: 30 },
      { label: '31-40', min: 31, max: 40 },
      { label: '41-45', min: 41, max: 45 },
    ];
    const total = draws.length * 6;
    return sections.map(sec => {
      let count = 0;
      draws.forEach(d => {
        d.numbers.forEach(n => { if (n >= sec.min && n <= sec.max) count++; });
      });
      return { ...sec, count, pct: (count / total * 100).toFixed(1) };
    });
  }

  // ── 연속 번호 포함 빈도 ──
  function getConsecutiveAnalysis(draws) {
    let withConsec = 0;
    const distribution = { 0: 0, 1: 0, 2: 0, 3: 0 }; // 0: 없음, 1: 쌍 1개, 2: 쌍 2개, 3: 쌍 3개+
    draws.forEach(d => {
      const sorted = [...d.numbers].sort((a, b) => a - b);
      let pairs = 0;
      for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i + 1] === sorted[i] + 1) pairs++;
      }
      if (pairs > 0) withConsec++;
      const key = Math.min(pairs, 3);
      distribution[key] = (distribution[key] || 0) + 1;
    });
    return {
      withConsecutive: withConsec,
      pct: (withConsec / draws.length * 100).toFixed(1),
      distribution
    };
  }

  // ── 각 번호의 마지막 출현 이후 경과 회차 (출현 간격) ──
  function getGapAnalysis(draws) {
    const lastSeen = {};
    const maxRound = draws[draws.length - 1]?.round || 0;

    draws.forEach(d => {
      d.numbers.forEach(n => { lastSeen[n] = d.round; });
    });

    const result = [];
    for (let i = 1; i <= 45; i++) {
      const last = lastSeen[i] || 0;
      result.push({ num: i, lastRound: last, gap: maxRound - last });
    }
    return result.sort((a, b) => b.gap - a.gap);
  }

  // ── AI 종합 스코어 계산 ──
  function getCompositeScore(draws) {
    const freq = getFrequencyMap(draws);
    const avg = getAverageCount(draws);
    const maxRound = draws[draws.length - 1]?.round || 0;

    // 각 번호별 마지막 출현 회차
    const lastSeen = {};
    draws.forEach(d => {
      d.numbers.forEach(n => { lastSeen[n] = d.round; });
    });

    const scores = {};
    for (let i = 1; i <= 45; i++) {
      const count = freq[i] || 0;
      const gap = maxRound - (lastSeen[i] || 0);
      const avgGap = draws.length / Math.max(1, count);

      // 빈도 점수: 평균에 가까울수록 높음 (종 모양)
      const freqScore = 1 - Math.abs(count - avg) / Math.max(avg, 1);

      // 간격 점수: 평균 간격에 가까울수록 높음
      const gapScore = 1 - Math.abs(gap - avgGap) / Math.max(avgGap, 1);

      // 최종 스코어 (0~100)
      scores[i] = Math.round((freqScore * 0.6 + gapScore * 0.4) * 100);
    }
    return scores;
  }

  // ── 당첨 등수 판별 ──
  function checkWinRank(myNumbers, draw) {
    const winNums = draw.numbers;
    const bonus = draw.bonus;
    const matched = myNumbers.filter(n => winNums.includes(n)).length;
    const bonusMatch = myNumbers.includes(bonus);

    if (matched === 6) return 1;
    if (matched === 5 && bonusMatch) return 2;
    if (matched === 5) return 3;
    if (matched === 4) return 4;
    if (matched === 3) return 5;
    return 0;
  }

  // ── 최근 N회 트렌드 데이터 (번호별) ──
  function getTrendData(draws, num, windowSize = 50) {
    const data = [];
    for (let i = windowSize; i <= draws.length; i += 10) {
      const slice = draws.slice(i - windowSize, i);
      const count = slice.reduce((acc, d) => acc + (d.numbers.includes(num) ? 1 : 0), 0);
      data.push({ round: draws[i - 1]?.round || i, count });
    }
    return data;
  }

  // ── 번호 그룹 분류 ──
  function getBallClass(num) {
    if (num >= 1  && num <= 10) return 'ball-1-10';
    if (num >= 11 && num <= 20) return 'ball-11-20';
    if (num >= 21 && num <= 30) return 'ball-21-30';
    if (num >= 31 && num <= 40) return 'ball-31-40';
    return 'ball-41-45';
  }

  return {
    getFrequencyMap,
    getBonusFrequencyMap,
    getHotNumbers,
    getColdNumbers,
    getBalancedNumbers,
    getAverageCount,
    getOddEvenAnalysis,
    getSumDistribution,
    getSectionDistribution,
    getConsecutiveAnalysis,
    getGapAnalysis,
    getCompositeScore,
    checkWinRank,
    getTrendData,
    getBallClass
  };
})();
