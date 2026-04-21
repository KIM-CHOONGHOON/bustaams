import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ChatRoom = () => {
    const navigate = useNavigate();
    const [message, setMessage] = useState('');

    return (
        <div className="bg-background text-on-surface min-h-screen flex flex-col font-body text-left overflow-hidden">
            {/* TopAppBar Shell */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/60 backdrop-blur-3xl border-b border-white/50">
                <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center bg-white rounded-2xl text-primary shadow-sm active:scale-90 transition-all">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <div className="flex flex-col">
                            <span className="font-headline font-black tracking-tighter text-xl text-teal-800 italic">busTaams Talk</span>
                            <span className="text-[9px] uppercase tracking-[0.3em] font-black text-secondary">Real-time Support</span>
                        </div>
                    </div>
                    {/* Glassmorphic Driver Profile Header */}
                    <div className="flex items-center gap-4 bg-white/80 backdrop-blur-xl pl-2 pr-6 py-2 rounded-full shadow-2xl shadow-teal-900/5 ring-1 ring-white/50">
                        <div className="relative w-10 h-10 shadow-lg rounded-full">
                            <img className="w-full h-full rounded-full object-cover border-2 border-white" alt="Partner" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC1DcaELpugvDEaa2s88SbvxYHUuWaS8Mc7J-wANTo6T702nkqMfMJcr4r4DozYsBAWxssGGTXVkB-3A-iT6V2o_IY-4FsDqd3fw0ymz2eDfak8jk7eGiRNpkyZixCUpuPahfqYs_OUR2vh6kBQcGf94eInbikl4oxA7xN8lW9Cd6tpDBF_JWdPjBckP-paeHnP70RdNxeZ_VEP-qKg3WGeRFAMTzOLjME9LxIjmiInyFJAXH9LBmKm36OFOkPO4xU0_2I9mQPnO8k"/>
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-teal-500 border-2 border-white rounded-full pulse shadow-sm"></div>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-black text-xs text-on-surface leading-tight tracking-tight">마커스 반스</span>
                            <span className="text-[9px] text-teal-600 font-black uppercase tracking-widest opacity-60">Logistics Expert</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Chat Canvas */}
            <main className="flex-1 pt-32 px-6 max-w-3xl mx-auto w-full overflow-y-auto space-y-10 pb-64 no-scrollbar">
                {/* Date Indicator */}
                <div className="flex justify-center">
                    <span className="px-5 py-2 bg-white/50 backdrop-blur-md text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] rounded-full border border-white/50 shadow-sm">Today</span>
                </div>

                {/* Receiver Bubble */}
                <div className="flex flex-col gap-3 items-start max-w-[85%] animate-in fade-in slide-in-from-left duration-700">
                    <div className="bg-white text-on-surface p-6 rounded-[2rem] rounded-tl-none shadow-2xl shadow-teal-900/[0.03] border border-slate-50 relative">
                        <p className="text-[15px] leading-relaxed font-medium opacity-80 italic">"안녕하세요! 2022년형 볼보 9700 모델에 관심이 있으시군요. 입찰 시작 전에 확인하고 싶으신 특별한 정비 기록이 있으신가요?"</p>
                    </div>
                    <span className="text-[9px] font-black text-slate-300 ml-4 uppercase tracking-widest">09:12 AM</span>
                </div>

                {/* Sender Bubble */}
                <div className="flex flex-col gap-3 items-end ml-auto max-w-[85%] animate-in fade-in slide-in-from-right duration-700">
                    <div className="bg-gradient-to-br from-primary to-teal-800 text-white p-6 rounded-[2rem] rounded-tr-none shadow-2xl shadow-primary/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                        <p className="text-[15px] leading-relaxed font-bold relative z-10">네, 마커스 님. 변속기 점검 이력과 마지막 타이어 교체 시기를 확인하고 싶습니다. 장거리 운송 차량 확충 계획이 있어서요.</p>
                    </div>
                    <div className="flex items-center gap-2 mr-4">
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">09:15 AM</span>
                        <span className="material-symbols-outlined text-[14px] text-primary" style={{fontVariationSettings: "'FILL' 1"}}>done_all</span>
                    </div>
                </div>

                {/* Receiver Bubble + Attachment */}
                <div className="flex flex-col gap-3 items-start max-w-[85%] animate-in fade-in slide-in-from-left duration-1000">
                    <div className="bg-white text-on-surface p-6 rounded-[2rem] rounded-tl-none shadow-2xl shadow-teal-900/[0.03] border border-slate-50">
                        <p className="text-[15px] leading-relaxed font-medium opacity-80 opacity-80 italic">"확인했습니다. 8821번 차량의 디지털 정비 로그를 첨부해 드립니다. 변속기는 약 24,000km 전에 전체 오버홀을 마친 최상급 상태입니다."</p>
                    </div>
                    {/* File Attachment */}
                    <div className="bg-white border border-slate-100 p-4 rounded-3xl flex items-center gap-5 w-full cursor-pointer hover:bg-slate-50 transition-all shadow-lg shadow-teal-900/5 group">
                        <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-2xl">description</span>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <h4 className="text-xs font-black truncate text-on-surface uppercase tracking-tight">Volvo_9700_Service_Log.pdf</h4>
                            <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest mt-1">2.4 MB • PDF Document</p>
                        </div>
                        <button className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-[20px]">download</span>
                        </button>
                    </div>
                    <span className="text-[9px] font-black text-slate-300 ml-4 uppercase tracking-widest">09:18 AM</span>
                </div>

                {/* Sender Bubble */}
                <div className="flex flex-col gap-3 items-end ml-auto max-w-[85%] animate-in fade-in slide-in-from-right duration-1000">
                    <div className="bg-gradient-to-br from-primary to-teal-800 text-white p-6 rounded-[2rem] rounded-tr-none shadow-2xl shadow-primary/20 relative overflow-hidden group">
                        <p className="text-[15px] leading-relaxed font-bold">좋은 소식이네요. 경매 입찰 준비가 된 것 같습니다. 현재 예상 최저 낙찰가는 어느 정도인가요?</p>
                    </div>
                    <span className="text-[9px] font-black text-slate-300 mr-4 uppercase tracking-widest">09:20 AM</span>
                </div>
            </main>

            {/* Interaction Footer */}
            <div className="fixed bottom-0 left-0 right-0 z-50">
                <div className="max-w-3xl mx-auto px-6 mb-28">
                    <div className="bg-white/90 backdrop-blur-3xl p-3 rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,78,71,0.15)] flex items-center gap-4 border border-white ring-1 ring-teal-900/5">
                        <button className="w-12 h-12 flex items-center justify-center text-slate-300 hover:text-primary hover:bg-primary/5 rounded-2xl transition-all active:scale-90">
                            <span className="material-symbols-outlined text-2xl">add_circle</span>
                        </button>
                        <input 
                            className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] font-bold text-on-surface placeholder:text-slate-200 py-3" 
                            placeholder="Type your message..." 
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                        <button className="bg-gradient-to-br from-primary to-teal-800 text-white w-12 h-12 flex items-center justify-center rounded-2xl shadow-xl shadow-primary/30 active:scale-95 hover:rotate-12 transition-all">
                            <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>send</span>
                        </button>
                    </div>
                </div>

                {/* Premium Bottom Nav */}
                <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex justify-around items-center px-4 py-2 bg-slate-900 text-white w-[90%] max-w-md mx-auto rounded-full shadow-2xl shadow-teal-900/40">
                    <button onClick={() => navigate('/customer-dashboard')} className="flex flex-col items-center justify-center text-slate-500 px-5 py-2 hover:text-white transition-all">
                        <span className="material-symbols-outlined">gavel</span>
                        <span className="font-black text-[9px] uppercase tracking-widest mt-1">Auction</span>
                    </button>
                    <button className="flex flex-col items-center justify-center px-5 py-2 text-white relative">
                        <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>chat_bubble</span>
                        <span className="font-black text-[9px] uppercase tracking-widest mt-1 underline decoration-2 underline-offset-4">Talk</span>
                        <div className="absolute top-2 right-4 w-2 h-2 bg-red-500 rounded-full ring-2 ring-slate-900"></div>
                    </button>
                    <button onClick={() => navigate('/reservation-list')} className="flex flex-col items-center justify-center text-slate-500 px-5 py-2 hover:text-white transition-all">
                        <span className="material-symbols-outlined">directions_bus</span>
                        <span className="font-black text-[9px] uppercase tracking-widest mt-1">Trips</span>
                    </button>
                    <button onClick={() => navigate('/profile-customer')} className="flex flex-col items-center justify-center bg-white/20 text-white rounded-full w-12 h-12 shadow-lg active:scale-90 transition-all">
                        <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>person</span>
                    </button>
                </nav>
            </div>
        </div>
    );
};

export default ChatRoom;
