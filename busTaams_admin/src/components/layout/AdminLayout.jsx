import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import BatchDashBoardModal from './BatchDashBoardModal';
import Footer from './Footer';
import Dashboard from '../../pages/Dashboard';
import UsersManagement from '../../pages/UsersManagement';
import ReservationsManagement from '../../pages/ReservationsManagement';
import MembersManagement from '../../pages/MembersManagement';
import DriversManagement from '../../pages/DriversManagement';
import TripsManagement from '../../pages/TripsManagement';
import SettlementManagement from '../../pages/SettlementManagement';
import MyCustomersManagement from '../../pages/MyCustomersManagement';
import MyPerformanceManagement from '../../pages/MyPerformanceManagement';
import SalesPerformanceManagement from '../../pages/SalesPerformanceManagement';
import SystemSettings from '../../pages/SystemSettings';
import MyInfo from '../../pages/MyInfo';

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
      case 'drivers':
        return <DriversManagement />;
      case 'trips':
        return <TripsManagement />;
      case 'settlement':
        return <SettlementManagement />;
      case 'my-customers':
        return <MyCustomersManagement />;
      case 'my-performance':
        return <MyPerformanceManagement />;
      case 'sales-performance':
        return <SalesPerformanceManagement />;
      case 'settings':
        return <SystemSettings />;
      case 'my-info':
        return <MyInfo />;
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
        <main className="flex-1 overflow-y-auto flex flex-col justify-between">
          <div className="flex-1">
            {renderContent()}
          </div>
          <Footer />
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
