import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const ReviewDetailCustomer = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    return (
        <div className="bg-background text-on-surface min-h-screen pb-40 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-3xl border-b border-white py-4 shadow-sm">
                <div className="flex items-center justify-between px-6 h-18 w-full max-w-4xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="material-symbols-outlined text-teal-700 hover:bg-slate-50 p-2 rounded-full transition-all">arrow_back</button>
                        <h1 className="font-headline font-black text-xl tracking-tighter text-teal-900 italic">Review Detail</h1>
                    </div>
                    <div className="text-teal-800 font-black text-[10px] opacity-40 uppercase tracking-[0.3em]">
                        Verified Feedback
                    </div>
                </div>
            </header>

            <main className="pt-32 px-6 max-w-3xl mx-auto space-y-12">
                {/* Main Kinetic Review Card */}
                <section className="bg-white rounded-[4rem] shadow-2xl shadow-teal-900/[0.04] overflow-hidden relative border border-slate-50 animate-in fade-in slide-in-from-bottom duration-1000 text-left">
                    {/* Visual Status Link */}
                    <div className="absolute top-0 left-0 w-2 h-40 bg-secondary opacity-20 rounded-br-full"></div>
                    
                    <div className="p-12 md:p-16">
                        {/* Trip Meta Info */}
                        <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-16 text-left">
                            <div className="space-y-4 text-left">
                                <p className="text-[10px] font-black text-secondary uppercase tracking-[0.4em] mb-2">Historical Journey</p>
                                <h2 className="font-headline text-4xl md:text-5xl font-black text-on-surface tracking-tighter flex flex-wrap items-center gap-6 leading-none">
                                    Seoul 
                                    <span className="material-symbols-outlined text-slate-200 text-4xl">east</span> 
                                    Busan
                                </h2>
                                <div className="flex items-center gap-3 text-slate-400 font-black text-xs uppercase tracking-widest mt-4">
                                    <span className="material-symbols-outlined text-sm">calendar_today</span>
                                    <span>2023. 11. 15</span>
                                </div>
                            </div>
                            <div className="bg-primary/5 px-8 py-4 rounded-[2rem] flex items-center gap-3 border border-primary/10 shadow-inner">
                                <span className="text-primary font-black text-4xl tracking-tighter">5.0</span>
                                <div className="flex flex-col">
                                    <div className="flex">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <span key={s} className="material-symbols-outlined text-primary text-lg" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                                        ))}
                                    </div>
                                    <span className="text-[8px] font-black text-primary/40 uppercase tracking-widest mt-1">Perfect Score</span>
                                </div>
                            </div>
                        </div>

                        {/* User Review Text */}
                        <div className="relative mb-20 text-left">
                            <span className="material-symbols-outlined absolute -top-10 -left-6 text-slate-50 text-[120px] -z-10 select-none">format_quote</span>
                            <p className="text-on-surface leading-[1.6] text-2xl md:text-3xl font-black tracking-tight relative z-10 px-4 md:px-0 bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                                "기사님이 너무 친절하시고 차량 상태도 깨끗해서 편안하게 여행했습니다. 다음에도 꼭 이용하고 싶네요!"
                            </p>
                        </div>

                        {/* Tonal Separator */}
                        <div className="h-px w-full bg-slate-50 mb-16"></div>

                        {/* Captain's Response Section */}
                        <div className="bg-slate-50 rounded-[3rem] p-10 relative overflow-hidden group text-left">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                            <div className="flex items-center gap-6 mb-8 text-left relative z-10">
                                <div className="relative text-left">
                                    <img alt="Captain" className="w-20 h-20 rounded-3xl object-cover shadow-xl rotate-2 ring-4 ring-white" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBb-Cs5OxgwPCbvHvg-gdg_4H5Zhw_2tjFoeHycnOjmwI6OCv5zKpr4NYF687THu-ReBNM5xQnvGro1sArwoV2u_eiFRVvEYDm6VMm4B7ZRgx8jJJdg2Ci7nbouJE9c1MKIJ5_v5cDOBT0G1OqKtOhbIEQt2gsREYXT-rzZJHHeIRZHSEMY0S3AsPTancDb1yMMrEsq6qcZL6sbDqxeV0S4zbfyJOrc-SK5zVeH32mt1FXrDO1qjRC7n1VInTtxBfdN41M-08NNC8"/>
                                    <div className="absolute -bottom-2 -right-2 bg-primary p-2 rounded-xl border-2 border-white shadow-lg">
                                        <span className="material-symbols-outlined text-white text-sm" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>
                                    </div>
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1">Partner Response</p>
                                    <h3 className="font-black text-on-surface text-2xl tracking-tighter">김영호 캡틴</h3>
                                </div>
                            </div>
                            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-teal-900/[0.02] text-left relative z-10 border border-white">
                                <p className="text-slate-500 leading-relaxed font-bold text-lg tracking-tight italic">
                                    "소중한 후기 감사합니다! 승객님들의 편안한 여행을 위해 항상 최선을 다하고 있습니다. 즐거운 여정 되셨다니 보람차네요. 다음에 또 뵙기를 기대하겠습니다."
                                </p>
                            </div>
                            {/* Iconic Bus Backdrop */}
                            <div className="absolute bottom-4 right-10 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                                <span className="material-symbols-outlined text-[140px] text-primary">directions_bus</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Decorative Footer */}
                <div className="pt-12 text-center opacity-10">
                    <div className="w-1 h-20 bg-gradient-to-b from-primary to-transparent mx-auto"></div>
                </div>
            </main>

            {/* Premium Bottom Nav */}
            <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex justify-around items-center px-4 py-2 bg-slate-900 text-white w-[90%] max-w-md mx-auto rounded-full shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] border border-white/10">
                <button onClick={() => navigate('/customer-dashboard')} className="flex flex-col items-center justify-center text-slate-500 px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">gavel</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Auction</span>
                </button>
                <button onClick={() => navigate('/reservation-list')} className="flex flex-col items-center justify-center text-slate-500 px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 0"}}>directions_bus</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Trips</span>
                </button>
                <button className="flex flex-col items-center justify-center px-5 py-2 text-white relative">
                    <div className="absolute inset-0 bg-white/10 rounded-2xl blur-lg"></div>
                    <span className="material-symbols-outlined relative z-10" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1 relative z-10 underline decoration-2 underline-offset-4">Reviews</span>
                </button>
                <button onClick={() => navigate('/profile-customer')} className="flex flex-col items-center justify-center bg-white/20 text-white rounded-full w-12 h-12 shadow-lg active:scale-90 transition-all">
                    <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>person</span>
                </button>
            </nav>
        </div>
    );
};

export default ReviewDetailCustomer;
