import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import BatchDashBoardModal from './BatchDashBoardModal';
import Dashboard from '../../pages/Dashboard';
import UsersManagement from '../../pages/UsersManagement';
import ReservationsManagement from '../../pages/ReservationsManagement';
import MembersManagement from '../../pages/MembersManagement';
import TripsManagement from '../../pages/TripsManagement';
import MyCustomersManagement from '../../pages/MyCustomersManagement';
import MyPerformanceManagement from '../../pages/MyPerformanceManagement';
import SalesPerformanceManagement from '../../pages/SalesPerformanceManagement';

const AdminLayout = ({ onLogout }) => {
  // 로그인된 정보에 기초해 초기 메뉴 설정
  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
  const role = adminUser.role || 'SALES';

  // 영업사원(SALES)이면 '나의 고객관리'로, 그 외엔 '대시보드'를 기본 진입점으로 설정
  const [currentMenu, setCurrentMenu] = useState(
    role === 'SALES' ? 'my-customers' : 'dashboard'
  );

  // BATCH JOB 모니터링 모달 열림/닫힘 상태
  const [showBatchModal, setShowBatchModal] = useState(false);

  const renderContent = () => {
    switch (currentMenu) {
      case 'dashboard':
        return <Dashboard />;
      case 'users':
        return <UsersManagement />;
      case 'reservations':
        return <ReservationsManagement />;
      case 'members':
        return <MembersManagement />;
      case 'trips':
        return <TripsManagement />;
      case 'my-customers':
        return <MyCustomersManagement />;
      case 'my-performance':
        return <MyPerformanceManagement />;
      case 'sales-performance':
        return <SalesPerformanceManagement />;
      case 'settings':
        return (
          <div className="p-8 max-w-7xl mx-auto">
            <h1 className="text-2xl font-black text-slate-800">시스템 설정</h1>
            <p className="mt-2 text-slate-500">관리자 계정 및 운영 정책을 설정하는 화면이 위치할 곳입니다.</p>
          </div>
        );
      default:
        return role === 'SALES' ? <MyCustomersManagement /> : <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      <Sidebar 
        currentMenu={currentMenu} 
        setCurrentMenu={setCurrentMenu} 
        onBatchClick={() => setShowBatchModal(true)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onLogout={onLogout} />
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
      <BatchDashBoardModal 
        isOpen={showBatchModal} 
        onClose={() => setShowBatchModal(false)} 
      />
    </div>
  );
};

export default AdminLayout;
