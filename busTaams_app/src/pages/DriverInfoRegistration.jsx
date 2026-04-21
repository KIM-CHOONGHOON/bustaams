import React from 'react';
import { useNavigate } from 'react-router-dom';

const DriverInfoRegistration = () => {
    const navigate = useNavigate();

    return (
        <div className="bg-background text-on-surface min-h-[100dvh] pb-48 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/40 backdrop-blur-3xl border-b border-white/20 py-6">
                <div className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto">
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl text-teal-800 shadow-xl shadow-teal-900/5 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-lg">menu</span>
                        </button>
                        <h1 className="font-headline font-black tracking-tighter text-3xl text-teal-900 italic">busTaams</h1>
                    </div>
                    <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-2xl rotate-3">
                        <img alt="User profile" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBMgxGWC9zA8wHaq8KCM2yeSxwR9zvH54fYWV58TZDIA1wEQpucK2crxw4gmjwgAUCHfuAgjYkL7eG_3tEPmfq_bwVQqD0eLtxVwo8g7as_1hz29rELaWLgkq4BR-qBL_2twqIvuQXB1xsPuoD5vwtfc6zLpC2nJH_yEFJSXjbLpXCUljQOuXnE3cdS_d8AM1uc1WJvBndzSPpZGpAd0YbFFUWguWSK0xJ9cWaZ1679m3s3CULfwz5WPFYMVLbp8LI1oxFA_QWDniY" />
                    </div>
                </div>
            </header>

            <main className="pt-40 px-6 max-w-7xl mx-auto space-y-20 animate-in fade-in slide-in-from-bottom duration-1000">
                {/* Editorial Header Section */}
                <section className="grid grid-cols-1 md:grid-cols-12 gap-8 text-left">
                    <div className="md:col-span-8 space-y-6 text-left">
                        <span className="text-secondary font-black tracking-[0.4em] uppercase text-[10px] block px-2">Onboarding Protocol</span>
                        <h2 className="font-headline text-6xl md:text-8xl font-black text-primary tracking-tighter leading-[0.9] italic text-left">
                            Welcome <br/><span className="text-secondary">Partner.</span>
                        </h2>
                        <p className="text-slate-400 text-xl font-bold tracking-tight italic leading-relaxed max-w-xl text-left">
                            자격 증명을 확인하여 독점 버스 경매 및 대규모 운송 계약에 참여하세요. 전문적인 파격적 파트너십이 여기서 시작됩니다.
                        </p>
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 text-left">
                    {/* Left Side: Profile Photo */}
                    <aside className="lg:col-span-3 space-y-8 text-left">
                        <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl shadow-teal-900/5 border border-white text-center group">
                            <div className="relative flex flex-col items-center">
                                <div className="w-48 h-48 rounded-full bg-slate-50 flex items-center justify-center overflow-hidden border-8 border-white shadow-inner mb-6 group-hover:scale-105 transition-transform duration-500 relative">
                                    <span className="material-symbols-outlined text-[80px] text-slate-100" style={{fontVariationSettings: "'FILL' 1"}}>account_circle</span>
                                    <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="material-symbols-outlined text-white text-4xl">photo_camera</span>
                                    </div>
                                </div>
                                <h3 className="font-headline font-black text-xl text-on-surface mb-2 italic">Master Profile</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed px-4">기사 ID 카드를 위한 선명하고 전문적인 정면 사진을 제공해 주세요.</p>
                                <button className="w-full mt-8 py-5 rounded-full bg-slate-900 text-white font-black text-[9px] uppercase tracking-[0.3em] hover:bg-primary transition-all active:scale-95 shadow-xl">
                                    Upload Library
                                </button>
                            </div>
                        </div>
                    </aside>

                    {/* Right Side: Form Sections */}
                    <div className="lg:col-span-9 space-y-12 text-left">
                        {/* 01: Personal Information */}
                        <section className="bg-white/40 backdrop-blur-2xl p-10 md:p-14 rounded-[4rem] shadow-2xl shadow-teal-900/5 border border-white space-y-12 text-left">
                            <h4 className="font-headline font-black text-3xl text-on-surface flex items-center gap-6 italic text-left">
                                <span className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl not-italic">01</span>
                                Identity Info
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-left">
                                <div className="space-y-4 text-left">
                                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 ml-2">Name (Real-name)</label>
                                    <input className="w-full bg-white border-4 border-slate-50 rounded-[2.5rem] px-8 py-6 text-on-surface font-black text-lg focus:border-primary transition-all outline-none shadow-sm" placeholder="홍길동" />
                                </div>
                                <div className="space-y-4 text-left">
                                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 ml-2">Personal Identity No.</label>
                                    <input className="w-full bg-white border-4 border-slate-50 rounded-[2.5rem] px-8 py-6 text-on-surface font-black text-lg focus:border-primary transition-all outline-none shadow-sm" placeholder="YYMMDD-*******" />
                                </div>
                                <div className="md:col-span-2 space-y-4 text-left">
                                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 ml-2">Mobile Terminal</label>
                                    <div className="flex flex-col md:flex-row gap-4">
                                        <input className="flex-1 bg-white border-4 border-slate-50 rounded-[2.5rem] px-8 py-6 text-on-surface font-black text-lg focus:border-primary transition-all outline-none shadow-sm" placeholder="010-0000-0000" />
                                        <button className="md:w-1/3 bg-slate-900 text-white font-black rounded-[2.5rem] px-10 py-6 hover:bg-primary transition-all active:scale-95 text-[10px] uppercase tracking-widest leading-none shadow-xl">Auth Req</button>
                                    </div>
                                </div>
                                <div className="md:col-span-2 space-y-4 text-left">
                                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 ml-2">Base Address</label>
                                    <div className="flex gap-4 mb-4">
                                        <input className="w-1/3 bg-slate-50 border-none rounded-[2rem] px-8 py-6 text-on-surface font-black text-lg" placeholder="Zip" readOnly />
                                        <button className="flex-1 bg-slate-900 text-white font-black rounded-[2rem] px-8 py-6 hover:bg-primary transition-all active:scale-95 text-[10px] uppercase tracking-widest shadow-xl">Search Global Grid</button>
                                    </div>
                                    <input className="w-full bg-white border-4 border-slate-50 rounded-[2.5rem] px-8 py-6 text-on-surface font-black text-lg focus:border-primary transition-all outline-none shadow-sm mb-4" placeholder="Street Address" />
                                    <input className="w-full bg-white border-4 border-slate-50 rounded-[2.5rem] px-8 py-6 text-on-surface font-black text-lg focus:border-primary transition-all outline-none shadow-sm" placeholder="Detailed Suite/Unit" />
                                </div>
                            </div>
                        </section>

                        {/* 02: Driver's License Info */}
                        <section className="bg-white/40 backdrop-blur-2xl p-10 md:p-14 rounded-[4rem] shadow-2xl shadow-teal-900/5 border border-white space-y-12 text-left">
                            <h4 className="font-headline font-black text-3xl text-on-surface flex items-center gap-6 italic text-left">
                                <span className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl not-italic">02</span>
                                License Grid
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-left">
                                <div className="space-y-4 text-left">
                                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 ml-2">Type Selection <span className="text-secondary ml-4">* 1st Grade Entry Required</span></label>
                                    <select className="w-full bg-white border-4 border-slate-50 rounded-[2.5rem] px-8 py-6 text-on-surface font-black text-lg focus:border-primary transition-all outline-none shadow-sm appearance-none cursor-pointer italic">
                                        <option value="">Choose Grade</option>
                                        <option value="1_large">1종 대형 (Heavy Duty)</option>
                                        <option value="1_normal">1종 보통 (Standard)</option>
                                    </select>
                                </div>
                                <div className="space-y-4 text-left">
                                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 ml-2">License Serial No.</label>
                                    <input className="w-full bg-white border-4 border-slate-50 rounded-[2.5rem] px-8 py-6 text-on-surface font-black text-lg focus:border-primary transition-all outline-none shadow-sm" placeholder="00-00-000000-00" />
                                </div>
                            </div>
                        </section>

                        {/* 03: Professional Credentials Vault */}
                        <section className="bg-slate-900 rounded-[4rem] p-10 md:p-14 shadow-2xl shadow-slate-900/40 space-y-10 text-left">
                            <div className="flex items-center gap-6 text-left">
                                <div className="w-14 h-14 rounded-2xl bg-primary/20 text-primary flex items-center justify-center shadow-inner">
                                    <span className="material-symbols-outlined text-3xl">inventory_2</span>
                                </div>
                                <h4 className="font-headline font-black text-3xl text-white italic uppercase tracking-tighter text-left">Document Vault</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                                <div className="p-8 rounded-[3rem] bg-white/5 border border-white/5 hover:border-primary transition-all cursor-pointer group text-left">
                                    <div className="flex items-center justify-between mb-8 text-left">
                                        <span className="text-[9px] font-black tracking-[0.3em] uppercase text-slate-500">License Visual</span>
                                        <span className="px-4 py-1.5 rounded-full bg-secondary text-white text-[8px] font-black uppercase tracking-widest shadow-lg shadow-secondary/20">Empty</span>
                                    </div>
                                    <div className="flex items-center gap-6 text-left">
                                        <div className="w-20 h-20 rounded-[1.5rem] bg-white/5 flex items-center justify-center text-slate-700 group-hover:text-primary transition-all shadow-inner">
                                            <span className="material-symbols-outlined text-4xl">badge</span>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-white font-black italic text-lg leading-none mb-1">Front Facade</p>
                                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Awaiting Capture</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8 rounded-[3rem] bg-white/5 border border-white/5 hover:border-primary transition-all cursor-pointer group text-left">
                                    <div className="flex items-center justify-between mb-8 text-left">
                                        <span className="text-[9px] font-black tracking-[0.3em] uppercase text-slate-500">Cert Proof</span>
                                        <span className="px-4 py-1.5 rounded-full bg-primary text-white text-[8px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">Reviewing</span>
                                    </div>
                                    <div className="flex items-center gap-6 text-left">
                                        <div className="w-20 h-20 rounded-[1.5rem] bg-white/5 flex items-center justify-center text-slate-700 group-hover:text-primary transition-all shadow-inner">
                                            <span className="material-symbols-outlined text-4xl">description</span>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-white font-black italic text-lg leading-none mb-1">Bus Cert Copy</p>
                                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest text-left">Processing (24h)</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Footer Action */}
                        <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-10 border-t-4 border-slate-50 text-left">
                            <div className="flex items-center gap-6 text-slate-300 text-left">
                                <span className="material-symbols-outlined text-4xl italic" style={{fontVariationSettings: "'FILL' 1"}}>info</span>
                                <p className="text-xs font-black italic uppercase tracking-tighter leading-tight max-w-xs text-left">운영팀은 일반적으로 24~48시간 이내에 검토를 완료합니다. 승인 시 고휘도 알림을 보내드립니다.</p>
                            </div>
                            <button className="w-full md:w-auto px-20 py-8 rounded-full bg-gradient-to-br from-primary to-primary-container text-white font-black font-headline text-xl italic uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:shadow-primary/50 active:scale-95 transition-all duration-500">
                                Dispatch Protocol
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Bottom Nav */}
            <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex justify-around items-center px-4 py-2 bg-slate-900 text-slate-500 w-[90%] max-w-lg mx-auto rounded-full shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] border border-white/10">
                <button onClick={() => navigate('/driver-dashboard')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">dashboard</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Home</span>
                </button>
                <button onClick={() => navigate('/estimate-list-driver')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">gavel</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Auction</span>
                </button>
                <button onClick={() => navigate('/driver-info')} className="flex flex-col items-center justify-center px-5 py-2 text-primary relative">
                    <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-lg"></div>
                    <span className="material-symbols-outlined relative z-10" style={{fontVariationSettings: "'FILL' 1"}}>person</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1 relative z-10 underline decoration-2 underline-offset-4">Profile</span>
                </button>
            </nav>
        </div>
    );
};

export default DriverInfoRegistration;
