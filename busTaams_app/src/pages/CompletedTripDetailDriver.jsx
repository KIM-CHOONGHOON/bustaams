import React from 'react';
import { useNavigate } from 'react-router-dom';

const CompletedTripDetailDriver = () => {
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
                        <h1 className="font-headline font-black tracking-tighter text-3xl text-teal-900 italic uppercase">Archive Details</h1>
                    </div>
                </div>
            </header>

            <main className="pt-48 px-6 max-w-3xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom duration-1000 text-left">
                {/* Journey Summary Hero */}
                <section className="relative overflow-hidden bg-primary rounded-[3.5rem] p-12 text-white shadow-[0_40px_100px_-20px_rgba(0,104,95,0.4)] text-left">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                    <div className="relative z-10 flex flex-col gap-4 text-left">
                        <div className="flex items-center gap-3 text-left">
                            <span className="px-5 py-1.5 bg-white/20 rounded-full text-[10px] font-black tracking-[0.3em] uppercase italic">MISSION COMPLETED</span>
                        </div>
                        <h2 className="font-headline text-5xl font-black italic uppercase tracking-tighter text-left leading-none">
                            서울역 <span className="text-secondary tracking-widest mx-2">→</span> 부산
                        </h2>
                        <div className="mt-6 flex flex-col text-left">
                            <span className="text-white/60 text-[10px] font-black uppercase tracking-widest italic mb-2">Total Settlement Value</span>
                            <span className="text-6xl font-black italic headline tracking-tighter">₩1,650,000</span>
                        </div>
                    </div>
                    <div className="absolute bottom-8 right-12 opacity-10">
                        <span className="material-symbols-outlined text-[10rem]" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>
                    </div>
                </section>

                {/* Timeline Section */}
                <section className="space-y-8 text-left">
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-primary flex items-center gap-4 text-left">
                        <span className="material-symbols-outlined text-secondary">route</span> Operation Audit
                    </h3>
                    
                    <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl shadow-teal-900/5 relative text-left border border-white">
                        <div className="absolute left-14 top-20 bottom-20 w-1 bg-slate-50"></div>
                        <div className="space-y-12 text-left">
                            <div className="relative pl-16 text-left">
                                <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-primary ring-8 ring-primary/10 z-10"></div>
                                <div className="text-left space-y-1">
                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Departure Execution</p>
                                    <h4 className="text-xl font-black text-primary italic uppercase tracking-tight text-left italic">서울역 광장 (HQ)</h4>
                                    <p className="text-slate-400 text-sm font-bold italic tracking-tighter">2024. 05. 20 • AM 08:00</p>
                                </div>
                            </div>
                            <div className="relative pl-16 text-left">
                                <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-secondary ring-8 ring-secondary/10 z-10"></div>
                                <div className="text-left space-y-1">
                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Checkpoint Delta</p>
                                    <h4 className="text-xl font-black text-primary italic uppercase tracking-tight text-left italic">천안삼거리 휴게소</h4>
                                    <p className="text-slate-400 text-sm font-bold italic tracking-tighter">2024. 05. 20 • AM 10:30</p>
                                </div>
                            </div>
                            <div className="relative pl-16 text-left">
                                <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-primary ring-8 ring-primary/10 z-10"></div>
                                <div className="text-left space-y-1">
                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Arrival Confirmation</p>
                                    <h4 className="text-xl font-black text-primary italic uppercase tracking-tight text-left italic">부산 해운대역 (Term)</h4>
                                    <p className="text-slate-400 text-sm font-bold italic tracking-tighter">2024. 05. 20 • PM 02:45</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Vehicle Bento Grid */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                    <div className="bg-slate-50 p-10 rounded-[2.5rem] flex flex-col justify-between min-h-[220px] transition-all hover:bg-white hover:shadow-2xl hover:shadow-teal-900/5 group text-left">
                        <span className="material-symbols-outlined text-primary text-4xl group-hover:scale-110 transition-transform duration-500">airport_shuttle</span>
                        <div className="text-left">
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mb-2 italic">Fleet Asset Model</p>
                            <h4 className="text-2xl font-black text-primary italic uppercase tracking-tight text-left">현대 유니버스 프레스티지</h4>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-10 rounded-[2.5rem] flex flex-col justify-between min-h-[220px] transition-all hover:bg-white hover:shadow-2xl hover:shadow-teal-900/5 group text-left">
                        <span className="material-symbols-outlined text-secondary text-4xl group-hover:scale-110 transition-transform duration-500">id_card</span>
                        <div className="text-left">
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mb-2 italic">Official License Plate</p>
                            <h4 className="text-2xl font-black text-secondary italic uppercase tracking-widest text-left">서울 70 바 1234</h4>
                        </div>
                    </div>
                </section>

                {/* Settlement Table */}
                <section className="space-y-8 text-left">
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-primary px-4 text-left">Financial Breakdown</h3>
                    <div className="bg-white rounded-[3.5rem] p-12 shadow-2xl shadow-teal-900/5 border border-white text-left">
                        <div className="space-y-8 text-left">
                            {[
                                { label: 'Base Fleet Rental', value: '1,400,000' },
                                { label: 'Driver Lodging/Meals', value: '150,000' },
                                { label: 'Tolls & Parking Grid', value: '65,000' },
                                { label: 'Fuel Index Settlement', value: '35,000' }
                            ].map((item, i) => (
                                <div key={i} className="flex justify-between items-center text-left border-b border-slate-50 pb-6 group">
                                    <span className="text-sm font-bold text-slate-400 italic uppercase tracking-widest group-hover:text-primary transition-colors">{item.label}</span>
                                    <span className="font-black text-primary italic text-lg">₩{item.value}</span>
                                </div>
                            ))}
                            <div className="pt-8 flex justify-between items-center text-left">
                                <span className="text-2xl font-black italic uppercase tracking-tighter text-on-surface">Total Cleared</span>
                                <span className="text-4xl font-black italic headline tracking-tighter text-secondary">₩1,650,000</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Review Section */}
                <section className="space-y-8 text-left">
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-primary px-4 text-left">Mission Debrief</h3>
                    <div className="bg-slate-900 rounded-[3.5rem] p-12 shadow-2xl shadow-slate-900/40 relative overflow-hidden text-left">
                        <div className="absolute top-12 right-12 flex items-center gap-1">
                            {[1,2,3,4,5].map(i => (
                                <span key={i} className="material-symbols-outlined text-secondary text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                            ))}
                        </div>
                        
                        <div className="flex items-center gap-6 mb-10 text-left">
                            <div className="w-16 h-16 rounded-[1.5rem] overflow-hidden border-4 border-white/10 rotate-3 p-1">
                                <img className="w-full h-full object-cover rounded-xl" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB4R2jh8VJc8ROSqRte6_1Y0juy2shoZucaOFvKNhcFEXVdnK7OUSpSeIZJNewDFaMjxxmfFrCcryi4-vMUPWkxg26cBBxF2bC03SOkb8-F009-yAJ4WsGdX_tfmxin0zyvVgpruM0uSxRJRzS7kVYk1rJvWCPYFJ_GjR__yl76jo5Rm0_VyzVO9cynBG3ZBBTaRLc2gMiZFf9fbUgwCZIrMHwFMFeggrWvJnZuvfKO4NwYZuyYYGfSgkhoOZou4Etaf7fkOcSLs8w" />
                            </div>
                            <div className="text-left space-y-1">
                                <p className="font-black text-white italic text-xl">김민준 Client</p>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Logged: 2024. 05. 21</p>
                            </div>
                        </div>
                        
                        <p className="text-2xl font-black italic text-slate-300 leading-tight text-left relative z-10 px-6 border-l-8 border-secondary">
                            "기사님이 너무 친절하셨어요! 운전도 정말 부드럽게 잘 해주셔서 부산까지 편안하게 잘 도착했습니다. 다음에도 꼭 이 기사님과 함께하고 싶네요."
                        </p>
                    </div>
                </section>

                {/* Final Actions */}
                <section className="flex flex-col gap-6 py-12 text-left pb-24">
                    <button className="w-full py-8 rounded-[2.5rem] bg-white text-primary font-black text-sm italic uppercase tracking-[0.4em] shadow-xl shadow-teal-900/5 hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-6 border border-slate-50 italic">
                        <span className="material-symbols-outlined">forum</span>
                        Open busTaams Talk History
                    </button>
                    <button onClick={() => navigate('/rating-reply-driver')} className="w-full py-8 rounded-[2.5rem] bg-gradient-to-br from-primary to-teal-800 text-white font-black text-sm italic uppercase tracking-[0.4em] shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-6 italic">
                        <span className="material-symbols-outlined">rate_review</span>
                        Manage Rating & Feedback
                    </button>
                </section>
            </main>

            {/* Bottom Nav */}
            <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex justify-around items-center px-4 py-2 bg-slate-900 text-slate-500 w-[90%] max-w-lg mx-auto rounded-full shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] border border-white/10">
                <button onClick={() => navigate('/driver-main')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">dashboard</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Home</span>
                </button>
                <button onClick={() => navigate('/estimate-list-driver')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">gavel</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Auction</span>
                </button>
                <button onClick={() => navigate('/completed-trips-driver')} className="flex flex-col items-center justify-center px-5 py-2 text-primary relative">
                    <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-lg"></div>
                    <span className="material-symbols-outlined relative z-10" style={{fontVariationSettings: "'FILL' 1"}}>manage_history</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1 relative z-10 underline decoration-2 underline-offset-4">Audit</span>
                </button>
                <button onClick={() => navigate('/driver-certification')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">person</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Profile</span>
                </button>
            </nav>
        </div>
    );
};

export default CompletedTripDetailDriver;
