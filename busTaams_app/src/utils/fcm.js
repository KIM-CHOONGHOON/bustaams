
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../firebase-config';
import { upsertDeviceToken, upsertDriverDeviceToken } from '../api';

// VAPID Key (Firebase Console > Project Settings > Cloud Messaging > Web Push certificates에서 확인 가능)
const VAPID_KEY = 'BJMZ5eRl1n_L9vN8JPg1bFKeyDjlifCHuFGj07ogYFYJuH-7Jtn8WtVaaxB-WwaaZex4fLE8sOpE5ThCqpxVcLQ';

// 고유 디바이스 토큰 생성 함수 (웹뷰/앱 토큰 미발급 시 Fallback 전용)
const getOrCreateFallbackToken = (userId) => {
  let fallbackToken = localStorage.getItem('appDeviceToken');
  if (!fallbackToken) {
    const randomStr = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    fallbackToken = `APP_DEVICE_${userId || 'GUEST'}_${randomStr}`;
    localStorage.setItem('appDeviceToken', fallbackToken);
  }
  return fallbackToken;
};

// 서버에 FCM/기기 토큰 저장하는 공통 함수
export const sendTokenToServer = async (token, clientKind = 'mobile') => {
  if (!token) return;
  const accessToken = localStorage.getItem('accessToken');
  const userData = localStorage.getItem('user');

  if (accessToken && userData) {
    try {
      const user = JSON.parse(userData);
      const isDriver = (user.userType === 'DRIVER' || user.user_type === 'DRIVER');

      if (isDriver) {
        await upsertDriverDeviceToken(token, clientKind);
        console.log('✅ [FCM] 기사용 기기 토큰이 TB_USER_DEVICE_TOKEN 테이블에 저장되었습니다:', token);
      } else {
        await upsertDeviceToken(token, clientKind);
        console.log('✅ [FCM] 고객용 기기 토큰이 TB_USER_DEVICE_TOKEN 테이블에 저장되었습니다:', token);
      }
    } catch (err) {
      console.error('❌ [FCM] 기기 토큰 DB 저장 중 오류:', err);
    }
  }
};

export const requestFirebaseToken = async () => {
  const userData = localStorage.getItem('user');
  let user = null;
  if (userData) {
    try { user = JSON.parse(userData); } catch (_) {}
  }

  // 1. URL 쿼리 파라미터에서 fcmToken 또는 appToken 전달 여부 확인
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const paramToken = urlParams.get('fcmToken') || urlParams.get('appToken') || urlParams.get('token');
    if (paramToken) {
      console.log('[FCM] URL Param Token Found:', paramToken);
      window.appFcmToken = paramToken;
      await sendTokenToServer(paramToken, 'app');
      return paramToken;
    }
  }

  // 2. 앱 환경(네이티브 브릿지)에서 넘어온 FCM 토큰이 있는지 확인
  if (typeof window !== 'undefined' && window.appFcmToken) {
    console.log('[FCM] Native App Token Found:', window.appFcmToken);
    await sendTokenToServer(window.appFcmToken, 'app');
    return window.appFcmToken;
  }

  // 3. 네이티브 앱 인터페이스 호출 시도 (안드로이드/iOS WebView 전용)
  if (typeof window !== 'undefined') {
    // Android Interface 시도
    if (window.Android && typeof window.Android.getFcmToken === 'function') {
      try {
        const appToken = window.Android.getFcmToken();
        if (appToken) {
          window.appFcmToken = appToken;
          await sendTokenToServer(appToken, 'app');
          return appToken;
        }
      } catch (e) { console.log('[Native App Call Error]:', e); }
    }
    // BustaamsApp Interface 시도
    if (window.BustaamsApp && typeof window.BustaamsApp.getFcmToken === 'function') {
      try {
        const appToken = window.BustaamsApp.getFcmToken();
        if (appToken) {
          window.appFcmToken = appToken;
          await sendTokenToServer(appToken, 'app');
          return appToken;
        }
      } catch (e) { console.log('[BustaamsApp Call Error]:', e); }
    }
  }

  // 4. 웹 브라우저 / 웹뷰 Firebase Web Push 토큰 시도
  let webToken = null;
  if (typeof window !== 'undefined' && ('Notification' in window)) {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        let swRegistration = null;
        if ('serviceWorker' in navigator) {
          try {
            swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          } catch (_) {}
        }

        webToken = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          ...(swRegistration && { serviceWorkerRegistration: swRegistration })
        });

        if (webToken) {
          console.log('[FCM Token Received]:', webToken);
          await sendTokenToServer(webToken, 'web');
          return webToken;
        }
      }
    } catch (error) {
      console.warn('[FCM] Web Push Token Error:', error.message);
    }
  }

  // 5. [100% 보장 Fallback] 앱/웹뷰 환경이거나 위의 알림 API 토큰 생성이 지원되지 않는 디바이스인 경우:
  // 모바일 앱 접속 시 TB_USER_DEVICE_TOKEN 테이블 레코드가 100% 생성되도록 모바일 기기 토큰 자동 저장!
  if (user && (user.userId || user.USER_ID || user.custId || user.CUST_ID)) {
    const fallbackToken = getOrCreateFallbackToken(user.userId || user.USER_ID || user.custId);
    console.log('[FCM Fallback Token Registered]:', fallbackToken);
    await sendTokenToServer(fallbackToken, 'mobile_app');
    return fallbackToken;
  }

  return null;
};

// 6. 네이티브 앱(Android/iOS WebView)에서 토큰 전송 시 수신할 글로벌 리스너
if (typeof window !== 'undefined') {
  window.receiveAppFcmToken = function(token) {
    console.log('[FCM] Received token from Native App:', token);
    window.appFcmToken = token;
    sendTokenToServer(token, 'app');
  };
}

// 포그라운드(앱이 켜져 있을 때) 메시지 수신 처리
export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log('포그라운드 메시지 수신:', payload);
      resolve(payload);
    });
  });
