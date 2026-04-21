import React from 'react';
import { useNavigate } from 'react-router-dom';

const DriverDashboard = () => {
    const navigate = useNavigate();

    const opportunities = [
        {
            id: 1,
            title: '서울 → 강릉 (단체 관광)',
            spec: '45인승 대형 · 24년 11월 15일',
            price: '₩1,250,000 ~',
            time: '12분 전',
            badge: 'High Demand',
            isUrgent: true
        },
        {
            id: 2,
            title: '인천공항 → 평택 (기업 연수)',
            spec: '28인승 우등 · 24년 11월 18일',
            price: '₩680,000 ~',
            time: '35분 전',
            badge: 'Regular',
            isUrgent: false
        }
    ];

    const quickMenus = [
        { icon: 'badge', label: '기사 정보 등록', path: '/driver-certification' },
        { icon: 'directions_bus', label: '버스 정보 등록', path: '/bus-certification' },
        { icon: 'format_list_bulleted', label: '견적 리스트', path: '/estimate-list-driver' },
        { icon: 'calendar_month', label: '운행 예정 리스트', path: '/upcoming-trips-driver' },
        { icon: 'pending_actions', label: '승인 진행 리스트', path: '/approval-pending-driver' },
        { icon: 'task_alt', label: '운행 완료 리스트', path: '/completed-trips-driver' },
        { icon: 'event_busy', label: '유찰 리스트', path: '/failed-estimate-list-driver' },
        { icon: 'chat', label: '실시간 채팅', path: '/chat-list-driver' },
        { icon: 'credit_card', label: '카드/회비 관리', path: '/payment-history-driver' },
        { icon: 'settings_suggest', label: '요금제 선택', path: '/pass-select-driver' },
    ];

    return (
        <div className="bg-background text-on-surface min-h-[100dvh] pb-48 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/40 backdrop-blur-3xl border-b border-white/20 py-4">
                <div className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto">
                    <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white shadow-2xl rotate-3 hover:rotate-0 transition-transform">
                            <img alt="Driver Profile" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA4Nmf6WYDrBGpPW1hDqpEgenqH04dYNaEU2BIt_wiS4SORIEBNyefV4B9DpABwpoebXKUdyfzOz6aO5XsHwP4oNfG5ToJa9ai3vPAXzWP3HAkA4xEvlwz_4dLPpmTfcUQyVap8EFhMdbvujApd5WnAD4LDO_LJA_htaIBWUaiL97E9MVXxwYSli7HNTDiAQB-SMhKrixHzZeLLnGetBFpzFretxha75lPBDcN8JMHSTRAqDNEZd3m6zX3E2Bdw6Y0aQRsBPh-OWYA" />
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="text-[9px] text-primary font-black uppercase tracking-[0.4em] mb-1">Premium Partner</span>
                            <h1 className="font-headline font-black tracking-tighter text-2xl text-teal-900 italic">김철수 마스터</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="p-4 bg-white rounded-2xl relative shadow-xl shadow-teal-900/5 hover:scale-105 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-teal-800">notifications</span>
                            <span className="absolute top-3 right-3 w-3 h-3 bg-secondary rounded-full border-2 border-white animate-pulse"></span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="pt-32 px-6 max-w-7xl mx-auto space-y-20 animate-in fade-in slide-in-from-bottom duration-1000">
                {/* Active Opportunities Hero */}
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end text-left">
                    <div className="lg:col-span-4 space-y-6 text-left">
                        <h2 className="text-6xl font-black font-headline tracking-tighter text-on-surface leading-[0.9] italic uppercase text-left">
                            Active<br/><span className="text-secondary">Opportunities</span>
                        </h2>
                        <p className="text-slate-400 text-lg font-bold tracking-tight italic opacity-80 leading-relaxed text-left">
                            현재 기사님의 제안을 기다리는 <span className="text-primary underline decoration-primary/20 underline-offset-4">12개의 새로운 운행 요청</span>이 실시간 감지되었습니다.
                        </p>
                        <div className="flex gap-4 items-center text-secondary font-black text-[10px] tracking-[0.4em] uppercase py-3 px-6 bg-secondary/5 rounded-full w-fit">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary"></span>
                            </span>
                            Live Grid Monitoring
                        </div>
                    </div>
                    <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                        {opportunities.map(op => (
                            <div key={op.id} className={`bg-white rounded-[3.5rem] p-10 shadow-2xl shadow-teal-900/5 border border-white hover:scale-[1.03] transition-all duration-500 relative overflow-hidden group border-l-[12px] ${op.isUrgent ? 'border-l-secondary' : 'border-l-primary'}`}>
                                <div className="space-y-6 text-left relative z-10">
                                    <div className="flex justify-between items-start text-left">
                                        <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${op.isUrgent ? 'bg-secondary text-white' : 'bg-primary text-white'}`}>
                                            {op.badge}
                                        </span>
                                        <span className="text-[10px] text-slate-300 font-black uppercase tracking-widest italic">{op.time}</span>
                                    </div>
                                    <div className="space-y-1 text-left">
                                        <h3 className="text-2xl font-black text-on-surface tracking-tighter italic leading-snug">{op.title}</h3>
                                        <p className="text-slate-400 font-bold text-xs tracking-tight uppercase opacity-60 italic">{op.spec}</p>
                                    </div>
                                    <div className="flex justify-between items-center pt-4 text-left">
                                        <span className="text-3xl font-black text-primary tracking-tighter italic leading-none">{op.price}</span>
                                        <button className="bg-slate-900 text-white rounded-full px-8 py-3.5 text-[9px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/20 active:scale-95 transition-all group-hover:bg-primary group-hover:shadow-primary/30">
                                            Bid Now
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Main Action Grid */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-12 text-left">
                    {/* Quick Menu */}
                    <div className="lg:col-span-2 space-y-10 text-left">
                        <div className="flex items-center gap-6 text-left">
                            <div className="h-[4px] w-12 bg-primary rounded-full"></div>
                            <h3 className="font-headline font-black text-3xl tracking-tighter italic uppercase text-teal-900">Partner Terminal</h3>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 text-left">
                            {quickMenus.map((menu, i) => (
                                <button 
                                    key={i}
                                    onClick={() => navigate(menu.path)}
                                    className="group bg-white p-6 rounded-[2.5rem] shadow-2xl shadow-teal-900/5 transition-all duration-500 flex flex-col items-center text-center gap-4 border border-white hover:bg-slate-900 hover:scale-105 active:scale-95"
                                >
                                    <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50 group-hover:bg-white/10 flex items-center justify-center transition-colors shadow-inner">
                                        <span className="material-symbols-outlined text-primary text-3xl group-hover:text-white group-hover:rotate-12 transition-all">{menu.icon}</span>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 group-hover:text-white uppercase tracking-widest leading-tight">{menu.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sidebar Stats */}
                    <div className="space-y-10 text-left">
                        {/* Today's Schedule */}
                        <div className="bg-primary rounded-[3.5rem] p-10 text-white shadow-2xl shadow-primary/30 relative overflow-hidden group hover:scale-[1.02] transition-all">
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 group-hover:rotate-12 transition-all">
                                <span className="material-symbols-outlined text-[120px]">route</span>
                            </div>
                            <div className="relative z-10 space-y-10 text-left">
                                <h4 className="text-[10px] font-black tracking-[0.4em] uppercase opacity-60">Manifesto: Today</h4>
                                <div className="space-y-6 text-left">
                                    <div className="flex items-center gap-6 text-left">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-white/10 flex items-center justify-center shadow-inner">
                                            <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>schedule</span>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[9px] font-black opacity-40 uppercase tracking-widest mb-1">Engage at</p>
                                            <p className="text-3xl font-black italic tracking-tighter">02:30 PM</p>
                                        </div>
                                    </div>
                                    <div className="pt-8 border-t border-white/10 text-left">
                                        <p className="text-[9px] font-black opacity-40 uppercase tracking-widest mb-2 text-left">Final Target</p>
                                        <p className="text-2xl font-black font-headline leading-[0.9] italic tracking-tighter md:text-3xl text-left">경기 용인 → 전남 여수</p>
                                    </div>
                                    <button className="w-full mt-6 bg-white text-primary py-6 rounded-full font-black text-[9px] uppercase tracking-[0.3em] hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-black/20">
                                        View Full Mission
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Financial Ledger */}
                        <div className="bg-white rounded-[3.5rem] p-10 shadow-2xl shadow-teal-900/5 border border-white text-left">
                            <div className="flex justify-between items-center mb-10 text-left">
                                <h4 className="text-[10px] font-black tracking-[0.4em] text-slate-300 uppercase">Earning Ledger</h4>
                                <span className="text-[8px] font-black text-primary px-4 py-1.5 bg-primary/5 rounded-full uppercase tracking-widest">November Grid</span>
                            </div>
                            <div className="space-y-2 text-left">
                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Consolidated Profit</p>
                                <p className="text-5xl font-black font-headline text-on-surface tracking-tighter italic leading-none">₩8,420k</p>
                            </div>
                            <div className="mt-12 grid grid-cols-2 gap-8 text-left border-t border-slate-50 pt-8">
                                <div className="space-y-2 text-left text-[9px]">
                                    <span className="text-slate-300 font-black uppercase tracking-widest block">In Pipeline</span>
                                    <span className="font-black text-on-surface tracking-tight block">₩1,240,000</span>
                                </div>
                                <div className="space-y-2 text-left text-[9px]">
                                    <span className="text-slate-300 font-black uppercase tracking-widest block">Missions Done</span>
                                    <span className="font-black text-on-surface tracking-tight block">14 Units</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Membership Banner */}
                <section className="relative h-60 rounded-[4rem] overflow-hidden bg-slate-900 flex items-center px-16 group cursor-pointer text-left">
                    <div className="absolute inset-0 z-0 overflow-hidden">
                        <img alt="Luxury bus" className="w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-2000" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDd1cmwWadGqEVtV-xNJu4CT-nzdrjTfWs5mnHZWthPLlGqXJvDM6-zdHdIOEfxl-33alvQ51u0CWgtmCwN0I5ZHQu44L0FpRakK5R7wFj8quXWJUvAMas6cHKI5jbsD6lqeZxRbjoFfi38ifujiNRcITlXAxtpv8j5FIO9E2z_W0hPP0xxi7GBetNBEvvO5w6RnBmgNyTkxMEC74CkkLdNfnJqFjlQYAI7nkmLce_5YITHZZyErTimyYQuayN6dI6S6w8xBqchskI" />
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/70 to-transparent"></div>
                    </div>
                    <div className="relative z-10 max-w-xl space-y-6 text-left">
                        <h3 className="text-white text-3xl md:text-5xl font-black font-headline leading-[0.9] italic uppercase tracking-tighter">Master Member <br/><span className="text-secondary">Exclusive Grid.</span></h3>
                        <p className="text-slate-400 text-sm font-bold tracking-tight italic opacity-80 text-left">전국 정비 데스크 할인 및 연방 유류비 환급 서비스를 즉시 잠금 해제하세요.</p>
                        <button className="bg-secondary text-white px-10 py-4 rounded-full font-black text-[9px] uppercase tracking-[0.3em] shadow-2xl shadow-secondary/30 active:scale-95 transition-all">Unlock Intelligence</button>
                    </div>
                </section>
            </main>

            {/* Bottom Nav */}
            <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex justify-around items-center px-4 py-2 bg-slate-900 text-slate-500 w-[90%] max-w-lg mx-auto rounded-full shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] border border-white/10">
                <button onClick={() => navigate('/driver-main')} className="flex flex-col items-center justify-center px-5 py-2 text-primary relative">
                    <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-lg"></div>
                    <span className="material-symbols-outlined relative z-10" style={{fontVariationSettings: "'FILL' 1"}}>dashboard</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1 relative z-10 underline decoration-2 underline-offset-4">Home</span>
                </button>
                <button onClick={() => navigate('/estimate-list-driver')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">gavel</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Auction</span>
                </button>
                <button onClick={() => navigate('/upcoming-trips-driver')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">route</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Missions</span>
                </button>
                <button onClick={() => navigate('/driver-certification')} className="flex flex-col items-center justify-center bg-white/20 text-white rounded-full w-12 h-12 shadow-lg active:scale-90 transition-all">
                    <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>person</span>
                </button>
            </nav>
        </div>
    );
};

export default DriverDashboard;
