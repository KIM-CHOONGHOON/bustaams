import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Swal from 'sweetalert2';
import { notify } from '../utils/toast';
import BottomNavCustomer from '../components/BottomNavCustomer';

const CustomerDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ progressing: 0, waiting: 0 });
    const [userName, setUserName] = useState('사용자');
    const [profileImage, setProfileImage] = useState(null);

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
            try {
                const [statsRes, profileRes] = await Promise.all([
                    api.get('/app/customer/dashboard'),
                    api.get('/app/customer/profile')
                ]);
                
                if (statsRes.success) {
                    setStats({
                        progressing: statsRes.data.countProgressing,
                        waiting: statsRes.data.countWaitingApproval
                    });
                    if (statsRes.data.userName) setUserName(statsRes.data.userName);
                    if (statsRes.data.profileImage) setProfileImage(statsRes.data.profileImage);
                }
                
                if (profileRes.success) {
                    setUserName(profileRes.data.name || profileRes.data.userName || '사용자');
                    if (profileRes.data.profileImage) setProfileImage(profileRes.data.profileImage);
                }
            } catch (err) {
                console.error('Fetch dashboard error:', err);
            }
        };

        fetchDashboardData();
    }, []);



    return (
        <div className="bg-background text-on-background min-h-screen pb-32 font-body">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-[0px_40px_60px_rgba(0,104,95,0.06)] h-16 flex items-center justify-between px-6">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-teal-700">directions_bus</span>
                    <h1 className="text-2xl font-black text-teal-800 italic font-headline tracking-tight text-[22px]">Velocity</h1>
                </div>
                <div className="flex items-center gap-4">
                    <button className="p-2 rounded-full hover:bg-slate-100/50 transition-colors">
                        <span className="material-symbols-outlined text-slate-500">notifications</span>
                    </button>
                    <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center">
                        {profileImage ? (
                            <img alt="Profile" src={profileImage.startsWith('http') ? profileImage : `${import.meta.env.VITE_API_BASE_URL || ''}${profileImage}`} className="w-full h-full object-cover" />
                        ) : (
                            <span className="material-symbols-outlined text-slate-400">person</span>
                        )}
                    </div>
                </div>
            </header>

            <main className="pt-24 px-6 max-w-7xl mx-auto space-y-12">
                <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <p className="text-secondary font-semibold tracking-wider text-sm uppercase">반가워요!</p>
                        <h2 className="text-4xl md:text-5xl font-extrabold text-on-surface tracking-tight leading-tight text-[36px]">
                            안녕하세요, <span className="text-primary">{userName || '사용자'}</span>님!<br/>
                            오늘의 새로운 여정을 시작해볼까요?
                        </h2>
                    </div>
                </section>

                <section className="relative overflow-hidden rounded-[2rem] bg-primary text-white p-8 md:p-12 shadow-xl">
                    <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
                        <img alt="Bus" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDGum5KlJoZ1QYpw5IUtpBjkmHm85WskANrUTCg5K2pp6oBoHGfm904xF0Sha_OV2yNjGAHuI_C5we-RplZzy8FNTllgSB3jrLud6xKDIt-Yn1sUdijX3D970Qn4JoiC3v5tfqVRs4VFH5cP0XqOp47pfFy5EjuwG7xK79EZy2twkr6P2kJi5Pb6AtubxOcGzAlSiIl5ew5i1lqDMgmBcs_lw4egfP7RyHxYkREFQYcVBJXOIo4hSks6H2AOFsHQmbzkLX3Ckbqzmg" />
                    </div>
                    <div className="relative z-10 space-y-8">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
                                <p className="text-white/70 text-[12px] font-bold uppercase tracking-wider mb-1">진행 중</p>
                                <div className="flex items-end gap-2">
                                    <span className="text-3xl font-black">{stats.progressing}</span>
                                    <span className="text-sm font-medium mb-1 opacity-80">건</span>
                                </div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
                                <p className="text-white/70 text-[12px] font-bold uppercase tracking-wider mb-1">승인 대기 중</p>
                                <div className="flex items-end gap-2">
                                    <span className="text-3xl font-black">{stats.waiting}</span>
                                    <span className="text-sm font-medium mb-1 opacity-80">건</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <button 
                                onClick={() => navigate('/estimate-list-customer?type=progress')} 
                                className="flex-1 bg-white text-primary px-6 py-3.5 rounded-2xl font-bold hover:bg-slate-50 transition-all text-[13px] shadow-lg flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">near_me</span>
                                견적진행중 리스트
                            </button>
                            <button 
                                onClick={() => navigate('/estimate-list-customer?type=waiting')} 
                                className="flex-1 bg-secondary text-white px-6 py-3.5 rounded-2xl font-bold hover:opacity-90 transition-all text-[13px] shadow-lg flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">pending_actions</span>
                                승인대기중 리스트
                            </button>
                        </div>
                    </div>
                </section>

                <section className="space-y-6">
                    <h3 className="text-xl font-bold text-on-surface">빠른 서비스</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
                        <div onClick={() => navigate('/request-bus')} className="cursor-pointer bg-white p-6 rounded-3xl shadow-sm border-l-4 border-secondary hover:translate-y-[-4px] transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center mb-4 text-secondary">
                                <span className="material-symbols-outlined">add_task</span>
                            </div>
                            <h4 className="font-bold text-on-surface text-[14px]">버스 요청 등록</h4>
                            <p className="text-[10px] text-on-surface-variant mt-1">새로운 일정 생성</p>
                        </div>
                        <div onClick={() => navigate('/order-history')} className="cursor-pointer bg-white p-6 rounded-3xl shadow-sm hover:translate-y-[-4px] transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 text-slate-600">
                                <span className="material-symbols-outlined">history</span>
                            </div>
                            <h4 className="font-bold text-on-surface text-[14px]">과거 운행 이력</h4>
                            <p className="text-[10px] text-on-surface-variant mt-1">지난 여정 확인</p>
                        </div>
                        <div onClick={() => navigate('/reservation-list')} className="cursor-pointer bg-white p-6 rounded-3xl shadow-sm hover:translate-y-[-4px] transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4 text-indigo-600">
                                <span className="material-symbols-outlined">event_note</span>
                            </div>
                            <h4 className="font-bold text-on-surface text-[14px]">예약 리스트</h4>
                            <p className="text-[10px] text-on-surface-variant mt-1">나의 예약 현황</p>
                        </div>
                        <div onClick={() => navigate('/review-pending-list')} className="cursor-pointer bg-white p-6 rounded-3xl shadow-sm hover:translate-y-[-4px] transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center mb-4 text-orange-600">
                                <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                            </div>
                            <h4 className="font-bold text-on-surface text-[14px]">평점 및 감사글</h4>
                            <p className="text-[10px] text-on-surface-variant mt-1">이용 후기 작성</p>
                        </div>
                        <div onClick={() => navigate('/inquiry-list')} className="cursor-pointer bg-white p-6 rounded-3xl shadow-sm hover:translate-y-[-4px] transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center mb-4 text-teal-600">
                                <span className="material-symbols-outlined">contact_support</span>
                            </div>
                            <h4 className="font-bold text-on-surface text-[14px]">1:1 문의</h4>
                            <p className="text-[10px] text-on-surface-variant mt-1">고객 지원 센터</p>
                        </div>
                        <div onClick={() => navigate('/user-profile')} className="cursor-pointer bg-white p-6 rounded-3xl shadow-sm hover:translate-y-[-4px] transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 text-slate-600">
                                <span className="material-symbols-outlined">manage_accounts</span>
                            </div>
                            <h4 className="font-bold text-on-surface text-[14px]">회원정보관리</h4>
                            <p className="text-[10px] text-on-surface-variant mt-1">프로필 및 보안</p>
                        </div>
                    </div>
                </section>
            </main>

            <BottomNavCustomer />

            <button onClick={() => navigate('/request-bus')} className="fixed bottom-28 right-6 w-14 h-14 bg-secondary rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all">
                <span className="material-symbols-outlined">add</span>
            </button>
        </div>
    );
};

export default CustomerDashboard;
