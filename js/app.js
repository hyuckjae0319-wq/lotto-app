// js/app.js - 메인 앱 로직 & SPA 라우팅

// ── 앱 상태 ──
const App = {
  draws: [],
  currentPage: 'dashboard',
  selectedMode: 'ai',
  analysisRange: 100,
  generatedLines: [],
  simulatorNumbers: [],
  historyPage: 1,
  historySearch: '',
  chartTab: 'frequency'
};

// ── 유틸 함수 ──
function el(id) { return document.getElementById(id); }
function qs(sel, ctx = document) { return ctx.querySelector(sel); }
function qsa(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

// ── 번호볼 HTML ──
function ballHtml(num, size = '', isBonus = false, animated = false, delay = 0) {
  const cls = isBonus ? 'ball-bonus' : Analysis.getBallClass(num);
  const sizeClass = size ? `size-${size}` : '';
  const animClass = animated ? 'animate' : '';
  const style = animated ? `style="animation-delay:${delay}ms;opacity:0"` : '';
  return `<div class="lotto-ball ${cls} ${sizeClass} ${animClass}" ${style}>${num}</div>`;
}

// ── 번호 줄 HTML ──
function rowHtml(row, idx, showBonus = false, bonusNum = null) {
  const alpha = ['A','B','C','D','E'];
  const label = alpha[idx] || (idx + 1);
  let numbersHtml = row.numbers.map((n, i) => ballHtml(n, '', false, true, i * 80)).join('');
  if (showBonus && bonusNum) {
    numbersHtml += `<span class="bonus-divider">+</span>${ballHtml(bonusNum, '', true)}`;
  }
  return `
    <div class="lotto-row" id="gen-row-${idx}">
      <span class="row-label">${label}</span>
      <div class="row-numbers">${numbersHtml}</div>
      <div class="row-action">
        <button class="btn btn-ghost btn-sm" onclick="saveSingleRow(${idx})" title="저장">⭐</button>
        <button class="btn btn-ghost btn-sm" onclick="copyRow(${idx})" title="복사">📋</button>
      </div>
    </div>`;
}

// ── 토스트 알림 ──
function toast(message, type = 'info', duration = 2500) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const container = el('toast-container');
  const div = document.createElement('div');
  div.className = `toast ${type}`;
  div.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-message">${message}</span>`;
  container.appendChild(div);
  setTimeout(() => {
    div.classList.add('hiding');
    setTimeout(() => div.remove(), 300);
  }, duration);
}

// ── 네비게이션 ──
function navigate(page) {
  App.currentPage = page;
  qsa('.page').forEach(p => p.classList.remove('active'));
  qsa('.nav-link').forEach(l => l.classList.remove('active'));
  const pageEl = el(`page-${page}`);
  const navEl = qs(`[data-page="${page}"]`);
  if (pageEl) pageEl.classList.add('active');
  if (navEl) navEl.classList.add('active');

  // 페이지별 렌더링
  switch (page) {
    case 'dashboard':  renderDashboard(); break;
    case 'generate':   renderGenerate(); break;
    case 'analysis':   renderAnalysis(); break;
    case 'simulator':  renderSimulator(); break;
    case 'history':    renderHistory(); break;
    case 'favorites':  renderFavorites(); break;
  }
}

// ════════════════════════════════════════════
//  📊 대시보드 페이지
// ════════════════════════════════════════════
function renderDashboard() {
  const draws = App.draws;
  if (!draws.length) {
    el('dashboard-content').innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>데이터 로드 중...</p></div>';
    return;
  }

  const latest = DataManager.getLatestDraw(draws);
  const freq = Analysis.getFrequencyMap(draws);
  const hot = Analysis.getHotNumbers(draws, 5);
  const cold = Analysis.getColdNumbers(draws, 5);
  const avg = Analysis.getAverageCount(draws).toFixed(1);
  const settings = Storage.getSettings();

  el('dashboard-content').innerHTML = `
    <!-- 최신 당첨 번호 -->
    <div class="latest-draw-card" style="margin-bottom:24px">
      <div class="latest-round-badge">🎱 제 ${latest.round}회 당첨번호</div>
      <div class="latest-numbers">
        ${latest.numbers.map(n => ballHtml(n, 'lg')).join('')}
        <span style="color:var(--text-muted);font-size:1.2rem;margin:0 4px">+</span>
        ${ballHtml(latest.bonus, 'lg', true)}
      </div>
      <div class="latest-date">📅 추첨일: ${DataManager.formatDate(latest.date)}</div>
    </div>

    <!-- 핵심 통계 -->
    <div class="grid grid-4" style="margin-bottom:24px">
      <div class="stat-card">
        <div class="stat-value">${draws.length}</div>
        <div class="stat-label">📦 분석 회차</div>
        <div class="stat-sub">${draws[0].round}~${latest.round}회</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-gold">${hot[0]?.num || '-'}</div>
        <div class="stat-label">🔥 최다 출현</div>
        <div class="stat-sub">${hot[0]?.count || 0}회 출현</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-cyan">${cold[0]?.num || '-'}</div>
        <div class="stat-label">❄️ 최소 출현</div>
        <div class="stat-sub">${cold[0]?.count || 0}회 출현</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-purple">${avg}</div>
        <div class="stat-label">⚖️ 평균 출현</div>
        <div class="stat-sub">회차당 평균</div>
      </div>
    </div>

    <div class="grid grid-2" style="margin-bottom:24px">
      <!-- 고빈도 TOP 5 -->
      <div class="card">
        <div class="card-title"><span class="icon">🔥</span> 최다 출현 번호 TOP 5</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${hot.map((h, i) => `
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-family:'Outfit';font-size:0.75rem;color:var(--text-muted);width:16px">${i+1}</span>
              ${ballHtml(h.num, 'sm')}
              <div class="freq-bar-track" style="flex:1">
                <div class="freq-bar-fill" style="width:${(h.count/hot[0].count*100).toFixed(0)}%"></div>
              </div>
              <span style="font-family:'Outfit';font-size:0.85rem;color:var(--gold);font-weight:700">${h.count}회</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 저빈도 TOP 5 -->
      <div class="card">
        <div class="card-title"><span class="icon">❄️</span> 최소 출현 번호 TOP 5</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${cold.map((c, i) => `
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-family:'Outfit';font-size:0.75rem;color:var(--text-muted);width:16px">${i+1}</span>
              ${ballHtml(c.num, 'sm')}
              <div class="freq-bar-track" style="flex:1">
                <div class="freq-bar-fill" style="width:${(c.count/hot[0].count*100).toFixed(0)}%;background:linear-gradient(90deg,#60a5fa,#2563eb)"></div>
              </div>
              <span style="font-family:'Outfit';font-size:0.85rem;color:var(--cyan);font-weight:700">${c.count}회</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- 최근 5회 당첨 번호 -->
    <div class="card">
      <div class="card-title"><span class="icon">📋</span> 최근 5회 당첨번호</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${draws.slice(-5).reverse().map(d => `
          <div class="history-item">
            <span class="history-round">${d.round}회</span>
            <span class="history-date">${DataManager.formatDate(d.date)}</span>
            <div class="history-numbers">
              ${d.numbers.map(n => ballHtml(n, 'sm')).join('')}
              <span class="bonus-divider" style="font-size:0.8rem">+</span>
              ${ballHtml(d.bonus, 'sm', true)}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ════════════════════════════════════════════
//  🎱 번호 생성 페이지
// ════════════════════════════════════════════
function renderGenerate() {
  const settings = Storage.getSettings();
  const lines = settings.defaultLines || 3;
  const mode  = App.selectedMode || settings.defaultMode || 'ai';

  el('page-generate').innerHTML = `
    <div class="section-header">
      <h1>🎱 번호 생성</h1>
      <p>분석 기반으로 로또 번호를 생성합니다</p>
    </div>

    <!-- 분석 기간 선택 -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-title"><span class="icon">📅</span> 분석 기간</div>
      <div class="range-tabs" id="range-tabs">
        ${[50,100,200,500,1000].map(r => `
          <button class="range-tab ${App.analysisRange === r ? 'active' : ''}" onclick="setAnalysisRange(${r})">${r}회</button>
        `).join('')}
      </div>
    </div>

    <!-- 생성 모드 선택 -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-title"><span class="icon">🎯</span> 생성 모드</div>
      <div class="mode-grid">
        ${Object.entries(Generator.modeInfo).map(([key, info]) => `
          <button class="mode-btn ${mode === key ? 'active' : ''}" onclick="selectMode('${key}')" id="mode-${key}">
            <span class="mode-icon">${info.icon}</span>
            <span class="mode-name">${info.name}</span>
          </button>
        `).join('')}
      </div>
      <div id="mode-desc" style="font-size:0.8rem;color:var(--text-secondary);margin-top:4px">
        ${Generator.modeInfo[mode]?.desc || ''}
      </div>
    </div>

    <!-- 줄 수 슬라이더 -->
    <div class="slider-container" style="margin-bottom:16px">
      <div class="slider-label">
        <span>생성 줄 수</span>
        <div style="display:flex;align-items:baseline;gap:4px">
          <span class="slider-value" id="lines-value">${lines}</span>
          <span class="slider-unit">줄</span>
        </div>
      </div>
      <input type="range" class="lotto-slider" id="lines-slider"
             min="1" max="5" step="1" value="${lines}"
             oninput="onLinesSlider(this.value)"
             onchange="onLinesSliderDone(this.value)">
      <div class="slider-ticks">
        ${[1,2,3,4,5].map(n => `<span class="slider-tick ${lines===n?'active':''}" onclick="onLinesSlider(${n});document.getElementById('lines-slider').value=${n};onLinesSliderDone(${n})">${n}줄</span>`).join('')}
      </div>
    </div>

    <!-- 생성 버튼 -->
    <button class="btn btn-primary btn-lg" id="gen-btn" onclick="doGenerate()" style="width:100%;margin-bottom:24px">
      <span>🎱 번호 생성하기</span>
    </button>

    <!-- 생성 결과 -->
    <div id="generated-result"></div>
  `;

  // 이전 생성 결과가 있으면 다시 표시
  if (App.generatedLines.length > 0) {
    renderGeneratedResult();
  }
}

function setAnalysisRange(range) {
  App.analysisRange = range;
  qsa('.range-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
}

function selectMode(mode) {
  App.selectedMode = mode;
  qsa('.mode-btn').forEach(b => b.classList.remove('active'));
  el(`mode-${mode}`)?.classList.add('active');
  const desc = el('mode-desc');
  if (desc) desc.textContent = Generator.modeInfo[mode]?.desc || '';
  Sound.click();
}

function onLinesSlider(val) {
  const v = Math.min(5, Math.max(1, parseInt(val)));
  const display = el('lines-value');
  if (display) display.textContent = v;
  // 틱 하이라이트
  qsa('.slider-tick').forEach((t, i) => {
    t.classList.toggle('active', i + 1 === v);
  });
}

function onLinesSliderDone(val) {
  const v = Math.min(5, Math.max(1, parseInt(val)));
  onLinesSlider(v);
  Sound.tick();
  Storage.saveSettings({ defaultLines: v });
}

function doGenerate() {
  const btn = el('gen-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> 생성 중...';

  setTimeout(() => {
    const range = Math.min(App.analysisRange, App.draws.length);
    const rangeDraws = App.draws.slice(-range);
    const lines = Math.min(5, Math.max(1, parseInt(el('lines-slider')?.value || 3)));

    App.generatedLines = Generator.generateLines(rangeDraws, App.selectedMode, lines);
    renderGeneratedResult(true);

    btn.disabled = false;
    btn.innerHTML = '<span>🎱 번호 생성하기</span>';
  }, 50);
}

function renderGeneratedResult(withSound = false) {
  const result = el('generated-result');
  if (!result || !App.generatedLines.length) return;

  const modeInfo = Generator.modeInfo[App.selectedMode] || {};

  result.innerHTML = `
    <div class="card">
      <div class="card-title">
        <span class="icon">${modeInfo.icon || '🎱'}</span>
        ${modeInfo.name || ''} 모드 생성 결과
        <span class="badge badge-gold" style="margin-left:auto">${App.generatedLines.length}줄</span>
      </div>
      <div class="generated-rows" id="gen-rows">
        ${App.generatedLines.map((row, i) => rowHtml(row, i)).join('')}
      </div>
      <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
        <button class="btn btn-secondary" onclick="saveAllRows()" style="flex:1">⭐ 전체 저장</button>
        <button class="btn btn-ghost" onclick="doGenerate()" style="flex:1">🔄 다시 생성</button>
      </div>
      <div class="reason-tags">
        <span class="reason-tag">📊 최근 ${App.analysisRange}회 분석</span>
        <span class="reason-tag">${modeInfo.desc || ''}</span>
      </div>
    </div>`;

  if (withSound) {
    // 볼 등장 효과음 + 애니메이션
    const totalBalls = App.generatedLines.length * 6;
    for (let i = 0; i < totalBalls; i++) {
      Sound.ballPop(i % 6);
    }
    setTimeout(() => Sound.generateComplete(), totalBalls * 80 + 100);
  }
}

function saveSingleRow(idx) {
  const row = App.generatedLines[idx];
  if (!row) return;
  Storage.saveFavorite(row.numbers, App.selectedMode);
  Sound.save();
  toast('⭐ 번호를 저장했습니다!', 'success');
}

function saveAllRows() {
  App.generatedLines.forEach(row => {
    Storage.saveFavorite(row.numbers, App.selectedMode);
  });
  Sound.save();
  toast(`⭐ ${App.generatedLines.length}줄 모두 저장했습니다!`, 'success');
}

function copyRow(idx) {
  const row = App.generatedLines[idx];
  if (!row) return;
  const text = row.numbers.join(', ');
  navigator.clipboard.writeText(text).then(() => toast('📋 클립보드에 복사했습니다!', 'info'));
}

// ════════════════════════════════════════════
//  📈 분석 페이지
// ════════════════════════════════════════════
function renderAnalysis() {
  el('page-analysis').innerHTML = `
    <div class="section-header">
      <h1>📊 번호 분석</h1>
      <p>역대 당첨 데이터 통계 분석</p>
    </div>

    <!-- 분석 기간 -->
    <div class="range-tabs" id="analysis-range-tabs" style="margin-bottom:20px">
      ${[50,100,200,500,1000].map(r => `
        <button class="range-tab ${App.analysisRange === r ? 'active' : ''}"
                onclick="setAnalysisRangeAndRefresh(${r},this)">${r}회</button>
      `).join('')}
    </div>

    <!-- 차트 탭 -->
    <div class="tabs">
      <button class="tab active" onclick="switchChartTab('frequency', this)">📊 출현 빈도</button>
      <button class="tab" onclick="switchChartTab('heatmap', this)">🌡️ 히트맵</button>
      <button class="tab" onclick="switchChartTab('oddeven', this)">⚖️ 홀짝 비율</button>
      <button class="tab" onclick="switchChartTab('sum', this)">➕ 합계 분포</button>
      <button class="tab" onclick="switchChartTab('section', this)">📐 구간 분포</button>
    </div>

    <div id="chart-content">
      <div class="card">
        <div class="chart-container"><canvas id="main-chart"></canvas></div>
      </div>
    </div>

    <!-- 상세 통계 -->
    <div class="grid grid-2" style="margin-top:20px">
      <div class="card">
        <div class="card-title"><span class="icon">📋</span> 연속번호 포함 빈도</div>
        <div id="consecutive-stats"></div>
      </div>
      <div class="card">
        <div class="card-title"><span class="icon">⏳</span> 오래 안 나온 번호 TOP 5</div>
        <div id="gap-stats"></div>
      </div>
    </div>
  `;

  const range = Math.min(App.analysisRange, App.draws.length);
  const rangeDraws = App.draws.slice(-range);

  renderChartTab('frequency', rangeDraws);
  renderAnalysisStats(rangeDraws);
}

function setAnalysisRangeAndRefresh(range, btn) {
  App.analysisRange = range;
  qsa('#analysis-range-tabs .range-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  const rangeDraws = App.draws.slice(-Math.min(range, App.draws.length));
  renderChartTab(App.chartTab || 'frequency', rangeDraws);
  renderAnalysisStats(rangeDraws);
}

function switchChartTab(tab, btn) {
  App.chartTab = tab;
  qsa('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  const range = Math.min(App.analysisRange, App.draws.length);
  renderChartTab(tab, App.draws.slice(-range));
}

function renderChartTab(tab, rangeDraws) {
  const chartContent = el('chart-content');
  if (!chartContent) return;

  if (tab === 'heatmap') {
    chartContent.innerHTML = `
      <div class="card">
        <div class="card-title">🌡️ 번호별 출현 빈도 히트맵</div>
        <div id="heatmap-container"></div>
        <div style="display:flex;gap:16px;margin-top:12px;font-size:0.75rem;color:var(--text-muted)">
          <span>■ 진할수록 고빈도</span>
          <span>🟡 1-10 &nbsp; 🔵 11-20 &nbsp; 🔴 21-30 &nbsp; ⬜ 31-40 &nbsp; 🟢 41-45</span>
        </div>
      </div>`;
    setTimeout(() => Charts.renderHeatmap('heatmap-container', rangeDraws), 50);
  } else {
    chartContent.innerHTML = `<div class="card"><div class="chart-container"><canvas id="main-chart"></canvas></div></div>`;
    setTimeout(() => {
      switch (tab) {
        case 'frequency': Charts.renderFrequencyChart('main-chart', rangeDraws, 20); break;
        case 'oddeven':   Charts.renderOddEvenPie('main-chart', rangeDraws); break;
        case 'sum':       Charts.renderSumHistogram('main-chart', rangeDraws); break;
        case 'section':   Charts.renderSectionRadar('main-chart', rangeDraws); break;
      }
    }, 50);
  }
}

function renderAnalysisStats(rangeDraws) {
  const consec = Analysis.getConsecutiveAnalysis(rangeDraws);
  const consecEl = el('consecutive-stats');
  if (consecEl) {
    consecEl.innerHTML = `
      <div style="margin-bottom:12px">
        <div style="font-family:'Outfit';font-size:1.8rem;font-weight:800;color:var(--cyan)">${consec.pct}%</div>
        <div style="font-size:0.8rem;color:var(--text-muted)">연속번호 포함 회차 비율</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${Object.entries(consec.distribution).map(([pairs, cnt]) => `
          <div style="display:flex;align-items:center;gap:8px;font-size:0.8rem">
            <span style="color:var(--text-muted);width:60px">${pairs === '0' ? '없음' : pairs + '쌍' + (pairs==='3'?'+':'')} </span>
            <div class="freq-bar-track" style="flex:1"><div class="freq-bar-fill" style="width:${(cnt/rangeDraws.length*100).toFixed(0)}%"></div></div>
            <span style="color:var(--text-secondary)">${cnt}회</span>
          </div>
        `).join('')}
      </div>`;
  }

  const gaps = Analysis.getGapAnalysis(rangeDraws).slice(0, 5);
  const gapEl = el('gap-stats');
  if (gapEl) {
    gapEl.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:8px">
        ${gaps.map((g, i) => `
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:0.75rem;color:var(--text-muted);width:16px">${i+1}</span>
            ${ballHtml(g.num, 'sm')}
            <div style="flex:1">
              <div style="font-size:0.8rem;color:var(--text-secondary)">${g.gap}회째 미출현</div>
              <div style="font-size:0.7rem;color:var(--text-muted)">마지막: ${g.lastRound}회</div>
            </div>
          </div>
        `).join('')}
      </div>`;
  }
}

// ════════════════════════════════════════════
//  🎰 시뮬레이터 페이지
// ════════════════════════════════════════════
function renderSimulator() {
  el('page-simulator').innerHTML = `
    <div class="section-header">
      <h1>🎰 당첨 시뮬레이터</h1>
      <p>선택한 번호로 과거 회차를 대조해 봅니다</p>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-title"><span class="icon">🔢</span> 번호 선택 (6개)</div>
      <div style="margin-bottom:12px;font-size:0.8rem;color:var(--text-secondary)">
        선택된 번호: <span id="sim-selected-display" style="color:var(--gold);font-weight:700">없음</span>
      </div>
      <div class="number-picker" id="number-picker">
        ${Array.from({length:45},(_,i)=>i+1).map(n => `
          <button class="number-pick-btn ${Analysis.getBallClass(n)}-btn"
                  id="pick-${n}" onclick="togglePickNum(${n})"
                  style="${App.simulatorNumbers.includes(n) ? getPickedStyle(n) : ''}">${n}</button>
        `).join('')}
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-ghost btn-sm" onclick="clearPickedNums()">초기화</button>
        <button class="btn btn-ghost btn-sm" onclick="quickFillFromGenerated()">생성된 번호 가져오기</button>
      </div>
    </div>

    <button class="btn btn-cyan btn-lg" onclick="runSimulation()" style="width:100%;margin-bottom:24px"
            id="sim-btn">🎰 시뮬레이션 실행</button>

    <div id="sim-result"></div>
  `;

  // 이미 선택된 번호 표시
  updateSimPickDisplay();
}

function getPickedStyle(num) {
  const classes = {
    'ball-1-10': 'background:radial-gradient(circle at 35% 35%,#fbbf24,#d97706);color:#fff;border-color:transparent',
    'ball-11-20': 'background:radial-gradient(circle at 35% 35%,#60a5fa,#2563eb);color:#fff;border-color:transparent',
    'ball-21-30': 'background:radial-gradient(circle at 35% 35%,#f87171,#dc2626);color:#fff;border-color:transparent',
    'ball-31-40': 'background:radial-gradient(circle at 35% 35%,#9ca3af,#4b5563);color:#fff;border-color:transparent',
    'ball-41-45': 'background:radial-gradient(circle at 35% 35%,#4ade80,#16a34a);color:#fff;border-color:transparent'
  };
  return classes[Analysis.getBallClass(num)] || '';
}

function togglePickNum(num) {
  const idx = App.simulatorNumbers.indexOf(num);
  if (idx >= 0) {
    App.simulatorNumbers.splice(idx, 1);
    const btn = el(`pick-${num}`);
    if (btn) { btn.style = ''; }
  } else {
    if (App.simulatorNumbers.length >= 6) {
      toast('번호는 6개까지만 선택할 수 있습니다', 'error');
      return;
    }
    App.simulatorNumbers.push(num);
    const btn = el(`pick-${num}`);
    if (btn) btn.style = getPickedStyle(num);
    Sound.click();
  }
  updateSimPickDisplay();
}

function updateSimPickDisplay() {
  const disp = el('sim-selected-display');
  if (!disp) return;
  disp.textContent = App.simulatorNumbers.length
    ? App.simulatorNumbers.sort((a,b)=>a-b).join(', ')
    : '없음';
}

function clearPickedNums() {
  App.simulatorNumbers = [];
  qsa('.number-pick-btn').forEach(b => b.style = '');
  updateSimPickDisplay();
}

function quickFillFromGenerated() {
  if (!App.generatedLines.length) {
    toast('먼저 번호를 생성해주세요!', 'error');
    return;
  }
  clearPickedNums();
  App.generatedLines[0].numbers.forEach(n => {
    App.simulatorNumbers.push(n);
    const btn = el(`pick-${n}`);
    if (btn) btn.style = getPickedStyle(n);
  });
  updateSimPickDisplay();
  toast('첫 번째 줄 번호를 가져왔습니다', 'info');
}

function runSimulation() {
  if (App.simulatorNumbers.length !== 6) {
    toast('번호 6개를 선택해주세요!', 'error');
    return;
  }

  const btn = el('sim-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> 분석 중...';

  setTimeout(() => {
    const result = Simulator.simulate(App.simulatorNumbers, App.draws);
    renderSimResult(result);
    btn.disabled = false;
    btn.innerHTML = '🎰 시뮬레이션 실행';
  }, 100);
}

function renderSimResult(r) {
  const nums = App.simulatorNumbers.sort((a,b)=>a-b);
  const isProfit = r.profit >= 0;

  el('sim-result').innerHTML = `
    <div class="simulator-result" style="margin-bottom:20px">
      <div style="text-align:center;margin-bottom:16px">
        <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:8px">시뮬레이션 번호</div>
        <div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap">
          ${nums.map(n => ballHtml(n)).join('')}
        </div>
      </div>
      <div class="grid grid-4" style="margin-bottom:12px">
        <div class="sim-stat">
          <div class="value">${r.total.toLocaleString()}</div>
          <div class="label">시뮬레이션 회차</div>
        </div>
        <div class="sim-stat">
          <div class="value">${Simulator.formatMoney(r.spent)}</div>
          <div class="label">총 지출</div>
        </div>
        <div class="sim-stat">
          <div class="value">${Simulator.formatMoney(r.earned)}</div>
          <div class="label">총 당첨금</div>
        </div>
        <div class="sim-stat">
          <div class="value ${isProfit ? 'profit' : 'loss'}">${isProfit ? '+' : ''}${Simulator.formatMoney(r.profit)}</div>
          <div class="label">순수익 (ROI ${r.roi}%)</div>
        </div>
      </div>

      <!-- 등수별 결과 -->
      <div class="grid grid-5" style="margin-bottom:16px">
        ${[1,2,3,4,5].map(rank => `
          <div style="text-align:center;padding:12px;background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid ${r.byRank[rank]>0?Simulator.getRankColor(rank)+'40':'transparent'}">
            <div style="font-family:'Outfit';font-size:1.4rem;font-weight:800;color:${Simulator.getRankColor(rank)}">${r.byRank[rank]}</div>
            <div style="font-size:0.7rem;color:var(--text-muted)">${Simulator.getRankLabel(rank)}</div>
          </div>
        `).join('')}
      </div>
    </div>

    ${r.winDraws.length > 0 ? `
    <div class="card">
      <div class="card-title"><span class="icon">🏆</span> 당첨 기록 (${r.winDraws.length}회)</div>
      <div class="scroll-area">
        ${r.winDraws.map(w => `
          <div class="history-item">
            <span class="history-round">${w.round}회</span>
            <span class="history-date">${DataManager.formatDate(w.date)}</span>
            <div class="history-numbers">
              ${w.numbers.map(n => ballHtml(n, 'sm')).join('')}
              <span class="bonus-divider" style="font-size:0.8rem">+</span>
              ${ballHtml(w.bonus, 'sm', true)}
            </div>
            <span class="favorite-tag tag-win${w.rank}" style="margin-left:auto">${Simulator.getRankLabel(w.rank)}</span>
          </div>
        `).join('')}
      </div>
    </div>
    ` : `<div class="empty-state"><div class="empty-icon">😅</div><p>당첨 기록이 없습니다</p></div>`}
  `;

  if (r.highestRank > 0) Sound.win(r.highestRank);
  else Sound.lose();
}

// ════════════════════════════════════════════
//  📋 히스토리 페이지
// ════════════════════════════════════════════
const HISTORY_PER_PAGE = 30;

function renderHistory() {
  el('page-history').innerHTML = `
    <div class="section-header">
      <h1>📋 당첨 번호 히스토리</h1>
      <p>역대 로또 당첨 번호 목록</p>
    </div>

    <div style="display:flex;gap:12px;margin-bottom:20px;align-items:center">
      <input type="text" class="search-input" id="history-search"
             placeholder="🔍 회차 번호 검색..."
             value="${App.historySearch}"
             oninput="onHistorySearch(this.value)"
             style="max-width:300px">
      <span style="font-size:0.8rem;color:var(--text-muted)">총 ${App.draws.length}회차</span>
    </div>

    <div id="history-list"></div>
    <div id="history-pagination" class="pagination"></div>
  `;

  renderHistoryList();
}

function onHistorySearch(val) {
  App.historySearch = val;
  App.historyPage = 1;
  renderHistoryList();
}

function renderHistoryList() {
  const search = App.historySearch.trim();
  const filtered = search
    ? App.draws.filter(d => String(d.round).includes(search) || d.numbers.some(n => String(n) === search))
    : App.draws;

  const reversed = [...filtered].reverse();
  const totalPages = Math.ceil(reversed.length / HISTORY_PER_PAGE);
  const page = Math.min(App.historyPage, Math.max(1, totalPages));
  const slice = reversed.slice((page - 1) * HISTORY_PER_PAGE, page * HISTORY_PER_PAGE);

  const list = el('history-list');
  if (!slice.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><p>검색 결과가 없습니다</p></div>';
  } else {
    list.innerHTML = `
      <div class="card" style="padding:12px">
        ${slice.map(d => `
          <div class="history-item">
            <span class="history-round">${d.round}회</span>
            <span class="history-date">${DataManager.formatDate(d.date)}</span>
            <div class="history-numbers">
              ${d.numbers.map(n => ballHtml(n, 'sm')).join('')}
              <span class="bonus-divider" style="font-size:0.8rem">+</span>
              ${ballHtml(d.bonus, 'sm', true)}
            </div>
          </div>
        `).join('')}
      </div>`;
  }

  // 페이지네이션
  const pag = el('history-pagination');
  if (totalPages <= 1) { pag.innerHTML = ''; return; }
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }
  pag.innerHTML = pages.map(p =>
    p === '...'
      ? `<span style="color:var(--text-muted);padding:0 4px">...</span>`
      : `<button class="page-btn ${p === page ? 'active' : ''}" onclick="goHistoryPage(${p})">${p}</button>`
  ).join('');
}

function goHistoryPage(p) {
  App.historyPage = p;
  renderHistoryList();
  el('page-history').scrollIntoView({ behavior: 'smooth' });
}

// ════════════════════════════════════════════
//  ⭐ 즐겨찾기 페이지
// ════════════════════════════════════════════
function renderFavorites() {
  const favs = Storage.getFavorites();
  const latest = DataManager.getLatestDraw(App.draws);

  el('page-favorites').innerHTML = `
    <div class="section-header">
      <h1>⭐ 저장된 번호</h1>
      <p>즐겨찾기 번호 및 최신 회차 당첨 대조</p>
    </div>

    ${latest ? `
    <button class="btn btn-cyan" onclick="checkAllFavs()" style="margin-bottom:20px">
      🔍 ${latest.round}회 당첨 대조하기
    </button>` : ''}

    <div id="favorites-list">
      ${favs.length === 0
        ? `<div class="empty-state"><div class="empty-icon">⭐</div><p>저장된 번호가 없습니다<br><small>번호 생성 후 저장해보세요!</small></p></div>`
        : favs.map(fav => renderFavoriteItem(fav)).join('')
      }
    </div>
  `;
}

function renderFavoriteItem(fav) {
  const modeInfo = Generator.modeInfo[fav.mode] || {};
  const result = fav.lastResult;
  let resultTag = '';
  if (result) {
    if (result.rank > 0) {
      resultTag = `<span class="favorite-tag tag-win${result.rank}">${result.round}회 ${Simulator.getRankLabel(result.rank)}</span>`;
    } else {
      resultTag = `<span class="favorite-tag tag-miss">${result.round}회 낙첨</span>`;
    }
  }

  return `
    <div class="favorite-item" id="fav-${fav.id}">
      <div style="flex:1;min-width:0">
        <div style="display:flex;gap:8px;margin-bottom:8px;align-items:center;flex-wrap:wrap">
          ${fav.numbers.map(n => ballHtml(n, 'sm')).join('')}
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          ${modeInfo.icon ? `<span class="badge badge-cyan">${modeInfo.icon} ${modeInfo.name || fav.mode}</span>` : ''}
          ${resultTag}
          <span style="font-size:0.7rem;color:var(--text-muted)">${Storage.formatSavedAt(fav.savedAt)}</span>
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button class="btn btn-ghost btn-sm" onclick="simFromFav('${fav.id}')" title="시뮬레이터로">🎰</button>
        <button class="btn btn-danger btn-sm" onclick="deleteFav('${fav.id}')" title="삭제">🗑️</button>
      </div>
    </div>`;
}

function checkAllFavs() {
  const latest = DataManager.getLatestDraw(App.draws);
  if (!latest) return;
  const wins = Storage.checkAllFavorites(latest);
  renderFavorites(); // 새로고침
  if (wins.length > 0) {
    wins.forEach(({ rank }) => Sound.win(rank));
    toast(`🎉 ${wins.length}개 당첨! ${wins.map(w => Simulator.getRankLabel(w.rank)).join(', ')}`, 'success', 4000);
  } else {
    Sound.lose();
    toast('이번 회차에 당첨된 번호가 없습니다 😅', 'info');
  }
}

function simFromFav(id) {
  const fav = Storage.getFavorites().find(f => f.id === id);
  if (!fav) return;
  App.simulatorNumbers = [...fav.numbers];
  navigate('simulator');
  setTimeout(() => { runSimulation(); }, 300);
}

function deleteFav(id) {
  Storage.deleteFavorite(id);
  Sound.delete();
  toast('삭제했습니다', 'info');
  renderFavorites();
}

// ════════════════════════════════════════════
//  ⚙️ 별빛 애니메이션
// ════════════════════════════════════════════
function initStars() {
  const canvas = el('stars-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const stars = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.5 + 0.3,
    a: Math.random(),
    da: (Math.random() - 0.5) * 0.006
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      s.a += s.da;
      if (s.a <= 0 || s.a >= 1) s.da = -s.da;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${Math.max(0, Math.min(1, s.a))})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

// ════════════════════════════════════════════
//  🚀 앱 초기화
// ════════════════════════════════════════════
async function initApp() {
  initStars();

  // ── 서비스 워커 등록 (PWA 오프라인 지원) ──
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('서비스 워커 등록 완료:', reg.scope))
      .catch(err => console.error('서비스 워커 등록 실패:', err));
  }

  const settings = Storage.getSettings();
  Sound.setEnabled(settings.soundEnabled);
  App.analysisRange = settings.analysisRange || 100;
  App.selectedMode  = settings.defaultMode || 'ai';

  // 업데이트 배너 표시
  const banner = el('update-banner');
  if (banner) {
    banner.classList.remove('hidden');
    banner.querySelector('.update-msg').textContent = '데이터 로드 중...';
  }

  try {
    App.draws = await DataManager.initialize((msg) => {
      const banner = el('update-banner');
      if (banner) banner.querySelector('.update-msg').textContent = msg;
    });

    if (banner) {
      if (App.draws.length > 0) {
        const latest = DataManager.getLatestDraw(App.draws);
        banner.querySelector('.update-msg').textContent =
          `✅ ${App.draws.length}회차 로드 완료 | 최신: ${latest.round}회 (${DataManager.formatDate(latest.date)})`;
        setTimeout(() => banner.classList.add('hidden'), 4000);
      } else {
        banner.querySelector('.update-msg').textContent = '⚠️ 데이터 없음 - 동행복권 연결을 확인해주세요';
        banner.style.borderColor = 'rgba(239,68,68,0.3)';
      }
    }

    // 저장된 번호 최신 회차 대조
    const latest = DataManager.getLatestDraw(App.draws);
    if (latest) {
      const wins = Storage.checkAllFavorites(latest);
      if (wins.length > 0) {
        setTimeout(() => {
          Sound.win(wins[0].rank);
          toast(`🎉 저장된 번호 중 ${wins.length}개 당첨!`, 'success', 5000);
        }, 2000);
      }
    }

    navigate('dashboard');

  } catch (err) {
    console.error('초기화 오류:', err);
    if (banner) {
      banner.querySelector('.update-msg').textContent = '⚠️ 데이터 로드 실패';
      banner.style.borderColor = 'rgba(239,68,68,0.3)';
    }
    navigate('dashboard');
  }
}

// ── DOM 로드 후 초기화 ──
document.addEventListener('DOMContentLoaded', initApp);
