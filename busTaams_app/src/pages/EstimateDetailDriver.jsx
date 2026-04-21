import React from 'react';
import { useNavigate } from 'react-router-dom';

const EstimateDetailDriver = () => {
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
                        <h1 className="font-headline font-black tracking-tighter text-3xl text-teal-900 italic uppercase">Submit Estimate</h1>
                    </div>
                    <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-primary-fixed shadow-2xl rotate-3">
                        <img alt="User profile" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD4vN2iJhYT28dqF3bXn1UtFElHnQDFzWTM9CdNaAeMcn5Y85HNmY9B2z1Nknl7_0LRROWW6Kp6ePpluuaaJm60f9fheJfiNCV-IjIldyuNn0rqoOsilL34BrGPY00oGI6qIOd2cKXQSsudhdeVbyanrHnuCqiifKuAoRcDX2pk1oO0TDo7Izx1aFfEP7T9ggFWTGdVNwsWWLAAqtiCftrqWM46536UPanJUNNd6GPoEFB-bpkobjeORZueHC5FbV1a-Z71vgICFjo" />
                    </div>
                </div>
            </header>

            <main className="pt-48 px-6 max-w-7xl mx-auto space-y-20 animate-in fade-in slide-in-from-bottom duration-1000 text-left">
                {/* Editorial Header Section */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end text-left">
                    <div className="md:col-span-8 space-y-4 text-left">
                        <span className="font-headline text-secondary font-black tracking-[0.4em] uppercase text-[10px] block px-2 italic">Auction ID: #BT-88429</span>
                        <h2 className="font-headline font-black text-6xl md:text-8xl text-primary leading-[0.9] tracking-tighter italic uppercase text-left">
                            Submit <br/><span className="text-secondary underline decoration-secondary/20 underline-offset-[12px]">Estimate.</span>
                        </h2>
                    </div>
                    <div className="md:col-span-4 text-left hidden md:block border-l-4 border-slate-50 pl-8">
                        <p className="text-slate-400 text-lg font-bold italic tracking-tight leading-snug text-left">
                            경쟁력 있는 견적으로 노선을 확보하세요. 프리미엄 운송을 위한 정밀한 가격 책정 제안.
                        </p>
                    </div>
                </div>

                {/* Content Canvas */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 text-left">
                    {/* Left Column: Trip Details */}
                    <aside className="lg:col-span-4 text-left">
                        <div className="bg-slate-900 rounded-[3.5rem] p-12 space-y-12 shadow-2xl shadow-slate-900/40 sticky top-48 text-left">
                            <h3 className="font-headline font-black text-2xl text-white italic border-l-8 border-secondary pl-6 text-left uppercase">Trip Protocol</h3>
                            
                            <div className="space-y-10 text-left">
                                {[
                                    { icon: 'location_on', label: 'Origin Base', value: '시애틀-타코마 국제공항 (SEA)' },
                                    { icon: 'route', label: 'Waypoints Grid', value: ['1: 수원역', '2: 대전복합터미널', '3: 동대구역'], isList: true },
                                    { icon: 'flag', label: 'Destination Point', value: '밴쿠버 워터프런트, BC' },
                                    { icon: 'calendar_month', label: 'Departure Sync', value: '2024. 10. 24 • AM 09:00' },
                                    { icon: 'group', label: 'Payload Capacity', value: '45-52 Passengers' }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-start gap-6 text-left">
                                        <div className="min-w-[48px] h-12 rounded-2xl bg-white/5 flex items-center justify-center text-secondary border border-white/10 shadow-inner">
                                            <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2 italic">{item.label}</p>
                                            {item.isList ? (
                                                <div className="space-y-1 text-left">
                                                    {item.value.map((v, idx) => (
                                                        <p key={idx} className="font-black text-white italic text-lg leading-none">{v}</p>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="font-black text-white italic text-lg leading-tight text-left">{item.value}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>

                    {/* Right Column: Form */}
                    <section className="lg:col-span-8 text-left space-y-12 pb-20">
                        <div className="bg-white/40 backdrop-blur-2xl p-10 md:p-16 rounded-[4.5rem] shadow-2xl shadow-teal-900/5 border border-white relative overflow-hidden text-left">
                            <div className="absolute -top-32 -right-32 w-80 h-80 bg-primary/5 rounded-full blur-[100px]"></div>
                            
                            <form className="relative z-10 space-y-12 text-left">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left">
                                    <div className="space-y-4 text-left group">
                                        <div className="flex justify-between items-center px-4 text-left">
                                            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 italic">Total Bid Amount</label>
                                            <span className="text-[9px] font-black text-secondary uppercase tracking-[0.3em]">KRW Index</span>
                                        </div>
                                        <div className="relative text-left">
                                            <span className="absolute left-8 top-1/2 -translate-y-1/2 font-black text-slate-300 text-2xl italic">₩</span>
                                            <input className="w-full bg-white border-4 border-slate-50 group-focus-within:border-primary rounded-[2.5rem] py-8 pl-14 pr-8 font-headline text-4xl font-black text-on-surface focus:outline-none transition-all shadow-sm italic" placeholder="1,500,000" type="number" />
                                        </div>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-loose px-4">AI Rec Range: ₩1,200,000 - ₩1,550,000</p>
                                    </div>

                                    <div className="space-y-4 text-left group">
                                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 px-4 block italic">Fleet Selection</label>
                                        <div className="relative text-left">
                                            <select className="w-full bg-white border-4 border-slate-50 group-focus-within:border-primary rounded-[2.5rem] py-8 px-8 font-black text-lg text-on-surface focus:outline-none transition-all shadow-sm appearance-none cursor-pointer italic">
                                                <option>Choose Active Member...</option>
                                                <option>코치 #402 (Setra S417)</option>
                                                <option>코치 #509 (MCI J4500)</option>
                                                <option>코치 #112 (Prevost H3-45)</option>
                                            </select>
                                            <span className="material-symbols-outlined absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 text-left group">
                                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 px-4 block italic">Service Ledger & Notes</label>
                                    <textarea className="w-full bg-white border-4 border-slate-50 group-focus-within:border-primary rounded-[3rem] p-10 font-black text-lg text-on-surface focus:outline-none transition-all shadow-sm placeholder:text-slate-200" placeholder="Wi-Fi, 화장실 상태 또는 운전기사 경력과 같은 편의 시설을 언급해 주세요..." rows={5}></textarea>
                                </div>

                                <div className="p-8 rounded-[2.5rem] bg-slate-50 border-2 border-white flex items-center gap-6 text-left">
                                    <input className="w-8 h-8 rounded-xl border-4 border-white bg-white text-primary focus:ring-0 shadow-sm" type="checkbox" />
                                    <label className="text-[11px] font-black text-slate-500 italic leading-snug text-left uppercase tracking-tighter">
                                        선택한 차량이 모든 안전 요구 사항을 충족하며 이 노선에 대한 보험이 최신 상태임을 <span className="text-primary underline">디지털 서명</span>으로 인증합니다.
                                    </label>
                                </div>

                                <div className="pt-8 flex flex-col md:flex-row items-center gap-10 text-left">
                                    <button className="w-full md:w-auto px-20 py-8 bg-gradient-to-br from-primary to-primary-container text-white font-black font-headline text-xl italic uppercase tracking-[0.2em] rounded-full shadow-2xl shadow-primary/30 hover:shadow-primary/50 active:scale-95 transition-all duration-500" type="submit">
                                        Post Estimate
                                    </button>
                                    <button className="text-slate-300 font-black text-[10px] uppercase tracking-[0.4em] hover:text-secondary transition-all italic" type="button">
                                        Store in Cache
                                    </button>
                                </div>
                            </form>
                        </div>
                    </section>
                </div>
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
                <button className="flex flex-col items-center justify-center px-5 py-2 text-primary relative">
                    <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-lg"></div>
                    <span className="material-symbols-outlined relative z-10" style={{fontVariationSettings: "'FILL' 1"}}>payments</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1 relative z-10 underline decoration-2 underline-offset-4">Bid</span>
                </button>
                <button className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">person</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Profile</span>
                </button>
            </nav>
        </div>
    );
};

export default EstimateDetailDriver;
