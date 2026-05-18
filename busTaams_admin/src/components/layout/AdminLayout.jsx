import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Dashboard from '../../pages/Dashboard';

const AdminLayout = ({ onLogout }) => {
  const [currentMenu, setCurrentMenu] = useState('dashboard');

  const renderContent = () => {
    switch (currentMenu) {
      case 'dashboard':
        return <Dashboard />;
      case 'users':
        return (
          <div className="p-8 max-w-7xl mx-auto">
            <h1 className="text-2xl font-black text-slate-800">회원 관리</h1>
            <p className="mt-2 text-slate-500">일반 고객 및 기사님 목록을 관리하는 화면이 위치할 곳입니다.</p>
          </div>
        );
      case 'reservations':
        return (
          <div className="p-8 max-w-7xl mx-auto">
            <h1 className="text-2xl font-black text-slate-800">예약 및 입찰 관리</h1>
            <p className="mt-2 text-slate-500">전체 견적 요청과 입찰 현황을 모니터링하는 화면이 위치할 곳입니다.</p>
          </div>
        );
      case 'settings':
        return (
          <div className="p-8 max-w-7xl mx-auto">
            <h1 className="text-2xl font-black text-slate-800">시스템 설정</h1>
            <p className="mt-2 text-slate-500">관리자 계정 및 운영 정책을 설정하는 화면이 위치할 곳입니다.</p>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      <Sidebar currentMenu={currentMenu} setCurrentMenu={setCurrentMenu} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onLogout={onLogout} />
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};
export default AdminLayout;
