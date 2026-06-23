import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Bus, Settings, Compass, HeartHandshake, TrendingUp, BarChart3, UserCheck, Receipt, Newspaper, User, ChevronDown, ChevronUp } from 'lucide-react';

const Sidebar = ({ currentMenu, setCurrentMenu, onBatchClick }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(currentMenu.startsWith('settings'));

  useEffect(() => {
    if (currentMenu.startsWith('settings')) {
      setIsSettingsOpen(true);
    }
  }, [currentMenu]);

  // 로컬스토리지에서 로그인된 관리자 정보 획득
  const adminUserStr = localStorage.getItem('adminUser');
  const adminUser = adminUserStr ? JSON.parse(adminUserStr) : null;
  const role = adminUser ? adminUser.role : 'SALES'; // fallback to SALES



  // 모든 메뉴 리스트 정의
  const allMenuItems = [
    { id: 'dashboard', label: '대시보드', icon: <LayoutDashboard size={20} /> },
    { id: 'users', label: '사용자 관리하기', icon: <Users size={20} /> },
    { id: 'members', label: '여행자 관리', icon: <Users size={20} /> },
    { id: 'drivers', label: '버스기사 관리', icon: <UserCheck size={20} /> },
    { id: 'reservations', label: '예약/입찰 관리', icon: <Bus size={20} /> },
    { id: 'trips',           label: '여정/입찰현황',  icon: <Compass size={20} /> },
    { id: 'settlement',      label: '여정/입찰 정산',  icon: <Receipt size={20} /> },
    { id: 'tax-invoices',    label: '세금계산서 관리', icon: <Receipt size={20} /> },
    { id: 'my-customers', label: '나의 고객관리', icon: <HeartHandshake size={20} /> },
    { id: 'my-performance', label: '나의 실적관리', icon: <TrendingUp size={20} /> },
    { id: 'sales-performance', label: '영업사원 실적', icon: <BarChart3 size={20} /> },
    { id: 'my-info', label: '내 정보 관리', icon: <User size={20} /> },
    { id: 'BatchDashBoard', label: 'BATCH JOB 모니터링', icon: <Newspaper size={20} />, isModal: true },
    { id: 'settings', label: '시스템 설정', icon: <Settings size={20} />, hasSubmenu: true },
  ];

  // 권한별 메뉴 필터링 로직
  // 1. SUPER: 모든 메뉴
  // 2. MANAGER: 시스템 설정 빼고 전부 노출
  // 3. SALES: '나의 고객관리', '나의 실적관리', '내 정보 관리' 노출
  const getFilteredMenuItems = () => {
    if (role === 'SUPER') {
      // 관리자는 '나의 고객관리', '나의 실적관리', '내 정보 관리'를 제외하고 전체 노출
      return allMenuItems.filter(
        item => item.id !== 'my-customers' && item.id !== 'my-performance' && item.id !== 'my-info'
      );
    }
    if (role === 'MANAGER') {
      // 일반 관리자는 시스템 설정 및 영업사원 전용 메뉴, 내 정보 관리를 제외하고 노출
      return allMenuItems.filter(
        item => item.id !== 'settings' && item.id !== 'my-customers' && item.id !== 'my-performance' && item.id !== 'my-info'
      );
    }
    if (role === 'SALES') {
      // 영업 담당자는 나의 고객관리, 나의 실적관리, 내 정보 관리만 노출
      return allMenuItems.filter(
        item => item.id === 'my-customers' || item.id === 'my-performance' || item.id === 'my-info'
      );
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

      <style>{`
        .thin-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .thin-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .thin-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 4px;
        }
        .thin-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #334155 transparent;
        }
      `}</style>

      <nav className="flex-1 pl-4 pr-2 py-6 space-y-2 overflow-y-auto thin-scrollbar">
        {menuItems.map((item) => {
          const isSelected = currentMenu === item.id || (item.hasSubmenu && currentMenu.startsWith(item.id));
          return (
            <div key={item.id} className="flex flex-col">
              <button
                onClick={() => {
                  if (item.isModal) {
                    onBatchClick();
                  } else if (item.hasSubmenu) {
                    setIsSettingsOpen(!isSettingsOpen);
                  } else {
                    setCurrentMenu(item.id);
                  }
                }}
                className={`w-full flex items-center justify-between pl-3 pr-2.5 py-3 rounded-xl transition-all ${
                  isSelected 
                    ? 'bg-emerald-500/10 text-emerald-400 font-bold' 
                    : 'hover:bg-slate-800 hover:text-white font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.hasSubmenu && (
                  isSettingsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                )}
              </button>

              {/* 하위 메뉴 렌더링 */}
              {item.hasSubmenu && isSettingsOpen && (
                <div className="flex flex-col pl-9 mt-1.5 space-y-1">
                  <button
                    onClick={() => setCurrentMenu('settings-products')}
                    className={`w-full text-left py-2 px-3 rounded-lg text-sm transition-all ${
                      currentMenu === 'settings-products'
                        ? 'text-emerald-400 font-bold bg-emerald-500/5'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    • 상품 목록
                  </button>
                  <button
                    onClick={() => setCurrentMenu('settings-codes')}
                    className={`w-full text-left py-2 px-3 rounded-lg text-sm transition-all ${
                      currentMenu === 'settings-codes'
                        ? 'text-emerald-400 font-bold bg-emerald-500/5'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    • 코드 관리
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div 
          onClick={() => {
            if (role === 'SALES') {
              setCurrentMenu('my-info');
            }
          }}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-4 transition-all ${
            role === 'SALES'
              ? 'cursor-pointer ' + (currentMenu === 'my-info' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold' : 'bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white')
              : 'bg-slate-800 text-slate-300 cursor-default'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-emerald-400 shrink-0">
            <Users size={16} />
          </div>
          <div className="text-left flex-1 min-w-0">
            <p className={`text-sm font-bold truncate ${role === 'SALES' && currentMenu === 'my-info' ? 'text-emerald-400' : 'text-white'}`}>
              {adminUser?.adminNm || '관리자'}
            </p>
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
