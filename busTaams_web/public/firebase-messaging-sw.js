/* eslint-disable no-undef */
/**
 * Firebase Cloud Messaging — 백그라운드 수신용 Service Worker
 * - 사이트 루트 `/firebase-messaging-sw.js` 로 제공됨 (Vite `public/` → 빌드 루트)
 * - 아래 firebaseConfig 는 `.env` 의 `VITE_FIREBASE_*` 와 동일하게 유지할 것
 */
importScripts('https://www.gstatic.com/firebasejs/12.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.11.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: 'AIzaSyAU5QJ2pnJb37BJ3iUXoppMoi3kRgP55QI',
  authDomain: 'project-d481af23-2c56-483d-956.firebaseapp.com',
  projectId: 'project-d481af23-2c56-483d-956',
  storageBucket: 'project-d481af23-2c56-483d-956.firebasestorage.app',
  messagingSenderId: '98374123431',
  appId: '1:98374123431:web:7db538cf23173492e74082',
  measurementId: 'G-XR2RWVL6B4',
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] background message', payload);

  const title =
    (payload.notification && payload.notification.title) ||
    (payload.data && payload.data.title) ||
    'Bustaams';

  const body =
    (payload.notification && payload.notification.body) ||
    (payload.data && payload.data.body) ||
    '';

  const options = {
    body: String(body).slice(0, 300),
    icon: '/images/buses/mini_bus.png',
    badge: '/images/buses/mini_bus.png',
    data: payload.data || {},
    tag: payload.data && payload.data.reqId ? `chat-${payload.data.reqId}` : 'bustaams-fcm',
    renotify: true,
  };

  return self.registration.showNotification(title, options);
});
