// Firebase 서비스 워커 설정
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase 초기화 (firebase-config.js와 동일한 설정값 사용)
firebase.initializeApp({
  apiKey: "AIzaSyAU5QJ2pnJb37BJ3iUXoppMoi3kRgP55QI",
  authDomain: "project-d481af23-2c56-483d-956.firebaseapp.com",
  projectId: "project-d481af23-2c56-483d-956",
  storageBucket: "project-d481af23-2c56-483d-956.firebasestorage.app",
  messagingSenderId: "98374123431",
  appId: "1:98374123431:web:7db538cf23173492e74082"
});

const messaging = firebase.messaging();

// 백그라운드 메시지 수신 처리
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] 백그라운드 메시지 수신:', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-512.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
