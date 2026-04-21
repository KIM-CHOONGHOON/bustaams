import React from 'react';
import { useNavigate } from 'react-router-dom';

const PassSelectDriver = () => {
    const navigate = useNavigate();

    const plans = [
        {
            id: 'basic',
            name: '일반',
            price: '300,000',
            desc: '안정적인 시작을 위한 선택',
            features: [
                { text: '월 10회 입찰 참여권', active: true },
                { text: '환불: 잔여일수 × ₩10,000', active: true },
                { text: '표준 고객 지원', active: false }
            ],
            btnText: '요금제 선택하기',
            current: false
        },
        {
            id: 'middle',
            name: '중급',
            price: '500,000',
            desc: '본격적인 비즈니스 확장',
            features: [
                { text: '월 20회 입찰 참여권', active: true, bold: true },
                { text: '환불: 잔여일수 × ₩17,000', active: true },
                { text: '경매 알림 우선순위 배정', active: true }
            ],
            btnText: '현재 멤버십 유지',
            current: true
        },
        {
            id: 'premium',
            name: '고급',
            price: '800,000',
            desc: '베스트 밸류 (BEST VALUE)',
            features: [
                { text: '월 30회 입찰 참여권', active: true },
                { text: '환불: 잔여일수 × ₩27,000', active: true },
                { text: 'VIP 전담 매니저 배정', active: true, bold: true },
                { text: '수수료 5% 추가 할인', active: true, bold: true }
            ],
            btnText: '고급 요금제로 업그레이드',
            current: false,
            badge: 'BEST'
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
                        <h1 className="font-headline font-black tracking-tighter text-3xl text-teal-900 italic uppercase">Membership</h1>
                    </div>
                </div>
            </header>

            <main className="pt-48 px-6 max-w-lg mx-auto space-y-16 animate-in fade-in slide-in-from-bottom duration-1000 text-left">
                {/* Hero Header */}
                <header className="space-y-6 text-left">
                    <span className="text-secondary font-black tracking-[0.4em] uppercase text-[10px] block px-2 italic">Premium Scalability</span>
                    <h2 className="font-headline text-5xl md:text-6xl font-black text-primary leading-[0.85] tracking-tighter italic uppercase text-left">
                        Maximize <br/><span className="text-slate-200 underline decoration-slate-200/20 underline-offset-[8px]">Fleet Revenue.</span>
                    </h2>
                    <p className="text-slate-400 text-lg font-bold italic tracking-tight leading-relaxed text-left border-l-4 border-slate-50 pl-8">
                        회원님의 운행 스타일에 맞는 요금제를 선택하고 더 많은 낙찰 기회를 잡으세요.
                    </p>
                </header>

                {/* Plans List */}
                <div className="space-y-10 text-left">
                    {plans.map(plan => (
                        <section key={plan.id} className={`relative bg-white rounded-[3rem] p-10 shadow-2xl shadow-teal-900/5 transition-all duration-500 overflow-hidden text-left border border-white group ${plan.current ? 'border-l-[12px] border-secondary' : 'hover:-translate-y-2'}`}>
                            {plan.current && (
                                <div className="absolute -top-1 right-10 bg-secondary text-white text-[8px] font-black px-5 py-2 rounded-b-2xl uppercase tracking-widest italic shadow-lg">
                                    Current Active (이용 중)
                                </div>
                            )}
                            {plan.badge && (
                                <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000"></div>
                            )}

                            <div className="flex justify-between items-start mb-10 text-left">
                                <div className="text-left space-y-1">
                                    <h3 className="text-3xl font-black text-primary italic uppercase tracking-tighter text-left">{plan.name}</h3>
                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">{plan.desc}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-3xl font-black text-primary italic tracking-tighter">₩{plan.price}</span>
                                    <span className="text-slate-300 text-[9px] font-black uppercase tracking-widest italic block mt-1">/ Monthly</span>
                                </div>
                            </div>

                            <div className="space-y-5 mb-10 text-left uppercase">
                                {plan.features.map((feat, i) => (
                                    <div key={i} className="flex items-center gap-4 text-left">
                                        <span className={`material-symbols-outlined text-xl ${feat.active ? (plan.current ? 'text-secondary' : 'text-primary') : 'text-slate-100'}`} style={feat.active ? {fontVariationSettings: "'FILL' 1"} : {}}>
                                            {feat.active ? 'check_circle' : (feat.text.includes('환불') ? 'history' : 'support_agent')}
                                        </span>
                                        <span className={`text-[11px] uppercase tracking-widest italic ${feat.active ? 'text-primary font-black' : 'text-slate-300 font-bold'}`}>
                                            {feat.text}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <button className={`w-full py-6 rounded-[2.5rem] font-black text-[10px] uppercase tracking-[0.3em] transition-all active:scale-95 italic ${plan.current ? 'bg-gradient-to-br from-primary to-teal-800 text-white shadow-2xl shadow-primary/30' : 'bg-slate-50 text-slate-400 hover:bg-primary hover:text-white'}`}>
                                {plan.btnText}
                            </button>
                        </section>
                    ))}
                </div>

                {/* Footer Info */}
                <footer className="pt-10 text-center pb-24">
                    <button className="text-slate-300 text-[10px] font-black uppercase tracking-widest italic hover:text-secondary transition-colors underline underline-offset-8 decoration-slate-100">
                        Terminate Membership 취소하기
                    </button>
                    <p className="text-center text-[9px] font-black text-slate-200 mt-10 uppercase tracking-widest leading-loose italic px-10">
                        멤버십 해지 시 다음 결제일부터 요금이 청구되지 않으며, 잔여 입찰권은 당월 말일까지 사용 가능합니다.
                    </p>
                </footer>
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
                <button onClick={() => navigate('/completed-trips-driver')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">history</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">History</span>
                </button>
                <button className="flex flex-col items-center justify-center px-5 py-2 text-primary relative">
                    <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-lg"></div>
                    <span className="material-symbols-outlined relative z-10" style={{fontVariationSettings: "'FILL' 1"}}>person</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1 relative z-10 underline decoration-2 underline-offset-4">Profile</span>
                </button>
            </nav>
        </div>
    );
};

export default PassSelectDriver;
