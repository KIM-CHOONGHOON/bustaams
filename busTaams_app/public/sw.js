// 기본 서비스 워커 (앱 설치 가능하게 만들기 위함)
const CACHE_NAME = 'bustaams-app-v1';

self.addEventListener('install', (event) => {
  console.log('App Service Worker: Installed');
});

self.addEventListener('activate', (event) => {
  console.log('App Service Worker: Activated');
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
