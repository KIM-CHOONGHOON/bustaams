import React from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNavDriver from '../components/BottomNavDriver';

const ContractCancelDriver = () => {
    const navigate = useNavigate();

    return (
        <div className="bg-background text-on-surface min-h-[100dvh] pb-48 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/40 backdrop-blur-3xl border-b border-white/20 py-6">
                <div className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto">
                    <div className="flex items-center gap-6 text-left">
                        <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl text-teal-800 shadow-xl shadow-teal-900/5 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                        </button>
                        <h1 className="font-headline font-black tracking-tighter text-3xl text-teal-900 italic uppercase font-bold">배차 취소</h1>
                    </div>
                    <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-2xl rotate-3">
                        <img alt="User profile" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBkXnRby57bMmx-82a0JjIO8LPiCDeaQ0U_GCsku9ZS2PpZ5EyCVJDmarP2ZybvsC8AXal0-p0hSX5KjlFmsZQUIq3xpc9GFOvnsu28beTJKUWb_zbKq2Aaj2eYVimhMegEAlH3tiJM6V5VOYIzieqo6bNrX3Gykb4w3K4JS62E-FF1Y2Gc_EGaGP6tNe9dMVLwT1eEtLl-iLKFw3jLkaFckb-FQzEOufgWPvws2brzSwqCuBnEXVH_XVDA5Eyc3TobTDo6vojY0VU" />
                    </div>
                </div>
            </header>

            <main className="pt-48 px-6 max-w-5xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom duration-1000 text-left">
                {/* Editorial Header Section */}
                <section className="space-y-6 text-left border-l-8 border-secondary pl-8">
                    <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-secondary/10 text-secondary font-black text-[10px] tracking-widest uppercase italic">
                        <span className="material-symbols-outlined text-sm" style={{fontVariationSettings: "'FILL' 1"}}>warning</span>
                        위기 관리 프로토콜: 배차 관리
                    </div>
                    <h2 className="font-headline font-black text-6xl md:text-8xl text-primary leading-[0.85] tracking-tighter italic uppercase text-left">
                        취소 사유 <br/><span className="text-secondary underline decoration-secondary/20 underline-offset-[12px]">검토하기.</span>
                    </h2>
                    <p className="text-slate-400 text-xl font-bold italic tracking-tight leading-relaxed max-w-xl text-left">
                        배차 취소를 진행하기 전, 취소에 따른 정책과 페널티를 신중히 검토해 주시기 바랍니다.
                    </p>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-12 text-left">
                    {/* Left Column: Context Carrier */}
                    <div className="md:col-span-7 space-y-10 text-left">
                        {/* Auction Context Card */}
                        <div className="bg-white rounded-[3.5rem] p-10 shadow-2xl shadow-teal-900/5 relative overflow-hidden text-left border border-white group">
                            <div className="absolute top-0 left-0 w-2 h-full bg-primary"></div>
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em] mb-4 italic">운행 상세 정보</p>
                            
                            <div className="flex items-start gap-10 text-left">
                                <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden bg-slate-50 shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-500">
                                    <img alt="Mission Fleet" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBNKj3N5hx9OndQicfEVhE4Ked2edaPMEFLI5afQoo20mhsqyYEeM32PHAKFHsAwH_tE0vqV4IAAf1CWvxyWTClUeE7WectMyClZ3SlzGfXJk15-yWVKl-LhTDEguNTzmMqxINJoRBsI1pu6iF4ASkVXp14mEuIWzppjEenJphzRlHb7p93cmdAybzFD6bSKnFqeBIrTFpvVzT3WdCXhhr19s8X6tqWxrO2hOD3Ki-JZKkmnoAHycX2L5E2bSUJTbaQO-FmuC_nbKo" />
                                </div>
                                <div className="space-y-4 text-left">
                                    <h3 className="text-3xl font-black text-primary italic uppercase tracking-tighter leading-none text-left">볼보 9700 럭셔리 대형</h3>
                                    <p className="text-slate-400 font-bold italic text-sm leading-none uppercase tracking-widest underline decoration-slate-100 underline-offset-4">배차 번호: #BT-882-QX</p>
                                    
                                    <div className="grid grid-cols-1 gap-4 pt-4 text-left">
                                        <div className="bg-slate-50 px-6 py-4 rounded-2xl flex justify-between items-center text-left">
                                            <span className="text-[8px] font-black uppercase text-slate-300 italic">최종 낙찰가</span>
                                            <span className="font-black text-primary italic text-lg tracking-tighter">₩1,250,000</span>
                                        </div>
                                        <div className="bg-slate-50 px-6 py-4 rounded-2xl flex justify-between items-center text-left">
                                            <span className="text-[8px] font-black uppercase text-slate-300 italic">운행 예정일</span>
                                            <span className="font-black text-primary italic text-sm tracking-tight text-left italic">2024. 10. 24 • 오전 09:00</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Consequences Bento Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-left">
                            <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-white space-y-4 text-left">
                                <span className="material-symbols-outlined text-secondary text-4xl" style={{fontVariationSettings: "'FILL' 1"}}>account_balance_wallet</span>
                                <h4 className="font-black text-on-surface italic uppercase tracking-tighter text-xl text-left leading-none">100% 환불 정책</h4>
                                <p className="text-sm font-bold text-slate-400 italic leading-relaxed text-left">배차 취소 시 예약자가 지불한 예약금 전액이 파트너 시스템을 통해 즉시 반환됩니다.</p>
                            </div>
                            <div className="bg-secondary/5 p-8 rounded-[2.5rem] border-2 border-secondary/5 space-y-4 text-left">
                                <span className="material-symbols-outlined text-error text-4xl">block</span>
                                <h4 className="font-black text-on-surface italic uppercase tracking-tighter text-xl text-left leading-none">삼진 아웃 제도</h4>
                                <p className="text-sm font-bold text-slate-400 italic leading-relaxed text-left">30일 이내 3회 취소 발생 시, 10일간 서비스 이용 권한이 제한될 수 있습니다.</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Execution Core */}
                    <aside className="md:col-span-5 space-y-8 text-left">
                        <div className="bg-slate-900 rounded-[3.5rem] p-12 relative overflow-hidden text-left shadow-2xl shadow-slate-900/40">
                            <div className="absolute top-6 right-8 opacity-5">
                                <span className="material-symbols-outlined text-9xl text-white" style={{fontVariationSettings: "'FILL' 1"}}>priority_high</span>
                            </div>
                            
                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-8 text-left leading-none border-l-8 border-secondary pl-6">최종 확인</h3>
                            <p className="text-sm font-bold text-slate-400 italic leading-relaxed mb-10 text-left">
                                지금 취소를 확정하면 예약자에게 즉시 알림이 전송되며, 기사님의 프로필에 <span className="text-secondary underline underline-offset-4 decoration-2">운행 취소</span> 기록이 남게 됩니다.
                            </p>

                            <ul className="space-y-6 mb-12 text-left">
                                <li className="flex gap-4 items-center text-left">
                                    <span className="material-symbols-outlined text-primary">check_circle</span>
                                    <span className="text-sm font-black text-white italic uppercase tracking-widest text-left">예약금 전액 환불 동의</span>
                                </li>
                                <li className="flex gap-4 items-center text-left">
                                    <span className="material-symbols-outlined text-secondary">history</span>
                                    <span className="text-sm font-black text-white italic uppercase tracking-widest text-left">취소 카운트 반영</span>
                                </li>
                            </ul>

                            <button className="w-full py-8 rounded-[2.5rem] bg-gradient-to-br from-secondary to-orange-600 text-white font-black text-xl italic uppercase tracking-[0.2em] shadow-2xl shadow-secondary/30 hover:scale-[1.02] active:scale-95 transition-all mb-6">
                                배차 취소 확정
                            </button>
                            <button onClick={() => navigate(-1)} className="w-full py-6 rounded-[2.5rem] bg-white/5 text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] hover:bg-white/10 transition-all italic">
                                배차 상태 유지
                            </button>
                        </div>

                        <div className="px-6 text-left">
                            <p className="text-[9px] text-slate-300 font-black uppercase tracking-[0.3em] leading-loose italic text-left">
                                *취소를 확정함으로써 귀하는 서비스 약관 제4.2조(배차 무결성 및 신뢰성)를 숙지하고 이에 동의하는 것으로 간주됩니다.
                            </p>
                        </div>
                    </aside>
                </div>
            </main>

            <BottomNavDriver />
        </div>
    );
};

export default ContractCancelDriver;
