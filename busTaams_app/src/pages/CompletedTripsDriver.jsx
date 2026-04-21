import React from 'react';
import { useNavigate } from 'react-router-dom';

const CompletedTripsDriver = () => {
    const navigate = useNavigate();

    const completedTrips = [
        {
            id: 1,
            title: '인터시티 프리미엄 익스프레스',
            route: '시애틀 다운타운 → 밴쿠버 워터프론트',
            period: '2023/10/24 ~ 2023/10/26',
            price: '1,650,000',
            model: 'Mercedes-Benz Tourismo',
            status: '운행 완료'
        },
        {
            id: 2,
            title: '센트럴 코스트 셔틀',
            route: '샌프란시스코 → 산호세',
            period: '2023/10/15 ~ 2023/10/15',
            price: '450,000',
            model: 'Hyundai Universe',
            status: '운행 완료'
        },
        {
            id: 3,
            title: '이스트사이드 비즈니스 라인',
            route: '보스턴 → 뉴욕 맨해튼',
            period: '2023/10/10 ~ 2023/10/12',
            price: '1,280,000',
            model: 'Volvo 9700',
            status: '운행 완료'
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
                </div>
            </header>

            <main className="pt-48 px-6 max-w-7xl mx-auto space-y-20 animate-in fade-in slide-in-from-bottom duration-1000 text-left">
                {/* Editorial Header Section */}
                <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end text-left">
                    <div className="md:col-span-7 space-y-6 text-left">
                        <span className="text-secondary font-black tracking-[0.4em] uppercase text-[10px] block px-2 italic">Historical Audit Ledger</span>
                        <h2 className="font-headline text-6xl md:text-8xl font-black text-primary leading-[0.85] tracking-tighter italic uppercase text-left">
                            Mission <br/><span className="text-secondary underline decoration-secondary/20 underline-offset-[12px]">Archived.</span>
                        </h2>
                    </div>
                    <div className="md:col-span-5 md:pl-12 text-left border-l-4 border-slate-50">
                        <p className="text-slate-400 text-lg font-bold italic tracking-tight leading-relaxed text-left">
                            성공적으로 완료된 모든 운행 내역과 최종 정산 금액을 확인하세요. 지난 미션의 성과와 히스토리를 데이터로 투명하게 제공합니다.
                        </p>
                    </div>
                </section>

                <nav className="flex gap-10 border-b-4 border-slate-50 pb-4 text-left justify-center">
                    <button className="text-primary font-black text-sm uppercase tracking-[0.3em] italic border-b-8 border-primary pb-4">
                        Completed Missions (3)
                    </button>
                </nav>

                {/* History Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 text-left">
                    {completedTrips.map((trip) => (
                        <div key={trip.id} className="group bg-white rounded-[3.5rem] p-10 relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-teal-900/5 hover:-translate-y-2 text-left border border-slate-50">
                            <div className="space-y-8 text-left">
                                <div className="flex justify-between items-center text-left">
                                    <span className="px-5 py-2 rounded-full bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest italic">
                                        {trip.status}
                                    </span>
                                    <span className="material-symbols-outlined text-slate-100 group-hover:text-primary/20 transition-colors duration-500 text-4xl">verified</span>
                                </div>

                                <div className="space-y-2 text-left">
                                    <h3 className="font-headline text-2xl font-black text-primary italic uppercase tracking-tighter text-left group-hover:text-secondary transition-colors duration-500 leading-tight">
                                        {trip.title}
                                    </h3>
                                    <p className="text-slate-400 font-bold italic text-sm leading-tight uppercase tracking-widest">{trip.route}</p>
                                </div>

                                <div className="space-y-4 text-left">
                                    <div className="flex justify-between items-center text-left border-b border-slate-50 pb-4">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-300 italic">Timeline</span>
                                        <span className="font-black text-primary text-xs italic">{trip.period}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-left border-b border-slate-50 pb-4">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-300 italic">Fleet Unit</span>
                                        <span className="font-black text-primary text-xs italic">{trip.model}</span>
                                    </div>
                                    <div className="pt-4 flex justify-between items-end text-left">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-on-surface italic">Settled Value</span>
                                        <span className="font-headline text-2xl font-black text-secondary italic tracking-tighter">₩{trip.price}</span>
                                    </div>
                                </div>

                                <button onClick={() => navigate(`/completed-trip-detail-driver/${trip.id}`)} className="w-full py-6 rounded-[2.5rem] bg-slate-50 text-primary font-black text-[10px] uppercase tracking-[0.3em] hover:bg-primary hover:text-white transition-all active:scale-95 italic">
                                    Open Archive 상세 보기
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
                    <span className="material-symbols-outlined relative z-10" style={{fontVariationSettings: "'FILL' 1"}}>history_edu</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1 relative z-10 underline decoration-2 underline-offset-4">History</span>
                </button>
                <button onClick={() => navigate('/driver-certification')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">person</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Profile</span>
                </button>
            </nav>
        </div>
    );
};

export default CompletedTripsDriver;
