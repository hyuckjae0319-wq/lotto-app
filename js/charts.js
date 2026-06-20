// js/charts.js - Chart.js 기반 시각화

const Charts = (() => {
  const chartInstances = {};

  function destroyChart(id) {
    if (chartInstances[id]) {
      chartInstances[id].destroy();
      delete chartInstances[id];
    }
  }

  // ── 공통 차트 옵션 ──
  const BASE_OPTIONS = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 800, easing: 'easeInOutQuart' },
    plugins: {
      legend: {
        labels: { color: '#94a3b8', font: { family: 'Outfit', size: 12 } }
      },
      tooltip: {
        backgroundColor: 'rgba(13,19,51,0.95)',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        titleFont: { family: 'Outfit', size: 13, weight: 'bold' },
        bodyFont: { family: 'Noto Sans KR', size: 12 },
        padding: 12,
        cornerRadius: 8
      }
    },
    scales: {
      x: {
        ticks: { color: '#475569', font: { family: 'Outfit', size: 11 } },
        grid: { color: 'rgba(255,255,255,0.04)' }
      },
      y: {
        ticks: { color: '#475569', font: { family: 'Outfit', size: 11 } },
        grid: { color: 'rgba(255,255,255,0.04)' }
      }
    }
  };

  // ── 번호별 출현 빈도 바 차트 ──
  function renderFrequencyChart(canvasId, draws, topN = 20) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const freq = Analysis.getFrequencyMap(draws);
    const sorted = Object.entries(freq)
      .map(([n, c]) => ({ num: parseInt(n), count: c }))
      .sort((a, b) => b.count - a.count)
      .slice(0, topN);

    const labels = sorted.map(s => `${s.num}번`);
    const data = sorted.map(s => s.count);
    const avg = Analysis.getAverageCount(draws);

    // 볼 색상
    const colors = sorted.map(s => {
      const n = s.num;
      if (n <= 10) return 'rgba(251,191,36,0.8)';
      if (n <= 20) return 'rgba(96,165,250,0.8)';
      if (n <= 30) return 'rgba(248,113,113,0.8)';
      if (n <= 40) return 'rgba(156,163,175,0.8)';
      return 'rgba(74,222,128,0.8)';
    });

    chartInstances[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: '출현 횟수',
            data,
            backgroundColor: colors,
            borderRadius: 6,
            borderSkipped: false
          },
          {
            label: `평균 (${avg.toFixed(1)}회)`,
            data: new Array(topN).fill(avg),
            type: 'line',
            borderColor: 'rgba(255,215,0,0.6)',
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        ...BASE_OPTIONS,
        plugins: {
          ...BASE_OPTIONS.plugins,
          legend: { ...BASE_OPTIONS.plugins.legend, display: true }
        }
      }
    });
  }

  // ── 홀짝 비율 파이 차트 ──
  function renderOddEvenPie(canvasId, draws) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const data = Analysis.getOddEvenAnalysis(draws).slice(0, 6);
    const colors = [
      'rgba(255,215,0,0.8)', 'rgba(0,212,255,0.8)', 'rgba(168,85,247,0.8)',
      'rgba(34,197,94,0.8)', 'rgba(249,115,22,0.8)', 'rgba(239,68,68,0.8)'
    ];

    chartInstances[canvasId] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: data.map(d => `홀${d.ratio.split(':')[0]} 짝${d.ratio.split(':')[1]} (${d.pct}%)`),
        datasets: [{
          data: data.map(d => d.count),
          backgroundColor: colors,
          borderColor: 'rgba(8,12,31,0.8)',
          borderWidth: 3,
          hoverOffset: 8
        }]
      },
      options: {
        ...BASE_OPTIONS,
        scales: undefined, // 파이차트에는 scales 없음
        cutout: '55%',
        plugins: {
          ...BASE_OPTIONS.plugins,
          legend: { ...BASE_OPTIONS.plugins.legend, position: 'right' }
        }
      }
    });
  }

  // ── 합계 분포 히스토그램 ──
  function renderSumHistogram(canvasId, draws) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const dist = Analysis.getSumDistribution(draws);

    chartInstances[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: dist.map(d => d.range),
        datasets: [{
          label: '회차 수',
          data: dist.map(d => d.count),
          backgroundColor: dist.map((_, i) => {
            const idx = i / dist.length;
            if (idx < 0.3) return 'rgba(96,165,250,0.7)';
            if (idx < 0.7) return 'rgba(255,215,0,0.7)';
            return 'rgba(168,85,247,0.7)';
          }),
          borderRadius: 4,
          borderSkipped: false
        }]
      },
      options: {
        ...BASE_OPTIONS,
        plugins: { ...BASE_OPTIONS.plugins, legend: { display: false } }
      }
    });
  }

  // ── 구간별 분포 레이더 차트 ──
  function renderSectionRadar(canvasId, draws) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const sections = Analysis.getSectionDistribution(draws);

    chartInstances[canvasId] = new Chart(canvas, {
      type: 'radar',
      data: {
        labels: sections.map(s => s.label),
        datasets: [{
          label: '번호 출현 %',
          data: sections.map(s => parseFloat(s.pct)),
          backgroundColor: 'rgba(0,212,255,0.15)',
          borderColor: 'rgba(0,212,255,0.7)',
          pointBackgroundColor: 'rgba(0,212,255,0.9)',
          pointBorderColor: '#fff',
          borderWidth: 2,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 800 },
        plugins: {
          legend: { labels: { color: '#94a3b8', font: { family: 'Outfit', size: 12 } } },
          tooltip: BASE_OPTIONS.plugins.tooltip
        },
        scales: {
          r: {
            ticks: { color: '#475569', font: { family: 'Outfit', size: 10 }, backdropColor: 'transparent' },
            grid: { color: 'rgba(255,255,255,0.06)' },
            pointLabels: { color: '#94a3b8', font: { family: 'Outfit', size: 12 } }
          }
        }
      }
    });
  }

  // ── 최근 트렌드 라인 차트 ──
  function renderTrendChart(canvasId, draws, nums = []) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const windowSize = 50;
    const step = Math.max(1, Math.floor(draws.length / 20));
    const points = [];
    for (let i = windowSize; i <= draws.length; i += step) {
      points.push(draws.slice(i - windowSize, i));
    }

    const colors = ['#ffd700', '#00d4ff', '#a855f7', '#22c55e', '#f97316', '#ef4444'];

    const datasets = nums.map((num, idx) => ({
      label: `${num}번`,
      data: points.map(slice => {
        const cnt = slice.filter(d => d.numbers.includes(num)).length;
        return (cnt / windowSize * 100).toFixed(1);
      }),
      borderColor: colors[idx % colors.length],
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 3,
      tension: 0.4
    }));

    chartInstances[canvasId] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: points.map((_, i) => `${i * step + windowSize}회`),
        datasets
      },
      options: {
        ...BASE_OPTIONS,
        plugins: {
          ...BASE_OPTIONS.plugins,
          legend: { ...BASE_OPTIONS.plugins.legend, display: true }
        },
        scales: {
          ...BASE_OPTIONS.scales,
          y: {
            ...BASE_OPTIONS.scales.y,
            title: { display: true, text: '출현율 (%)', color: '#475569', font: { family: 'Outfit' } }
          }
        }
      }
    });
  }

  // ── 히트맵 렌더링 (Canvas 없이 HTML 그리드로) ──
  function renderHeatmap(containerId, draws) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const freq = Analysis.getFrequencyMap(draws);
    const maxCount = Math.max(...Object.values(freq));
    const minCount = Math.min(...Object.values(freq));

    let html = '<div class="heatmap-grid">';
    for (let i = 1; i <= 45; i++) {
      const count = freq[i];
      const intensity = maxCount > minCount
        ? (count - minCount) / (maxCount - minCount)
        : 0.5;

      const ballClass = Analysis.getBallClass(i);
      const opacity = 0.2 + intensity * 0.8;

      // 볼 색상 기반 히트맵
      const colorMap = {
        'ball-1-10':  `rgba(251,191,36,${opacity})`,
        'ball-11-20': `rgba(96,165,250,${opacity})`,
        'ball-21-30': `rgba(248,113,113,${opacity})`,
        'ball-31-40': `rgba(156,163,175,${opacity})`,
        'ball-41-45': `rgba(74,222,128,${opacity})`
      };

      html += `
        <div class="heatmap-cell" style="background:${colorMap[ballClass]}"
             title="${i}번: ${count}회 출현" data-num="${i}">
          ${i}
        </div>`;
    }
    // 빈 칸 채우기 (9열 * 5행 = 45, 딱 맞음)
    html += '</div>';

    container.innerHTML = html;
  }

  return {
    renderFrequencyChart,
    renderOddEvenPie,
    renderSumHistogram,
    renderSectionRadar,
    renderTrendChart,
    renderHeatmap,
    destroyChart
  };
})();
