import React from 'react';
import { useNavigate } from 'react-router-dom';

const CustomerDashboard = () => {
    const navigate = useNavigate();

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
                    <div className="w-8 h-8 rounded-full bg-surface-container-high overflow-hidden">
                        <img alt="Profile" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBKsBuT0YnY_XuZeAdo3ySw3EoiCwK1zkqDI-vax9GIt5ySoePMlCRm2WJ3b8lwk-r1dPM2hthSnRWvYHGeHf7A9NHtAz_ppNB1CAfmsw5obu8aqwEQEtHXMLMR8c2jzssAxdp1BazBygsvlXmJ0303juZqR-X5Lcwsh81WDVHISPC_-CFIo5GzK_Crd8A1AQdTKeTGXiNemNQfVPEwRGkCh9zQiNLzyYphW4Bc3BcBSS3-u2w9fcfZxe2JzbjbOow6lqe2TVnfT60" />
                    </div>
                </div>
            </header>

            <main className="pt-24 px-6 max-w-7xl mx-auto space-y-12">
                <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <p className="text-secondary font-semibold tracking-wider text-sm uppercase">반가워요!</p>
                        <h2 className="text-4xl md:text-5xl font-extrabold text-on-surface tracking-tight leading-tight text-[36px]">
                            안녕하세요, <span className="text-primary">김지훈</span>님!<br/>
                            오늘의 새로운 여정을 시작해볼까요?
                        </h2>
                    </div>
                </section>

                <section className="relative overflow-hidden rounded-[2rem] bg-primary text-white p-8 md:p-12 shadow-xl">
                    <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
                        <img alt="Bus" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDGum5KlJoZ1QYpw5IUtpBjkmHm85WskANrUTCg5K2pp6oBoHGfm904xF0Sha_OV2yNjGAHuI_C5we-RplZzy8FNTllgSB3jrLud6xKDIt-Yn1sUdijX3D970Qn4JoiC3v5tfqVRs4VFH5cP0XqOp47pfFy5EjuwG7xK79EZy2twkr6P2kJi5Pb6AtubxOcGzAlSiIl5ew5i1lqDMgmBcs_lw4egfP7RyHxYkREFQYcVBJXOIo4hSks6H2AOFsHQmbzkLX3Ckbqzmg" />
                    </div>
                    <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 uppercase tracking-widest text-[10px] font-bold">
                                <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse"></span>
                                진행 중인 요청
                            </div>
                            <div>
                                <h3 className="text-3xl font-bold mb-2 text-[24px]">서울 ↔ 부산 워크샵 단체 버스</h3>
                                <p className="text-on-primary-container font-medium opacity-90 text-[14px]">견적 대기 중 • 12개의 새로운 제안이 도착했습니다</p>
                            </div>
                            <button onClick={() => navigate('/estimate-list-customer')} className="bg-white text-primary px-8 py-3 rounded-full font-bold hover:bg-primary-fixed transition-all text-sm">
                                견적 리스트 확인
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

            <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[95%] md:w-[600px] rounded-full z-50 bg-white/80 backdrop-blur-xl shadow-2xl flex justify-around items-center p-2 h-16 border border-white/40">
                <button className="flex flex-col items-center justify-center bg-teal-700 text-white rounded-full px-5 py-2">
                    <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>home</span>
                    <span className="font-semibold text-[9px] uppercase tracking-widest mt-0.5">홈</span>
                </button>
                <button onClick={() => navigate('/estimate-list-customer')} className="flex flex-col items-center justify-center text-slate-500 px-4 py-2 hover:text-teal-700 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">gavel</span>
                    <span className="font-semibold text-[9px] uppercase tracking-widest mt-0.5">경매</span>
                </button>
                <button onClick={() => navigate('/reservation-list')} className="flex flex-col items-center justify-center text-slate-500 px-4 py-2 hover:text-teal-700 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">confirmation_number</span>
                    <span className="font-semibold text-[9px] uppercase tracking-widest mt-0.5">예약</span>
                </button>
                <button onClick={() => navigate('/estimate-list')} className="flex flex-col items-center justify-center text-slate-500 px-4 py-2 hover:text-teal-700 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">chat_bubble</span>
                    <span className="font-semibold text-[9px] uppercase tracking-widest mt-0.5">메시지</span>
                </button>
                <button onClick={() => navigate('/inquiry-list')} className="flex flex-col items-center justify-center text-slate-500 px-4 py-2 hover:text-teal-700 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">support_agent</span>
                    <span className="font-semibold text-[9px] uppercase tracking-widest mt-0.5">문의</span>
                </button>
                <button onClick={() => navigate('/user-profile')} className="flex flex-col items-center justify-center text-slate-500 px-4 py-2 hover:text-teal-700 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">person</span>
                    <span className="font-semibold text-[9px] uppercase tracking-widest mt-0.5">내 정보</span>
                </button>
            </nav>

            <button onClick={() => navigate('/request-bus')} className="fixed bottom-28 right-6 w-14 h-14 bg-secondary rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all">
                <span className="material-symbols-outlined">add</span>
            </button>
        </div>
    );
};

export default CustomerDashboard;
