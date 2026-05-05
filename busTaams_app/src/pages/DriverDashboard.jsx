import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import BottomNavDriver from '../components/BottomNavDriver';

const DriverDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ 
        countBidding: 0, 
        countConfirmed: 0, 
        countDone: 0, 
        countAuctions: 0, 
        totalProfit: 0,
        monthlyProfit: 0,
        pendingProfit: 0
    });
    const [userName, setUserName] = useState('기사님');
    const [userImage, setUserImage] = useState(null);
    const [registrationStatus, setRegistrationStatus] = useState({ isDriverInfoRegistered: false, isBusInfoRegistered: false });
    const [auctionList, setAuctionList] = useState([]);
    const [todayTrip, setTodayTrip] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                const res = await api.get('/app/driver/dashboard');
                if (res.success) {
                    setStats({
                        countBidding: res.data.countBidding || 0,
                        countConfirmed: res.data.countConfirmed || 0,
                        countDone: res.data.countDone || 0,
                        countAuctions: res.data.countAuctions || 0,
                        totalProfit: res.data.totalProfit || 0,
                        monthlyProfit: res.data.monthlyProfit || 0,
                        pendingProfit: res.data.pendingProfit || 0
                    });
                    setUserName(res.data.userName);
                    setUserImage(res.data.userImage);
                    setRegistrationStatus({
                        isDriverInfoRegistered: res.data.isDriverInfoRegistered,
                        isBusInfoRegistered: res.data.isBusInfoRegistered
                    });
                    setAuctionList(res.data.auctionList || []);
                    setTodayTrip(res.data.todayTrip || null);
                }
            } catch (err) {
                console.error('Fetch driver dashboard error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const quickMenus = [
        { icon: 'badge', label: '기사 정보 등록', path: '/driver-certification' },
        { icon: 'directions_bus', label: '버스 정보 등록', path: '/bus-certification' },
        { icon: 'format_list_bulleted', label: '견적 리스트', path: '/estimate-list-driver' },
        { icon: 'calendar_month', label: '운행 예정 리스트', path: '/upcoming-trips-driver' },
        { icon: 'pending_actions', label: '승인 진행 리스트', path: '/approval-pending-driver' },
        { icon: 'task_alt', label: '운행 완료 리스트', path: '/completed-trips-driver' },
        { icon: 'event_busy', label: '유찰 리스트', path: '/failed-estimate-list-driver' },
        { icon: 'chat', label: '실시간 채팅', path: '/chat-list-driver' },
        { icon: 'credit_card', label: '카드/회비 관리', path: '/membership-card-mgmt' },
        { icon: 'settings_suggest', label: '요금제 선택', path: '/pass-select-driver' },
    ];

    return (
        <div className="bg-background text-on-background min-h-screen pb-40 font-body">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-xl shadow-teal-900/5 flex items-center justify-between px-6 h-16 w-full">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden border border-slate-100 flex items-center justify-center">
                        {userImage ? (
                            <img alt="Driver profile" className="w-full h-full object-cover" src={userImage} />
                        ) : (
                            <span className="material-symbols-outlined text-slate-300">person</span>
                        )}
                    </div>
                    <div className="flex flex-col text-left">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">프리미엄 파트너</span>
                        <span className="font-headline font-bold text-teal-900 tracking-tight">{userName} 기사님</span>
                    </div>
                </div>
                <div className="text-xl font-extrabold text-teal-900 tracking-tighter font-headline hidden md:block italic">BUS TAAMS</div>
                <div className="flex items-center gap-4">
                    <button className="relative text-teal-800 hover:opacity-80 transition-opacity p-2">
                        <span className="material-symbols-outlined">notifications</span>
                        <span className="absolute top-2 right-2 w-2 h-2 bg-secondary rounded-full"></span>
                    </button>
                </div>
            </header>

            <main className="pt-24 px-6 max-w-7xl mx-auto space-y-12">
                {/* Active Opportunities Hero */}
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end text-left">
                    <div className="lg:col-span-4 space-y-4">
                        <h2 className="text-4xl font-extrabold font-headline tracking-tighter text-on-surface leading-none italic uppercase">실시간 견적 기회</h2>
                        <p className="text-on-surface-variant text-sm max-w-xs font-medium">현재 {stats.countAuctions}개의 새로운 운행 요청이 기사님의 제안을 기다리고 있습니다.</p>
                        <div className="flex gap-2 items-center text-secondary font-black text-sm">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary"></span>
                            </span>
                            실시간 업데이트
                        </div>
                    </div>
                    <div className="lg:col-span-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {auctionList.length > 0 ? (
                                auctionList.slice(0, 3).map((auction, idx) => (
                                    <div key={auction.id} className={`bg-white rounded-[2rem] p-6 shadow-xl shadow-teal-900/5 border-l-4 ${idx === 0 ? 'border-secondary' : 'border-primary'} flex flex-col justify-between h-48 hover:translate-y-[-4px] transition-all duration-300 cursor-pointer`} onClick={() => navigate(`/estimate-detail-driver/${auction.id}`)}>
                                        <div className="text-left">
                                            <div className="flex justify-between items-start">
                                                <span className={`${idx === 0 ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-primary-fixed text-on-primary-fixed'} text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider`}>
                                                    {idx === 0 ? '수요 높음' : '일반'}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase">{auction.timeAgo}</span>
                                            </div>
                                            <h3 className="mt-4 font-bold text-lg text-on-surface italic truncate">{auction.title || '여정 제목 없음'}</h3>
                                            <div className="text-[11px] text-on-surface-variant font-bold leading-tight mt-1 space-x-1">
                                                <span>{auction.startAddr.split(' ')[1] || auction.startAddr.split(' ')[0]}</span>
                                                {auction.roundTrip && (
                                                    <>
                                                        <span className="text-secondary">→</span>
                                                        <span>{auction.roundTrip.split(' ')[1] || auction.roundTrip.split(' ')[0]}</span>
                                                    </>
                                                )}
                                                <span className="text-secondary">→</span>
                                                <span>{auction.endAddr.split(' ')[1] || auction.endAddr.split(' ')[0]}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-medium mt-2">{auction.startDate} 운행</p>
                                        </div>
                                        <div className="flex justify-between items-center mt-4">
                                            <span className="text-primary font-black text-xl tracking-tighter italic">₩{Number(auction.price).toLocaleString()} ~</span>
                                            <button 
                                                onClick={() => navigate(`/estimate-detail-driver/${auction.id}`)}
                                                className="bg-primary text-white rounded-full px-6 py-2.5 text-[12px] font-black shadow-lg shadow-primary/20 uppercase tracking-widest hover:bg-secondary transition-all"
                                            >
                                                견적선택
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="md:col-span-2 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-12 flex flex-col items-center justify-center text-center space-y-4">
                                    <span className="material-symbols-outlined text-4xl text-slate-300">search_off</span>
                                    <p className="text-slate-500 font-bold text-sm">현재 등록된 경매 기회가 없습니다.<br/><span className="text-xs font-medium opacity-60">기사님의 차량 정보와 일치하는 요청을 기다려주세요.</span></p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Main Bento Grid */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left items-start">
                    {/* Quick Menu Grid */}
                    <div className="lg:col-span-2 space-y-6">
                        <h3 className="font-headline font-bold text-xl tracking-tight text-teal-900 flex items-center gap-3">
                            <span className="w-8 h-[2px] bg-teal-800"></span> 빠른 메뉴
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                            {quickMenus.map((menu, idx) => {
                                const isDriverInfoReg = registrationStatus.isDriverInfoRegistered;
                                const isBusInfoReg = registrationStatus.isBusInfoRegistered;
                                
                                let isDisabled = false;
                                if (!isDriverInfoReg && menu.path !== '/driver-certification') {
                                    isDisabled = true;
                                }
                                else if (isDriverInfoReg && !isBusInfoReg && 
                                         menu.path !== '/driver-certification' && 
                                         menu.path !== '/bus-certification') {
                                    isDisabled = true;
                                }

                                return (
                                    <button 
                                        key={idx}
                                        onClick={() => !isDisabled && navigate(menu.path)}
                                        className={`group bg-slate-50 p-5 rounded-[1.5rem] transition-all duration-300 flex flex-col items-center text-center gap-3 shadow-sm border border-transparent ${
                                            isDisabled 
                                            ? 'opacity-40 cursor-not-allowed grayscale' 
                                            : 'hover:bg-white hover:shadow-xl hover:translate-y-[-2px] hover:border-slate-100'
                                        }`}
                                    >
                                        <div className={`w-12 h-12 rounded-2xl bg-white flex items-center justify-center transition-all shadow-sm ${!isDisabled && 'group-hover:bg-primary group-hover:text-white rotate-3 group-hover:rotate-0'}`}>
                                            <span className="material-symbols-outlined">{menu.icon}</span>
                                        </div>
                                        <span className={`text-[11px] font-black uppercase tracking-tight ${isDisabled ? 'text-slate-300' : 'text-on-surface'}`}>{menu.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Side Column: Schedule & Earnings */}
                    <div className="space-y-8">
                        {/* Today's Schedule Card */}
                        {todayTrip && (
                            <div className="bg-primary text-white rounded-[2.5rem] p-8 shadow-2xl shadow-primary/20 relative overflow-hidden group cursor-pointer" onClick={() => navigate(`/upcoming-trip-detail-driver/${todayTrip.id}`)}>
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 group-hover:rotate-12 transition-all">
                                    <span className="material-symbols-outlined text-[100px]" style={{fontSize: '100px'}}>route</span>
                                </div>
                                <div className="relative z-10 space-y-8 text-left">
                                    <h4 className="text-[10px] font-black tracking-[0.4em] uppercase opacity-60">오늘의 운행 일정</h4>
                                    <div className="space-y-6 text-left">
                                        <div className="flex items-center gap-4 text-left">
                                            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shadow-inner">
                                                <span className="material-symbols-outlined text-xl">schedule</span>
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[9px] font-black opacity-40 uppercase tracking-widest mb-1">대기/출발 시간</p>
                                                <p className="text-xl font-black italic tracking-tighter">{todayTrip.time}</p>
                                            </div>
                                        </div>
                                        <div className="pt-6 border-t border-white/10 text-left">
                                            <p className="text-[11px] font-bold text-secondary mb-1">{todayTrip.title}</p>
                                            <p className="text-[9px] font-black opacity-40 uppercase tracking-widest mb-2">운행 경로</p>
                                            <p className="text-lg font-black font-headline leading-tight italic tracking-tighter">
                                                {todayTrip.startAddr.split(' ')[1] || todayTrip.startAddr.split(' ')[0]} 
                                                {todayTrip.roundTrip && ` → ${todayTrip.roundTrip.split(' ')[1] || todayTrip.roundTrip.split(' ')[0]}`}
                                                → {todayTrip.endAddr.split(' ')[1] || todayTrip.endAddr.split(' ')[0]}
                                            </p>
                                            <div className="mt-4 flex items-end justify-between">
                                                <p className="text-2xl font-black italic tracking-tighter text-secondary">₩{Number(todayTrip.price).toLocaleString()}</p>
                                                <span className="text-[10px] font-bold opacity-60">운행 금액</span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); navigate(`/upcoming-trip-detail-driver/${todayTrip.id}`); }}
                                            className="w-full mt-4 bg-white text-primary py-4 rounded-full font-black text-[10px] uppercase tracking-[0.3em] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/20"
                                        >
                                            상세 정보 확인
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Earnings Ledger */}
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-teal-900/5 border border-white text-left">
                            <div className="flex justify-between items-center mb-8 text-left">
                                <h4 className="text-[10px] font-black tracking-[0.4em] text-slate-300 uppercase">수익 요약</h4>
                                <span className="text-[10px] font-black text-primary px-3 py-1 bg-primary/10 rounded-lg uppercase tracking-widest">
                                    {new Date().getMonth() + 1}월
                                </span>
                            </div>
                            <div className="space-y-1 text-left">
                                <p className="text-[12px] text-slate-500 font-bold tracking-tight">이번 달 총 수익</p>
                                <p className="text-4xl font-black font-headline text-on-surface tracking-tighter italic leading-none">
                                    ₩{Number(stats.monthlyProfit || 0).toLocaleString()}
                                </p>
                            </div>
                            <div className="mt-10 grid grid-cols-2 gap-6 text-left border-t border-slate-50 pt-8">
                                <div className="space-y-1 text-left">
                                    <span className="text-slate-300 font-black uppercase tracking-widest text-[9px] block">정산 예정</span>
                                    <span className="font-black text-on-surface tracking-tight block text-base">
                                        ₩{Number(stats.pendingProfit || 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="space-y-1 text-left border-l border-slate-50 pl-6">
                                    <span className="text-slate-300 font-black uppercase tracking-widest text-[9px] block">완료된 운행</span>
                                    <span className="font-black text-on-surface tracking-tight block text-base">
                                        {stats.countDone || 0}건
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Membership Banner */}
                <section className="relative h-56 rounded-[3rem] overflow-hidden bg-slate-900 flex items-center px-12 group cursor-pointer text-left shadow-2xl shadow-slate-900/30">
                    <div className="absolute inset-0 z-0 overflow-hidden">
                        <img alt="Luxury bus" className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-[2000ms]" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDd1cmwWadGqEVtV-xNJu4CT-nzdrjTfWs5mnHZWthPLlGqXJvDM6-zdHdIOEfxl-33alvQ51u0CWgtmCwN0I5ZHQu44L0FpRakK5R7wFj8quXWJUvAMas6cHKI5jbsD6lqeZxRbjoFfi38ifujiNRcITlXAxtpv8j5FIO9E2z_W0hPP0xxi7GBetNBEvvO5w6RnBmgNyTkxMEC74CkkLdNfnJqFjlQYAI7nkmLce_5YITHZZyErTimyYQuayN6dI6S6w8xBqchskI" />
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/70 to-transparent"></div>
                    </div>
                    <div className="relative z-10 max-w-xl space-y-6 text-left">
                        <h3 className="text-white text-2xl md:text-4xl font-black font-headline leading-[0.9] italic uppercase tracking-tighter">마스터 멤버 <br/><span className="text-secondary">전용 혜택.</span></h3>
                        <p className="text-slate-400 text-xs font-bold tracking-tight italic opacity-80 text-left">전국 정비 데스크 할인 및 연방 유류비 환급 서비스를 즉시 잠금 해제하세요.</p>
                        <button className="bg-secondary text-white px-8 py-3 rounded-full font-black text-[9px] uppercase tracking-[0.3em] shadow-2xl shadow-secondary/30 active:scale-95 transition-all">혜택 확인하기</button>
                    </div>
                </section>
            </main>

            <BottomNavDriver activeTab="home" />
        </div>
    );
};

export default DriverDashboard;
