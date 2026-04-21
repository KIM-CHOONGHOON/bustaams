import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const EstimateDetailCustomer = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    return (
        <div className="bg-background text-on-surface min-h-screen pb-32 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-50 shadow-sm">
                <div className="flex items-center justify-between px-6 h-18 w-full max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="material-symbols-outlined text-slate-400 hover:bg-slate-50 p-2 rounded-full transition-all">arrow_back</button>
                        <h1 className="font-headline text-lg font-black tracking-tighter text-teal-700 italic">busTaams Premier</h1>
                    </div>
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-teal-50 shadow-sm">
                        <img alt="User" src="https://lh3.googleusercontent.com/aida-public/AB6AXuANS93xG7AUgubsf6sqp29rNs1qohmh-TlClLjyLHubaPtcnX3IRM6eLJma2ZLVaZP-QkwoTOAaSa1Yz08LzWNWsvzPXMPSqG2bevLcX9aKOnlXDWYuQkx2U-TgraHt1MbZ89CyDkYjYDlN33EV0jkctrTeIC0Vmp0sjEo6wWB6ICkduz6fnsWQvjrykK3jjlwflf-vgLxq39-KQgv0UGwn1zBTjdMZwiY4KNW7XWvTJOg-pQGIGtfQO8EMOfMkT0TUgc1BC0mgy08" />
                    </div>
                </div>
            </header>

            <main className="pt-28 pb-32 px-6 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
                    <div className="lg:col-span-8 space-y-16">
                        {/* Driver Profile Section */}
                        <section className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
                            <div className="md:col-span-5 aspect-square rounded-[3rem] overflow-hidden shadow-2xl shadow-teal-900/10 bg-white ring-8 ring-white">
                                <img alt="Driver" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDO_BNLuF034x5Cszfwy3z0ITFxvEWTn8UC1XjQUr2nKSRC-P0RvwFwPzPjm5AW74QUxuABrQ0KMfkF5p3yFgQQM-kv-qr7Su8WkRCZThQtzKgpMM4IbieUcoMY1qLQAy8mzEmwKq-Inwt6XFNd2ow_EA0pE8eazLoxA-Ql3INKb7B7Exo9ou8P5LJ4pgyWmynIxUdimCX1jKlytwzJny5d4Dh9VBSycaiGyCynv4gI669R3IOXz4e1HEONY-xMawS59BX3Gwwbr8M" />
                            </div>
                            <div className="md:col-span-7 space-y-6">
                                <div className="flex items-center gap-3">
                                    <span className="bg-primary/5 text-primary text-[10px] font-black px-4 py-1.5 rounded-full flex items-center gap-1.5 uppercase tracking-widest border border-primary/10">
                                        <span className="material-symbols-outlined text-[14px]" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>
                                        Certified Partner
                                    </span>
                                    <span className="text-secondary font-black text-[10px] tracking-[0.2em] uppercase">15 Years Exp.</span>
                                </div>
                                <h2 className="text-[44px] font-black tracking-tighter text-on-surface leading-none">김민수 파트너</h2>
                                <p className="text-on-surface-variant text-lg leading-snug max-w-lg font-medium opacity-70">
                                    "안전과 정시 도착은 기본입니다. 1,000회 이상의 무사고 기록을 보유한 드라이버와 함께 프리미엄 여행의 품격을 경험해 보세요."
                                </p>
                                <div className="grid grid-cols-2 gap-8 py-6 border-y border-slate-100">
                                    <div>
                                        <p className="text-slate-300 text-[10px] font-black uppercase tracking-widest mb-1">평점</p>
                                        <p className="text-2xl font-black flex items-center gap-1.5">
                                            4.9 <span className="material-symbols-outlined text-secondary text-lg" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-300 text-[10px] font-black uppercase tracking-widest mb-1">예약 확정</p>
                                        <p className="text-2xl font-black">1,248회</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Vehicle Gallery */}
                        <section className="space-y-8">
                            <div className="flex justify-between items-end">
                                <div className="space-y-1">
                                    <h3 className="text-[32px] font-black tracking-tighter text-primary leading-tight">현대 유니버스 노블</h3>
                                    <p className="text-on-surface-variant font-bold opacity-50 uppercase tracking-widest text-xs">2023 EDITION | 28 SEATS PREMIUM CLASS</p>
                                </div>
                                <div className="flex gap-2">
                                    <button className="w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center hover:bg-slate-50 transition-all active:scale-90 border border-slate-50">
                                        <span className="material-symbols-outlined">chevron_left</span>
                                    </button>
                                    <button className="w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center hover:bg-slate-50 transition-all active:scale-90 border border-slate-50">
                                        <span className="material-symbols-outlined">chevron_right</span>
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-12 gap-4 h-[450px]">
                                <div className="col-span-8 rounded-[3rem] overflow-hidden bg-slate-100 relative group shadow-2xl shadow-teal-900/10">
                                    <img alt="Exterior" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDecZEtL6dETnBmr40vD2OT0hYPSAcKQwKO47_e56V9h1tEJvK6cj7czpDDbd5lUCAfZPVC5DOaiwZLOp3JrI0R5wrCprX9sFgw4fIuotlUjwwZkR01PvsF6tZqbjzg-o6PrT7TXjPVF7G83q8pW2u2hs0JL74boDeyhZ0-lkqEoxHzMgxs_IOzwT4xRuOhMMdG8pz6nkIwRY-gG2IirQOKmB9DtHZFwd-C__nskZJw9La-JFylnx0pTwKpIoZU-WX29H2-G_NepfU" />
                                    <div className="absolute top-8 left-8 bg-black/30 backdrop-blur-md px-5 py-2 rounded-full text-white text-[10px] font-black uppercase tracking-widest border border-white/20">Exterior</div>
                                </div>
                                <div className="col-span-4 flex flex-col gap-4">
                                    <div className="h-1/2 rounded-[2.5rem] overflow-hidden bg-slate-100 relative group shadow-xl">
                                        <img alt="Interior" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDE_MkEqTZuhiX4PcASlCRXxAaWsIkdHMYDQvjU5yXJqgbit52MH_484Dxf3yKObxnRnlWNtEFS9BbAw21cPuICDhGonUoAZRfQ0XWV_hQgvqFeZgPcDvKfZM27WRlo0tTEjQYkBHqx0D3OvUWa_j0yKWHZZaONag4hWoWPkw-Jydi9tA7Dv4OaBUStcm89YMCBtovPcGxfBRgBa6lh2q8t4nVyPhFUZyld7jfJ0yFDmuV43oecPj8o72WFabdiXd-SSl4VpU_j-WY" />
                                        <div className="absolute top-6 right-6 bg-secondary/80 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-[10px] font-black uppercase tracking-widest">Premium Seat</div>
                                    </div>
                                    <div className="h-1/2 rounded-[2.5rem] overflow-hidden bg-slate-100 relative group shadow-xl">
                                        <img alt="Detail" className="w-full h-full object-cover group-hover:rotate-2 transition-transform duration-1000" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAxADwSp1SoNwQ1Avahps1GcZ3ETHwOsIDd35adp6oa9NP01Lg4qRva14pLoLOLjkE0IbH22GWfikOwWPtCBBHHyjY6oXRTaOnhV6KHtc3kJehjuBCWswmPsgnW1ppXs0iAKSt5NLtTIlDKya3-WGAVuHUWMy6kAwpzsTnOxWsqm7pRM4uDEyfhR9ur3_W7ZD72MKBRli1tPdYzkFNxEQym5BgMFOmQYmR89KfgtViBSwt6WKYurCm0_hCcQG6qAR0D-iEO-8mXBwA" />
                                        <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                            <span className="text-3xl font-black tracking-tighter">+12</span>
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">View More</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Vehicle Specs */}
                        <section className="bg-white rounded-[3rem] p-12 shadow-2xl shadow-teal-900/[0.03] border border-slate-50 space-y-10">
                            <h4 className="text-xl font-black tracking-tight border-b border-slate-50 pb-6">차량 사양 정보</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8">
                                <div className="flex justify-between items-center group">
                                    <span className="text-slate-400 font-bold uppercase text-[11px] tracking-widest">차량 모델</span>
                                    <span className="font-black text-on-surface">현대 유니버스 노블</span>
                                </div>
                                <div className="flex justify-between items-center group">
                                    <span className="text-slate-400 font-bold uppercase text-[11px] tracking-widest">배출 단계</span>
                                    <span className="font-black text-on-surface">Euro 6 Certified</span>
                                </div>
                                <div className="flex justify-between items-center group">
                                    <span className="text-slate-400 font-bold uppercase text-[11px] tracking-widest">보험 상태</span>
                                    <span className="font-black text-primary flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-sm">security</span>
                                        전매 가입 완료
                                    </span>
                                </div>
                                <div className="flex justify-between items-center group">
                                    <span className="text-slate-400 font-bold uppercase text-[11px] tracking-widest">정기 정검</span>
                                    <span className="font-black text-primary">검사 완료 (24/02)</span>
                                </div>
                            </div>
                            <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[{icon: 'wifi', name: 'Free Wi-Fi'}, {icon: 'ac_unit', name: 'Climate Control'}, {icon: 'usb', name: 'USB Port'}, {icon: 'airline_seat_recline_extra', name: 'Premium Seats'}].map(opt => (
                                    <div key={opt.name} className="p-6 rounded-[1.5rem] bg-slate-50 flex flex-col items-center justify-center text-center space-y-3 border-b-4 border-secondary/20">
                                        <span className="material-symbols-outlined text-primary text-3xl">{opt.icon}</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-on-surface">{opt.name}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Right Sticky Sidebar */}
                    <div className="lg:col-span-4">
                        <aside className="sticky top-28 bg-white p-12 rounded-[3.5rem] shadow-2xl shadow-teal-900/10 border border-slate-50 space-y-10">
                            <div className="space-y-2">
                                <h4 className="text-xs font-black text-slate-300 uppercase tracking-[0.3em]">Estimated Receipt</h4>
                                <h3 className="text-2xl font-black tracking-tight">상세 견적서</h3>
                            </div>
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 font-bold text-sm">기본 운행료 (12h)</span>
                                    <span className="font-black">₩ 850,000</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 font-bold text-sm">유류비 및 소모품</span>
                                    <span className="font-black">₩ 120,000</span>
                                </div>
                                <div className="flex justify-between items-center pb-6 border-b border-slate-50">
                                    <span className="text-slate-400 font-bold text-sm">도로 통행료 (Est.)</span>
                                    <span className="font-black">₩ 45,000</span>
                                </div>
                                <div className="pt-4 flex justify-between items-baseline">
                                    <span className="text-lg font-black tracking-tighter">TOTAL</span>
                                    <div className="text-right">
                                        <span className="text-[40px] font-black text-primary leading-none tracking-tighter">₩ 1,015,000</span>
                                        <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest mt-2">VAT Included</p>
                                    </div>
                                </div>
                            </div>
                            <button className="w-full py-6 rounded-full bg-gradient-to-br from-primary to-teal-800 text-white font-black text-xl shadow-2xl shadow-primary/30 hover:scale-[1.03] active:scale-95 transition-all">
                                지금 바로 예약하기
                            </button>
                            <p className="text-center text-[10px] text-slate-300 font-black leading-loose uppercase tracking-widest">
                                * Free cancelation within 24 hours.<br/>Terms & Conditions apply.
                            </p>
                        </aside>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default EstimateDetailCustomer;
