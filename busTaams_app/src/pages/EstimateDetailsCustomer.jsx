import React from 'react';
import { useNavigate } from 'react-router-dom';

const EstimateDetailsCustomer = () => {
    const navigate = useNavigate();

    return (
        <div className="bg-background text-on-surface min-h-[100dvh] pb-40 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/40 backdrop-blur-3xl border-b border-white/20 py-5">
                <div className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto">
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl text-teal-800 shadow-xl shadow-teal-900/5 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                        </button>
                        <h1 className="font-headline font-black tracking-tighter text-2xl text-teal-900 italic">Portfolio Details</h1>
                    </div>
                    <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-2xl rotate-3">
                        <img alt="User profile" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDAuydGKeWcVXnNwZDRc1I8NFS_BI9gq969584jVmM5maopYZ63srZ7FvlrWEb_EAlmkWIjBb5BPNcP1t7cxeVW66HWUlO53iZcSpZ7qSCpZdrQUXwvp8X5ibBv6Xx57pJrCmFA8WY8f1W6QCEC0wt2VbiePnFQ6Dco1T3vF-Vkzh0wL5vNyHOTwR2RKCQJ0QLxejtltR8UYIvSuocurIgQmtVJa8pHYHzWuHFe8N8rJRH34uYOlkJtQMcv8C1c99d4lMC41r-mrI" />
                    </div>
                </div>
            </header>

            <main className="pt-32 pb-32 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 animate-in fade-in slide-in-from-bottom duration-1000">
                {/* Left Column: Driver & Vehicle Content */}
                <div className="lg:col-span-8 space-y-20">
                    {/* Driver Profile Section */}
                    <section className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center text-left">
                        <div className="md:col-span-5 aspect-square rounded-[4rem] overflow-hidden shadow-2xl shadow-teal-900/10 bg-white border-8 border-white rotate-3 group hover:rotate-0 transition-all duration-700">
                            <img alt="Driver Photo" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDO_BNLuF034x5Cszfwy3z0ITFxvEWTn8UC1XjQUr2nKSRC-P0RvwFwPzPjm5AW74QUxuABrQ0KMfkF5p3yFgQQM-kv-qr7Su8WkRCZThQtzKgpMM4IbieUcoMY1qLQAy8mzEmwKq-Inwt6XFNd2ow_EA0pE8eazLoxA-Ql3INKb7B7Exo9ou8P5LJ4pgyWmynIxUdimCX1jKlytwzJny5d4Dh9VBSycaiGyCynv4gI669R3IOXz4e1HEONY-xMawS59BX3Gwwbr8M" />
                        </div>
                        <div className="md:col-span-7 space-y-6 text-left">
                            <div className="flex items-center gap-4 text-left">
                                <span className="bg-primary text-white text-[9px] font-black px-5 py-2 rounded-full flex items-center gap-2 tracking-widest uppercase shadow-lg shadow-primary/20">
                                    <span className="material-symbols-outlined text-[14px]" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>
                                    Verified Master
                                </span>
                                <span className="text-secondary font-black text-[10px] tracking-[0.4em] uppercase">15 Years Experience</span>
                            </div>
                            <h1 className="text-6xl font-black tracking-tighter text-on-surface italic leading-none">김민수 파트너</h1>
                            <p className="text-slate-400 text-xl font-bold tracking-tight italic leading-relaxed">
                                "안전과 정시 도착을 최우선으로 생각합니다. <span className="text-primary underline decoration-primary/20 underline-offset-4">1,000회 이상의 무사고 기록</span>을 보유한 베테랑과 함께하세요."
                            </p>
                            <div className="grid grid-cols-2 gap-8 py-8 border-y-4 border-slate-50 text-left">
                                <div className="space-y-1">
                                    <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest">Master Rating</p>
                                    <p className="text-3xl font-black flex items-baseline gap-2 italic">4.9 <span className="text-secondary text-sm">★★★★★</span></p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest">Global Trips</p>
                                    <p className="text-3xl font-black italic tracking-tighter">1,248 Units</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Gallery Section */}
                    <section className="space-y-10 text-left">
                        <div className="flex justify-between items-end text-left">
                            <div className="space-y-2 text-left">
                                <h2 className="text-4xl font-black tracking-tighter italic uppercase text-primary">Vessel Specification</h2>
                                <p className="text-slate-400 font-bold tracking-tight">현대 유니버스 노블 | 2023 New Generation</p>
                            </div>
                            <div className="flex gap-4">
                                <button className="w-14 h-14 rounded-2xl bg-white shadow-xl flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all active:scale-90">
                                    <span className="material-symbols-outlined">chevron_left</span>
                                </button>
                                <button className="w-14 h-14 rounded-2xl bg-white shadow-xl flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all active:scale-90">
                                    <span className="material-symbols-outlined">chevron_right</span>
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-12 gap-6 h-[500px] text-left">
                            <div className="col-span-8 rounded-[3.5rem] overflow-hidden bg-slate-100 relative group">
                                <img alt="Bus Exterior" className="w-full h-full object-cover scale-105 group-hover:scale-100 transition-all duration-1000" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDecZEtL6dETnBmr40vD2OT0hYPSAcKQwKO47_e56V9h1tEJvK6cj7czpDDbd5lUCAfZPVC5DOaiwZLOp3JrI0R5wrCprX9sFgw4fIuotlUjwwZkR01PvsF6tZqbjzg-o6PrT7TXjPVF7G83q8pW2u2hs0JL74boDeyhZ0-lkqEoxHzMgxs_IOzwT4xRuOhMMdG8pz6nkIwRY-gG2IirQOKmB9DtHZFwd-C__nskZJw9La-JFylnx0pTwKpIoZU-WX29H2-G_NepfU" />
                                <div className="absolute bottom-10 left-10 bg-white/40 backdrop-blur-3xl px-8 py-3 rounded-full text-black text-[10px] font-black uppercase tracking-widest shadow-2xl">Main Exterior</div>
                            </div>
                            <div className="col-span-4 flex flex-col gap-6">
                                <div className="h-1/2 rounded-[3rem] overflow-hidden bg-slate-100 relative group">
                                    <img alt="Bus Interior" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDE_MkEqTZuhiX4PcASlCRXxAaWsIkdHMYDQvjU5yXJqgbit52MH_484Dxf3yKObxnRnlWNtEFS9BbAw21cPuICDhGonUoAZRfQ0XWV_hQgvqFeZgPcDvKfZM27WRlo0tTEjQYkBHqx0D3OvUWa_j0yKWHZZaONag4hWoWPkw-Jydi9tA7Dv4OaBUStcm89YMCBtovPcGxfBRgBa6lh2q8t4nVyPhFUZyld7jfJ0yFDmuV43oecPj8o72WFabdiXd-SSl4VpU_j-WY" />
                                    <div className="absolute top-6 right-6 bg-primary text-white px-4 py-2 rounded-2xl text-[8px] font-black uppercase tracking-widest">Lounge</div>
                                </div>
                                <div className="h-1/2 rounded-[3rem] overflow-hidden bg-slate-900 relative group cursor-pointer">
                                    <img alt="Bus Detail" className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-all" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAxADwSp1SoNwQ1Avahps1GcZ3ETHwOsIDd35adp6oa9NP01Lg4qRva14pLoLOLjkE0IbH22GWfikOwWPtCBBHHyjY6oXRTaOnhV6KHtc3kJehjuBCWswmPsgnW1ppXs0iAKSt5NLtTIlDKya3-WGAVuHUWMy6kAwpzsTnOxWsqm7pRM4uDEyfhR9ur3_W7ZD72MKBRli1tPdYzkFNxEQym5BgMFOmQYmR89KfgtViBSwt6WKYurCm0_hCcQG6qAR0D-iEO-8mXBwA" />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-2">
                                        <span className="text-white font-black text-2xl tracking-tighter">+12 Photos</span>
                                        <span className="text-slate-500 text-[8px] font-black uppercase tracking-[0.3em]">Explore Full Gallery</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Amenities Icons */}
                    <section className="grid grid-cols-2 md:grid-cols-4 gap-6 text-left">
                        {[
                            { icon: 'wifi', label: 'Broadband Wi-Fi' },
                            { icon: 'ac_unit', label: 'Arctic Climate' },
                            { icon: 'usb', label: 'Power Nodes' },
                            { icon: 'airline_seat_recline_extra', label: 'Royal Seating' }
                        ].map(item => (
                            <div key={item.label} className="p-10 rounded-[3rem] bg-white shadow-2xl shadow-teal-900/5 group hover:bg-slate-900 transition-all duration-500 border border-slate-50 flex flex-col items-center text-center space-y-4">
                                <span className="material-symbols-outlined text-primary text-4xl group-hover:text-white transition-all">{item.icon}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 group-hover:text-slate-500">{item.label}</span>
                            </div>
                        ))}
                    </section>

                    {/* Reviews */}
                    <section className="space-y-10 text-left">
                        <h3 className="text-3xl font-black tracking-tighter italic uppercase text-primary">Intelligence (Reviews)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                            {[
                                { name: '박지훈 님', text: '기사님이 정말 친절하시고 운전도 매끄럽게 잘 하세요. 차량도 신형이라 그런지 냄새 하나 없이 쾌적했습니다.', letter: 'P' },
                                { name: '이서연 님', text: '가족 여행에 이용했는데, 내부 공간이 정말 넓어서 부모님도 만족하셨어요. 정시 도착은 기본입니다!', letter: 'S' }
                            ].map((review, i) => (
                                <div key={i} className="p-10 bg-white rounded-[3.5rem] shadow-2xl shadow-teal-900/5 space-y-6 border border-slate-50 text-left hover:scale-[1.02] transition-all">
                                    <div className="flex justify-between items-center text-left">
                                        <div className="flex items-center gap-4 text-left">
                                            <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary font-black shadow-inner">{review.letter}</div>
                                            <span className="font-black text-on-surface tracking-tight">{review.name}</span>
                                        </div>
                                        <span className="text-secondary text-sm">★★★★★</span>
                                    </div>
                                    <p className="text-slate-400 font-bold italic leading-relaxed text-sm">"{review.text}"</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Right Column: Sticky Quotation */}
                <div className="lg:col-span-4">
                    <div className="sticky top-32 space-y-8 animate-in fade-in slide-in-from-right duration-1000 delay-300">
                        <div className="bg-slate-900 p-12 rounded-[4rem] text-left shadow-2xl shadow-slate-900/40 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-secondary"></div>
                            <h3 className="text-2xl font-black text-white tracking-tighter italic uppercase mb-10">Quotation Ledger</h3>
                            <div className="space-y-6 text-left">
                                <div className="flex justify-between items-center text-left">
                                    <span className="text-slate-500 font-black text-[9px] uppercase tracking-widest">Base Duration (12h)</span>
                                    <span className="font-black text-white tracking-tight">₩ 850,000</span>
                                </div>
                                <div className="flex justify-between items-center text-left">
                                    <span className="text-slate-500 font-black text-[9px] uppercase tracking-widest">Fuel & Logistics</span>
                                    <span className="font-black text-white tracking-tight">₩ 120,000</span>
                                </div>
                                <div className="flex justify-between items-center pb-6 text-left">
                                    <span className="text-slate-500 font-black text-[9px] uppercase tracking-widest">Highway Tolls (Est.)</span>
                                    <span className="font-black text-white tracking-tight">₩ 45,000</span>
                                </div>
                                <div className="pt-8 border-t border-white/10 flex justify-between items-baseline text-left">
                                    <span className="text-sm font-black text-slate-300 uppercase tracking-widest">Grand Total</span>
                                    <div className="text-right">
                                        <p className="text-5xl font-black text-primary tracking-tighter leading-none italic">₩1,015k</p>
                                        <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest mt-2">VAT Integrated</p>
                                    </div>
                                </div>
                            </div>
                            <button className="w-full mt-12 py-7 rounded-full bg-primary text-white font-black text-xs uppercase tracking-[0.4em] shadow-2xl shadow-primary/30 active:scale-95 transition-all hover:bg-white hover:text-black group">
                                Confirm & Secure Trip
                            </button>
                            <p className="text-center text-[8px] text-slate-500 font-black uppercase tracking-widest mt-8 leading-relaxed">
                                * Free cancellation within 24 hours of protocol initiation.
                            </p>
                        </div>

                        {/* Status Check */}
                        <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex items-center gap-6">
                            <div className="w-4 h-4 rounded-full bg-secondary animate-pulse shadow-lg shadow-secondary/50"></div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real-Time Grid Availability Lock</p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Shared Bottom Nav */}
            <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex justify-around items-center px-4 py-2 bg-white/70 backdrop-blur-3xl text-slate-400 w-[90%] max-w-md mx-auto rounded-full shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] border border-white">
                <button onClick={() => navigate('/customer-dashboard')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-primary transition-all">
                    <span className="material-symbols-outlined">gavel</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Auction</span>
                </button>
                <button onClick={() => navigate('/reservation-list')} className="flex flex-col items-center justify-center px-5 py-2 text-primary">
                    <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>directions_bus</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1 underline decoration-2 underline-offset-4">Trips</span>
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

export default EstimateDetailsCustomer;
