import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const BottomNavCustomer = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'home', icon: 'home', path: '/customer-dashboard', name: 'Home' },
    { id: 'request', icon: 'add', path: '/request-bus', name: 'Request' },
    { id: 'reservations', icon: 'directions_bus', path: '/reservation-list', name: 'Booking' },
    { id: 'history', icon: 'history', path: '/order-history', name: 'History' },
    { id: 'reviews', icon: 'rate_review', path: '/review-pending-list', name: 'Review' },
    { id: 'inquiry', icon: 'chat', path: '/inquiry-list', name: 'Inquiry' },
    { id: 'profile', icon: 'person', path: '/user-profile', name: 'Profile' }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[95%] max-w-2xl bg-white/80 backdrop-blur-3xl rounded-full shadow-[0_40px_80px_-20px_rgba(0,104,95,0.25)] border border-white/50 px-6 py-4 flex justify-around items-center z-50">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => navigate(item.path)}
          className={`group flex flex-col items-center gap-1 transition-all ${
            isActive(item.path) ? 'text-teal-900' : 'text-slate-400 hover:text-teal-900'
          }`}
        >
          <span 
            className="material-symbols-outlined font-black text-2xl group-hover:scale-125 transition-transform"
            style={isActive(item.path) ? { fontVariationSettings: "'FILL' 1" } : {}}
          >
            {item.icon}
          </span>
          <span className="text-[9px] font-black uppercase tracking-tighter hidden md:block">
            {item.name}
          </span>
        </button>
      ))}
    </nav>
  );
};

export default BottomNavCustomer;
