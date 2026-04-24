import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

export const firebaseApp = initializeApp(firebaseConfig);
export const phoneAuth = getAuth(firebaseApp);

// 항상 true로 두면 실제 번호로 보낼 때 서버 reCAPTCHA 검증과 불일치해 auth/captcha-check-failed(MALFORMED)가 날 수 있음.
// Firebase 콘솔에 등록한 테스트 전화번호만 쓸 때만 .env에 VITE_FIREBASE_PHONE_TEST_MODE=true
if (import.meta.env.VITE_FIREBASE_PHONE_TEST_MODE === 'true') {
  phoneAuth.settings.appVerificationDisabledForTesting = true;
}

export { RecaptchaVerifier, signInWithPhoneNumber, signOut };
