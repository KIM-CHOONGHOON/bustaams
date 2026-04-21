import React from 'react';
import { useNavigate } from 'react-router-dom';

const CancellationCustomer = () => {
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
                        <h1 className="font-headline font-black tracking-tighter text-3xl text-teal-900 italic">예약 취소</h1>
                    </div>
                    <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-2xl rotate-3">
                        <img alt="User profile" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDAuydGKeWcVXnNwZDRc1I8NFS_BI9gq969584jVmM5maopYZ63srZ7FvlrWEb_EAlmkWIjBb5BPNcP1t7cxeVW66HWUlO53iZcSpZ7qSCpZdrQUXwvp8X5ibBv6Xx57pJrCmFA8WY8f1W6QCEC0wt2VbiePnFQ6Dco1T3vF-Vkzh0wL5vNyHOTwR2RKCQJ0QLxejtltR8UYIvSuocurIgQmtVJa8pHYHzWuHFe8N8rJRH34uYOlkJtQMcv8C1c99d4lMC41r-mrI"/>
                    </div>
                </div>
            </header>

            <main className="pt-32 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16">
                {/* Left Column: Editorial Summary */}
                <div className="lg:col-span-5 space-y-12 animate-in fade-in slide-in-from-left duration-700 text-left">
                    <section className="space-y-6 text-left">
                        <div className="inline-block px-5 py-2 rounded-full bg-secondary/10 text-secondary font-black text-[10px] uppercase tracking-[0.4em] border border-secondary/20">
                            Active Reservation
                        </div>
                        <h2 className="font-headline font-black text-6xl leading-tight text-primary tracking-tighter italic">
                            Luxury Executive <br/>Collective Mobility
                        </h2>
                        <p className="text-slate-400 text-lg max-w-md leading-relaxed font-bold italic">
                            "확정된 버스 대절 예약 내역입니다. 예약 조정은 차량 수급 현황에 따라 제한될 수 있으며, busTaams의 프리미엄 운영 정책이 적용됩니다."
                        </p>
                    </section>

                    {/* Status Card (Asymmetric) */}
                    <div className="relative group text-left">
                        <div className="absolute -inset-6 bg-slate-50/50 rounded-[4rem] -z-10 transition-all group-hover:scale-105 duration-700"></div>
                        <div className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-teal-900/5 border-l-8 border-primary text-left">
                            <div className="flex justify-between items-start mb-10 text-left">
                                <div className="text-left">
                                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300 mb-2">Reservation ID</p>
                                    <p className="font-headline font-black text-3xl text-on-surface tracking-tighter">#BTS-9928-VX</p>
                                </div>
                                <span className="material-symbols-outlined text-primary text-4xl" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>
                            </div>
                            <div className="space-y-8 text-left">
                                <div className="flex items-center gap-5 text-left">
                                    <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary shadow-inner">
                                        <span className="material-symbols-outlined text-2xl">calendar_today</span>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[10px] font-black text-on-surface uppercase tracking-widest leading-none mb-1">Service Schedule</p>
                                        <p className="text-slate-400 font-bold tracking-tight">2024. 10. 24 ~ 10. 26 (3 Days)</p>
                                    </div>
                                </div>
                                <div className="space-y-5 text-left">
                                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300 mb-4">Booked Asset List</p>
                                    {/* Bus Item 1 */}
                                    <div className="flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-slate-100 group/item hover:bg-white transition-all">
                                        <div className="flex items-center gap-4">
                                            <span className="material-symbols-outlined text-primary group-hover/item:rotate-12 transition-all">directions_bus</span>
                                            <span className="font-black text-sm text-on-surface tracking-tight">45인승 일반 코치 1대</span>
                                        </div>
                                        <button className="px-5 py-2 rounded-full bg-white text-red-500 text-[10px] font-black uppercase tracking-widest border border-red-100 hover:bg-red-500 hover:text-white transition-all">
                                            Cancel Item
                                        </button>
                                    </div>
                                    {/* Bus Item 2 */}
                                    <div className="flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-slate-100 group/item hover:bg-white transition-all">
                                        <div className="flex items-center gap-4">
                                            <span className="material-symbols-outlined text-primary group-hover/item:rotate-12 transition-all">airport_shuttle</span>
                                            <span className="font-black text-sm text-on-surface tracking-tight">21인승 프리미엄 1대</span>
                                        </div>
                                        <button className="px-5 py-2 rounded-full bg-white text-red-500 text-[10px] font-black uppercase tracking-widest border border-red-100 hover:bg-red-500 hover:text-white transition-all">
                                            Cancel Item
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Actions & Policy */}
                <div className="lg:col-span-7 space-y-12 animate-in fade-in slide-in-from-right duration-700 text-left delay-200">
                    {/* Information Panel */}
                    <div className="bg-slate-50 rounded-[4rem] p-12 space-y-10 border border-slate-100 text-left shadow-inner">
                        <div className="flex gap-8 items-start text-left">
                            <div className="w-16 h-16 shrink-0 rounded-3xl bg-secondary flex items-center justify-center shadow-2xl shadow-secondary/30 rotate-3">
                                <span className="material-symbols-outlined text-white text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>info</span>
                            </div>
                            <div className="space-y-5 text-left">
                                <h3 className="font-headline font-black text-3xl text-on-surface tracking-tighter italic">Cancelation Protocol</h3>
                                <p className="text-slate-400 leading-relaxed font-bold italic">
                                    "독점성과 정밀성을 유지하기 위해, 예약 취소 시 <span className="text-secondary font-black text-xl underline decoration-4 underline-offset-4 decoration-secondary/20">결제 금액의 50% 위약금</span>이 발생합니다. 이는 라이브 가용성 관리 비용을 포함합니다."
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-10 border-t border-slate-200 text-left">
                            <div className="p-8 bg-white rounded-[2.5rem] shadow-xl shadow-teal-900/5 text-left">
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-3">Original Payment</p>
                                <p className="font-headline font-black text-4xl text-on-surface tracking-tighter">₩420,000</p>
                            </div>
                            <div className="p-8 bg-white rounded-[2.5rem] border-2 border-secondary/20 shadow-xl shadow-secondary/5 text-left">
                                <p className="text-[9px] font-black text-secondary uppercase tracking-widest mb-3">Expected Refund (50%)</p>
                                <p className="font-headline font-black text-4xl text-secondary tracking-tighter">₩210,000</p>
                            </div>
                        </div>
                    </div>

                    {/* Action Cluster */}
                    <div className="space-y-8 text-left">
                        <div className="pt-6 border-t font-black border-slate-100 text-left">
                            <button className="w-full py-7 rounded-full bg-transparent border-4 border-secondary text-secondary font-headline font-black text-xl tracking-tighter flex items-center justify-center gap-5 hover:bg-secondary hover:text-white transition-all transform hover:-translate-y-1 active:scale-95 shadow-xl shadow-secondary/10">
                                <span className="material-symbols-outlined text-3xl">delete_forever</span>
                                Journey Termination
                            </button>
                        </div>
                        <p className="text-center text-xs text-slate-300 font-bold uppercase tracking-widest pt-4">
                            "By clicking, you acknowledge the <span className="underline decoration-secondary/30 text-secondary">Service Agreement</span> and penalty clauses."
                        </p>
                    </div>

                    {/* Visual Context */}
                    <div className="relative h-80 rounded-[3.5rem] overflow-hidden shadow-2xl shadow-slate-900/10 border-4 border-white text-left group">
                        <img alt="Bus interior" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 scale-110 group-hover:scale-100" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBxHmZscCtXuIT5-8sfoHpIedD7Mb1F-50tBouk8CZH7t0bz9w21BQWNipXX0BD2eTvTrtEoisllcrAdsOFKaGxBtIcwKIhXpkp2HDQmRvHOLG4r4n53rO8ELuZoy9bpSM7SUjojmH17GrLVK4tgdwhGuTWr3fWR6IOS7sSxbM6SgcfTDExXKbU9T--K71CO0n8zN6Yw5CjrSfQlvXftivoL6TVDtShymEdapLQ3v-Pm5dkDNNoKVW6tBW9UIjyC2yRogFSsIJJdS4"/>
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent flex items-end p-10">
                            <div className="flex items-center gap-4">
                                <span className="w-3 h-3 rounded-full bg-secondary animate-pulse shadow-lg shadow-secondary/50"></span>
                                <p className="text-white font-headline font-black text-sm tracking-[0.3em] uppercase italic">System Fleet Logic Active</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default CancellationCustomer;
