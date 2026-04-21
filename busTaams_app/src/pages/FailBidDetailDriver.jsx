import React from 'react';
import { useNavigate } from 'react-router-dom';

const FailBidDetailDriver = () => {
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
                        <h1 className="font-headline font-black tracking-tighter text-3xl text-teal-900 italic uppercase">Auction Audit</h1>
                    </div>
                </div>
            </header>

            <main className="pt-48 px-6 max-w-3xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom duration-1000 text-left">
                {/* Result Title Section */}
                <section className="space-y-4 text-left px-4">
                    <span className="text-secondary font-black tracking-[0.4em] uppercase text-[10px] block px-2 italic">Result Analysis Post-Mortem</span>
                    <div className="flex justify-between items-end text-left gap-8">
                        <h2 className="font-headline text-5xl font-black text-primary leading-[0.85] tracking-tighter italic uppercase text-left">
                            2024년 <br/><span className="text-slate-200 underline decoration-slate-200/20 underline-offset-[8px]">추계 워크숍.</span>
                        </h2>
                        <div className="bg-slate-900 text-white px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest italic border border-white/10 shrink-0">
                            Closed Entry (유찰)
                        </div>
                    </div>
                </section>

                {/* Journey Summary Card */}
                <section className="bg-white rounded-[3.5rem] p-12 shadow-2xl shadow-teal-900/5 border border-white relative overflow-hidden text-left group">
                    <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:rotate-12 transition-transform duration-1000">
                        <span className="material-symbols-outlined text-[8rem]">history</span>
                    </div>
                    <div className="flex items-start gap-8 text-left relative z-10">
                        <div className="flex flex-col items-center gap-2 pt-2">
                            <div className="w-4 h-4 rounded-full bg-primary ring-8 ring-primary/5"></div>
                            <div className="w-1 h-20 bg-slate-50"></div>
                            <div className="w-4 h-4 rounded-full border-4 border-primary bg-white"></div>
                        </div>
                        <div className="flex-1 space-y-10 text-left">
                            <div className="space-y-1 text-left">
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Departure Execution</p>
                                <p className="text-2xl font-black text-primary italic uppercase tracking-tight text-left">서울역 (1호선)</p>
                            </div>
                            <div className="space-y-1 text-left">
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Target Destination</p>
                                <p className="text-2xl font-black text-primary italic uppercase tracking-tight text-left">가평 남이섬 선착장</p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-12 pt-10 border-t border-slate-50 flex items-center justify-between text-left relative z-10">
                        <div className="text-left space-y-1">
                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest italic">Timeline Period</p>
                            <p className="font-black text-primary text-sm italic tracking-tighter uppercase">2024.10.15 — 2024.10.16</p>
                        </div>
                        <div className="text-right space-y-1">
                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest italic">Execution Status</p>
                            <p className="font-black text-secondary text-sm italic tracking-widest uppercase">BID FAILED (유찰)</p>
                        </div>
                    </div>
                </section>

                {/* Price Gap Analysis */}
                <section className="space-y-8 text-left">
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-primary px-4 text-left">Pricing Breakdown Analysis</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                        <div className="bg-slate-50 rounded-[2.5rem] p-10 relative overflow-hidden group hover:bg-white hover:shadow-2xl hover:shadow-teal-900/5 transition-all text-left">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-6xl">person</span>
                            </div>
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mb-4 italic">Client Target Budget</p>
                            <p className="text-3xl font-black italic headline tracking-tighter text-primary leading-none text-left">₩1,500,000</p>
                        </div>
                        <div className="bg-primary rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl shadow-primary/30 group hover:scale-[1.02] transition-all text-left">
                            <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:rotate-12 transition-transform">
                                <span className="material-symbols-outlined text-6xl text-white">gavel</span>
                            </div>
                            <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.3em] mb-4 italic">My Submitted Proposal</p>
                            <p className="text-3xl font-black italic headline tracking-tighter text-white leading-none text-left">₩1,650,000</p>
                            <div className="mt-8 inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-secondary italic">
                                <span className="material-symbols-outlined text-xs">trending_up</span>
                                Deviation: +10% Above Target
                            </div>
                        </div>
                    </div>
                </section>

                {/* Fleet Proposal */}
                <section className="space-y-8 text-left">
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-primary px-4 text-left">Proposed Fleet Intel</h3>
                    <div className="bg-white border-2 border-slate-50 rounded-[3.5rem] p-4 text-left shadow-2xl shadow-teal-900/5 group">
                        <div className="aspect-video w-full rounded-[2.5rem] overflow-hidden bg-slate-50 border-8 border-white shadow-inner relative">
                            <img className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCuRj_K06co_jZ87A_BB-ZBlL4FoyNXgCkIIcxx5_ta7XaSKskpNi-Mw3MzbNE-9RqMUZZw8MPpYUOmQOTNrWVRpv-10-iL5gR2jYh8Q5vkgxqFDJXqPLlXukOtfJWqPhd75Nms8riAj1F2fSmWaFdZIOKf01WKFutbBAFA5RvyGjRAU6MyAjKPwMO3Jqfjq5OPhUD_OqYBb_aM-8knorNt3f9kBvnseh1jdRqh8XzYph-MQePxD8PDRAhfm_cEahlgcyhTboIuKIY" />
                            <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity duration-700">
                                <span className="text-white font-black italic text-xl uppercase tracking-[0.4em]">Audit Grayscale Mode</span>
                            </div>
                        </div>
                        <div className="p-10 space-y-6 text-left">
                            <div className="text-left space-y-1">
                                <h4 className="text-3xl font-black text-primary italic uppercase tracking-tight text-left">현대 유니버스 프레스티지</h4>
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">28 Seats • Elite Class • MY 2023</p>
                            </div>
                            <div className="flex flex-wrap gap-3 text-left">
                                {['WIFI', 'USB CHARGER', 'RECLINING', 'VOD'].map(tag => (
                                    <span key={tag} className="px-4 py-2 bg-slate-50 rounded-full text-[8px] font-black text-slate-400 uppercase tracking-widest italic border border-slate-100">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Final Action */}
                <section className="pt-10 text-left pb-24">
                    <button onClick={() => navigate('/estimate-list-driver')} className="w-full py-8 rounded-[2.5rem] bg-gradient-to-br from-primary to-teal-800 text-white font-black text-sm italic uppercase tracking-[0.4em] shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all italic text-center">
                        Explore Active Requests 다른 요청 확인
                    </button>
                    <p className="text-center text-[9px] font-black text-slate-300 mt-6 uppercase tracking-widest italic">
                        유찰된 데이터는 입찰 보관함에서 30일간 보존됩니다.
                    </p>
                </section>
            </main>

            {/* Bottom Nav */}
            <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex justify-around items-center px-4 py-2 bg-slate-900 text-slate-500 w-[90%] max-w-lg mx-auto rounded-full shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] border border-white/10">
                <button onClick={() => navigate('/driver-main')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">dashboard</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Home</span>
                </button>
                <button onClick={() => navigate('/estimate-list-driver')} className="flex flex-col items-center justify-center px-5 py-2 text-primary relative">
                    <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-lg"></div>
                    <span className="material-symbols-outlined relative z-10" style={{fontVariationSettings: "'FILL' 1"}}>gavel</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1 relative z-10 underline decoration-2 underline-offset-4">Auction</span>
                </button>
                <button onClick={() => navigate('/completed-trips-driver')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">history</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">History</span>
                </button>
                <button onClick={() => navigate('/rating-reply-driver')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">star</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Intel</span>
                </button>
            </nav>
        </div>
    );
};

export default FailBidDetailDriver;
