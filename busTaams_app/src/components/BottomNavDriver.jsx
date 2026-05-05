import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const BottomNavDriver = ({ activeTab }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();

    // 기사님 필수 메뉴 6개 구성
    const navItems = [
        { id: 'home', icon: 'home', path: '/driver-dashboard', name: t('driver.nav.home') },
        { id: 'estimate', icon: 'request_quote', path: '/estimate-list-driver', name: t('driver.nav.estimate') },
        { id: 'approval', icon: 'pending_actions', path: '/approval-pending-driver', name: t('driver.nav.approval') },
        { id: 'chat', icon: 'chat', path: '/chat-list-driver', name: t('driver.nav.chat') },
        { id: 'trips', icon: 'directions_bus', path: '/upcoming-trips-driver', name: t('driver.nav.trips') },
        { id: 'settlement', icon: 'account_balance_wallet', path: '/payment-history-driver', name: t('driver.nav.settlement') }
    ];

    const isActive = (item) => {
        if (activeTab && activeTab === item.id) return true;
        const path = item.path;
        if (path === '/driver-dashboard' && location.pathname === '/driver-dashboard') return true;
        if (path !== '/driver-dashboard' && location.pathname.startsWith(path)) return true;
        return location.pathname === path;
    };

    return (
        <div className="fixed bottom-0 left-0 w-full z-50">
            {/* 글래스모피즘(Glassmorphism) 배경 */}
            <div className="absolute inset-0 bg-white/80 backdrop-blur-xl border-t border-white/60 shadow-[0_-8px_30px_rgba(0,0,0,0.06)]"></div>
            
            <nav className="relative max-w-lg mx-auto px-2 pt-2 pb-6 flex justify-between items-center">
                {navItems.map((item) => {
                    const active = isActive(item);
                    return (
                        <button 
                            key={item.id}
                            onClick={() => navigate(item.path)}
                            className="relative flex flex-col items-center justify-center flex-1 h-14 group outline-none px-1"
                        >
                            {/* 선택 시 나타나는 화려한 인디케이터 (상단) */}
                            {active && (
                                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-blue-600 rounded-b-full shadow-[0_2px_8px_rgba(37,99,235,0.4)]"></div>
                            )}

                            {/* 아이콘 컨테이너 */}
                            <div className={`relative flex items-center justify-center w-10 h-10 transition-all duration-300 ${active ? 'scale-110 -translate-y-1' : 'group-hover:-translate-y-0.5'}`}>
                                <span 
                                    className={`material-symbols-outlined text-[24px] transition-all duration-300 drop-shadow-sm ${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`}
                                    style={{fontVariationSettings: active ? "'FILL' 1, 'wght' 600" : "'FILL' 0, 'wght' 400"}}
                                >
                                    {item.icon}
                                </span>
                            </div>

                            {/* 텍스트 라벨 (공간 확보를 위해 10px로 축소) */}
                            <span className={`text-[10px] font-semibold tracking-tight whitespace-nowrap transition-all duration-300 ${active ? 'text-blue-600 -translate-y-0.5' : 'text-slate-400'}`}>
                                {item.name}
                            </span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};

export default BottomNavDriver;
