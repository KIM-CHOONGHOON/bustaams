import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const ReservationDetailCustomer = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    return (
        <div className="bg-background text-on-surface min-h-screen pb-40 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-3xl border-b border-white py-4 shadow-sm">
                <div className="flex items-center justify-between px-6 h-18 w-full max-w-7xl mx-auto">
                    <div className="flex items-center gap-5">
                        <button onClick={() => navigate(-1)} className="text-teal-800 hover:bg-slate-50 p-2 rounded-full transition-all">
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                        <h1 className="text-3xl font-black text-teal-900 tracking-tighter font-headline italic">busTaams</h1>
                    </div>
                    <div className="flex items-center gap-8">
                        <nav className="hidden lg:flex items-center gap-10">
                            <a className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em] hover:text-primary transition-all">Home</a>
                            <a className="text-primary font-black uppercase text-[10px] tracking-[0.3em] border-b-2 border-primary pb-1">Reservations</a>
                            <a className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em] hover:text-primary transition-all">Messages</a>
                        </nav>
                        <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-2xl rotate-3">
                            <img alt="User" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAoeVWTLVpGnkWIyZicMecety9-CGdpLwphd882r5bR7LGEFApzaB-h75AbUKFv7Z2dXtx1cK0v1kHNhLGb4f72VRsKJ7CVygOEoLxikAN4igS9CwKYHmnRKRcbyZEw2KOO4nLvN-hRvfRji39TRg6EhEI4vCiDn8P_V3H7VvBpacjSba137bq3sC0SUIWG6zjFXUKoWm-W14wbuiEduIRPUnpYuUwFYtWNCj5VLcpcQ7SIpcrpO3P8OM4OOk-BrAPiRmLzIJcMFmQ" />
                        </div>
                    </div>
                </div>
            </header>

            <main className="pt-32 px-6 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                    {/* Left Column: Route Summary & Vehicles */}
                    <div className="lg:col-span-8 space-y-16">
                        {/* Editorial Header Section */}
                        <section className="animate-in fade-in slide-in-from-top duration-700 text-left">
                            <div className="flex items-end justify-between gap-6 mb-12">
                                <div className="text-left">
                                    <p className="text-secondary font-black tracking-[0.4em] text-[10px] mb-4 uppercase">Reservation Details</p>
                                    <h2 className="text-6xl md:text-7xl font-black tracking-tighter text-on-surface leading-none">
                                        <span className="text-primary italic">광주 터미널</span> 여정
                                    </h2>
                                </div>
                                <span className="inline-flex items-center gap-3 px-6 py-2 bg-secondary/10 text-secondary rounded-full text-xs font-black uppercase tracking-widest border border-secondary/20">
                                    <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                                    예약중
                                </span>
                            </div>
                        </section>

                        {/* Route Summary */}
                        <div className="bg-white rounded-[3.5rem] p-12 shadow-2xl shadow-teal-900/[0.03] relative overflow-hidden border border-slate-50 text-left">
                            <div className="absolute top-0 left-0 w-2 h-full bg-primary opacity-20"></div>
                            <h2 className="text-2xl font-black mb-12 flex items-center gap-4 text-on-surface tracking-tighter italic">
                                <span className="material-symbols-outlined text-primary text-3xl">route</span>
                                Route Overview
                            </h2>
                            <div className="space-y-12 relative text-left">
                                {/* Timeline Line */}
                                <div className="absolute left-4 top-2 bottom-2 w-1 bg-slate-50"></div>
                                
                                {/* Departure */}
                                <div className="relative pl-16 text-left">
                                    <div className="absolute left-[7px] top-2 w-4 h-4 rounded-full bg-primary border-4 border-white shadow-lg z-10"></div>
                                    <p className="text-slate-300 text-[9px] font-black uppercase tracking-widest mb-2">Departing Point</p>
                                    <h3 className="text-2xl font-black tracking-tighter">서울역</h3>
                                    <p className="text-sm text-slate-400 font-bold mt-2 italic">2024. 05. 12 09:00</p>
                                </div>
                                
                                {/* Waypoint */}
                                <div className="relative pl-16 text-left">
                                    <div className="absolute left-2 top-2 w-3 h-3 rounded-full bg-slate-200 border-2 border-white shadow-md z-10"></div>
                                    <p className="text-slate-300 text-[9px] font-black uppercase tracking-widest mb-2">Waypoint</p>
                                    <h3 className="text-xl font-bold text-slate-400 tracking-tighter">대전 스카이 센터</h3>
                                    <p className="text-sm text-slate-300 font-bold mt-2">2024. 05. 12 11:30</p>
                                </div>
                                
                                {/* Destination */}
                                <div className="relative pl-16 text-left">
                                    <div className="absolute left-[7px] top-2 w-4 h-4 rounded-full bg-secondary border-4 border-white shadow-lg z-10"></div>
                                    <p className="text-slate-300 text-[9px] font-black uppercase tracking-widest mb-2">Arrival Point</p>
                                    <h3 className="text-2xl font-black tracking-tighter text-secondary">광주 유스퀘어</h3>
                                    <p className="text-sm text-secondary/40 font-bold mt-2 italic font-black">2024. 05. 12 14:45</p>
                                </div>
                            </div>
                        </div>

                        {/* Vehicle & Driver Section */}
                        <div className="space-y-10 text-left">
                            <div className="flex justify-between items-end px-4">
                                <h2 className="text-3xl font-black tracking-tighter text-on-surface">배정 차량 정보</h2>
                                <span className="text-xs text-primary font-black uppercase tracking-widest bg-primary/5 px-4 py-2 rounded-full">2 Units Reserved</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                {/* Vehicle 1 */}
                                <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-teal-900/[0.04] border-l-8 border-primary flex flex-col justify-between hover:scale-[1.02] transition-all group">
                                    <div className="text-left">
                                        <div className="flex justify-between items-start mb-8 text-left">
                                            <div className="w-16 h-16 rounded-3xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                                                <span className="material-symbols-outlined text-4xl">directions_bus</span>
                                            </div>
                                            <span className="text-[9px] font-black px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-full text-slate-400 uppercase tracking-widest">Premium</span>
                                        </div>
                                        <h4 className="font-black text-2xl tracking-tighter mb-1">노블 스카이 45</h4>
                                        <p className="text-xs text-slate-300 font-bold uppercase tracking-widest mb-10">Luxury High-Class Coach</p>
                                        <div className="flex items-center gap-4 py-8 border-t border-slate-50 text-left">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden shadow-lg rotate-2">
                                                <img alt="Driver" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBd83Y4Qs6PjJ02-M6I4UIZxAP8lZXbtKV99Hb1fKXun5CFox_BZLTJgQ40vUulLOu-u-A_mfPYEgNFWsS8jN4ztoM-jq4Vabs3wMMtENlVoomhbdPFC4vDj7TTqx-CjQmYmmf8okNa0zYRLWVsXkujQjIeyU15AQ98b6gnJPkPT8iUY6BKArcftSS9TcHI2ABKna4Z2h0c6YFY97j_0wg9xH6yDsU_xUCcdRCtvXp4fM5dajsuzsoZ1xYFpwUWN-aDfz8dapFPGOg"/>
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Captain</p>
                                                <p className="text-lg font-black tracking-tight text-on-surface">김민수 기사님</p>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => navigate('/chat-room')} className="w-full mt-6 bg-primary/5 text-primary py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-primary/10 hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-3">
                                        <span className="material-symbols-outlined text-lg">chat_bubble</span>
                                        Captain 1:1 Talk
                                    </button>
                                </div>
                                {/* Vehicle 2 */}
                                <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-teal-900/[0.04] border-l-8 border-secondary flex flex-col justify-between hover:scale-[1.02] transition-all group">
                                    <div className="text-left">
                                        <div className="flex justify-between items-start mb-8 text-left">
                                            <div className="w-16 h-16 rounded-3xl bg-secondary/5 flex items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-white transition-all">
                                                <span className="material-symbols-outlined text-4xl">directions_bus</span>
                                            </div>
                                            <span className="text-[9px] font-black px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-full text-slate-400 uppercase tracking-widest">Gold</span>
                                        </div>
                                        <h4 className="font-black text-2xl tracking-tighter mb-1">유니스타 28</h4>
                                        <p className="text-xs text-slate-300 font-bold uppercase tracking-widest mb-10">Executive Suite Limousine</p>
                                        <div className="flex items-center gap-4 py-8 border-t border-slate-50 text-left">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden shadow-lg -rotate-2">
                                                <img alt="Driver" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAgYfgm-GMsLqc1y0t9mI1czkD3D1c61V5j-Hwpx3gB2LYd5DGTjXFzPObG0O916PF2yjYG2Vti0yWeQzpK4CiM0lbkfq2m2UrhqIrqgYU2Iyg7lzFuALkpCP1PYEeknAPt3DkbJH1hltqMfoYk4B5HilkyjDNxW1t_3t0WuoJeJgSRX8oy7rKJ8yEFCxtWwXFP7dAansYs0MRfJzKhFn89ckkRvwlxBEvLOB57Lw2uhB29042x4K4j0jzt3aqh7CK6YV_KzeKr0EU"/>
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Captain</p>
                                                <p className="text-lg font-black tracking-tight text-on-surface">이지원 기사님</p>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => navigate('/chat-room')} className="w-full mt-6 bg-secondary/5 text-secondary py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-secondary/10 hover:bg-secondary hover:text-white transition-all flex items-center justify-center gap-3">
                                        <span className="material-symbols-outlined text-lg">chat_bubble</span>
                                        Captain 1:1 Talk
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Payment & Actions */}
                    <div className="lg:col-span-4 space-y-12">
                        <div className="bg-slate-900 rounded-[3rem] p-10 sticky top-32 shadow-2xl shadow-slate-900/40 border border-white/5 text-left">
                            <h2 className="text-2xl font-black mb-10 text-white tracking-tighter italic">Payment Details</h2>
                            <div className="space-y-8 mb-12">
                                {/* Vehicle 1 Breakdown */}
                                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 text-left space-y-4">
                                    <p className="text-[8px] font-black text-primary uppercase tracking-[0.4em] flex items-center gap-3">
                                        <span className="w-2 h-2 rounded-full bg-primary shadow-lg shadow-primary/50"></span>
                                        Vehicle 1 Summary
                                    </p>
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-xs text-slate-400 font-bold tracking-tight"><span>기본 대여료</span><span className="text-white">₩1,300,000</span></div>
                                        <div className="flex justify-between text-xs text-slate-400 font-bold tracking-tight"><span>기사 숙박/식대</span><span className="text-white">₩50,000</span></div>
                                        <div className="flex justify-between text-xs text-slate-400 font-bold tracking-tight"><span>유류비/기타</span><span className="text-white">₩222,100</span></div>
                                    </div>
                                </div>
                                {/* Vehicle 2 Breakdown */}
                                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 text-left space-y-4">
                                    <p className="text-[8px] font-black text-secondary uppercase tracking-[0.4em] flex items-center gap-3">
                                        <span className="w-2 h-2 rounded-full bg-secondary shadow-lg shadow-secondary/50"></span>
                                        Vehicle 2 Summary
                                    </p>
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-xs text-slate-400 font-bold tracking-tight"><span>기본 대여료</span><span className="text-white">₩1,100,000</span></div>
                                        <div className="flex justify-between text-xs text-slate-400 font-bold tracking-tight"><span>기사 숙박/식대</span><span className="text-white">₩50,000</span></div>
                                        <div className="flex justify-between text-xs text-slate-400 font-bold tracking-tight"><span>유류비/기타</span><span className="text-white">₩212,100</span></div>
                                    </div>
                                </div>
                                {/* Final Total */}
                                <div className="pt-8 border-t border-white/10 text-left">
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.6em] mb-3">Total Amount Paid</p>
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-5xl font-black tracking-tighter text-white">₩2,984,200</span>
                                        <span className="material-symbols-outlined text-primary text-3xl">verified</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-4 text-left">
                                <button onClick={() => navigate('/chat-room')} className="w-full bg-primary text-white py-6 rounded-full font-black text-xs uppercase tracking-[0.4em] shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4">
                                    <span className="material-symbols-outlined text-lg">support_agent</span>
                                    Concierge Talk
                                </button>
                                <button onClick={() => navigate('/cancel-reservation/1')} className="w-full bg-white/5 text-red-400 border border-white/10 py-6 rounded-full font-black text-xs uppercase tracking-[0.4em] hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-4">
                                    <span className="material-symbols-outlined text-lg">cancel</span>
                                    Cancel Journey
                                </button>
                            </div>
                            
                            <div className="mt-10 p-6 bg-white/[0.02] rounded-3xl border border-white/[0.05]">
                                <p className="text-[10px] leading-relaxed text-slate-500 font-bold italic text-left">
                                    * 실제 이동 거리 및 대기 시간에 따라 최종 금액이 변동될 수 있습니다. 출발 24시간 이내 취소 시 10%의 위약금이 발생합니다.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Premium Bottom Nav */}
            <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex justify-around items-center px-4 py-2 bg-slate-900 text-white w-[90%] max-w-md mx-auto rounded-full shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] border border-white/10">
                <button onClick={() => navigate('/customer-dashboard')} className="flex flex-col items-center justify-center text-slate-500 px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">gavel</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Auction</span>
                </button>
                <button onClick={() => navigate('/reservation-list')} className="flex flex-col items-center justify-center px-5 py-2 text-white relative">
                    <div className="absolute inset-0 bg-white/10 rounded-2xl blur-lg"></div>
                    <span className="material-symbols-outlined relative z-10" style={{fontVariationSettings: "'FILL' 1"}}>confirmation_number</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1 relative z-10 underline decoration-2 underline-offset-4">Reservations</span>
                </button>
                <button onClick={() => navigate('/chat-room')} className="flex flex-col items-center justify-center text-slate-500 px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">chat_bubble</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Talk</span>
                </button>
                <button onClick={() => navigate('/profile-customer')} className="flex flex-col items-center justify-center bg-white/20 text-white rounded-full w-12 h-12 shadow-lg active:scale-90 transition-all">
                    <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>person</span>
                </button>
            </nav>
        </div>
    );
};

export default ReservationDetailCustomer;
