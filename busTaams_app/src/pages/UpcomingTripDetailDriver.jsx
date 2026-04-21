import React from 'react';
import { useNavigate } from 'react-router-dom';

const UpcomingTripDetailDriver = () => {
    const navigate = useNavigate();

    return (
        <div className="bg-background text-on-surface min-h-[100dvh] pb-48 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/40 backdrop-blur-3xl border-b border-white/20 py-6">
                <div className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto">
                    <div className="flex items-center gap-6 text-left">
                        <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl text-teal-800 shadow-xl shadow-teal-900/5 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                        </button>
                        <h1 className="font-headline font-black tracking-tighter text-3xl text-teal-900 italic uppercase">Mission Detail</h1>
                    </div>
                    <button className="p-3 bg-white rounded-2xl text-slate-400 shadow-xl shadow-teal-900/5 active:scale-95 transition-all">
                        <span className="material-symbols-outlined text-lg">more_vert</span>
                    </button>
                </div>
            </header>

            <main className="pt-48 px-6 max-w-2xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom duration-1000 text-left">
                {/* Hero Trip Card */}
                <section className="space-y-10 text-left">
                    <div className="flex justify-between items-end border-l-8 border-secondary pl-8 text-left">
                        <div className="space-y-2 text-left">
                            <span className="text-secondary font-black tracking-[0.4em] text-[10px] uppercase italic">Next Mission Protocol</span>
                            <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-primary italic uppercase leading-none text-left">
                                Seoul <span className="text-slate-200 font-light mx-2">→</span> Busan
                            </h2>
                        </div>
                        <div className="text-right">
                            <p className="text-slate-300 text-[9px] font-black uppercase tracking-widest italic mb-2">Contract Value</p>
                            <p className="text-3xl font-black text-primary italic leading-none">₩1,650,000</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-[3.5rem] p-10 shadow-2xl shadow-teal-900/5 relative overflow-hidden text-left border border-white">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left">
                            <div className="space-y-10 text-left">
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-300 block mb-3 italic">Operation Timeline</label>
                                    <p className="text-xl font-black italic text-primary">2024. 10. 24 — 10. 26</p>
                                </div>
                                <div className="relative space-y-8 text-left pl-2">
                                    <div className="flex items-center gap-6 text-left">
                                        <div className="w-4 h-4 rounded-full bg-primary ring-8 ring-primary/10"></div>
                                        <span className="text-sm font-black italic text-on-surface uppercase tracking-tight">Seoul Base (Departure)</span>
                                    </div>
                                    <div className="absolute left-[7px] top-6 w-0.5 h-12 bg-slate-100 italic"></div>
                                    <div className="flex items-center gap-6 pt-4 text-left">
                                        <div className="w-4 h-4 rounded-full border-4 border-slate-100 bg-white ring-8 ring-slate-50"></div>
                                        <span className="text-sm font-black italic text-slate-400 uppercase tracking-tight text-left">Daejeon Grid (Waypoint)</span>
                                    </div>
                                    <div className="absolute left-[7px] top-24 w-0.5 h-12 bg-slate-100"></div>
                                    <div className="flex items-center gap-6 pt-8 text-left">
                                        <div className="w-4 h-4 rounded-full bg-secondary ring-8 ring-secondary/10"></div>
                                        <span className="text-sm font-black italic text-on-surface uppercase tracking-tight text-left">Busan Waterfront (Dest)</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-10 text-left border-l-2 border-slate-50 pl-10">
                                <div className="space-y-6 text-left">
                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-300 italic px-2">Client Intelligence</p>
                                    <div className="bg-slate-50 rounded-3xl p-6 space-y-4 text-left border border-white">
                                        <div className="flex justify-between items-center text-left">
                                            <div className="text-left">
                                                <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Master Account</p>
                                                <p className="font-black text-on-surface italic">김철수 마스터님</p>
                                            </div>
                                            <button className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all">
                                                <span className="material-symbols-outlined text-lg" style={{fontVariationSettings: "'FILL' 1"}}>call</span>
                                                <span className="text-[10px] font-black uppercase tracking-widest italic">Connect</span>
                                            </button>
                                        </div>
                                        <div className="pt-2 text-left">
                                            <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Secure Mobile</p>
                                            <p className="font-black text-primary tracking-[0.2em] italic">010-1234-5678</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6 text-left">
                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-300 italic px-2">Fleet Asset</p>
                                    <div className="space-y-4 text-left">
                                        <div className="text-left">
                                            <p className="font-black italic text-on-surface text-lg leading-none">현대 유니버스 프레스티지</p>
                                            <p className="text-xs text-secondary font-black tracking-widest mt-2 uppercase">Seoul 70 SA 1234</p>
                                        </div>
                                        <div className="rounded-2xl overflow-hidden shadow-2xl grayscale hover:grayscale-0 transition-all duration-700 h-32">
                                            <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDRtHeNj1lWxXOv1GBZeeRgpxMpp_meNQevIZCTexJmEZeknzSZkt59fLdFvEuT4dqIhB3XuS7ep_5TXCkZnqDCAI0I9dqfH0xoUZE57S_1MXk-jKo_uddsOjmxPmNovAN3JlUP7uHL9ZWh5wfg9l3uSvFoQeoNsCnj3bA6G_41KVXadd70bJRfviWx8NO_8-UZ7HE1UKvK0KUO9W8f9zun_U-CnPWxhAfyS7nzPHsFgVml_QsWyKUASCUZA6vMOlQUCKCs_58HM9M" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Detailed Itinerary (Timeline) */}
                <section className="space-y-12 text-left">
                    <div className="flex items-center gap-6 text-left">
                        <div className="h-0.5 w-12 bg-secondary opacity-20"></div>
                        <h3 className="text-2xl font-black italic text-primary uppercase tracking-tighter">Mission Ledger 안내</h3>
                    </div>
                    
                    <div className="space-y-12 text-left pl-4">
                        {[
                            { date: '10/24', type: 'Departure', tag: 'bg-primary', time: 'AM 08:30', title: '서울역 광장 3번 출구 집결 및 인원 점검', desc: '승객 명단 확인 및 수하물 적재를 위해 최소 20분 전 대기 권장합니다.' },
                            { date: '10/24', type: 'Rest Stop', tag: 'bg-secondary', time: 'AM 11:50', title: '대전복합터미널 경유 및 휴식', desc: '경유지 내 20분간 휴게 시간 제공 예정입니다.' },
                            { date: '10/26', type: 'Completion', tag: 'bg-slate-900', time: 'PM 04:00', title: '부산 터미널 도착 및 운행 종료', desc: '최종 목적지 하차 및 차량 내부 유실물 확인 후 운행 종료 보고 바랍니다.' }
                        ].map((item, i) => (
                            <div key={i} className="flex gap-10 group text-left">
                                <div className="flex flex-col items-center">
                                    <div className="text-xs font-black text-slate-300 group-hover:text-primary transition-all rotate-[-90deg] mb-8">{item.date}</div>
                                    {i < 2 && <div className="w-0.5 h-full bg-slate-50"></div>}
                                </div>
                                <div className="flex-1 pb-10 text-left">
                                    <div className="bg-slate-50 group-hover:bg-white group-hover:shadow-2xl group-hover:shadow-teal-900/5 transition-all rounded-[2.5rem] p-10 space-y-6 border border-transparent group-hover:border-slate-50 text-left">
                                        <div className="flex justify-between items-center text-left">
                                            <span className={`text-[8px] font-black text-white px-4 py-1.5 rounded-full uppercase tracking-widest ${item.tag} italic`}>{item.type}</span>
                                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">{item.time}</span>
                                        </div>
                                        <div className="space-y-3 text-left">
                                            <p className="font-black text-xl italic text-on-surface leading-tight text-left uppercase tracking-tight">{item.title}</p>
                                            <p className="text-sm font-bold text-slate-400 italic leading-relaxed text-left max-w-lg">{item.desc}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Actions */}
                <section className="flex flex-col gap-6 pt-10 text-left pb-20">
                    <button className="w-full bg-primary text-white py-8 rounded-[2.5rem] font-black text-xl italic uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:shadow-primary/50 active:scale-95 transition-all flex items-center justify-center gap-6">
                        <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>
                        Close Mission 완료
                    </button>
                    <button className="w-full bg-gradient-to-br from-slate-900 to-slate-800 text-white py-8 rounded-[2.5rem] font-black text-xl italic uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/30 active:scale-95 transition-all flex items-center justify-center gap-6">
                        <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>chat_bubble</span>
                        Connect Talk 실시간 채팅
                    </button>
                    <button className="w-full py-4 text-slate-300 font-black text-[10px] uppercase tracking-[0.4em] hover:text-secondary transition-all text-center italic">
                        운행이 어려우신가요? <span className="underline ml-4">Abort Mission 취소 요청</span>
                    </button>
                </section>
            </main>

            {/* Bottom Nav */}
            <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex justify-around items-center px-4 py-2 bg-slate-900 text-slate-500 w-[90%] max-w-lg mx-auto rounded-full shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] border border-white/10">
                <button onClick={() => navigate('/driver-dashboard')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">dashboard</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Home</span>
                </button>
                <button onClick={() => navigate('/estimate-list-driver')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">gavel</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Auction</span>
                </button>
                <button className="flex flex-col items-center justify-center px-5 py-2 text-primary relative">
                    <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-lg"></div>
                    <span className="material-symbols-outlined relative z-10" style={{fontVariationSettings: "'FILL' 1"}}>calendar_today</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1 relative z-10 underline decoration-2 underline-offset-4">Mission</span>
                </button>
                <button onClick={() => navigate('/driver-info')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined font-variation-fill" style={{fontVariationSettings: "'FILL' 1"}}>payments</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Finance</span>
                </button>
            </nav>
        </div>
    );
};

export default UpcomingTripDetailDriver;
