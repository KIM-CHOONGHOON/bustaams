import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Firebase 프로젝트 설정
const firebaseConfig = {
  apiKey: "AIzaSyAU5QJ2pnJb37BJ3iUXoppMoi3kRgP55QI",
  authDomain: "project-d481af23-2c56-483d-956.firebaseapp.com",
  projectId: "project-d481af23-2c56-483d-956",
  storageBucket: "project-d481af23-2c56-483d-956.firebasestorage.app",
  messagingSenderId: "98374123431",
  appId: "1:98374123431:web:7db538cf23173492e74082",
  measurementId: "G-XR2RWVL6B4"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Auth 인스턴스 생성 및 내보내기
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
auth.languageCode = 'ko'; // 한국어 설정

export default app;
