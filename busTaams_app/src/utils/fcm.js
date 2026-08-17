
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../firebase-config';
import { upsertDeviceToken, upsertDriverDeviceToken } from '../api';

// VAPID Key (Firebase Console > Project Settings > Cloud Messaging > Web Push certificates에서 확인 가능)
const VAPID_KEY = 'BJMZ5eRl1n_L9vN8JPg1bFKeyDjlifCHuFGj07ogYFYJuH-7Jtn8WtVaaxB-WwaaZex4fLE8sOpE5ThCqpxVcLQ';

// 서버에 FCM 토큰 저장하는 공통 함수
export const sendTokenToServer = async (token) => {
  if (!token) return;
  const accessToken = localStorage.getItem('accessToken');
  const userData = localStorage.getItem('user');

  if (accessToken && userData) {
    try {
      const user = JSON.parse(userData);
      const isDriver = (user.userType === 'DRIVER' || user.user_type === 'DRIVER');

      if (isDriver) {
        await upsertDriverDeviceToken(token, 'mobile');
        console.log('✅ [FCM] 기사용 기기 토큰이 TB_USER_DEVICE_TOKEN 테이블에 저장되었습니다.');
      } else {
        await upsertDeviceToken(token, 'mobile');
        console.log('✅ [FCM] 고객용 기기 토큰이 TB_USER_DEVICE_TOKEN 테이블에 저장되었습니다.');
      }
    } catch (err) {
      console.error('❌ [FCM] 기기 토큰 DB 저장 중 오류:', err);
    }
  }
};

export const requestFirebaseToken = async () => {
  // 1. 앱 환경(네이티브 브릿지)에서 넘어온 FCM 토큰이 있는지 확인
  if (typeof window !== 'undefined' && window.appFcmToken) {
    console.log('[FCM] Native App Token Found:', window.appFcmToken);
    await sendTokenToServer(window.appFcmToken);
    return window.appFcmToken;
  }

  // 2. 웹 브라우저/웹뷰 알림 API 방어
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log('이 브라우저/환경에서는 알림 서비스를 지원하지 않습니다.');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
      });
      if (token) {
        console.log('[FCM Token Received]:', token);
        await sendTokenToServer(token);
        return token;
      } else {
        console.log('FCM 토큰을 생성할 수 없습니다. 권한 및 Firebase 설정을 확인하세요.');
      }
    } else {
      console.log('알림 권한이 거부되었습니다.');
    }
  } catch (error) {
    console.error('FCM 토큰 가져오기 오류:', error);
  }
};

// 3. 네이티브 앱(Android/iOS WebView)에서 토큰 전송 시 수신할 글로벌 리스너
if (typeof window !== 'undefined') {
  window.receiveAppFcmToken = function(token) {
    console.log('[FCM] Received token from Native App:', token);
    window.appFcmToken = token;
    sendTokenToServer(token);
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
