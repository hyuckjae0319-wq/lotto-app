// js/data.js - 데이터 로드, API 연동, IndexedDB 관리

const DataManager = (() => {
  const DB_NAME = 'lottoDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'draws';
  const LOCAL_JSON = './data/lotto_history.json';

  let db = null;
  let cachedDraws = null; // 메모리 캐시

  // ── IndexedDB 초기화 ──
  function initDB() {
    return new Promise((resolve, reject) => {
      if (db) return resolve(db);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains(STORE_NAME)) {
          const store = d.createObjectStore(STORE_NAME, { keyPath: 'round' });
          store.createIndex('date', 'date', { unique: false });
        }
      };
      req.onsuccess = (e) => { db = e.target.result; resolve(db); };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // ── IndexedDB에 회차 저장 ──
  async function saveDrawsToDB(draws) {
    const d = await initDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      draws.forEach(draw => store.put(draw));
      tx.oncomplete = resolve;
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  // ── IndexedDB에서 전체 회차 가져오기 ──
  async function getDrawsFromDB() {
    const d = await initDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = (e) => resolve(e.target.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // ── IndexedDB에서 최대 회차 번호 ──
  async function getMaxRoundFromDB() {
    const draws = await getDrawsFromDB();
    if (!draws.length) return 0;
    return Math.max(...draws.map(d => d.round));
  }

  // ── 현재 최신 회차 계산 (1회차: 2002-12-07) ──
  function calcCurrentRound() {
    const start = new Date('2002-12-07T00:00:00+09:00');
    const now = new Date();
    const diffMs = now - start;
    const weeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
    return Math.max(1, weeks + 1);
  }

  // ── 동행복권 API에서 단일 회차 가져오기 (CORS 및 장애 대비 백업 포함) ──
  async function fetchRoundFromAPI(drwNo) {
    try {
      const url = `https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${drwNo}`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.returnValue === 'success') {
          return {
            round: json.drwNo,
            date: json.drwNoDate,
            numbers: [json.drwtNo1, json.drwtNo2, json.drwtNo3, json.drwtNo4, json.drwtNo5, json.drwtNo6].sort((a, b) => a - b),
            bonus: json.bnusNo
          };
        }
      }
    } catch (e) {
      console.warn(`동행복권 API 직접 호출 실패 (CORS 또는 네트워크), 백업 엔드포인트 사용:`, e);
    }

    // CORS가 허용되고 IP 차단이 없는 GitHub Pages 백업 사용
    const backupUrl = `https://smok95.github.io/lotto/results/${drwNo}.json`;
    const res = await fetch(backupUrl);
    if (!res.ok) throw new Error(`Backup HTTP ${res.status}`);
    const json = await res.json();
    return {
      round: json.draw_no,
      date: json.date.substring(0, 10), // YYYY-MM-DD
      numbers: json.numbers.sort((a, b) => a - b),
      bonus: json.bonus_no
    };
  }

  // ── JSON 파일에서 데이터 로드 ──
  async function loadFromJSON() {
    try {
      const res = await fetch(LOCAL_JSON + '?t=' + Date.now());
      if (!res.ok) return [];
      const json = await res.json();
      return json.draws || [];
    } catch {
      return [];
    }
  }

  // ── 메인 초기화: JSON → IndexedDB 동기화 → Lazy Fetch ──
  async function initialize(onProgress) {
    if (cachedDraws && cachedDraws.length > 0) return cachedDraws;

    try {
      await initDB();

      // 1. JSON 파일 로드
      onProgress?.('JSON 데이터 로드 중...');
      const jsonDraws = await loadFromJSON();
      if (jsonDraws.length > 0) {
        await saveDrawsToDB(jsonDraws);
      }

      // 2. IndexedDB에서 전체 데이터 읽기
      let draws = await getDrawsFromDB();

      // 3. Lazy Fetch: 누락 회차가 있으면 API에서 보충
      const currentRound = calcCurrentRound();
      const maxLocal = draws.length > 0 ? Math.max(...draws.map(d => d.round)) : 0;
      const startRound = Math.max(1, currentRound - 1000 + 1);

      if (maxLocal < currentRound) {
        onProgress?.(`최신 데이터 확인 중... (${maxLocal}회 → ${currentRound}회)`);
        const missing = [];
        for (let r = Math.max(startRound, maxLocal + 1); r <= currentRound; r++) {
          missing.push(r);
        }

        const newDraws = [];
        for (const round of missing) {
          try {
            const data = await fetchRoundFromAPI(round);
            if (data) newDraws.push(data);
            else break; // 미발표 회차면 중단
          } catch {
            break; // 실패하면 중단
          }
          // 너무 많으면 끊기
          if (newDraws.length >= 10) break;
        }

        if (newDraws.length > 0) {
          await saveDrawsToDB(newDraws);
          draws = await getDrawsFromDB();
        }
      }

      // 4. 최근 1000회 필터링 및 정렬
      draws = draws
        .filter(d => d.round >= startRound)
        .sort((a, b) => a.round - b.round);

      cachedDraws = draws;
      return draws;

    } catch (err) {
      console.error('데이터 초기화 실패:', err);
      // 폴백: JSON에서 직접 반환
      const jsonDraws = await loadFromJSON();
      cachedDraws = jsonDraws;
      return jsonDraws;
    }
  }

  // ── 캐시 무효화 ──
  function invalidateCache() {
    cachedDraws = null;
  }

  // ── 최신 회차 데이터 ──
  function getLatestDraw(draws) {
    if (!draws || !draws.length) return null;
    return draws[draws.length - 1];
  }

  // ── 특정 회차 번호로 검색 ──
  function findByRound(draws, round) {
    return draws.find(d => d.round === round) || null;
  }

  // ── 날짜 포맷 (YYYY-MM-DD → YY.MM.DD) ──
  function formatDate(dateStr) {
    if (!dateStr) return '';
    return dateStr.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1.$2.$3');
  }

  // ── 저장소 정보 ──
  async function getStorageInfo() {
    const draws = await getDrawsFromDB();
    const maxRound = draws.length ? Math.max(...draws.map(d => d.round)) : 0;
    const minRound = draws.length ? Math.min(...draws.map(d => d.round)) : 0;
    return { count: draws.length, maxRound, minRound };
  }

  return {
    initialize,
    invalidateCache,
    getLatestDraw,
    findByRound,
    formatDate,
    calcCurrentRound,
    getStorageInfo,
    fetchRoundFromAPI,
    getDrawsFromDB,
    saveDrawsToDB
  };
})();
