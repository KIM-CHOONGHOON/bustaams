import React from 'react';
import { LayoutDashboard, Users, Bus, Settings } from 'lucide-react';

const Sidebar = ({ currentMenu, setCurrentMenu }) => {
  const menuItems = [
    { id: 'dashboard', label: '대시보드', icon: <LayoutDashboard size={20} /> },
    { id: 'users', label: '회원 관리', icon: <Users size={20} /> },
    { id: 'reservations', label: '예약/입찰 관리', icon: <Bus size={20} /> },
    { id: 'settings', label: '시스템 설정', icon: <Settings size={20} /> },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col min-h-screen shrink-0">
      <div className="h-20 flex items-center px-6 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center mr-3">
          <span className="text-white font-black text-lg leading-none">B</span>
        </div>
        <span className="text-xl font-black text-white tracking-wide">BusTaams</span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentMenu(item.id)}
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
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
            <Users size={16} className="text-slate-300" />
          </div>
          <div className="text-left flex-1">
            <p className="text-sm font-bold text-white">최고 관리자</p>
            <p className="text-xs text-slate-400">시스템 운영팀</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
export default Sidebar;
