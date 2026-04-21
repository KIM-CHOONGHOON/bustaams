import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const PastTripDetailCustomer = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    return (
        <div className="bg-background text-on-surface min-h-screen pb-32 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-50 shadow-sm">
                <div className="flex items-center justify-between px-6 h-18 w-full max-w-4xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="material-symbols-outlined text-teal-700 hover:bg-slate-50 p-2 rounded-full transition-all">arrow_back</button>
                        <h1 className="font-headline font-black text-lg tracking-tighter text-teal-900 italic leading-none">Trip Report</h1>
                    </div>
                    <div className="text-teal-800 font-black text-[10px] opacity-40 uppercase tracking-[0.3em]">
                        TRP-8829-Z10
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 pt-32 space-y-16">
                {/* Section 1: Trip Summary */}
                <section className="space-y-8 animate-in fade-in slide-in-from-bottom duration-700 text-left">
                    <div className="flex justify-between items-end">
                        <div className="space-y-2 text-left">
                            <p className="text-xs font-black text-secondary uppercase tracking-[0.4em]">Historical Record</p>
                            <h2 className="font-headline text-[44px] font-black tracking-tighter text-on-surface leading-tight">운행 기록 요약</h2>
                        </div>
                        <span className="font-black px-5 py-2 rounded-full bg-primary/10 text-primary text-[10px] tracking-widest uppercase border border-primary/20">
                            Completed
                        </span>
                    </div>
                    
                    <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl shadow-teal-900/[0.03] border border-slate-50 relative overflow-hidden text-left">
                        <div className="absolute top-0 left-0 w-2 h-full bg-primary opacity-20"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 text-left">
                            <div className="space-y-8 text-left">
                                <div className="space-y-6 text-left">
                                    <div className="flex items-start gap-6 text-left">
                                        <div className="flex flex-col items-center gap-2 mt-2 text-left">
                                            <div className="w-4 h-4 rounded-full bg-primary shadow-lg shadow-primary/30"></div>
                                            <div className="w-0.5 h-16 bg-slate-50"></div>
                                            <div className="w-4 h-4 rounded-full border-2 border-slate-200 bg-white"></div>
                                            <div className="w-0.5 h-16 bg-slate-50"></div>
                                            <div className="w-4 h-4 rounded-full border-2 border-primary bg-white"></div>
                                        </div>
                                        <div className="space-y-10 text-left">
                                            <div className="text-left">
                                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Departure</p>
                                                <p className="text-xl font-black tracking-tight mt-1">서울역 공항철도 입구</p>
                                                <p className="text-[11px] text-slate-400 font-bold mt-2">2023. 11. 15, 08:00 AM</p>
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Waypoint</p>
                                                <p className="text-xl font-black tracking-tight mt-1">덕평자연휴게소</p>
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Destination</p>
                                                <p className="text-xl font-black tracking-tight mt-1">강릉 오죽헌 대형주차장</p>
                                                <p className="text-[11px] text-slate-400 font-bold mt-2">2023. 11. 15, 11:30 AM</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-10 text-left">
                                <div className="grid grid-cols-2 gap-6 text-left">
                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-left">
                                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-2">Group Size</p>
                                        <div className="flex items-center gap-3 text-left">
                                            <span className="material-symbols-outlined text-primary">group</span>
                                            <p className="text-2xl font-black tracking-tighter">42명</p>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-left">
                                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-2">Distance</p>
                                        <div className="flex items-center gap-3 text-left">
                                            <span className="material-symbols-outlined text-primary">route</span>
                                            <p className="text-2xl font-black tracking-tighter">214km</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-slate-900 p-8 rounded-[2rem] flex items-center justify-between shadow-2xl shadow-slate-900/40 text-left">
                                    <div className="text-left">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Receipt ID</p>
                                        <p className="font-mono text-sm font-black text-white">RQ-20231115-A882</p>
                                    </div>
                                    <button className="text-white/40 hover:text-white transition-colors">
                                        <span className="material-symbols-outlined">content_copy</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 2: Fleet & Partners */}
                <section className="space-y-8 text-left overflow-x-hidden">
                    <h2 className="font-headline text-3xl font-black tracking-tighter text-on-surface-variant text-left">배차 및 운전자 정보</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                        {/* Vehicle Card 1 */}
                        <div className="bg-white rounded-[3rem] p-8 shadow-2xl shadow-teal-900/[0.03] border border-slate-50 relative group text-left">
                            <div className="absolute top-8 right-8 px-4 py-1 bg-primary/5 text-primary text-[9px] font-black rounded-full uppercase tracking-widest">Vehicle 01</div>
                            <div className="flex items-center gap-6 mb-10 text-left">
                                <div className="relative text-left">
                                    <img alt="Captain" className="w-20 h-20 rounded-[1.5rem] object-cover shadow-xl rotate-2" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBFayeoNs9olmehX13_cgGOiEVKecCBJVEeSMkR-Fc6Q4KpAROCa8JqpAIdGaGFrTU9gARcaJ-Ba8NIBnFNd1qaVPd2VuvlLzLZCfLRWHQvL4B7XCzgxA1dEhN9lhWu22TkzgpN5V6hnHUZIIJx0b-yEjdsY7XjDCxKGM3wJFHeAllbnrfb1qcNHtf9YE5MBVNAHZj5pRSycR_E9PG9XV5h8tK8VSgLZK6tz7TYEuUJRzGN5HMRQ1vlZp8XYXccxC_cnbvg83jxw8o" />
                                    <div className="absolute -bottom-2 -right-2 bg-white p-1.5 rounded-xl shadow-lg ring-1 ring-slate-50 text-left">
                                        <span className="material-symbols-outlined text-primary text-lg" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>
                                    </div>
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Standard Class</p>
                                    <h3 className="text-2xl font-black tracking-tight">김영호 캡틴</h3>
                                    <p className="text-sm text-slate-400 font-bold mt-1">경기 70 바 1234</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-3 text-left">
                                <button className="w-full py-5 rounded-2xl bg-slate-50 text-on-surface-variant font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-100 transition-all active:scale-95">
                                    <span className="material-symbols-outlined text-lg">chat_bubble</span>
                                    메시지 이력 조회
                                </button>
                                <button className="w-full py-5 rounded-2xl border border-slate-100 text-on-surface-variant font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-50 transition-all active:scale-95">
                                    <span className="material-symbols-outlined text-lg text-secondary" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                                    등록된 평점 (4.9)
                                </button>
                            </div>
                        </div>

                        {/* Vehicle Card 2 */}
                        <div className="bg-white rounded-[3rem] p-8 shadow-2xl shadow-teal-900/[0.03] border border-slate-50 relative group text-left">
                            <div className="absolute top-8 right-8 px-4 py-1 bg-primary/5 text-primary text-[9px] font-black rounded-full uppercase tracking-widest">Vehicle 02</div>
                            <div className="flex items-center gap-6 mb-10 text-left">
                                <div className="relative text-left">
                                    <img alt="Captain" className="w-20 h-20 rounded-[1.5rem] object-cover shadow-xl -rotate-2" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAlhvhGjbS4xk6pzM4XiSMmk435vrLfJ_sFky6iqmRrPNBY6Ug3EiyOCKku9w7tlotLzNvhhM5-Q_tr0JzRrvIOmqiUlwie56mc7coJOmHNx1-y-fJuFullt9AE7EoMb1zSDvWIXWFiYGBvOFpfs2sHO-kw5VAIjgFbzS9eyN4f8YRHWYWft5CKLXekWsYoaFNZqwaOC1mhxcQPg3mQT-Zlp3y24pIDG6FyOeswZlKrfo4QOWynKndWq_Pa4Myy3VtCQNRLEfu1DIU" />
                                    <div className="absolute -bottom-2 -right-2 bg-white p-1.5 rounded-xl shadow-lg ring-1 ring-slate-50 text-left">
                                        <span className="material-symbols-outlined text-primary text-lg" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>
                                    </div>
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Standard Class</p>
                                    <h3 className="text-2xl font-black tracking-tight">이수진 캡틴</h3>
                                    <p className="text-sm text-slate-400 font-bold mt-1">서울 72 하 5678</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-3 text-left">
                                <button className="w-full py-5 rounded-2xl bg-slate-50 text-on-surface-variant font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-100 transition-all active:scale-95">
                                    <span className="material-symbols-outlined text-lg">chat_bubble</span>
                                    메시지 이력 조회
                                </button>
                                <button onClick={() => navigate('/submit-review/2')} className="w-full py-5 rounded-2xl bg-gradient-to-br from-secondary to-orange-600 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-secondary/30 hover:scale-[1.02] transition-all active:scale-95">
                                    <span className="material-symbols-outlined text-lg">edit_note</span>
                                    평점 및 후기 작성
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 3: Cost Breakdown */}
                <section className="space-y-8 text-left pb-20">
                    <h2 className="font-headline text-3xl font-black tracking-tighter text-on-surface-variant text-left">결제 내역 정보</h2>
                    <div className="bg-slate-50 rounded-[3rem] p-12 space-y-10 border border-slate-100 text-left relative overflow-hidden">
                        <div className="space-y-6 text-left relative z-10">
                            <div className="flex justify-between items-center text-left">
                                <span className="text-slate-400 font-black text-sm uppercase tracking-widest">Basic Charter Fee (x2)</span>
                                <span className="font-black text-xl tracking-tighter">₩ 1,200,000</span>
                            </div>
                            <div className="flex justify-between items-center text-left">
                                <span className="text-slate-400 font-black text-sm uppercase tracking-widest">Taxes & Service Fees</span>
                                <span className="font-black text-xl tracking-tighter text-secondary">+ ₩ 154,000</span>
                            </div>
                            <div className="flex justify-between items-center text-left">
                                <span className="text-slate-400 font-black text-sm uppercase tracking-widest">Fuel & Extras</span>
                                <span className="font-black text-xl tracking-tighter text-secondary">+ ₩ 86,000</span>
                            </div>
                        </div>
                        <div className="h-px w-full bg-slate-100 relative z-10"></div>
                        <div className="bg-primary p-10 rounded-[2rem] flex flex-col md:flex-row justify-between items-center shadow-2xl shadow-primary/30 text-left relative z-10 overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                            <div className="text-left w-full md:w-auto">
                                <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.4em] mb-2">Final Settlement</p>
                                <p className="text-sm font-bold text-white/90">신용카드 결제 완료 (KB국민 4492***)</p>
                            </div>
                            <div className="text-right w-full md:w-auto mt-6 md:mt-0">
                                <span className="text-[44px] font-black text-white tracking-tighter leading-none">₩ 1,440,000</span>
                            </div>
                        </div>
                    </div>
                    
                    <button className="w-full flex items-center justify-center gap-4 text-primary font-black text-sm uppercase tracking-[0.3em] py-8 hover:underline group">
                        <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">receipt_long</span>
                        공식 영수증 및 매출전표 다운로드
                    </button>
                </section>
            </main>

            {/* Premium Bottom Nav */}
            <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex justify-around items-center px-4 py-2 bg-white/80 backdrop-blur-[30px] w-[90%] max-w-md mx-auto rounded-full shadow-2xl shadow-teal-900/20 border border-white/50">
                <button onClick={() => navigate('/customer-dashboard')} className="flex flex-col items-center justify-center text-slate-300 px-5 py-2 hover:text-teal-600 transition-all">
                    <span className="material-symbols-outlined">gavel</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Auction</span>
                </button>
                <button className="flex flex-col items-center justify-center bg-primary/10 text-primary rounded-full px-5 py-2 transition-all">
                    <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>directions_bus</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Trips</span>
                </button>
                <button onClick={() => navigate('/chat-room')} className="flex flex-col items-center justify-center text-slate-300 px-5 py-2 hover:text-teal-600 transition-all">
                    <span className="material-symbols-outlined">chat_bubble</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Talk</span>
                </button>
                <button onClick={() => navigate('/profile-customer')} className="flex flex-col items-center justify-center text-slate-300 px-5 py-2 hover:text-teal-600 transition-all">
                    <span className="material-symbols-outlined">person</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Account</span>
                </button>
            </nav>
        </div>
    );
};

export default PastTripDetailCustomer;
