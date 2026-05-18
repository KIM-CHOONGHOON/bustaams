
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../firebase-config';
import { upsertDeviceToken, upsertDriverDeviceToken } from '../api';

// VAPID Key (Firebase Console > Project Settings > Cloud Messaging > Web Push certificates에서 확인 가능)
// TODO: 실제 VAPID Key로 교체해야 합니다.
const VAPID_KEY = 'YOUR_VAPID_PUBLIC_KEY_HERE';

export const requestFirebaseToken = async () => {
  // 알림 API가 지원되지 않는 브라우저 또는 환경에서의 예외 방어
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
        console.log('FCM Token:', token);
        
        // 로그인된 상태인 경우에만 서버에 토큰 저장
        const accessToken = localStorage.getItem('accessToken');
        const userData = localStorage.getItem('user');
        
        if (accessToken && userData) {
          try {
            const user = JSON.parse(userData);
            const isDriver = user.userType === 'DRIVER';
            
            if (isDriver) {
              await upsertDriverDeviceToken(token, 'mobile');
              console.log('기사용 FCM 토큰이 서버에 성공적으로 저장되었습니다.');
            } else {
              await upsertDeviceToken(token, 'mobile');
              console.log('고객용 FCM 토큰이 서버에 성공적으로 저장되었습니다.');
            }
          } catch (err) {
            console.error('FCM 토큰 서버 저장 실패:', err);
          }
        }
        
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
