import React from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNavCustomer from '../components/BottomNavCustomer';

const ReviewPendingListCustomer = () => {
    const navigate = useNavigate();

    const pendingReviews = [
        {
            id: 1,
            date: '2024/02/15',
            from: '서울역',
            to: '부산역',
            busType: '45인승 일반 2대',
            company: '주식회사 태양관광',
            slogan: '"안전하고 편안한 이동을 약속드립니다."',
            img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDG9HYfhlFif6KC19r6OCPUp9QJMrL56hnLR1ZsETwyL4c5g4A4fSe6JoS9M0GLNZqIrvpmYf8apB7MbUHidcuEs-xvWR9pybhbJ_M_BW64cZyeqA3eR69Dv0b956_PxKAIgYjuCiuBn46sOuET6wrVJ145aywbnM87KbroQkqZuFoaeI0CLThr8EyBxuzN6bcBE64Y-gaXT4aNY8AQ4w3CGol1nDNLXguMndGLQFgf61s-HRPGmNSk0t65umy_AmvJ3avUtSWECEY'
        },
        {
            id: 2,
            date: '2024/02/12',
            from: '인천공항',
            to: '대전복합',
            busType: '28인승 우등 1대',
            company: '글로벌 리무진',
            slogan: '"VIP급 우등 버스로 모셨습니다."',
            img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC--QxIesqZhWoele-_nOuFez1tsrncIgsqVg25oRKA6RUEEhpEfS4U-ZP2xAtzLMOU_xyesKIMJgIzUQwTtwo-sIC2uU7HbSlFIKBsSpYVeb1kxdTq9whAjkJbS7go5BsESE8JYjlpvLF6ecPR4MvGSWFz3lNwwKvkX8epbaSx5bRfs2W0uP1X9j7CciuwDgHWfRwDVRzqpsjCWjirUYXbCyEwYoht8H6zrfKmQ-gs3YUJVKdOL1xsCGeiIU6xGBbshFS8HswWh2w'
        },
        {
            id: 3,
            date: '2024/02/08',
            from: '광주종합',
            to: '강남터미널',
            busType: '45인승 일반 3대',
            company: '남도고속관광',
            slogan: '"단체 여행의 파트너, 남도고속입니다."',
            img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAqGy1N67olce7Ys8-nDLwjnA3i5MbKkPmliIsi7GgCRyJHyxefuzmICaWIIVgwDmBk4hml6TVRPVQc3bLWiZCVpGo50B8bb9GT2BwvUZHoI0D8B7VPiQS6vuK98MVBscv47nfQwRgTsFSXC44u4AnwyP0oXLMJ1MWT7bs8r42qpG6yHRLG22XzALN1WdI33L-O_hxwLwEByNub_TNmqIIgBGbIOEZ886xvoOeLw_Ipk3iUjBltajFZO74dlZy1nFRaXxkl7pTRwlo'
        }
    ];

    return (
        <div className="bg-background text-on-surface min-h-screen pb-40 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-3xl border-b border-white shadow-2xl shadow-teal-900/[0.02]">
                <div className="flex items-center justify-between px-6 h-18 w-full max-w-4xl mx-auto py-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="material-symbols-outlined text-teal-700 hover:bg-slate-50 p-2 rounded-full transition-all">arrow_back</button>
                        <h1 className="font-headline font-black text-xl tracking-tighter text-teal-900 italic">Review Inbox</h1>
                    </div>
                    <button className="relative p-2 text-slate-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">notifications</span>
                        <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></div>
                    </button>
                </div>
            </header>

            <main className="pt-32 px-6 max-w-2xl mx-auto space-y-16">
                {/* Emotional Header */}
                <section className="text-left animate-in fade-in slide-in-from-top duration-700">
                    <p className="text-[10px] font-black text-secondary uppercase tracking-[0.4em] mb-4">Sharing the Journey</p>
                    <h2 className="text-5xl font-black text-on-surface tracking-tighter leading-[0.9]">
                        당신의 여정은<br/>
                        <span className="text-primary italic">어떠셨나요?</span>
                    </h2>
                    <p className="text-slate-400 font-bold mt-6 text-lg tracking-tight">소중한 후기는 버스 파트너들에게 가장 큰 힘이 됩니다.</p>
                </section>

                {/* Trip Cards List */}
                <div className="grid grid-cols-1 gap-10">
                    {pendingReviews.map((review, idx) => (
                        <div 
                            key={review.id}
                            className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-teal-900/[0.03] border border-slate-50 relative group overflow-hidden animate-in fade-in slide-in-from-bottom duration-1000"
                            style={{ animationDelay: `${idx * 200}ms` }}
                        >
                            <div className="absolute left-0 top-0 bottom-0 w-2 bg-secondary opacity-10 group-hover:opacity-100 transition-opacity"></div>
                            
                            <div className="flex justify-between items-center mb-8">
                                <span className="px-5 py-2 bg-primary/10 text-primary text-[10px] font-black rounded-full tracking-widest uppercase">
                                    Journey Done
                                </span>
                                <span className="text-slate-300 text-xs font-black uppercase tracking-widest">{review.date}</span>
                            </div>

                            <div className="mb-10 space-y-4">
                                <div className="flex items-center gap-5">
                                    <span className="text-3xl font-black tracking-tighter text-on-surface">{review.from}</span>
                                    <span className="material-symbols-outlined text-primary/30 text-3xl">trending_flat</span>
                                    <span className="text-3xl font-black tracking-tighter text-on-surface">{review.to}</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-400">
                                    <span className="material-symbols-outlined text-xl">directions_bus</span>
                                    <span className="text-sm font-black uppercase tracking-wider">{review.busType}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-8 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 group-hover:bg-teal-50 transition-colors">
                                <div className="h-20 w-20 rounded-2xl overflow-hidden shadow-lg rotate-2 group-hover:rotate-0 transition-transform">
                                    <img className="w-full h-full object-cover" alt="Fleet" src={review.img}/>
                                </div>
                                <div className="flex-1 space-y-2">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{review.company}</p>
                                    <p className="text-sm font-bold text-on-surface italic opacity-60 leading-snug">{review.slogan}</p>
                                </div>
                            </div>

                            <button 
                                onClick={() => navigate(`/submit-review/${review.id}`)}
                                className="w-full mt-8 bg-slate-900 text-white font-black py-6 rounded-3xl flex items-center justify-center gap-4 shadow-2xl shadow-slate-900/20 active:scale-95 hover:bg-primary transition-all group/btn"
                            >
                                <span className="uppercase tracking-[0.3em] text-[10px]">평점 작성하기</span>
                                <span className="material-symbols-outlined text-lg group-hover/btn:translate-x-2 transition-transform">edit</span>
                            </button>
                        </div>
                    ))}
                </div>

                {/* Decorative Quote */}
                <div className="pt-16 text-center space-y-6 opacity-20 hover:opacity-50 transition-opacity">
                    <span className="material-symbols-outlined text-5xl text-primary block">format_quote</span>
                    <p className="text-xs font-black text-on-surface uppercase tracking-[0.5em] leading-[2] mx-auto max-w-[280px]">
                        "우리는 단순한 이동이 아닌, 당신의 소중한 시간을 연결합니다."
                    </p>
                </div>
            </main>

            {/* Premium Bottom Nav */}
            <BottomNavCustomer />
        </div>
    );
};

export default ReviewPendingListCustomer;
