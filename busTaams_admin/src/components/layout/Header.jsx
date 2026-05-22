import React from 'react';
import { Bell } from 'lucide-react';

const Header = ({ onLogout }) => {
  return (
    <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-end px-8 z-10 shrink-0">
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
