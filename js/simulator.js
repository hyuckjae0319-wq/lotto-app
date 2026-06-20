// js/simulator.js - 당첨 시뮬레이터

const Simulator = (() => {

  const PRIZE_BASE = 1000; // 1게임 = 1000원

  // ── 과거 전체 회차 대조 시뮬레이션 ──
  function simulate(myNumbers, draws) {
    const results = {
      total: draws.length,
      spent: draws.length * PRIZE_BASE,
      earned: 0,
      byRank: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      winDraws: [], // 당첨된 회차들
      highestRank: 0
    };

    draws.forEach(draw => {
      const rank = Analysis.checkWinRank(myNumbers, draw);
      if (rank > 0) {
        results.byRank[rank]++;
        results.winDraws.push({ round: draw.round, date: draw.date, rank, numbers: draw.numbers, bonus: draw.bonus });
        if (rank > results.highestRank || results.highestRank === 0) {
          results.highestRank = rank;
        }
      }
    });

    // 실제 당첨금은 변동이지만, 4,5등 고정금 사용, 1~3등은 평균치 사용
    const avgPrize = {
      1: 2_000_000_000, // 20억 (평균)
      2:    60_000_000, // 6000만 (평균)
      3:     1_500_000, // 150만 (평균)
      4:        50_000,
      5:         5_000
    };

    for (const [rank, cnt] of Object.entries(results.byRank)) {
      results.earned += cnt * (avgPrize[rank] || 0);
    }

    results.profit = results.earned - results.spent;
    results.roi = results.spent > 0 ? ((results.profit / results.spent) * 100).toFixed(1) : '0';

    return results;
  }

  // ── 등수 라벨 ──
  function getRankLabel(rank) {
    const labels = { 1: '1등', 2: '2등', 3: '3등', 4: '4등', 5: '5등' };
    return labels[rank] || '낙첨';
  }

  // ── 등수 색상 ──
  function getRankColor(rank) {
    const colors = {
      1: '#ffd700',
      2: '#00d4ff',
      3: '#a855f7',
      4: '#22c55e',
      5: '#f97316'
    };
    return colors[rank] || '#6b7280';
  }

  // ── 금액 포맷 ──
  function formatMoney(amount) {
    if (Math.abs(amount) >= 100_000_000) {
      return (amount / 100_000_000).toFixed(1) + '억';
    }
    if (Math.abs(amount) >= 10_000) {
      return Math.round(amount / 10_000) + '만';
    }
    return amount.toLocaleString() + '원';
  }

  // ── 금액 상세 포맷 ──
  function formatMoneyFull(amount) {
    const sign = amount < 0 ? '-' : '';
    const abs = Math.abs(amount);
    return sign + abs.toLocaleString() + '원';
  }

  return {
    simulate,
    getRankLabel,
    getRankColor,
    formatMoney,
    formatMoneyFull
  };
})();
