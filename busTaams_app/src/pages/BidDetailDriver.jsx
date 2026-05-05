import React from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNavDriver from '../components/BottomNavDriver';

const BidDetailDriver = () => {
    const navigate = useNavigate();

    return (
        <div className="bg-background text-on-surface min-h-[100dvh] pb-32 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/40 backdrop-blur-3xl border-b border-white/20 py-6">
                <div className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto">
                    <div className="flex items-center gap-6 text-left">
                        <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl text-teal-800 shadow-xl shadow-teal-900/5 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                        </button>
                        <h1 className="font-headline font-black tracking-tighter text-2xl text-teal-900 italic uppercase">입찰 상세 정보 및 수정</h1>
                    </div>
                </div>
            </header>

            <main className="pt-32 px-6 max-w-3xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom duration-1000 text-left">
                {/* Customer Request Summary */}
                <section className="space-y-8 text-left">
                    <div className="flex items-baseline justify-between text-left">
                        <h2 className="font-headline font-black text-3xl text-primary italic uppercase tracking-tighter text-left">고객 요청 요약</h2>
                        <span className="text-[10px] font-black text-secondary bg-secondary/10 px-4 py-1.5 rounded-full uppercase tracking-widest italic">진행 중인 요청</span>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-teal-900/5 relative overflow-hidden text-left border border-white">
                        <div className="absolute left-0 top-0 bottom-0 w-2 bg-secondary"></div>
                        <div className="space-y-8 text-left">
                            <div>
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-2 italic">운행 제목</p>
                                <h3 className="font-headline font-black text-2xl text-primary italic leading-tight text-left">2024년 추계 워크숍 전용 배차</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                                <div className="space-y-6 text-left">
                                    <div className="flex items-start gap-4 text-left">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-secondary text-xl">route</span>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-black uppercase text-slate-300 mb-1 italic">운행 경로</p>
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
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-secondary text-xl">event</span>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-black uppercase text-slate-300 mb-1 italic">운행 일정</p>
                                            <p className="font-black text-on-surface text-sm italic">2024. 10. 24 — 10. 26 (2박 3일)</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6 text-left">
                                    <div className="flex items-start gap-4 text-left">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-secondary text-xl">bus_alert</span>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-black uppercase text-slate-300 mb-1 italic">차량 정보</p>
                                            <p className="font-black text-on-surface text-sm italic">21인승 프리미엄 리무진 1대</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 text-left">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-secondary text-xl">payments</span>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-black uppercase text-slate-300 mb-1 italic">고객 희망 예산</p>
                                            <p className="font-black text-on-surface text-sm italic">₩1,500,000 (Target)</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* My Bid Adjustment */}
                <section className="space-y-8 text-left">
                    <h2 className="font-headline font-black text-3xl text-primary italic uppercase tracking-tighter text-left">내 입찰 정보</h2>
                    
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-teal-900/5 space-y-8 border border-white text-left">
                        <div className="space-y-4 text-left group">
                            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 px-4 block italic">현재 입찰 금액</label>
                            <div className="relative text-left">
                                <span className="absolute left-8 top-1/2 -translate-y-1/2 font-black text-slate-200 text-3xl italic">₩</span>
                                <input className="w-full bg-slate-50 border-4 border-transparent group-focus-within:border-primary/20 rounded-3xl py-6 pl-16 pr-8 font-headline text-4xl font-black text-primary focus:outline-none transition-all italic tracking-tighter" defaultValue="1,650,000" type="text" />
                            </div>
                        </div>

                        <div className="bg-primary/5 rounded-[2rem] p-6 flex gap-6 items-start border-2 border-primary/5 text-left">
                            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shrink-0 shadow-lg shadow-primary/20">
                                <span className="material-symbols-outlined text-2xl">lightbulb</span>
                            </div>
                            <div className="space-y-2 text-left">
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary italic">AI 입찰 전략 분석</p>
                                <p className="text-sm font-bold text-slate-500 italic leading-relaxed text-left">
                                    주변 기사님들의 유사 요건 평균 입찰가는 <span className="text-primary font-black">₩1,580,000 ~ ₩1,720,000</span> 입니다. 현재 입찰가는 경쟁력 있는 구간에 위치해 있습니다.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Breakdown Grid */}
                <section className="space-y-8 text-left">
                    <h2 className="font-headline font-black text-2xl text-primary italic uppercase tracking-widest text-left">항목별 상세 비용</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                        {[
                            { label: '숙박/식사비', value: '200,000' },
                            { label: '통행/주차료', value: '100,000' },
                            { label: '유류비(인덱스)', value: '150,000' }
                        ].map((item, i) => (
                            <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-50 group hover:border-primary/20 transition-all text-left">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-2 italic">{item.label}</p>
                                <div className="flex items-baseline gap-2 text-left">
                                    <span className="text-xs font-black text-slate-200 italic">₩</span>
                                    <input className="bg-transparent border-none p-0 focus:ring-0 text-lg font-black text-primary w-full italic" defaultValue={item.value} type="text" />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Action Grid */}
                <section className="flex flex-col md:flex-row gap-4 pt-6 text-left pb-12">
                    <button className="flex-1 bg-primary text-white py-6 rounded-3xl font-black text-lg italic uppercase tracking-[0.1em] shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4">
                        <span className="material-symbols-outlined text-xl">edit_square</span>
                        수정사항 적용
                    </button>
                    <button className="flex-1 bg-white text-slate-400 py-6 rounded-3xl font-black text-lg italic uppercase tracking-[0.1em] shadow-xl shadow-teal-900/5 hover:bg-red-50 hover:text-red-500 transition-all active:scale-95 flex items-center justify-center gap-4 border border-slate-50">
                        <span className="material-symbols-outlined text-xl">cancel</span>
                        입찰 취소
                    </button>
                </section>
            </main>

            {/* Bottom Nav */}
            <BottomNavDriver />
        </div>
    );
};

export default BidDetailDriver;
