import React, { useState } from 'react'
import AdminSignup from './AdminSignup'
import AdminLayout from './components/layout/AdminLayout'
// bustaamsAdminScreen — 공개 랜딩 홈페이지 (로그인 모달 포함)
import BustaamsAdminScreen from './pages/BustaamsAdminScreen'

function App() {
  // 'home' → 홈페이지(bustaamsAdminScreen), 'signup' → 관리자 가입, 'dashboard' → 어드민
  const [currentView, setCurrentView] = useState('home');

  if (currentView === 'signup') {
    return <AdminSignup onBack={() => setCurrentView('home')} />;
  }

  if (currentView === 'home') {
    return (
      <BustaamsAdminScreen
        onLoginSuccess={() => setCurrentView('dashboard')}
      />
    );
  }

  // 관리자 대시보드 메인 레이아웃 렌더링
  return <AdminLayout onLogout={() => setCurrentView('home')} />;
}

export default App
