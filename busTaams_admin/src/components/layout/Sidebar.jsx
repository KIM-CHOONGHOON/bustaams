import React from 'react';
import { LayoutDashboard, Users, Bus, Settings, Compass, HeartHandshake, TrendingUp, BarChart3, Newspaper } from 'lucide-react';

const Sidebar = ({ currentMenu, setCurrentMenu, onBatchClick }) => {
  // 로컬스토리지에서 로그인된 관리자 정보 획득
  const adminUserStr = localStorage.getItem('adminUser');
  const adminUser = adminUserStr ? JSON.parse(adminUserStr) : null;
  const role = adminUser ? adminUser.role : 'SALES'; // fallback to SALES

  // 모든 메뉴 리스트 정의
  const allMenuItems = [
    { id: 'dashboard', label: '대시보드', icon: <LayoutDashboard size={20} /> },
    { id: 'users', label: '사용자 관리하기', icon: <Users size={20} /> },
    { id: 'members', label: '회원 관리', icon: <Users size={20} /> },
    { id: 'reservations', label: '예약/입찰 관리', icon: <Bus size={20} /> },
    { id: 'trips', label: '여행 목록', icon: <Compass size={20} /> },
    { id: 'my-customers', label: '나의 고객관리', icon: <HeartHandshake size={20} /> },
    { id: 'my-performance', label: '나의 실적관리', icon: <TrendingUp size={20} /> },
    { id: 'sales-performance', label: '영업사원 실적', icon: <BarChart3 size={20} /> },
    { id: 'BatchDashBoard', label: 'BATCH JOB 모니터링', icon: <Newspaper size={20} />, isModal: true },
    { id: 'settings', label: '시스템 설정', icon: <Settings size={20} /> },
  ];

  // 권한별 메뉴 필터링 로직
  // 1. SUPER: 모든 메뉴
  // 2. MANAGER: 시스템 설정 빼고 전부 노출
  // 3. SALES: '나의 고객관리', '나의 실적관리' 두 개만 노출
  const getFilteredMenuItems = () => {
    if (role === 'SUPER') {
      return allMenuItems;
    }
    if (role === 'MANAGER') {
      return allMenuItems.filter(item => item.id !== 'settings');
    }
    if (role === 'SALES') {
      return allMenuItems.filter(item => item.id === 'my-customers' || item.id === 'my-performance');
    }
    return []; // 권한 없거나 정의 안 됨
  };

  const menuItems = getFilteredMenuItems();

  const getRoleLabel = (r) => {
    switch (r) {
      case 'SUPER': return '최고 관리자';
      case 'MANAGER': return '일반 관리자';
      case 'SALES': return '영업 담당자';
      default: return r || '관리자';
    }
  };

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col min-h-screen shrink-0">
      <div className="flex flex-col items-start px-6 py-4 border-b border-slate-800 gap-2">
        <img 
          src="/admin/assets/BUSTAAM_FULL_LOGO.png" 
          alt="버스탐스 로고" 
          className="w-36 h-28 object-contain rounded-lg"
        />
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.isModal) {
                onBatchClick();
              } else {
                setCurrentMenu(item.id);
              }
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              currentMenu === item.id 
                ? 'bg-emerald-500/10 text-emerald-400 font-bold' 
                : 'hover:bg-slate-800 hover:text-white font-medium'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-800 rounded-xl mb-4">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-emerald-400">
            <Users size={16} />
          </div>
          <div className="text-left flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{adminUser?.adminNm || '관리자'}</p>
            <p className="text-xs text-slate-400 truncate">
              {adminUser?.deptNm ? `${adminUser.deptNm} (${getRoleLabel(role)})` : getRoleLabel(role)}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
