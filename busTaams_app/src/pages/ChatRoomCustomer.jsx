import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ChatRoomCustomer = () => {
    const navigate = useNavigate();
    const [message, setMessage] = useState('');

    const chatHistory = [
        {
            id: 1,
            sender: 'partner',
            name: '마커스 반스',
            role: '현장 마스터',
            text: '안녕하세요! 요청하신 차량의 실시간 상태를 확인해 드릴까요? 현재 대기 명단에 등록되었습니다.',
            time: '오전 09:12',
            type: 'text'
        },
        {
            id: 2,
            sender: 'me',
            text: '네, 마커스 님. 차량의 내부 청결 상태와 좌석 배치를 미리 확인하고 싶습니다. 특별 행사가 있어서요.',
            time: '오전 09:15',
            type: 'text',
            isRead: true
        },
        {
            id: 3,
            sender: 'partner',
            name: '마커스 반스',
            text: '확인했습니다. 8821번 차량의 상세 내부 리포트를 첨부해 드립니다. 어제 특수 세차를 마친 깨끗한 상태입니다.',
            time: '오전 09:18',
            type: 'file',
            fileName: '차량_상세_인스펙션_결과.pdf',
            fileSize: '3.1 MB'
        },
        {
            id: 4,
            sender: 'me',
            text: '감사합니다. 리포트 확인했습니다! 곧 입찰을 진행하도록 하겠습니다.',
            time: '오전 09:20',
            type: 'text',
            isRead: true
        }
    ];

    return (
        <div className="bg-background text-on-surface min-h-[100dvh] transition-colors duration-500 font-body flex flex-col items-center">
            {/* TopAppBar Shell */}
            <header className="fixed top-0 w-full z-50 bg-white/40 backdrop-blur-3xl border-b border-white/20">
                <div className="flex justify-between items-center w-full px-6 py-5 max-w-4xl mx-auto">
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl text-teal-800 shadow-xl shadow-teal-900/5 active:scale-90 transition-all">
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                        </button>
                        <div className="flex flex-col text-left">
                            <span className="font-headline font-black tracking-tighter text-2xl text-teal-900 italic">busTaams Talk</span>
                            <span className="text-[9px] uppercase tracking-[0.4em] font-black text-secondary">Expert Concierge</span>
                        </div>
                    </div>
                    {/* Partner Profile Header */}
                    <div className="flex items-center gap-4 bg-white/80 pl-2 pr-6 py-2 rounded-full shadow-2xl shadow-teal-900/5 border border-white">
                        <div className="relative w-11 h-11">
                            <img className="w-full h-full rounded-2xl object-cover shadow-lg rotate-2" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC1DcaELpugvDEaa2s88SbvxYHUuWaS8Mc7J-wANTo6T702nkqMfMJcr4r4DozYsBAWxssGGTXVkB-3A-iT6V2o_IY-4FsDqd3fw0ymz2eDfak8jk7eGiRNpkyZixCUpuPahfqYs_OUR2vh6kBQcGf94eInbikl4oxA7xN8lW9Cd6tpDBF_JWdPjBckP-paeHnP70RdNxeZ_VEP-qKg3WGeRFAMTzOLjME9LxIjmiInyFJAXH9LBmKm36OFOkPO4xU0_2I9mQPnO8k" alt="Partner" />
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-teal-500 border-4 border-white rounded-full animate-pulse shadow-md"></div>
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="font-black text-[13px] text-on-surface tracking-tighter">마커스 반스</span>
                            <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest leading-none">Senior Expert</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Chat Canvas */}
            <main className="flex-1 pt-32 pb-64 px-6 max-w-3xl w-full space-y-12 overflow-y-auto scrollbar-hide text-left">
                {/* Date Indicator */}
                <div className="flex justify-center mb-16">
                    <span className="px-6 py-2 bg-slate-900 text-white text-[9px] font-black uppercase tracking-[0.4em] rounded-full shadow-2xl">Today Timeflow</span>
                </div>

                {chatHistory.map((chat) => (
                    <div key={chat.id} className={`flex flex-col gap-3 group animate-in fade-in slide-in-from-bottom duration-500 ${chat.sender === 'me' ? 'items-end' : 'items-start'}`}>
                        {chat.sender === 'partner' && (
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest ml-4 mb-1">{chat.name}</span>
                        )}
                        
                        <div className={`relative max-w-[85%] p-6 rounded-[2.5rem] shadow-2xl text-left border border-white/50 ${chat.sender === 'me' ? 'bg-primary text-white rounded-tr-none shadow-primary/20' : 'bg-white text-on-surface rounded-tl-none shadow-teal-900/5'}`}>
                            {chat.type === 'text' ? (
                                <p className="text-lg leading-[1.6] font-bold tracking-tight italic">"{chat.text}"</p>
                            ) : (
                                <div className="space-y-6">
                                    <p className="text-lg leading-[1.6] font-medium tracking-tight">"{chat.text}"</p>
                                    <div className="bg-slate-50 border border-slate-100 p-5 rounded-3xl flex items-center gap-5 hover:bg-white transition-all cursor-pointer group/file">
                                        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover/file:bg-primary group-hover/file:text-white transition-all">
                                            <span className="material-symbols-outlined text-3xl">description</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-black truncate text-on-surface tracking-tighter uppercase">{chat.fileName}</h4>
                                            <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase mt-1">{chat.fileSize} • PDF Document</p>
                                        </div>
                                        <span className="material-symbols-outlined text-slate-300 group-hover/file:text-primary transition-all">download</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={`flex items-center gap-3 px-4 ${chat.sender === 'me' ? 'flex-row-reverse' : ''}`}>
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{chat.time}</span>
                            {chat.sender === 'me' && chat.isRead && (
                                <div className="flex text-primary">
                                    <span className="material-symbols-outlined text-[14px]" style={{fontVariationSettings: "'FILL' 1"}}>done_all</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </main>

            {/* Floating Interaction Layer */}
            <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
                <div className="max-w-3xl mx-auto px-6 mb-32 pointer-events-auto">
                    <div className="bg-slate-900 p-3 rounded-[3.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] flex items-center gap-4 border border-white/10 group focus-within:ring-4 ring-primary/20 transition-all">
                        <button className="w-14 h-14 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-90">
                            <span className="material-symbols-outlined text-2xl">add_circle</span>
                        </button>
                        <input 
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="flex-1 bg-transparent border-none focus:ring-0 text-white text-lg font-bold placeholder:text-slate-600 py-4 px-2" 
                            placeholder="Type your message..." 
                            type="text"
                        />
                        <button className="bg-primary text-white w-14 h-14 flex items-center justify-center rounded-full shadow-2xl shadow-primary/40 active:scale-90 transition-all hover:rotate-12 group-hover:rotate-0">
                            <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>send</span>
                        </button>
                    </div>
                </div>

                {/* Shared Bottom Nav */}
                <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex justify-around items-center px-4 py-2 bg-white/70 backdrop-blur-3xl text-slate-400 w-[90%] max-w-md mx-auto rounded-full shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] border border-white">
                    <button onClick={() => navigate('/customer-dashboard')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-primary transition-all">
                        <span className="material-symbols-outlined">gavel</span>
                        <span className="font-black text-[9px] uppercase tracking-widest mt-1">Auction</span>
                    </button>
                    <button onClick={() => navigate('/reservation-list')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-primary transition-all">
                        <span className="material-symbols-outlined">confirmation_number</span>
                        <span className="font-black text-[9px] uppercase tracking-widest mt-1">Trips</span>
                    </button>
                    <button className="flex flex-col items-center justify-center px-5 py-2 text-primary relative">
                        <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-lg"></div>
                        <span className="material-symbols-outlined relative z-10" style={{fontVariationSettings: "'FILL' 1"}}>chat_bubble</span>
                        <span className="font-black text-[9px] uppercase tracking-widest mt-1 relative z-10 underline decoration-2 underline-offset-4">Talk</span>
                    </button>
                    <button onClick={() => navigate('/profile-customer')} className="flex flex-col items-center justify-center bg-slate-900 text-white rounded-full w-12 h-12 shadow-lg active:scale-90 transition-all">
                        <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>person</span>
                    </button>
                </nav>
            </div>
        </div>
    );
};

export default ChatRoomCustomer;
