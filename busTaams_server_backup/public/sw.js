// 기본 서비스 워커 (자동 업데이트 지원)
const CACHE_NAME = 'bustaams-app-v2';

self.addEventListener('install', (event) => {
  console.log('App Service Worker: Installing New Version');
  self.skipWaiting(); // 새로운 서비스 워커를 즉시 활성화
});

self.addEventListener('activate', (event) => {
  console.log('App Service Worker: Activated');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('App Service Worker: Clearing Old Cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
