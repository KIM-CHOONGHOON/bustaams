import React from 'react';
import { useNavigate } from 'react-router-dom';

const BidDetailDriver = () => {
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
                        <h1 className="font-headline font-black tracking-tighter text-3xl text-teal-900 italic uppercase">Bid Audit & Edit</h1>
                    </div>
                </div>
            </header>

            <main className="pt-48 px-6 max-w-3xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom duration-1000 text-left">
                {/* Customer Request Summary */}
                <section className="space-y-10 text-left">
                    <div className="flex items-baseline justify-between text-left">
                        <h2 className="font-headline font-black text-4xl text-primary italic uppercase tracking-tighter text-left">Client Protocol</h2>
                        <span className="text-[9px] font-black text-secondary bg-secondary/10 px-4 py-1.5 rounded-full uppercase tracking-widest italic">Active Request</span>
                    </div>

                    <div className="bg-white rounded-[3.5rem] p-10 shadow-2xl shadow-teal-900/5 relative overflow-hidden text-left border border-white">
                        <div className="absolute left-0 top-0 bottom-0 w-2 bg-secondary"></div>
                        <div className="space-y-10 text-left">
                            <div>
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em] mb-3 italic">Mission Title</p>
                                <h3 className="font-headline font-black text-3xl text-primary italic leading-none text-left">2024년 추계 워크숍 전용 배차</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-left">
                                <div className="space-y-6 text-left">
                                    <div className="flex items-start gap-4 text-left">
                                        <span className="material-symbols-outlined text-secondary text-2xl">route</span>
                                        <div className="text-left">
                                            <p className="text-[8px] font-black uppercase text-slate-300 mb-1 italic">Route Grid</p>
                                            <div className="flex flex-wrap items-center gap-2 font-black text-on-surface text-sm italic">
                                                <span>서울역</span>
                                                <span className="material-symbols-outlined text-xs text-slate-200">arrow_forward</span>
                                                <span>대전</span>
                                                <span className="material-symbols-outlined text-xs text-slate-200">arrow_forward</span>
                                                <span>부산</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 text-left">
                                        <span className="material-symbols-outlined text-secondary text-2xl">event</span>
                                        <div className="text-left">
                                            <p className="text-[8px] font-black uppercase text-slate-300 mb-1 italic">Mission Sync</p>
                                            <p className="font-black text-on-surface text-sm italic">2024. 10. 24 — 10. 26 (2박 3일)</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6 text-left">
                                    <div className="flex items-start gap-4 text-left">
                                        <span className="material-symbols-outlined text-secondary text-2xl">bus_alert</span>
                                        <div className="text-left">
                                            <p className="text-[8px] font-black uppercase text-slate-300 mb-1 italic">Fleet Spec</p>
                                            <p className="font-black text-on-surface text-sm italic">21인승 프리미엄 리무진 1대</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 text-left">
                                        <span className="material-symbols-outlined text-secondary text-2xl">payments</span>
                                        <div className="text-left">
                                            <p className="text-[8px] font-black uppercase text-slate-300 mb-1 italic">Client Budget</p>
                                            <p className="font-black text-on-surface text-sm italic">₩1,500,000 (Target)</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* My Bid Adjustment */}
                <section className="space-y-10 text-left">
                    <h2 className="font-headline font-black text-4xl text-primary italic uppercase tracking-tighter text-left">My Bid Ledger</h2>
                    
                    <div className="bg-white rounded-[3.5rem] p-10 shadow-2xl shadow-teal-900/5 space-y-10 border border-white text-left">
                        <div className="space-y-4 text-left group">
                            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 px-4 block italic">Active Bid Amount</label>
                            <div className="relative text-left">
                                <span className="absolute left-8 top-1/2 -translate-y-1/2 font-black text-slate-200 text-3xl italic">₩</span>
                                <input className="w-full bg-slate-50 border-4 border-transparent group-focus-within:border-primary/20 rounded-3xl py-8 pl-16 pr-8 font-headline text-5xl font-black text-primary focus:outline-none transition-all italic tracking-tighter" defaultValue="1,650,000" type="text" />
                            </div>
                        </div>

                        <div className="bg-primary/5 rounded-[2.5rem] p-8 flex gap-6 items-start border-2 border-primary/5 text-left">
                            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shrink-0 shadow-lg shadow-primary/20">
                                <span className="material-symbols-outlined text-2xl">lightbulb</span>
                            </div>
                            <div className="space-y-2 text-left">
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary italic">AI Bid Strategy Index</p>
                                <p className="text-sm font-bold text-slate-500 italic leading-relaxed text-left">
                                    주변 기사님들의 유사 요건 평균 입찰 지수는 <span className="text-primary font-black">₩1,580,000 ~ ₩1,720,000</span> 입니다. 현재 입찰가는 경쟁력 있는 구간에 위치해 있습니다.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Breakdown Grid */}
                <section className="space-y-10 text-left">
                    <h2 className="font-headline font-black text-2xl text-primary italic uppercase tracking-widest text-left">Detailed Overhead</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                        {[
                            { label: 'Lodging/Meals', value: '200,000' },
                            { label: 'Tolls/Parking', value: '100,000' },
                            { label: 'Fuel Index', value: '150,000' }
                        ].map((item, i) => (
                            <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-50 group hover:border-primary/20 transition-all text-left">
                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-300 mb-3 italic">{item.label}</p>
                                <div className="flex items-baseline gap-2 text-left">
                                    <span className="text-xs font-black text-slate-200 italic">₩</span>
                                    <input className="bg-transparent border-none p-0 focus:ring-0 text-xl font-black text-primary w-full italic" defaultValue={item.value} type="text" />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Action Grid */}
                <section className="flex flex-col md:flex-row gap-6 pt-10 text-left pb-20">
                    <button className="flex-1 bg-primary text-white py-8 rounded-[2.5rem] font-black text-xl italic uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-6">
                        <span className="material-symbols-outlined text-2xl">edit_square</span>
                        Commit Changes 수정
                    </button>
                    <button className="flex-1 bg-white text-slate-400 py-8 rounded-[2.5rem] font-black text-xl italic uppercase tracking-[0.2em] shadow-xl shadow-teal-900/5 hover:bg-red-50 hover:text-red-500 transition-all active:scale-95 flex items-center justify-center gap-6 border border-slate-50">
                        <span className="material-symbols-outlined text-2xl">cancel</span>
                        Abort Bid 취소
                    </button>
                </section>
            </main>

            {/* Bottom Nav */}
            <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex justify-around items-center px-4 py-2 bg-slate-900 text-slate-500 w-[90%] max-w-lg mx-auto rounded-full shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] border border-white/10">
                <button onClick={() => navigate('/driver-main')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">dashboard</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Home</span>
                </button>
                <button className="flex flex-col items-center justify-center px-5 py-2 text-primary relative">
                    <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-lg"></div>
                    <span className="material-symbols-outlined relative z-10" style={{fontVariationSettings: "'FILL' 1"}}>list_alt</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1 relative z-10 underline decoration-2 underline-offset-4">Audit</span>
                </button>
                <button className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">gavel</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Auction</span>
                </button>
                <button className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">person</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Profile</span>
                </button>
            </nav>
        </div>
    );
};

export default BidDetailDriver;
