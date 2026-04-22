import React from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNavCustomer from '../components/BottomNavCustomer';

const ReservationList = () => {
    const navigate = useNavigate();

    return (
        <div className="bg-background text-on-surface font-body min-h-screen pb-32">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,104,95,0.04)]">
                <div className="flex items-center justify-between px-6 py-4 w-full">
                    <div className="flex items-center gap-4 text-left">
                        <button className="text-teal-700 hover:bg-slate-100 transition-colors p-2 rounded-full scale-95 active:scale-90 duration-200">
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                        <h1 className="text-2xl font-black text-teal-800 tracking-tighter font-headline text-[24px]">Velocity</h1>
                    </div>
                    <div className="flex items-center gap-6">
                        <nav className="hidden md:flex items-center gap-8">
                            <button onClick={() => navigate('/customer-dashboard')} className="text-slate-500 font-semibold hover:text-teal-700 transition-colors">홈</button>
                            <button className="text-teal-700 font-bold">예약</button>
                            <button className="text-slate-500 font-semibold hover:text-teal-700 transition-colors">메시지</button>
                        </nav>
                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-teal-100 shadow-sm transition-transform hover:scale-110">
                            <img alt="User" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDAuydGKeWcVXnNwZDRc1I8NFS_BI9gq969584jVmM5maopYZ63srZ7FvlrWEb_EAlmkWIjBb5BPNcP1t7cxeVW66HWUlO53iZcSpZ7qSCpZdrQUXwvp8X5ibBv6Xx57pJrCmFA8WY8f1W6QCEC0wt2VbiePnFQ6Dco1T3vF-Vkzh0wL5vNyHOTwR2RKCQJ0QLxejtltR8UYIvSuocurIgQmtVJa8pHYHzWuHFe8N8rJRH34uYOlkJtQMcv8C1c99d4lMC41r-mrI" />
                        </div>
                    </div>
                </div>
            </header>

            <main className="pt-28 pb-32 px-6 max-w-5xl mx-auto text-left">
                {/* Editorial Header Section */}
                <section className="mb-12">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div className="max-w-xl">
                            <span className="text-secondary font-bold tracking-widest uppercase text-[10px] mb-2 block">여행 컨시어지</span>
                            <h2 className="text-5xl md:text-6xl font-extrabold font-headline text-on-surface tracking-tighter text-[40px]">내 예약 내역</h2>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full text-on-surface-variant text-sm font-semibold shadow-sm hover:bg-slate-200 transition-colors cursor-pointer">
                            <span className="material-symbols-outlined text-sm">filter_list</span>
                            <span>상태별 필터링</span>
                        </div>
                    </div>
                    <div className="mt-6 h-1 w-24 bg-primary rounded-full"></div>
                </section>

                <div className="grid grid-cols-1 gap-8">
                    {/* Upcoming Trip */}
                    <div className="group relative bg-white rounded-2xl shadow-sm border border-slate-50 overflow-hidden transition-all duration-300 hover:shadow-xl hover:translate-y-[-4px]">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary"></div>
                        <div className="p-8 flex flex-col md:flex-row gap-8">
                            <div className="w-full md:w-1/3 h-48 rounded-xl overflow-hidden relative shadow-sm">
                                <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBkFgpCqOKwslyeB-NDZZWgUztAqUL0bfHiOrJqNJJN6DpHr41urNw5IJbiscbKz7SRUeipoTldOC-T9K1hgHX0Ql-j8HNSBG7i7RsroxP2pU55sPH2h18ejgiAIUhlk7ClZgs-q20FqjXXkNpV6ztIhaTC2EUu5gNvLvdKaXaGHKYW2nXvxveE0DY6Z3XOqnvIyAdfKEvapFzLayq9xIjqgGqcuwwu4qmp5WnLSgsnzUNS17N7rvUar-ZpG0fnE-1dIGrFGlPczso" alt="Bus" />
                                <div className="absolute top-4 left-4 bg-secondary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-md">운행 예정</div>
                            </div>
                            <div className="flex-1 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="text-left">
                                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1 text-left">운행 노선</p>
                                            <h3 className="text-2xl font-headline font-bold text-on-surface flex items-center gap-3 text-[22px]">
                                                샌프란시스코 
                                                <span className="material-symbols-outlined text-primary">arrow_right_alt</span> 
                                                로스앤젤레스
                                            </h3>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">상태</p>
                                            <span className="text-primary font-bold flex items-center gap-1 text-sm">
                                                <span className="material-symbols-outlined text-sm" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>
                                                예약 확정
                                            </span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-6 border-t border-slate-50">
                                        <div className="text-left">
                                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">운행 일자</p>
                                            <p className="text-on-surface font-semibold text-sm">2023/12/15</p>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">차량 종류</p>
                                            <p className="text-on-surface font-semibold text-sm">일반 45인승</p>
                                        </div>
                                        <div className="hidden md:block text-left">
                                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">좌석 번호</p>
                                            <p className="text-on-surface font-semibold text-sm">12A, 12B</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-8 flex gap-4">
                                    <button onClick={() => navigate('/reservation-detail/1')} className="bg-primary text-white px-8 py-3 rounded-full font-bold text-sm tracking-wide shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                                        티켓 확인
                                    </button>
                                    <button className="border border-slate-200 text-slate-500 px-8 py-3 rounded-full font-bold text-sm tracking-wide hover:bg-slate-50 transition-all">
                                        변경하기
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Past Trip */}
                    <div className="group relative bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 overflow-hidden transition-all duration-300">
                        <div className="p-8 flex flex-col md:flex-row gap-8 opacity-60">
                            <div className="w-full md:w-1/3 h-48 rounded-xl overflow-hidden relative grayscale">
                                <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAajDyuTPXjqy919kPT6tOWkBYkWF2ezCjk7h4pY2yvNzH8tmS9kh5hkzflmjQEoSAZXy1jJP9qLgMeOFp4JATVgzPk3vo1ErworFujJHZdo_NwKXTkIJnQE8nH8nIpfF_15KfrqatVeR09ntz6FMzMiFo9LCnG38pDFnrsWnGZa533vqa9QEUEyzWrquG5QCCRev65boyGpomD-8dwifdE3OCONLSKQ2IElHO_7UE-MJJ89-fjj2qYDmOVUYY5v7RuSWSmZRyDW0Y" alt="Past Bus" />
                            </div>
                            <div className="flex-1 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="text-left">
                                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1 text-left">운행 노선</p>
                                            <h3 className="text-xl font-headline font-bold text-on-surface flex items-center gap-3 text-[18px]">
                                                라스베이거스
                                                <span className="material-symbols-outlined text-slate-300">arrow_right_alt</span> 
                                                피닉스
                                            </h3>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">상태</p>
                                            <span className="text-slate-400 font-bold text-sm">운행 완료</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-6 border-t border-slate-200/40">
                                        <div className="text-left">
                                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">운행 일자</p>
                                            <p className="text-on-surface font-semibold text-sm">2023/11/20</p>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">차량 종류</p>
                                            <p className="text-on-surface font-semibold text-sm">일반 45인승</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-8 flex gap-4">
                                    <button className="text-primary font-bold text-sm tracking-wide flex items-center gap-2 hover:underline">
                                        <span className="material-symbols-outlined">receipt</span>
                                        영수증 다운로드
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* BottomNavBar */}
            <BottomNavCustomer />
        </div>
    );
};

export default ReservationList;
