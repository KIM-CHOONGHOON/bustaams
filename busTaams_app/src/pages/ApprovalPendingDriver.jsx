import React from 'react';
import { useNavigate } from 'react-router-dom';

const ApprovalPendingDriver = () => {
    const navigate = useNavigate();

    const pendingItems = [
        {
            id: 1,
            title: '코스탈 스카이라이너',
            route: '포틀랜드 → 샌프란시스코',
            period: '2023/11/12 ~ 2023/11/14',
            price: '1,200,000',
            model: 'Scania Irizar i8',
            status: '승인 대기'
        },
        {
            id: 2,
            title: '노던 벨리 셔틀',
            route: '밴쿠버 → 윌러멧 밸리',
            period: '2023/11/20 ~ 2023/11/22',
            price: '850,000',
            model: 'Mercedes-Benz Tourismo',
            status: '승인 대기'
        }
    ];

    return (
        <div className="bg-background text-on-surface min-h-[100dvh] pb-48 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/40 backdrop-blur-3xl border-b border-white/20 py-6">
                <div className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto">
                    <div className="flex items-center gap-6 text-left">
                        <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl text-teal-800 shadow-xl shadow-teal-900/5 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                        </button>
                        <h1 className="font-headline font-black tracking-tighter text-3xl text-teal-900 italic uppercase">busTaams</h1>
                    </div>
                    <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-2xl rotate-3">
                        <img alt="User profile" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCsf1fTFUXZEBkAapjlINnKsBJh4aLCVH588hSiZiY38jIs7xt060L40FPWV_8W9s0nyFSYUgEDeUgfTBkNsQH4LaXw0yyZRXGoqbkuvj4whXqLdwIrotpKKjUml3-_jqjhyWXJDlpYBIIwT2IlqA3oQwxvsm4VA0BMtDuh4FPEgEhmv137JUrMBRthn0z4kfT2DnWW4Ukc4o_cqKte86848uR9jxB0mOdx42GBE-F0zikuQU7AZRT91g7cMoAkaPWiB-UroEeBb9A" />
                    </div>
                </div>
            </header>

            <main className="pt-48 px-6 max-w-7xl mx-auto space-y-20 animate-in fade-in slide-in-from-bottom duration-1000 text-left">
                {/* Editorial Header Section */}
                <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end text-left">
                    <div className="md:col-span-8 space-y-6 text-left">
                        <span className="text-secondary font-black tracking-[0.4em] uppercase text-[10px] block px-2 italic">Fleet Audit Trail</span>
                        <h2 className="font-headline text-6xl md:text-8xl font-black text-primary leading-[0.85] tracking-tighter italic uppercase text-left">
                            Approval <br/><span className="text-secondary underline decoration-secondary/20 underline-offset-[12px]">Pending.</span>
                        </h2>
                    </div>
                    <div className="md:col-span-4 text-left border-l-4 border-slate-50 pl-8">
                        <p className="text-slate-400 text-lg font-bold italic tracking-tight leading-relaxed text-left">
                            현재 승인 대기 중인 입찰 항목들을 확인하세요. 배차팀의 검토가 완료되면 실시간 알림을 통해 알려드립니다.
                        </p>
                    </div>
                </section>

                <nav className="flex gap-12 border-b-4 border-slate-50 pb-4 text-left">
                    <button className="text-primary font-black text-sm uppercase tracking-[0.3em] italic border-b-8 border-primary pb-4">
                        Pending Reviews (2)
                    </button>
                    <button className="text-slate-300 font-black text-sm uppercase tracking-[0.3em] italic pb-4 hover:text-primary transition-all">
                        Archive
                    </button>
                </nav>

                {/* Pending Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left">
                    {pendingItems.map((item) => (
                        <div key={item.id} className="bg-white rounded-[3.5rem] p-12 transition-all duration-500 hover:shadow-2xl hover:shadow-teal-900/5 hover:-translate-y-2 border border-slate-50 relative overflow-hidden group text-left">
                            <div className="absolute top-0 right-0 p-8">
                                <span className="material-symbols-outlined text-slate-100 text-6xl rotate-12 group-hover:rotate-0 transition-transform duration-700">hourglass_empty</span>
                            </div>
                            
                            <div className="space-y-10 text-left relative z-10">
                                <div className="flex justify-between items-start text-left">
                                    <span className="bg-secondary/10 text-secondary px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em] italic">
                                        Audit in Progress
                                    </span>
                                    <button className="p-2 text-slate-200 hover:text-primary transition-colors">
                                        <span className="material-symbols-outlined">more_vert</span>
                                    </button>
                                </div>

                                <div className="space-y-2 text-left">
                                    <h3 className="font-headline text-3xl font-black text-primary italic uppercase tracking-tighter text-left">{item.title}</h3>
                                    <p className="text-slate-400 font-bold italic text-sm uppercase tracking-[0.2em]">{item.route}</p>
                                </div>

                                <div className="space-y-6 border-y-2 border-slate-50 py-8 text-left">
                                    <div className="flex justify-between items-center text-left">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 italic">Deployment Period</span>
                                        <span className="font-black text-primary italic text-sm">{item.period}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-left">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 italic">Submission Value</span>
                                        <span className="font-black text-primary italic text-sm">₩{item.price}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-left">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 italic">Assigned Asset</span>
                                        <span className="font-black text-primary italic text-sm">{item.model}</span>
                                    </div>
                                </div>

                                <button onClick={() => navigate(`/bid-detail-driver/${item.id}`)} className="w-full py-6 rounded-[2.5rem] bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.3em] hover:bg-primary transition-all active:scale-95 shadow-2xl shadow-slate-900/30 italic">
                                    View Audit 상세 정보
                                </button>
                            </div>
                        </div>
                    ))}
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
                    <span className="material-symbols-outlined relative z-10" style={{fontVariationSettings: "'FILL' 1"}}>manage_search</span>
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

export default ApprovalPendingDriver;
