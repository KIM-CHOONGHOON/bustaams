import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const ReservationDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    return (
        <div className="bg-background text-on-surface min-h-screen pb-32 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-sm border-b border-slate-50">
                <div className="flex items-center justify-between px-6 py-4 w-full">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="text-teal-700 hover:bg-slate-100 transition-colors p-2 rounded-full scale-95 active:scale-90 duration-200">
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                        <span className="text-2xl font-black text-teal-800 tracking-tighter italic">busTaams</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <nav className="hidden md:flex gap-8 items-center">
                            <button onClick={() => navigate('/customer-dashboard')} className="text-slate-500 font-semibold text-sm hover:text-teal-700 transition-colors">홈</button>
                            <button onClick={() => navigate('/reservation-list')} className="text-teal-700 font-extrabold text-sm border-b-2 border-teal-700 pb-1">내 예약</button>
                            <button className="text-slate-500 font-semibold text-sm hover:text-teal-700 transition-colors">메시지</button>
                        </nav>
                        <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                            <img alt="User" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAoeVWTLVpGnkWIyZicMecety9-CGdpLwphd882r5bR7LGEFApzaB-h75AbUKFv7Z2dXtx1cK0v1kHNhLGb4f72VRsKJ7CVygOEoLxikAN4igS9CwKYHmnRKRcbyZEw2KOO4nLvN-hRvfRji39TRg6EhEI4vCiDn8P_V3H7VvBpacjSba137bq3sC0SUIWG6zjFXUKoWm-W14wbuiEduIRPUnpYuUwFYtWNCj5VLcpcQ7SIpcrpO3P8OM4OOk-BrAPiRmLzIJcMFmQ" />
                        </div>
                    </div>
                </div>
            </header>

            <main className="pt-28 px-6 max-w-5xl mx-auto space-y-12">
                {/* Editorial Header Section */}
                <section className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                    <div className="md:col-span-8">
                        <p className="text-secondary font-bold tracking-[0.2em] text-[10px] mb-3 uppercase">여정 상세 가이드</p>
                        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-on-surface leading-tight text-[48px] md:text-[60px]">
                            <span className="text-primary italic">광주 유스퀘어</span> 투어
                        </h1>
                    </div>
                    <div className="md:col-span-4 text-right">
                        <span className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-50 text-teal-700 rounded-full text-xs font-bold border border-teal-100 shadow-sm">
                            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse"></span>
                            예정된 예약
                        </span>
                    </div>
                </section>

                {/* Bento Grid Content */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    {/* Left Column: Route Summary */}
                    <div className="md:col-span-7 space-y-8">
                        <div className="bg-white rounded-[2rem] p-8 shadow-2xl shadow-teal-900/5 relative overflow-hidden border border-slate-50">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/40"></div>
                            <h2 className="text-xl font-black mb-8 flex items-center gap-3 text-primary">
                                <span className="material-symbols-outlined">route</span>
                                여정 타임라인
                            </h2>
                            <div className="space-y-12 relative pb-4">
                                {/* Timeline Line */}
                                <div className="absolute left-[20px] top-2 bottom-8 w-[2px] bg-slate-100"></div>
                                
                                {/* Departure */}
                                <div className="relative pl-12 group">
                                    <div className="absolute left-[14px] top-1.5 w-[14px] h-[14px] rounded-full bg-primary border-4 border-white ring-4 ring-primary/10 z-10 transition-transform group-hover:scale-125"></div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">출발</p>
                                    <h3 className="text-xl font-bold tracking-tight">서울역 광장</h3>
                                    <p className="text-xs text-on-surface-variant font-semibold mt-1 opacity-70">2024.05.12 (월) • 09:00 AM</p>
                                </div>
                                
                                {/* Waypoint */}
                                <div className="relative pl-12 group opacity-60">
                                    <div className="absolute left-[16px] top-2 w-[10px] h-[10px] rounded-full bg-slate-300 border-2 border-white z-10"></div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">경유</p>
                                    <h3 className="text-lg font-bold">대전 복합터미널</h3>
                                    <p className="text-xs font-semibold mt-1 text-slate-400">오후 12:30 예정</p>
                                </div>
                                
                                {/* Destination */}
                                <div className="relative pl-12 group">
                                    <div className="absolute left-[14px] top-1.5 w-[14px] h-[14px] rounded-full bg-secondary border-4 border-white ring-4 ring-secondary/10 z-10 transition-transform group-hover:scale-125"></div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">도착</p>
                                    <h3 className="text-xl font-bold tracking-tight">광주 유스퀘어</h3>
                                    <p className="text-xs text-on-surface-variant font-semibold mt-1 opacity-70">오후 4:45 도착 예정</p>
                                </div>
                            </div>
                        </div>

                        {/* Vehicle & Driver list */}
                        <div className="space-y-6">
                            <div className="flex justify-between items-center px-2">
                                <h2 className="text-xl font-black tracking-tight">배정 차량 <span className="text-primary ml-1">2대</span></h2>
                                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">그룹 단체 이동</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* Vehicle 1 */}
                                <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-teal-900/5 border-l-4 border-primary group hover:translate-y-[-4px] transition-all">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                                            <span className="material-symbols-outlined text-3xl">directions_bus</span>
                                        </div>
                                        <span className="text-[9px] font-black px-3 py-1.5 bg-slate-50 rounded-full text-slate-400 uppercase tracking-tighter">프리미엄 45</span>
                                    </div>
                                    <h4 className="font-extrabold text-lg mb-1 tracking-tight">노블 스카이 제트</h4>
                                    <p className="text-[11px] text-slate-400 font-bold mb-6">고품격 실크로드 코치</p>
                                    <div className="flex items-center gap-3 py-4 border-t border-slate-50 mb-4">
                                        <img className="w-10 h-10 rounded-full object-cover border-2 border-primary/10" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBd83Y4Qs6PjJ02-M6I4UIZxAP8lZXbtKV99Hb1fKXun5CFox_BZLTJgQ40vUulLOu-u-A_mfPYEgNFWsS8jN4ztoM-jq4Vabs3wMMtENlVoomhbdPFC4vDj7TTqx-CjQmYmmf8okNa0zYRLWVsXkujQjIeyU15AQ98b6gnJPkPT8iUY6BKArcftSS9TcHI2ABKna4Z2h0c6YFY97j_0wg9xH6yDsU_xUCcdRCtvXp4fM5dajsuzsoZ1xYFpwUWN-aDfz8dapFPGOg" alt="Driver" />
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">드라이버</p>
                                            <p className="text-sm font-bold">김민수 리더</p>
                                        </div>
                                    </div>
                                    <button onClick={() => navigate('/chat/driver1')} className="w-full py-3.5 bg-primary/5 hover:bg-primary text-primary hover:text-white rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2">
                                        <span className="material-symbols-outlined text-[16px]">chat</span>
                                        전용 채팅방 입장
                                    </button>
                                </div>
                                {/* Vehicle 2 */}
                                <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-teal-900/5 border-l-4 border-secondary group hover:translate-y-[-4px] transition-all">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-12 h-12 rounded-2xl bg-secondary/5 flex items-center justify-center text-secondary">
                                            <span className="material-symbols-outlined text-3xl">directions_bus</span>
                                        </div>
                                        <span className="text-[9px] font-black px-3 py-1.5 bg-slate-50 rounded-full text-slate-400 uppercase tracking-tighter">골드 리무진</span>
                                    </div>
                                    <h4 className="font-extrabold text-lg mb-1 tracking-tight">유니스타 럭셔리</h4>
                                    <p className="text-[11px] text-slate-400 font-bold mb-6">안정적인 주행의 정석</p>
                                    <div className="flex items-center gap-3 py-4 border-t border-slate-50 mb-4">
                                        <img className="w-10 h-10 rounded-full object-cover border-2 border-secondary/10" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAgYfgm-GMsLqc1y0t9mI1czkD3D1c61V5j-Hwpx3gB2LYd5DGTjXFzPObG0O916PF2yjYG2Vti0yWeQzpK4CiM0lbkfq2m2UrhqIrqgYU2Iyg7lzFuALkpCP1PYEeknAPt3DkbJH1hltqMfoYk4B5HilkyjDNxW1t_3t0WuoJeJgSRX8oy7rKJ8yEFCxtWwXFP7dAansYs0MRfJzKhFn89ckkRvwlxBEvLOB57Lw2uhB29042x4K4j0jzt3aqh7CK6YV_KzeKr0EU" alt="Driver" />
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">드라이버</p>
                                            <p className="text-sm font-bold">이지원 캡틴</p>
                                        </div>
                                    </div>
                                    <button onClick={() => navigate('/chat/driver2')} className="w-full py-3.5 bg-secondary/5 hover:bg-secondary text-secondary hover:text-white rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2">
                                        <span className="material-symbols-outlined text-[16px]">chat</span>
                                        기사님과 소통하기
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Payment Summary */}
                    <div className="md:col-span-5 relative">
                        <div className="bg-slate-50/80 backdrop-blur-xl rounded-[2.5rem] p-8 sticky top-28 border border-white shadow-2xl shadow-teal-900/5">
                            <h2 className="text-xl font-black mb-8 tracking-tight">정산 요약</h2>
                            <div className="space-y-6 mb-10">
                                <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="w-2 h-2 rounded-full bg-primary ring-4 ring-primary/10"></span>
                                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.1em]">노블 스카이 제트</p>
                                    </div>
                                    <div className="space-y-2.5">
                                        <div className="flex justify-between text-xs font-semibold text-slate-400"><span>운임료</span><span className="text-on-surface">₩1,300,000</span></div>
                                        <div className="flex justify-between text-xs font-semibold text-slate-400"><span>부대비용 (톨비/식대)</span><span className="text-on-surface">₩272,300</span></div>
                                    </div>
                                </div>
                                <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="w-2 h-2 rounded-full bg-secondary ring-4 ring-secondary/10"></span>
                                        <p className="text-[10px] font-black text-secondary uppercase tracking-[0.1em]">유니스타 럭셔리</p>
                                    </div>
                                    <div className="space-y-2.5">
                                        <div className="flex justify-between text-xs font-semibold text-slate-400"><span>운임료</span><span className="text-on-surface">₩1,100,000</span></div>
                                        <div className="flex justify-between text-xs font-semibold text-slate-400"><span>부대비용 합계</span><span className="text-on-surface">₩261,900</span></div>
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-slate-100">
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">최종 결제 예정액</p>
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-4xl font-black text-primary tracking-tighter">₩2,934,200</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <button className="w-full py-5 bg-gradient-to-br from-primary to-teal-800 text-white rounded-full font-black text-lg shadow-xl shadow-primary/30 hover:scale-[1.03] active:scale-95 transition-all outline-none">
                                    문의하기
                                </button>
                                <button onClick={() => navigate('/cancel-reservation')} className="w-full py-5 bg-white text-orange-600 border border-orange-100 hover:bg-orange-50 rounded-full font-bold text-sm transition-all focus:ring-4 focus:ring-orange-100 outline-none">
                                    예약 취소 요청
                                </button>
                            </div>
                            <p className="mt-8 text-[11px] text-slate-400 leading-relaxed italic font-medium">
                                * 최종 결제 금액은 톨게이트 비용 및 추가 경유지에 따라 소폭 변동될 수 있습니다. 귀하의 안전한 여정을 위해 최선을 다하겠습니다.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ReservationDetail;
