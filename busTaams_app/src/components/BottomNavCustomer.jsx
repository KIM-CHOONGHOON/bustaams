import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const BottomNavCustomer = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'home', icon: 'home', path: '/customer-dashboard', name: '홈' },
    { id: 'request', icon: 'add_task', path: '/request-bus', name: '요청등록' },
    { id: 'reservations', icon: 'confirmation_number', path: '/reservation-list', name: '예약' },
    { id: 'messages', icon: 'chat_bubble', path: '/chat-list', name: '메시지' },
    { id: 'inquiry', icon: 'support_agent', path: '/inquiry-list', name: '문의' },
    { id: 'profile', icon: 'person', path: '/user-profile', name: '내 정보' }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[95%] md:w-[600px] rounded-full z-50 bg-white/80 backdrop-blur-xl shadow-2xl flex justify-around items-center p-2 h-16 border border-white/40 font-body">
      {navItems.map((item) => {
        const active = isActive(item.path);
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center transition-all duration-300 ${
              active 
                ? 'bg-teal-700 text-white rounded-full px-5 py-2' 
                : 'text-slate-500 px-4 py-2 hover:text-teal-700'
            }`}
          >
            <span 
              className="material-symbols-outlined text-[20px]"
              style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {item.icon}
            </span>
            <span className="font-semibold text-[9px] uppercase tracking-widest mt-0.5">
              {item.name}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNavCustomer;
