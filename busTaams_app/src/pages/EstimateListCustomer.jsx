import React from 'react';
import { useNavigate } from 'react-router-dom';

const EstimateListCustomer = () => {
    const navigate = useNavigate();

    const tripSummary = {
        title: '서울 ↔ 부산, 프리미엄 여정',
        date: '2024/05/15 - 05/16',
        passengers: '성인 30명',
        status: 'Active Bidding'
    };

    const estimates = [
        {
            id: 1,
            driverName: '김진우 기사님',
            rating: '4.9',
            busInfo: '2023년형 현대 유니버스 프레스티지 (45인승)',
            price: '1,250,000',
            tags: ['무료 와이파이', '생수 제공', 'USB 충전'],
            isBest: true,
            image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCTrnomtlcU6w73a9IrtLQAmeoeK0DXJ6NGyP0tb5htzXQanuoftrcHs4V-sLbH3yzbCHqfPwSHDtDg9OxW-6IX-5YMt5fnaVAgE8xgWCqmWgZ1FUaZaJl463fh2CQlAafodRR54b743nY9dtXM-Avp6hPu-pwFt-es-FM8CuuihI4UqJ_vmdoPvQyB3U_iu3X_aHftpjBJjK0nXJkcgzptgR94MDoBQmNdkvOtF6IOdnU1iSYoUPtW_rsgSpjHB7eJ3mVTuU0betg'
        },
        {
            id: 2,
            driverName: '이지연 기사님',
            rating: '4.8',
            busInfo: '2022년형 기아 그랜버드 실크로드 (45인승)',
            price: '1,180,000',
            tags: ['금연 차량', '베테랑 드라이버', '공기청정기'],
            isBest: false,
            image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuJsWP926CFerdl-7mF5NP8rPnYqAHM66MrmkhQYEaEPdidZVtNOdaSRruV2W7rPrgCgRJeOifd2IumtCS19EYD4Op9xMq1eyrMxGiHxzj8wTqSKi8BLWDCk5iC5FxrILPjBJRWw7JUAM_t1h1zaaqiIxzC7XwwtKWCUxq5Bz6myKv1C4pPU1JzsWQkhLq96AHS4xulwh9pRwtw2t8m03JD7wYlDBUoL7bvWE8RSg6bEUOIhjuNUsOryAGT2sid7whrS64CxoB_RB8'
        }
    ];

    return (
        <div className="bg-background text-on-surface min-h-[100dvh] pb-40 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/40 backdrop-blur-3xl border-b border-white/20 py-5">
                <div className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto">
                    <div className="flex items-center gap-6">
                        <button className="p-3 bg-white rounded-2xl text-teal-800 shadow-xl shadow-teal-900/5 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-lg">menu</span>
                        </button>
                        <h1 className="font-headline font-black tracking-tighter text-2xl text-teal-900 italic">busTaams Estimates</h1>
                    </div>
                    <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-2xl rotate-3">
                        <img alt="User profile" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDAuydGKeWcVXnNwZDRc1I8NFS_BI9gq969584jVmM5maopYZ63srZ7FvlrWEb_EAlmkWIjBb5BPNcP1t7cxeVW66HWUlO53iZcSpZ7qSCpZdrQUXwvp8X5ibBv6Xx57pJrCmFA8WY8f1W6QCEC0wt2VbiePnFQ6Dco1T3vF-Vkzh0wL5vNyHOTwR2RKCQJ0QLxejtltR8UYIvSuocurIgQmtVJa8pHYHzWuHFe8N8rJRH34uYOlkJtQMcv8C1c99d4lMC41r-mrI" />
                    </div>
                </div>
            </header>

            <main className="pt-32 px-6 max-w-5xl mx-auto">
                {/* Trip Summary Section */}
                <section className="mb-16 animate-in fade-in slide-in-from-top duration-700">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
                        <div className="lg:col-span-8 space-y-6">
                            <span className="text-secondary font-black tracking-[0.4em] uppercase text-[10px] block px-2">Confirmed Intent</span>
                            <h2 className="font-headline text-5xl md:text-7xl font-black text-primary tracking-tighter leading-[0.95] italic">
                                Seoul To Busan,<br/>Premium Journey.
                            </h2>
                        </div>
                        <div className="lg:col-span-4 bg-white/80 p-8 rounded-[3rem] shadow-2xl shadow-teal-900/5 border border-white space-y-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-all duration-700"></div>
                            <div className="space-y-5 relative">
                                <div className="flex items-center gap-4">
                                    <span className="material-symbols-outlined text-primary text-xl" style={{fontVariationSettings: "'FILL' 1"}}>calendar_today</span>
                                    <div className="text-left">
                                        <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest leading-none mb-1">Schedule</p>
                                        <p className="text-sm font-black tracking-tight">{tripSummary.date}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="material-symbols-outlined text-primary text-xl" style={{fontVariationSettings: "'FILL' 1"}}>group</span>
                                    <div className="text-left">
                                        <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest leading-none mb-1">Capacity</p>
                                        <p className="text-sm font-black tracking-tight">{tripSummary.passengers}</p>
                                    </div>
                                </div>
                                <button className="w-full py-4 px-4 border-4 border-secondary/20 text-secondary font-black text-[10px] uppercase tracking-[0.3em] rounded-full hover:bg-secondary hover:text-white transition-all duration-300 active:scale-95 shadow-xl shadow-secondary/5">
                                    Terminate Request
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Estimates List */}
                <div className="space-y-20">
                    {/* Done Category */}
                    <div className="space-y-8 text-left">
                        <div className="flex justify-between items-center border-b-4 border-slate-50 pb-6">
                            <h3 className="font-headline text-2xl font-black text-on-surface tracking-tighter italic uppercase">Vehicle Unit #01</h3>
                            <div className="flex items-center gap-4">
                                <button className="text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-red-500 transition-all">Cancel</button>
                                <span className="px-6 py-2 bg-teal-500 text-white text-[9px] font-black uppercase tracking-[0.3em] rounded-full shadow-lg shadow-teal-500/20">Secured</span>
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-[3.5rem] p-12 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-4 opacity-60 grayscale group hover:grayscale-0 hover:opacity-100 transition-all duration-700">
                            <div className="w-20 h-20 bg-teal-500/10 rounded-full flex items-center justify-center text-teal-500 mb-2">
                                <span className="material-symbols-outlined text-4xl" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>
                            </div>
                            <p className="font-black text-xl text-on-surface tracking-tighter italic">This segment is already locked.</p>
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.4em]">No further bids accepted for this vessel</p>
                        </div>
                    </div>

                    {/* Active Category */}
                    <div className="space-y-10 text-left">
                        <div className="flex justify-between items-center border-b-4 border-slate-50 pb-6 text-left">
                            <h3 className="font-headline text-2xl font-black text-on-surface tracking-tighter italic uppercase">Vehicle Unit #02</h3>
                            <div className="flex items-center gap-6">
                                <button className="text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-red-500 transition-all">Cancel</button>
                                <button className="text-[10px] font-black text-primary flex items-center gap-2 uppercase tracking-widest hover:opacity-70 group transition-all">
                                    Newest Stream <span className="material-symbols-outlined text-sm group-hover:translate-y-1 transition-transform">expand_more</span>
                                </button>
                            </div>
                        </div>

                        {estimates.map((est, index) => (
                            <div key={est.id} className={`bg-white rounded-[3.5rem] p-10 shadow-2xl shadow-teal-900/5 border border-white group hover:scale-[1.02] transition-all duration-700 animate-in fade-in slide-in-from-bottom text-left ${est.isBest ? 'border-l-8 border-l-secondary' : 'border-l-8 border-l-slate-100'}`} style={{animationDelay: `${index * 150}ms`}}>
                                <div className="flex flex-col lg:flex-row gap-12 text-left">
                                    <div className="flex-shrink-0 relative self-start">
                                        <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white rotate-3 group-hover:rotate-0 transition-all duration-700">
                                            <img alt="Driver Profile" className="w-full h-full object-cover" src={est.image} />
                                        </div>
                                        {est.isBest && (
                                            <div className="absolute -bottom-3 -right-3 bg-secondary text-white px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-secondary/40 rotate-12">OPTIMAL</div>
                                        )}
                                    </div>
                                    <div className="flex-grow space-y-8 text-left">
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 text-left">
                                            <div className="text-left">
                                                <div className="flex items-center gap-4 mb-3 text-left">
                                                    <h4 className="text-3xl font-black tracking-tighter italic text-on-surface">{est.driverName}</h4>
                                                    <div className="flex items-center bg-secondary/10 px-4 py-1.5 rounded-full text-secondary">
                                                        <span className="material-symbols-outlined text-sm" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                                                        <span className="text-xs font-black ml-2">{est.rating}</span>
                                                    </div>
                                                </div>
                                                <p className="text-slate-400 font-bold text-sm flex items-center gap-3 italic">
                                                    <span className="material-symbols-outlined text-lg text-primary">directions_bus</span>
                                                    {est.busInfo}
                                                </p>
                                            </div>
                                            <div className="text-left lg:text-right bg-slate-50 lg:bg-transparent p-6 lg:p-0 rounded-3xl">
                                                <p className="text-[9px] text-slate-300 font-black uppercase tracking-[0.4em] mb-2 leading-none">Expected Quote</p>
                                                <p className="text-4xl font-black text-primary tracking-tighter leading-none italic">₩{est.price}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            {est.tags.map(tag => (
                                                <span key={tag} className="px-5 py-2 bg-slate-50 rounded-full text-[10px] font-black text-slate-400 border border-slate-100 uppercase tracking-widest group-hover:bg-white group-hover:border-primary/20 group-hover:text-primary transition-all">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-end lg:justify-center lg:border-l lg:border-slate-100 lg:pl-12">
                                        <button onClick={() => navigate('/estimate-details')} className="bg-primary text-white px-10 py-5 rounded-full font-black text-xs uppercase tracking-[0.4em] shadow-2xl shadow-primary/30 active:scale-95 transition-all hover:bg-slate-900">
                                            Access Data
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Shared Bottom Nav */}
            <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex justify-around items-center px-4 py-2 bg-white/70 backdrop-blur-3xl text-slate-400 w-[90%] max-w-md mx-auto rounded-full shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] border border-white">
                <button onClick={() => navigate('/customer-dashboard')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-primary transition-all">
                    <span className="material-symbols-outlined">gavel</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Auction</span>
                </button>
                <button className="flex flex-col items-center justify-center px-5 py-2 text-primary relative">
                    <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-lg"></div>
                    <span className="material-symbols-outlined relative z-10" style={{fontVariationSettings: "'FILL' 1"}}>directions_bus</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1 relative z-10 underline decoration-2 underline-offset-4">Trips</span>
                </button>
                <button onClick={() => navigate('/chat-room')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-primary transition-all">
                    <span className="material-symbols-outlined">chat_bubble</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Talk</span>
                </button>
                <button onClick={() => navigate('/profile-customer')} className="flex flex-col items-center justify-center bg-slate-900 text-white rounded-full w-12 h-12 shadow-lg active:scale-90 transition-all">
                    <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>person</span>
                </button>
            </nav>
        </div>
    );
};

export default EstimateListCustomer;
