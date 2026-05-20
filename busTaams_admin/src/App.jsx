import React, { useState } from 'react'
import Login from './Login'
import AdminSignup from './AdminSignup'
import AdminLayout from './components/layout/AdminLayout'

function App() {
  // 'login', 'signup', 'dashboard' 세 가지 상태 관리
  const [currentView, setCurrentView] = useState('login');

  if (currentView === 'signup') {
    return <AdminSignup onBack={() => setCurrentView('login')} />;
  }

  if (currentView === 'login') {
    return (
      <Login 
        onLoginSuccess={() => setCurrentView('dashboard')} 
        onGoSignup={() => setCurrentView('signup')}
      />
    );
  }

  // 관리자 대시보드 메인 레이아웃 렌더링
  return <AdminLayout onLogout={() => setCurrentView('login')} />;
}

export default App
