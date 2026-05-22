import React from 'react';
import { Bell, Search } from 'lucide-react';

const Header = ({ onLogout }) => {
  return (
    <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shrink-0">
      <div className="relative w-96">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input 
          type="text" 
          placeholder="회원 이름, 예약번호 검색..." 
          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-medium"
        />
      </div>

      <div className="flex items-center gap-4">
        <button className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center relative transition-colors">
          <Bell size={20} className="text-slate-600" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
        <div className="w-px h-6 bg-slate-200 mx-2"></div>
        <button 
          onClick={onLogout}
          className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors px-3 py-2"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
};
export default Header;
