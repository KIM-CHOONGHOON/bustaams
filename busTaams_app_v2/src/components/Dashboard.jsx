import React from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div style={{ 
      padding: '40px', 
      textAlign: 'center', 
      background: 'var(--bg-main)', 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      color: 'white'
    }}>
      <h1 style={{ marginBottom: '20px', background: 'linear-gradient(135deg, #fff, var(--primary-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        환영합니다, {user?.USER_NM}님!
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
        회원 유형: {user?.USER_TYPE} | 고객번호: {user?.CUST_ID}
      </p>
      
      <div style={{ 
        padding: '30px', 
        borderRadius: '20px', 
        background: 'var(--bg-card)', 
        backdropFilter: 'var(--blur)',
        border: '1px solid var(--glass-border)',
        maxWidth: '500px'
      }}>
        <p>이곳은 {user?.USER_TYPE} 전용 대시보드입니다.</p>
        <p style={{ fontSize: '0.9rem', marginTop: '10px', color: 'var(--text-muted)' }}>
          현재 화면은 로그인 성공 후의 데모 화면입니다. 추후 상세 기능을 추가할 예정입니다.
        </p>
      </div>

      <button 
        onClick={handleLogout}
        style={{
          marginTop: '40px',
          padding: '12px 24px',
          background: 'rgba(255, 255, 255, 0.1)',
          color: 'white',
          borderRadius: '12px',
          border: '1px solid var(--glass-border)',
          fontWeight: '600'
        }}
      >
        로그아웃
      </button>
    </div>
  );
};

export default Dashboard;
