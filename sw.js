// sw.js - Service Worker (PWA 오프라인 지원)

const CACHE_NAME = 'lotto-recommender-v1';
const SHELL_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/sound.js',
  './js/storage.js',
  './js/data.js',
  './js/analysis.js',
  './js/generator.js',
  './js/simulator.js',
  './js/charts.js',
  './js/app.js',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js'
];

// 설치: 앱 셸 캐싱
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(SHELL_ASSETS.filter(url => !url.startsWith('http')));
    })
  );
  self.skipWaiting();
});

// 활성화: 이전 캐시 삭제
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 패치: 캐시 우선, 실패 시 네트워크
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 데이터 JSON은 네트워크 우선
  if (url.pathname.includes('lotto_history.json')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 동행복권 API: 캐시하지 않음 (항상 네트워크)
  if (url.hostname === 'www.dhlottery.co.kr') {
    event.respondWith(fetch(event.request));
    return;
  }

  // 나머지: 캐시 우선
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      });
    })
  );
});
