/**
 * 웹 FCM 토큰 등록 (선택). VITE_FIREBASE_VAPID_KEY 가 없으면 조용히 생략.
 * `public/firebase-messaging-sw.js` 가 있으면 백그라운드 푸시 수신 가능.
 */
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { firebaseApp } from './firebasePhoneVerify';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');

const SW_URL = '/firebase-messaging-sw.js';

export async function registerWebFcmTokenIfPossible(userUuid) {
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!userUuid || !vapidKey || typeof window === 'undefined') return null;
  try {
    const ok = await isSupported();
    if (!ok) return null;
    const messaging = getMessaging(firebaseApp);

    let serviceWorkerRegistration;
    if ('serviceWorker' in navigator) {
      try {
        serviceWorkerRegistration = await navigator.serviceWorker.register(SW_URL, {
          scope: '/',
        });
        await navigator.serviceWorker.ready;
      } catch (swErr) {
        console.warn('FCM service worker register:', swErr.message);
      }
    }

    const token = await getToken(messaging, {
      vapidKey,
      ...(serviceWorkerRegistration ? { serviceWorkerRegistration } : {}),
    });
    if (!token) return null;
    const res = await fetch(`${API_BASE}/api/user/device-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userUuid, token, clientKind: 'web' }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      console.warn('FCM token register:', j.error || res.status);
      return null;
    }
    return token;
  } catch (e) {
    console.warn('registerWebFcmTokenIfPossible:', e.message);
    return null;
  }
}
