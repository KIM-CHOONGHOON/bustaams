// 기본 서비스 워커 (설치 가능하게 만들기 위함)
const CACHE_NAME = 'bustaams-v1';

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed');
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
});

self.addEventListener('fetch', (event) => {
  // 캐시 전략 등을 추가할 수 있지만, 일단은 통과시킵니다.
  event.respondWith(fetch(event.request));
});
