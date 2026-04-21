import React from 'react';
import { useNavigate } from 'react-router-dom';

const PastTripListCustomer = () => {
    const navigate = useNavigate();

    const trips = [
        {
            id: 1,
            date: '2023년 10월 24일',
            title: '시외 익스프레스 402',
            route: '런던 빅토리아 → 맨체스터 센트럴',
            captain: '마커스 쏜',
            captainImg: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD7VSSkjSeXOWUlSicsIEZ2rudA_07pATCvBbB4ZzS0FeRhWTERJ93g5QDGHRtkQQap8M8Gq0naMNkfmGu61I7DLFw6jB-PGbuj-IpLIaXt1gXKFQIjflBSHxCqDyOzcodjGyjGt1JPj803-8O-DswJfvNi5x_MWYlVpvDYzRTeMYkRCYlv_AOAujT5pexHsMrVctyHWanvAhuidULjD_0lTCm4aiGV8hBhIRlkW4M91NxLUvGlVheOAMYHVt50nD5m1uEzvVlZfVk',
            price: '₩420,000',
            accent: 'bg-secondary'
        },
        {
            id: 2,
            date: '2023년 10월 12일',
            title: '코스탈 크루저 XL',
            route: '브라이튼 피어 → 사우샘프턴 항구',
            captain: '사라 젠킨스',
            captainImg: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC0c4eKzz9BOXwPB7qsAWWbMG5wRDs9BxdBGrYLyKXqDpIak2iMJ8A1E5QtGzl1MlBSzjTMa92diMjK-pMcpH_t0bd4pao5VaeKgyHg1jD5LHz6vGQ-EBae-5wuErIfL9FX8mBbrJMAf0CHOBFyqeEDQzIjKmAiNTHP_6IIz7zr8lf6nfSbwbEyeCRpqDK2zHH4fbH54Z95LGhkTHaRWk5QX7l0An2_qMtznh4QJcGAIIjeWydrvHYBkLWUQGSMOpA-QokiGLMGnr4',
            price: '₩285,500',
            accent: 'bg-primary'
        },
        {
            id: 3,
            date: '2023년 9월 30일',
            title: '럭셔리 슬리퍼 10-A',
            route: '에든버러 세인트 자일스 → 런던 킹스크로스',
            captain: '데이비드 밀러',
            captainImg: 'https://lh3.googleusercontent.com/aida-public/AB6AXuADunvZJcaeZmRTtKAA_tCUsU5GWuAyz6OUoz0Vd4kLEo0qSx9DzYE4wLPi_644gwvZI9fghZEyjs_eQXuYdUeOX30u_2VJl5eljHDmsOfI_qDTOf8uWL7bg7gBqlnSTDpW68FTh846fpXt1xQS015n46aUamZs9lFloi5rmtpZ7Wtcj6_-B0ZvyKs0nIKlDp0cGP_LKWyPYm5yeI2XeMf9n1SnicG92M7CkvjgaIaR7srOpoDHcd4nZU4yRgqJTaycMT-SjJYEb3c',
            price: '₩612,000',
            accent: 'bg-secondary'
        },
        {
            id: 4,
            date: '2023년 9월 15일',
            title: '메트로폴리탄 커넥트',
            route: '옥스퍼드 시티 센터 → 캠브리지 테크 파크',
            captain: '엘레나 로드리게스',
            captainImg: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAxDUlyVBqQsDCBhW5xOQAcv4iEiDS5folywX2-4MooCYzK3O239ichwbzG3tkvYN4uyIIWZ4VrCxCcJhUHAnBe2EYXu1GSnhuDd0eLnzYhY7tIcy-nEwex3eDp183eQEf9OoDOWmtrpe2HLhsrOQIgF573jaqPE4wZu-Fv-30JB8JsPaw7X2aEp7JFQB0tKIeK-D6SIQgd4hPsu6kfq2-Ei-kJ_p6UCVwiqp4HDV6TKaBqLVaihzh6hy4G2-a1985isrvwPWc9rZc',
            price: '₩145,000',
            accent: 'bg-primary'
        }
    ];

    return (
        <div className="bg-background text-on-surface min-h-screen font-body text-left">
            {/* TopAppBar */}
            <header className="bg-white/60 backdrop-blur-3xl sticky top-0 z-40 border-b border-white/50">
                <div className="flex justify-between items-center w-full px-6 py-5 max-w-7xl mx-auto">
                    <div className="flex items-center gap-5">
                        <button className="material-symbols-outlined text-teal-800 hover:bg-teal-50 p-2 rounded-full transition-all">menu</button>
                        <h1 className="font-headline font-black tracking-tighter text-3xl text-teal-900 border-l-4 border-primary pl-4 leading-none italic">busTaams</h1>
                    </div>
                    <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-2xl shadow-teal-900/10 rotate-3">
                        <img alt="User" src="https://lh3.googleusercontent.com/aida-public/AB6AXuARu0AsQmz4MYxTlYnquGCZVxq1VkmIMvF15cnV6VZVgon2koJh3GakbN7MQFJaMHoPpacCZss1keCkymnaqsyn6v5Zzb-YLjQOFz8m5aueu1TNs-rQBtX3uGkHSQJdwvUVV-HwzCG2ZcrO0qC63qzVDWmlJPgEtBg0HeQ9hTHiD1rwztdD2VZXsVYv6REVOnaHIL11IO4-vqhR9xo6OI14ro0lfGAq7Wm3QRBguARS9gIR1VJ4S-Hi2HgW09czpaxJG_U9bN9Dito" />
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-20 pb-40">
                {/* Editorial Header */}
                <div className="mb-24 animate-in fade-in slide-in-from-bottom duration-1000">
                    <p className="font-headline font-black text-secondary uppercase tracking-[0.5em] text-[10px] mb-6">Contract History</p>
                    <h2 className="font-headline font-black text-6xl md:text-[90px] text-primary leading-[0.9] tracking-tighter max-w-4xl">
                        나의 운행 이력<span className="text-secondary">.</span>
                    </h2>
                    <div className="h-2 w-32 bg-gradient-to-r from-secondary to-orange-200 mt-12 rounded-full shadow-lg shadow-secondary/20"></div>
                </div>

                {/* Trips List Container */}
                <div className="grid grid-cols-1 gap-10">
                    {trips.map((trip, idx) => (
                        <div 
                            key={trip.id} 
                            onClick={() => navigate(`/past-trip-detail/${trip.id}`)}
                            className={`group grid grid-cols-1 lg:grid-cols-12 bg-white rounded-[3rem] shadow-2xl shadow-teal-900/[0.03] overflow-hidden transition-all duration-700 hover:translate-y-[-12px] hover:shadow-teal-900/10 cursor-pointer border border-white relative ${idx % 2 === 1 ? 'bg-slate-50/50' : ''}`}
                        >
                            <div className={`lg:col-span-1 w-2 ${trip.accent} opacity-20 group-hover:opacity-100 transition-opacity`}></div>
                            <div className="lg:col-span-11 p-10 md:p-14 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
                                <div className="space-y-4">
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">{trip.date}</span>
                                    <h3 className="font-headline font-black text-3xl text-primary tracking-tight group-hover:text-secondary transition-colors">{trip.title}</h3>
                                    <div className="flex items-center gap-3 text-on-surface-variant font-bold opacity-60">
                                        <span className="material-symbols-outlined text-xl">route</span>
                                        <span className="text-lg tracking-tight">{trip.route}</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-12">
                                    <div className="flex items-center gap-4 bg-slate-50 px-6 py-3 rounded-full border border-slate-100">
                                        <img alt="Driver" className="w-14 h-14 rounded-2xl object-cover shadow-lg rotate-2" src={trip.captainImg} />
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Captain</span>
                                            <span className="font-black text-on-surface tracking-tight">{trip.captain}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Final Price</span>
                                        <span className="text-3xl font-black text-primary tracking-tighter">{trip.price}</span>
                                    </div>
                                    <button className="bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center shadow-2xl shadow-primary/40 group-hover:rotate-45 transition-transform duration-500">
                                        <span className="material-symbols-outlined text-3xl">receipt_long</span>
                                    </button>
                                </div>
                            </div>
                            {/* Decorative Background Element */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50 rounded-full -mr-32 -mt-32 opacity-0 group-hover:opacity-40 transition-opacity blur-3xl"></div>
                        </div>
                    ))}
                </div>

                {/* Footer Insight */}
                <div className="mt-24 pt-12 border-t border-slate-50 flex flex-col items-center text-center space-y-4 opacity-40">
                    <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[10px]">End of History</p>
                    <div className="w-1 h-12 bg-gradient-to-b from-slate-200 to-transparent"></div>
                </div>
            </main>

            {/* Premium Bottom Nav */}
            <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex justify-around items-center px-4 py-2 bg-slate-900 text-white w-[90%] max-w-md mx-auto rounded-full shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] border border-white/10">
                <button onClick={() => navigate('/customer-dashboard')} className="flex flex-col items-center justify-center text-slate-500 px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">gavel</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Auction</span>
                </button>
                <button onClick={() => navigate('/chat-room')} className="flex flex-col items-center justify-center text-slate-500 px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">chat_bubble</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Talk</span>
                </button>
                <button className="flex flex-col items-center justify-center px-5 py-2 text-white relative">
                    <div className="absolute inset-0 bg-white/10 rounded-2xl blur-lg"></div>
                    <span className="material-symbols-outlined relative z-10" style={{fontVariationSettings: "'FILL' 1"}}>payments</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1 relative z-10 underline decoration-2 underline-offset-4">History</span>
                </button>
                <button onClick={() => navigate('/profile-customer')} className="flex flex-col items-center justify-center bg-white/20 text-white rounded-full w-12 h-12 shadow-lg active:scale-90 transition-all">
                    <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>person</span>
                </button>
            </nav>
        </div>
    );
};

export default PastTripListCustomer;
