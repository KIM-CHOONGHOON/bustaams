import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getNotifications, logout, getImageUrl } from '../api';
import Swal from 'sweetalert2';
import { notify } from '../utils/toast';
import BottomNavCustomer from '../components/BottomNavCustomer';
import Avatar from '../components/Avatar';
import CompanyInfoFooter from '../components/CompanyInfoFooter';

const CustomerDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ 
        progressing: 0, 
        customerPayWait: 0, 
        driverPayWait: 0, 
        finalApprovalWait: 0 
    });
    const [userName, setUserName] = useState('사용자');
    const [profileImage, setProfileImage] = useState(null);
    const [imageVersion, setImageVersion] = useState(Date.now());

    const [restriction, setRestriction] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);

    const categories = [
        { name: '입찰 및 예약 문의', code: 'BID_RES' },
        { name: '결제 및 계약금 관련', code: 'PAY_REFUND' },
        { name: '취소 및 환불 정책', code: 'CANCEL_RULE' },
        { name: '기사님 및 운행 서비스', code: 'BUS_STAT' },
        { name: '서비스 제안 및 기타', code: 'SUGGESTION' }
    ];

    useEffect(() => {
        // 대시보드 통계 및 프로필 정보 로드
        const fetchDashboardData = async () => {
            // 1. 대시보드 통계 가져오기
            try {
                const statsRes = await api.get('/app/customer/dashboard');
                if (statsRes.success && statsRes.stats) {
                    setStats({
                        progressing: statsRes.stats.countProgressing || 0,
                        customerPayWait: statsRes.stats.countCustomerPayWait ?? statsRes.stats.countWaitingApproval ?? 0,
                        driverPayWait: statsRes.stats.countDriverPayWait || 0,
                        finalApprovalWait: statsRes.stats.countFinalApprovalWait || 0
                    });
                    if (statsRes.user && statsRes.user.userNm) {
                        setUserName(statsRes.user.userNm);
                    }
                    if (statsRes.user && statsRes.user.userImage) {
                        setProfileImage(statsRes.user.userImage);
                        setImageVersion(Date.now());
                    }
                    if (statsRes.restriction) {
                        setRestriction(statsRes.restriction);
                    }
                }
            } catch (err) {
                console.error('Fetch dashboard stats error:', err);
            }

            // 2. 프로필 정보 가져오기 (이름 보완)
            try {
                const profileRes = await api.get('/app/customer/profile');
                if (profileRes.success && profileRes.data) {
                    const name = profileRes.data.name || profileRes.data.userName;
                    if (name) {
                        setUserName(name);
                    }
                    if (profileRes.data.profileImage) {
                        setProfileImage(profileRes.data.profileImage);
                        setImageVersion(Date.now());
                    }
                }
            } catch (err) {
                console.error('Fetch profile error:', err);
            }

            // 3. 읽지 않은 알림 개수 가져오기
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

    const handleRequestBus = () => {
        if (restriction) {
            Swal.fire({
                icon: 'error',
                title: '이용 제한 안내',
                text: restriction.message,
                confirmButtonText: '확인',
                confirmButtonColor: '#00685f'
            });
            return;
        }
        navigate('/request-bus');
    };

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



    return (
        <div className="bg-background text-on-background min-h-screen pb-32 font-body">
            {/* TopAppBar */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl shadow-[0px_40px_60px_rgba(0,104,95,0.06)] h-16 flex items-center justify-between px-3 md:px-6">
                <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
                    <img src="/app/assets/BUSTAAMS_IMAGE_LOGO.png" alt="BUSTAAMS Logo" className="w-7 h-7 md:w-8 md:h-8 object-contain rounded-xl" />
                    <h1 className="text-sm md:text-2xl font-black text-teal-800 italic font-headline tracking-tight text-[14px] md:text-[22px]">BUSTAAMS</h1>
                </div>
                <div className="flex items-center gap-1.5 md:gap-4 shrink-0">
                    <button 
                        onClick={() => navigate('/notifications')}
                        className="p-1 md:p-2 rounded-full hover:bg-slate-100/50 transition-colors relative"
                    >
                        <span className="material-symbols-outlined text-slate-500 text-[20px] md:text-[24px]">notifications</span>
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white text-[9px] text-white font-bold flex items-center justify-center">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>
                    <Avatar 
                        profileImage={profileImage} 
                        imageVersion={imageVersion} 
                        onClick={() => navigate('/profile-customer')} 
                        className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors"
                    />
                    <button 
                        onClick={handleLogout}
                        className="p-1 md:p-2 rounded-full hover:bg-red-50 transition-colors group"
                        title="로그아웃"
                    >
                        <span className="material-symbols-outlined text-slate-500 group-hover:text-red-500 text-[20px] md:text-[24px]">logout</span>
                    </button>
                </div>
            </header>

            <main className="pt-24 px-6 max-w-7xl mx-auto space-y-12">
                <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <p className="text-secondary font-semibold tracking-wider text-sm uppercase">반가워요!</p>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight leading-tight text-[28px]">
                            안녕하세요, <span className="text-primary">{userName || '사용자'}</span>님!<br/>
                            오늘의 새로운 여행을 시작해볼까요?
                        </h2>
                    </div>
                </section>

                {restriction && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-start gap-3 shadow-sm animate-pulse">
                        <span className="material-symbols-outlined text-red-500">warning</span>
                        <div className="flex-1">
                            <p className="text-red-800 font-bold text-sm">이용 제한 알림</p>
                            <p className="text-red-700 text-xs mt-0.5">{restriction.message}</p>
                        </div>
                    </div>
                )}

                <section className="relative overflow-hidden rounded-2xl bg-primary text-white p-6 md:p-10 shadow-xl">
                    <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
                        <img alt="Bus" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDGum5KlJoZ1QYpw5IUtpBjkmHm85WskANrUTCg5K2pp6oBoHGfm904xF0Sha_OV2yNjGAHuI_C5we-RplZzy8FNTllgSB3jrLud6xKDIt-Yn1sUdijX3D970Qn4JoiC3v5tfqVRs4VFH5cP0XqOp47pfFy5EjuwG7xK79EZy2twkr6P2kJi5Pb6AtubxOcGzAlSiIl5ew5i1lqDMgmBcs_lw4egfP7RyHxYkREFQYcVBJXOIo4hSks6H2AOFsHQmbzkLX3Ckbqzmg" />
                    </div>
                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full text-white/90 backdrop-blur-sm">실시간 청약 4단계 진행현황</span>
                        </div>

                        {/* 4단계 상태 카드 버튼 그룹 (한글 주석) */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                            <button 
                                onClick={() => navigate('/estimate-request-list?type=progress')} 
                                className="p-4 rounded-xl font-bold transition-all text-xs md:text-sm shadow-lg flex flex-col items-center justify-center gap-1.5 bg-white text-primary hover:bg-slate-50 hover:translate-y-[-2px] active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[22px]">near_me</span>
                                <span className="text-center">{stats.progressing}건 청약진행중</span>
                            </button>
                            <button 
                                onClick={() => navigate('/estimate-request-list?type=customer_pay')} 
                                className="p-4 rounded-xl font-bold transition-all text-xs md:text-sm shadow-lg flex flex-col items-center justify-center gap-1.5 bg-amber-500 text-white hover:bg-amber-600 hover:translate-y-[-2px] active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[22px]">payment</span>
                                <span className="text-center">{stats.customerPayWait}건 결제대기중</span>
                            </button>
                            <button 
                                onClick={() => navigate('/estimate-request-list?type=driver_pay')} 
                                className="p-4 rounded-xl font-bold transition-all text-xs md:text-sm shadow-lg flex flex-col items-center justify-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 hover:translate-y-[-2px] active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[22px]">directions_bus</span>
                                <span className="text-center">{stats.driverPayWait}건 기사 결제대기</span>
                            </button>
                            <button 
                                onClick={() => navigate('/estimate-request-list?type=final_approval')} 
                                className="p-4 rounded-xl font-bold transition-all text-xs md:text-sm shadow-lg flex flex-col items-center justify-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 hover:translate-y-[-2px] active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[22px]">verified</span>
                                <span className="text-center">{stats.finalApprovalWait}건 최종 승인대기</span>
                            </button>
                        </div>
                    </div>
                </section>

                <section className="space-y-6">
                    <h3 className="text-xl font-bold text-on-surface">빠른 서비스</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
                        {/* 1. 버스요청등록 (한글 주석) */}
                        <div onClick={handleRequestBus} className={`cursor-pointer bg-white p-5 rounded-2xl shadow-sm border-l-4 border-secondary hover:translate-y-[-4px] transition-all ${restriction ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center mb-3 text-secondary">
                                <span className="material-symbols-outlined">add_task</span>
                            </div>
                            <h4 className="font-bold text-on-surface text-[13px]">버스요청등록</h4>
                            <p className="text-[10px] text-on-surface-variant mt-1">새로운 일정 생성</p>
                        </div>
                        
                        {/* 2. 결제대기 (한글 주석) */}
                        <div onClick={() => navigate('/estimate-request-list?type=customer_pay')} className="cursor-pointer bg-white p-5 rounded-2xl shadow-sm border-l-4 border-amber-500 hover:translate-y-[-4px] transition-all">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-3 text-amber-600">
                                <span className="material-symbols-outlined">payment</span>
                            </div>
                            <h4 className="font-bold text-on-surface text-[13px]">결제대기</h4>
                            <p className="text-[10px] text-on-surface-variant mt-1">이용대금 결제하기</p>
                        </div>

                        {/* 3. 기사결제대기 (한글 주석) */}
                        <div onClick={() => navigate('/estimate-request-list?type=driver_pay')} className="cursor-pointer bg-white p-5 rounded-2xl shadow-sm border-l-4 border-blue-500 hover:translate-y-[-4px] transition-all">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3 text-blue-600">
                                <span className="material-symbols-outlined">directions_bus</span>
                            </div>
                            <h4 className="font-bold text-on-surface text-[13px]">기사결제대기</h4>
                            <p className="text-[10px] text-on-surface-variant mt-1">배차 확정 진행</p>
                        </div>

                        {/* 4. 고객 최종승인 (한글 주석) */}
                        <div onClick={() => navigate('/estimate-request-list?type=final_approval')} className="cursor-pointer bg-white p-5 rounded-2xl shadow-sm border-l-4 border-emerald-500 hover:translate-y-[-4px] transition-all">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3 text-emerald-600">
                                <span className="material-symbols-outlined">verified</span>
                            </div>
                            <h4 className="font-bold text-on-surface text-[13px]">고객 최종승인</h4>
                            <p className="text-[10px] text-on-surface-variant mt-1">최종 예약 확정하기</p>
                        </div>

                        {/* 5. 예약리스트 (한글 주석) */}
                        <div onClick={() => navigate('/reservation-list')} className="cursor-pointer bg-white p-5 rounded-2xl shadow-sm hover:translate-y-[-4px] transition-all">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-3 text-indigo-600">
                                <span className="material-symbols-outlined">event_note</span>
                            </div>
                            <h4 className="font-bold text-on-surface text-[13px]">예약리스트</h4>
                            <p className="text-[10px] text-on-surface-variant mt-1">나의 예약 현황</p>
                        </div>

                        {/* 6. 과거여행이력 (한글 주석) */}
                        <div onClick={() => navigate('/order-history')} className="cursor-pointer bg-white p-5 rounded-2xl shadow-sm hover:translate-y-[-4px] transition-all">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3 text-slate-600">
                                <span className="material-symbols-outlined">history</span>
                            </div>
                            <h4 className="font-bold text-on-surface text-[13px]">과거여행이력</h4>
                            <p className="text-[10px] text-on-surface-variant mt-1">지난 여행 확인</p>
                        </div>

                        {/* 7. 평점 및 감사글 (한글 주석) */}
                        <div onClick={() => navigate('/review-pending-list')} className="cursor-pointer bg-white p-5 rounded-2xl shadow-sm hover:translate-y-[-4px] transition-all">
                            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center mb-3 text-orange-600">
                                <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                            </div>
                            <h4 className="font-bold text-on-surface text-[13px]">평점 및 감사글</h4>
                            <p className="text-[10px] text-on-surface-variant mt-1">이용 후기 작성</p>
                        </div>

                        {/* 8. 1:1문의 (한글 주석) */}
                        <div onClick={() => navigate('/inquiry-list')} className="cursor-pointer bg-white p-5 rounded-2xl shadow-sm hover:translate-y-[-4px] transition-all">
                            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center mb-3 text-teal-600">
                                <span className="material-symbols-outlined">contact_support</span>
                            </div>
                            <h4 className="font-bold text-on-surface text-[13px]">1:1문의</h4>
                            <p className="text-[10px] text-on-surface-variant mt-1">고객 지원 센터</p>
                        </div>

                        {/* 9. 실시간 채팅 (한글 주석) */}
                        <div onClick={() => navigate('/chat-list-customer')} className="cursor-pointer bg-white p-5 rounded-2xl shadow-sm hover:translate-y-[-4px] transition-all">
                            <div className="w-10 h-10 rounded-xl bg-teal-100/50 flex items-center justify-center mb-3 text-[#00685f]">
                                <span className="material-symbols-outlined">chat</span>
                            </div>
                            <h4 className="font-bold text-on-surface text-[13px]">실시간 채팅</h4>
                            <p className="text-[10px] text-on-surface-variant mt-1">기사님과 대화</p>
                        </div>

                        {/* 10. 회원정보관리 (한글 주석) */}
                        <div onClick={() => navigate('/user-profile')} className="cursor-pointer bg-white p-5 rounded-2xl shadow-sm hover:translate-y-[-4px] transition-all">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3 text-slate-600">
                                <span className="material-symbols-outlined">manage_accounts</span>
                            </div>
                            <h4 className="font-bold text-on-surface text-[13px]">회원정보관리</h4>
                            <p className="text-[10px] text-on-surface-variant mt-1">프로필 및 보안</p>
                        </div>
                    </div>
                </section>
            </main>

            <CompanyInfoFooter forceShow={true} />

            <BottomNavCustomer />

            <button onClick={handleRequestBus} className={`fixed bottom-28 right-6 w-14 h-14 bg-secondary rounded-2xl shadow-lg flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all ${restriction ? 'grayscale-[0.5]' : ''}`}>
                <span className="material-symbols-outlined">add</span>
            </button>
        </div>
    );
};

export default CustomerDashboard;
