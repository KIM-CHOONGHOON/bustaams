import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getNotifications, logout } from '../api';
import Swal from 'sweetalert2';
import { notify } from '../utils/toast';
import BottomNavDriver from '../components/BottomNavDriver';
import CompanyInfoFooter from '../components/CompanyInfoFooter';

const DriverDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ 
        countCustomerWait: 0, 
        countDriverPayWait: 0, 
        countFinalApprovalWait: 0, 
        countConfirmed: 0, 
        countDone: 0, 
        countAuctions: 0, 
        totalProfit: 0,
        monthlyProfit: 0,
        pendingProfit: 0,
        feePolicyNm: '미가입'
    });
    const [userName, setUserName] = useState('기사님');
    const [userImage, setUserImage] = useState(null);
    const [registrationStatus, setRegistrationStatus] = useState({ isDriverInfoRegistered: false, isBusInfoRegistered: false });
    const [auctionList, setAuctionList] = useState([]);
    const [todayTrip, setTodayTrip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
 
    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                const res = await api.get('/app/driver/dashboard');
                if (res.success) {
                    setStats({
                        countCustomerWait: res.data.countCustomerWait || 0,
                        countDriverPayWait: res.data.countDriverPayWait || 0,
                        countFinalApprovalWait: res.data.countFinalApprovalWait || 0,
                        countConfirmed: res.data.countConfirmed || 0,
                        countDone: res.data.countDone || 0,
                        countAuctions: res.data.countAuctions || 0,
                        totalProfit: res.data.totalProfit || 0,
                        monthlyProfit: res.data.monthlyProfit || 0,
                        pendingProfit: res.data.pendingProfit || 0,
                        feePolicyNm: res.data.feePolicyNm || '미가입'
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

            // 읽지 않은 알림 개수 가져오기
            try {
                const notifs = await getNotifications();
                const unread = notifs.filter(n => n.READ_YN === 'N').length;
                setUnreadCount(unread);
            } catch (err) {
                console.error('Fetch notifications count error:', err);
            }
        };
        fetchDashboardData();
    }, []);

    const handleLogout = () => {
        Swal.fire({
            title: '로그아웃',
            text: '정말 로그아웃 하시겠습니까?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#00685f',
            cancelButtonColor: '#d33',
            confirmButtonText: '로그아웃',
            cancelButtonText: '취소'
        }).then((result) => {
            if (result.isConfirmed) {
                logout();
                navigate('/login', { replace: true });
                notify.success('로그아웃', '성공적으로 로그아웃되었습니다.');
            }
        });
    };

    const quickMenus = [
        { icon: 'task_alt', label: '운행 완료 리스트', desc: '지난 일정 확인', path: '/completed-trips-driver', iconBg: 'bg-slate-100', iconColor: 'text-slate-600' },
        { icon: 'chat', label: '실시간 채팅', desc: '고객과 대화', path: '/chat-list-driver', iconBg: 'bg-cyan-50', iconColor: 'text-cyan-600' },
        { icon: 'credit_card', label: '카드/회비 관리', desc: '결제 수단 및 멤버십', path: '/membership-card-mgmt', iconBg: 'bg-purple-50', iconColor: 'text-purple-600' },
        { icon: 'settings_suggest', label: '요금제 선택', desc: '이용권 구매 및 관리', path: '/pass-select-driver', iconBg: 'bg-rose-50', iconColor: 'text-rose-600' },
        { icon: 'badge', label: '기사 정보 등록', desc: '파트너 인증', path: '/driver-certification', iconBg: 'bg-orange-50', iconColor: 'text-orange-600' },
        { icon: 'directions_bus', label: '버스 정보 등록', desc: '차량 인증', path: '/bus-certification', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-700' },
    ];

    return (
        <div className="bg-background text-on-background min-h-screen pb-40 font-body">
            {/* TopAppBar */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-xl shadow-teal-900/5 flex items-center justify-between px-3 md:px-6 h-16">
                <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
                    <img src="/app/assets/BUSTAAMS_IMAGE_LOGO.png" alt="busTaams Logo" className="w-7 h-7 md:w-8 md:h-8 object-contain rounded-xl" />
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-surface-container-highest overflow-hidden border border-slate-100 flex items-center justify-center shrink-0">
                        {userImage ? (
                            <img alt="Driver profile" className="w-full h-full object-cover" src={userImage} />
                        ) : (
                            <span className="material-symbols-outlined text-slate-300 text-[18px] md:text-[24px]">person</span>
                        )}
                    </div>
                    <div className="flex flex-col text-left">
                        <span className="text-[8px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">프리미엄 파트너</span>
                        <span className="font-headline font-bold text-teal-900 tracking-tight text-[11px] md:text-[16px] mt-0.5">{userName} 기사님</span>
                    </div>
                </div>
                <div className="text-xl font-extrabold text-teal-900 tracking-tighter font-headline hidden lg:block italic shrink-0">BUS TAAMS</div>
                <div className="flex items-center gap-1.5 md:gap-4 shrink-0">
                    <button 
                        onClick={() => navigate('/notifications')}
                        className="relative text-teal-800 hover:opacity-80 transition-opacity p-1 md:p-2"
                    >
                        <span className="material-symbols-outlined text-[20px] md:text-[24px]">notifications</span>
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-secondary rounded-full border-2 border-white text-[9px] text-white font-bold flex items-center justify-center">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>
                    <button 
                        onClick={handleLogout}
                        className="p-1 md:p-2 rounded-xl hover:bg-red-50 transition-colors group"
                        title="로그아웃"
                    >
                        <span className="material-symbols-outlined text-teal-800 group-hover:text-red-500 text-[20px] md:text-[24px]">logout</span>
                    </button>
                </div>
            </header>

            <main className="pt-24 px-6 max-w-7xl mx-auto space-y-12">
                {/* 실시간 진행현황 5단계 배너 카드 (한글 주석) */}
                <section className="relative overflow-hidden rounded-2xl bg-teal-900 text-white p-6 md:p-10 shadow-xl text-left animate-in fade-in slide-in-from-bottom duration-500">
                    <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none flex items-center justify-end pr-8">
                        <span className="material-symbols-outlined text-[150px] text-white">local_shipping</span>
                    </div>
                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full text-white/90 backdrop-blur-sm">실시간 청약 5단계 진행현황</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                            <button 
                                onClick={() => navigate('/estimate-list-driver?tab=opportunities')} 
                                className="p-4 rounded-xl font-bold transition-all text-xs md:text-sm shadow-lg flex flex-col items-center justify-center gap-1.5 bg-white text-teal-900 hover:bg-slate-50 hover:translate-y-[-2px] active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[22px]">format_list_bulleted</span>
                                <span className="text-center">{stats.countAuctions}건 청약요청</span>
                            </button>
                            <button 
                                onClick={() => navigate('/approval-pending-driver?tab=customer_wait')} 
                                className="p-4 rounded-xl font-bold transition-all text-xs md:text-sm shadow-lg flex flex-col items-center justify-center gap-1.5 bg-amber-500 text-white hover:bg-amber-600 hover:translate-y-[-2px] active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[22px]">pending_actions</span>
                                <span className="text-center">{stats.countCustomerWait}건 승인대기</span>
                            </button>
                            <button 
                                onClick={() => navigate('/approval-pending-driver?tab=driver_pay')} 
                                className="p-4 rounded-xl font-bold transition-all text-xs md:text-sm shadow-lg flex flex-col items-center justify-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 hover:translate-y-[-2px] active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[22px]">payment</span>
                                <span className="text-center">{stats.countDriverPayWait}건 결제대기</span>
                            </button>
                            <button 
                                onClick={() => navigate('/approval-pending-driver?tab=final_approval_wait')} 
                                className="p-4 rounded-xl font-bold transition-all text-xs md:text-sm shadow-lg flex flex-col items-center justify-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 hover:translate-y-[-2px] active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[22px]">verified</span>
                                <span className="text-center">{stats.countFinalApprovalWait}건 최종 승인대기</span>
                            </button>
                            <button 
                                onClick={() => navigate('/upcoming-trips-driver')} 
                                className="p-4 rounded-xl font-bold transition-all text-xs md:text-sm shadow-lg flex flex-col items-center justify-center gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 hover:translate-y-[-2px] active:scale-95 col-span-2 sm:col-span-1"
                            >
                                <span className="material-symbols-outlined text-[22px]">calendar_month</span>
                                <span className="text-center">{stats.countConfirmed}건 운행예정</span>
                            </button>
                        </div>
                    </div>
                </section>

                {/* Active Opportunities Hero */}
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end text-left">
                    <div className="lg:col-span-4 space-y-4">
                        <h2 className="text-4xl font-extrabold font-headline tracking-tighter text-on-surface leading-none italic uppercase">실시간 청약 기회</h2>
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
                                    <div key={auction.id} className={`bg-white rounded-2xl p-6 shadow-xl shadow-teal-900/5 border-l-4 ${idx === 0 ? 'border-secondary' : 'border-primary'} flex flex-col justify-between h-48 hover:translate-y-[-4px] transition-all duration-300 cursor-pointer`} onClick={() => navigate(`/estimate-detail-driver/${auction.id}`)}>
                                        <div className="text-left">
                                            <div className="flex justify-between items-start">
                                                <span className={`${idx === 0 ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-primary-fixed text-on-primary-fixed'} text-[10px] font-bold px-2 py-1 rounded-xl uppercase tracking-wider`}>
                                                    {idx === 0 ? '수요 높음' : '일반'}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase">{auction.timeAgo}</span>
                                            </div>
                                            <h3 className="mt-3 font-bold text-lg text-on-surface italic truncate">{auction.title || '여행 제목 없음'}</h3>
                                            <p className="text-[10px] text-slate-400 font-medium mt-1">{auction.startDate} 운행</p>
                                            <div className="text-[11px] text-on-surface-variant font-bold leading-tight mt-2 space-x-1">
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
                                        </div>
                                        <div className="flex justify-between items-center mt-4">
                                            <span className="text-primary font-black text-xl tracking-tighter italic">₩{Number(auction.price).toLocaleString()}</span>
                                            <button 
                                                onClick={() => navigate(`/estimate-detail-driver/${auction.id}`)}
                                                className="bg-primary text-white rounded-xl px-6 py-2.5 text-[12px] font-black shadow-lg shadow-primary/20 uppercase tracking-widest hover:bg-secondary transition-all"
                                            >
                                                청약선택
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="md:col-span-2 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-4">
                                    <span className="material-symbols-outlined text-4xl text-slate-300">search_off</span>
                                    <p className="text-slate-500 font-bold text-sm">현재 등록된 청약 기회가 없습니다.<br/><span className="text-xs font-medium opacity-60">기사님의 차량 정보와 일치하는 요청을 기다려주세요.</span></p>
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
                        <div className="flex flex-col gap-3">
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
                                    <div 
                                        key={idx}
                                        onClick={() => !isDisabled && navigate(menu.path)}
                                        className={`cursor-pointer bg-white px-5 py-4 rounded-[20px] shadow-sm border border-slate-100/70 flex items-center justify-between transition-all duration-300 ${
                                            isDisabled 
                                            ? 'opacity-45 cursor-not-allowed grayscale' 
                                            : 'hover:translate-y-[-2px] hover:shadow-md'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-full ${menu.iconBg || 'bg-slate-100'} ${menu.iconColor || 'text-slate-600'} flex items-center justify-center`}>
                                                <span className="material-symbols-outlined text-2xl">{menu.icon}</span>
                                            </div>
                                            <div className="text-left flex items-baseline">
                                                <span className={`font-extrabold text-base ${isDisabled ? 'text-slate-400' : 'text-slate-800'}`}>{menu.label}</span>
                                                {menu.desc && (
                                                    <span className="text-xs font-semibold text-slate-400 ml-2">{menu.desc}</span>
                                                )}
                                            </div>
                                        </div>
                                        <span className="material-symbols-outlined text-slate-300 text-xl">chevron_right</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Side Column: Schedule & Earnings */}
                    <div className="space-y-8">
                        {/* Today's Schedule Card */}
                        {todayTrip && (
                            <div className="bg-primary text-white rounded-2xl p-8 shadow-2xl shadow-primary/20 relative overflow-hidden group cursor-pointer" onClick={() => navigate(`/upcoming-trip-detail-driver/${todayTrip.id}`)}>
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 group-hover:rotate-12 transition-all">
                                    <span className="material-symbols-outlined text-[100px]" style={{fontSize: '100px'}}>route</span>
                                </div>
                                <div className="relative z-10 space-y-8 text-left">
                                    <h4 className="text-[10px] font-black tracking-[0.4em] uppercase opacity-60">오늘의 운행 일정</h4>
                                    <div className="space-y-6 text-left">
                                        <div className="flex items-center gap-4 text-left">
                                            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shadow-inner">
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
                                            className="w-full mt-4 bg-white text-primary py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/20"
                                        >
                                            상세 정보 확인
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Earnings Ledger */}
                        <div className="bg-white rounded-2xl p-8 shadow-2xl shadow-teal-900/5 border border-white text-left">
                            <div className="flex justify-between items-center mb-8 text-left">
                                <h4 className="text-[10px] font-black tracking-[0.4em] text-slate-300 uppercase">수익 요약</h4>
                                <span className="text-[10px] font-black text-primary px-3 py-1 bg-primary/10 rounded-xl uppercase tracking-widest">
                                    {new Date().getMonth() + 1}월
                                </span>
                            </div>
                            <div className="space-y-1 text-left">
                                <p className="text-[12px] text-slate-500 font-bold tracking-tight">이번 달 총 수익</p>
                                <p className="text-4xl font-black font-headline text-on-surface tracking-tighter italic leading-none">
                                    ₩{Number(stats.monthlyProfit || 0).toLocaleString()}
                                </p>
                            </div>
                            <div className="mt-10 grid grid-cols-3 gap-4 text-left border-t border-slate-50 pt-8">
                                <div className="space-y-1 text-left">
                                    <span className="text-slate-300 font-black uppercase tracking-widest text-[9px] block">정산 예정</span>
                                    <span className="font-black text-on-surface tracking-tight block text-[13px] sm:text-base truncate">
                                        ₩{Number(stats.pendingProfit || 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="space-y-1 text-left border-l border-slate-50 pl-4">
                                    <span className="text-slate-300 font-black uppercase tracking-widest text-[9px] block">완료된 운행</span>
                                    <span className="font-black text-on-surface tracking-tight block text-[13px] sm:text-base">
                                        {stats.countDone || 0}건
                                    </span>
                                </div>
                                <div className="space-y-1 text-left border-l border-slate-50 pl-4">
                                    <span className="text-slate-300 font-black uppercase tracking-widest text-[9px] block">현재 요금제</span>
                                    <span className="font-black text-primary tracking-tight block text-[13px] sm:text-base truncate">
                                        {stats.feePolicyNm || '미가입'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>


            </main>

            <CompanyInfoFooter forceShow={true} />

            <BottomNavDriver activeTab="home" />
        </div>
    );
};

export default DriverDashboard;
