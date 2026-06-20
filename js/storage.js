// js/storage.js - 즐겨찾기 & 설정 관리 (localStorage)

const Storage = (() => {
  const KEY_FAVORITES = 'lotto_favorites';
  const KEY_SETTINGS  = 'lotto_settings';

  // ── 기본 설정 ──
  const DEFAULT_SETTINGS = {
    soundEnabled: true,
    analysisRange: 100,  // 분석 기간 (회차 수)
    defaultMode: 'ai',
    defaultLines: 3,
    theme: 'dark'
  };

  // ── 설정 로드 ──
  function getSettings() {
    try {
      const raw = localStorage.getItem(KEY_SETTINGS);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  // ── 설정 저장 ──
  function saveSettings(settings) {
    localStorage.setItem(KEY_SETTINGS, JSON.stringify({ ...getSettings(), ...settings }));
  }

  // ── 즐겨찾기 로드 ──
  function getFavorites() {
    try {
      const raw = localStorage.getItem(KEY_FAVORITES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  // ── 즐겨찾기 저장 ──
  function saveFavorite(numbers, mode = '', memo = '') {
    const favs = getFavorites();
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const item = {
      id,
      numbers: [...numbers].sort((a, b) => a - b),
      mode,
      memo,
      savedAt: new Date().toISOString(),
      lastChecked: null,
      lastResult: null
    };
    favs.unshift(item);
    // 최대 50개 유지
    if (favs.length > 50) favs.pop();
    localStorage.setItem(KEY_FAVORITES, JSON.stringify(favs));
    return item;
  }

  // ── 즐겨찾기 삭제 ──
  function deleteFavorite(id) {
    const favs = getFavorites().filter(f => f.id !== id);
    localStorage.setItem(KEY_FAVORITES, JSON.stringify(favs));
  }

  // ── 즐겨찾기 메모 수정 ──
  function updateFavoriteMemo(id, memo) {
    const favs = getFavorites().map(f => f.id === id ? { ...f, memo } : f);
    localStorage.setItem(KEY_FAVORITES, JSON.stringify(favs));
  }

  // ── 즐겨찾기 당첨 결과 업데이트 ──
  function updateFavoriteResult(id, result) {
    const favs = getFavorites().map(f =>
      f.id === id ? { ...f, lastResult: result, lastChecked: new Date().toISOString() } : f
    );
    localStorage.setItem(KEY_FAVORITES, JSON.stringify(favs));
  }

  // ── 최신 회차로 즐겨찾기 당첨 여부 체크 ──
  function checkAllFavorites(latestDraw) {
    const favs = getFavorites();
    const results = [];
    favs.forEach(fav => {
      const rank = Analysis.checkWinRank(fav.numbers, latestDraw);
      updateFavoriteResult(fav.id, { round: latestDraw.round, rank });
      if (rank > 0) results.push({ fav, rank });
    });
    return results; // 당첨된 항목들 반환
  }

  // ── 날짜 포맷 ──
  function formatSavedAt(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  return {
    getSettings,
    saveSettings,
    getFavorites,
    saveFavorite,
    deleteFavorite,
    updateFavoriteMemo,
    updateFavoriteResult,
    checkAllFavorites,
    formatSavedAt
  };
})();
