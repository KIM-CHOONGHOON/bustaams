import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../firebase-config';

// VAPID Key (Firebase Console > Project Settings > Cloud Messaging > Web Push certificates에서 확인 가능)
// TODO: 실제 VAPID Key로 교체해야 합니다.
const VAPID_KEY = 'YOUR_VAPID_PUBLIC_KEY_HERE';

export const requestFirebaseToken = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
      });
      if (token) {
        console.log('FCM Token:', token);
        // 이 토큰을 백엔드 서버에 저장하는 로직이 필요합니다.
        return token;
      } else {
        console.log('토큰을 생성할 수 없습니다. 권한을 확인하세요.');
      }
    } else {
      console.log('알림 권한이 거부되었습니다.');
    }
  } catch (error) {
    console.error('FCM 토큰 가져오기 오류:', error);
  }
};

// 포그라운드(앱이 켜져 있을 때) 메시지 수신 처리
export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log('포그라운드 메시지 수신:', payload);
      resolve(payload);
    });
  });
