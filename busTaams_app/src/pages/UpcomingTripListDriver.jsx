import React from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNavDriver from '../components/BottomNavDriver';

const UpcomingTripListDriver = () => {
    const navigate = useNavigate();

    const upcomingTrips = [
        {
            id: 1,
            title: '인터시티 프리미엄 익스프레스',
            route: '서울역 → 부산 터미널',
            period: '2023/10/24 ~ 2023/10/26',
            price: '1,650,000',
            model: '현대 유니버스 프레스티지',
            status: '다음 운행 예정',
            isFeatured: true,
            image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDZmRZL_HsaOszSmVrtuGwUBYyk6tx-rD4Vk4Dasgb37vYAbbZuWacuLUPqrpB9BVhKLuUw-tF2Etkrkt-rZ4xwhT9ZgE3DjgEoksHVJIAaAcDdV-b-rsVtEvcVtKK2EmfqAmsfSSz-jkrLECuP2Pl1W98npMSrPEjigDVHPy5EauRaAGFpUNKJwbmlxIhbJXkrmDZf4k95TECEDbq8ljjlCzWMxf9L9qkUPJwW0evuxafMlIu1mxVH0QFXZ0fXd6sgXKIvpbZIdOo'
        },
        {
            id: 2,
            title: '코스탈 스카이라이너',
            route: '속초 → 강릉 해안도로',
            period: '2023/11/12 ~ 2023/11/14',
            price: '980,000',
            model: '기아 그랜버드 실크로드',
            status: '확정됨'
        },
        {
            id: 3,
            title: '마운틴 피크 익스프레스',
            route: '평창 → 대관령 목장',
            period: '2023/12/01 ~ 2023/12/03',
            price: '1,250,000',
            model: 'Scania Irizar i8',
            status: '확정됨'
        },
        {
            id: 4,
            title: '그랜드 시티 투어',
            route: '대전 시티홀 → 엑스포 과학공원',
            period: '2023/11/15 ~ 2023/11/18',
            price: '2,750,000',
            model: 'Setra S 531 DT (2층 버스)',
            status: '예정됨 - 대형 운송',
            isSecondaryFeatured: true,
            image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDQEQ7Mdir7rLkG0Lk3UVAI9DaHmrIz5ktYW0eDIsXE3CNe1x_Xy9-kJHWnABM3HHtPiJYg2ck6gJC5fmWkZ7AVQ9wnlxYChCBZ3-Kkp1c4d94wo-grYweOPoS1KlHC6zVI0NgQjgNubsYd4HXN6Brx8yndg7BK1vtAoAbpGCgaP2CqTjjlooDCSGlFv7c0UADhIPjZThViqY2Q-wTEJ9Hsvl16fJKWx2SkB3_RiasGDe6aTM-ur6OXspBZNkFA-DoIhXh59LjUnoI'
        }
    ];

    return (
        <div className="bg-background text-on-surface min-h-[100dvh] pb-48 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/40 backdrop-blur-3xl border-b border-white/20 py-6">
                <div className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto">
                    <div className="flex items-center gap-6 text-left">
                        <button className="p-3 bg-white rounded-2xl text-teal-800 shadow-xl shadow-teal-900/5 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-lg">menu</span>
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
                    <div className="md:col-span-7 space-y-6 text-left">
                        <span className="text-secondary font-black tracking-[0.4em] uppercase text-[10px] block px-2 italic">Fleet Operations Ledger</span>
                        <h2 className="font-headline text-6xl md:text-8xl font-black text-primary leading-[0.85] tracking-tighter italic uppercase text-left">
                            Upcoming <br/><span className="text-secondary">Missions.</span>
                        </h2>
                    </div>
                    <div className="md:col-span-5 md:pl-12 text-left border-l-4 border-slate-50">
                        <p className="text-slate-400 text-lg font-bold italic tracking-tight leading-relaxed text-left">
                            확정된 향후 운행 일정을 확인하고 관리하세요. 각 계약의 상세 정보와 배차팀 프로토콜을 제공합니다.
                        </p>
                    </div>
                </section>

                <nav className="flex gap-10 border-b-4 border-slate-50 pb-4 text-left">
                    <button className="text-primary font-black text-sm uppercase tracking-[0.3em] italic border-b-8 border-primary pb-4">
                        Reserved Fleet (4)
                    </button>
                </nav>

                {/* Contract Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 text-left">
                    {upcomingTrips.map((trip) => (
                        <div key={trip.id} className={`${(trip.isFeatured || trip.isSecondaryFeatured) ? 'lg:col-span-2' : 'col-span-1'} group bg-white rounded-[3.5rem] p-10 relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-teal-900/5 hover:-translate-y-2 text-left`}>
                            {trip.isFeatured && <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-secondary"></div>}
                            
                            <div className="flex flex-col md:flex-row gap-10 text-left">
                                <div className="flex-1 space-y-8 text-left">
                                    <div className="flex items-center justify-between text-left">
                                        <div className="flex items-center gap-4 text-left">
                                            {trip.isFeatured && <span className="flex h-3 w-3 rounded-full bg-secondary animate-pulse"></span>}
                                            <span className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest ${trip.isFeatured ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'}`}>
                                                {trip.status}
                                            </span>
                                        </div>
                                        {!trip.isFeatured && <span className="material-symbols-outlined text-slate-200">more_vert</span>}
                                    </div>

                                    <div className="space-y-2 text-left">
                                        <h3 className="font-headline text-3xl font-black text-primary italic uppercase tracking-tighter text-left">{trip.title}</h3>
                                        <p className="text-slate-400 font-bold italic text-lg leading-none">{trip.route}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6 text-left">
                                        <div className="bg-slate-50 p-6 rounded-[2rem] text-left">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-300 mb-2 italic">Operation Sync</p>
                                            <p className="font-black text-primary text-sm italic">{trip.period}</p>
                                        </div>
                                        <div className="bg-slate-50 p-6 rounded-[2rem] text-left">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-300 mb-2 italic">Contract Value</p>
                                            <p className="font-black text-primary text-sm italic">₩{trip.price}</p>
                                        </div>
                                    </div>

                                    <div className="text-left py-2">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-300 mb-2 italic">Fleet Model</p>
                                        <p className="font-black text-primary text-lg italic leading-none underline decoration-primary/10 underline-offset-4">{trip.model}</p>
                                    </div>

                                    <button onClick={() => navigate('/upcoming-trip-detail-driver')} className="w-full py-6 rounded-[2rem] bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.3em] hover:bg-primary transition-all active:scale-95 shadow-2xl shadow-slate-900/30 italic">
                                        Open Ledger 상세 보기
                                    </button>
                                </div>

                                {(trip.isFeatured || trip.isSecondaryFeatured) && (
                                    <div className="w-full md:w-80 h-auto min-h-[300px] rounded-[3rem] overflow-hidden shadow-2xl relative group-hover:scale-[1.02] transition-transform duration-700">
                                        <img alt={trip.title} className="w-full h-full object-cover" src={trip.image} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            <BottomNavDriver activeTab="trips" />
        </div>
    );
};

export default UpcomingTripListDriver;
