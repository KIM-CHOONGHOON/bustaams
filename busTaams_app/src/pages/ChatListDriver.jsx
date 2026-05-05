import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { notify } from '../utils/toast';
import BottomNavDriver from '../components/BottomNavDriver';

const ChatListDriver = () => {
    const navigate = useNavigate();
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchChats = async () => {
            try {
                const res = await api.get('/app/chat/list');
                if (res.success) {
                    setChats(res.data);
                } else {
                    notify.error('오류', '채팅 목록을 불러올 수 없습니다.');
                }
            } catch (err) {
                console.error('Chat list fetch error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchChats();
    }, []);

    // 시간 포맷팅 유틸리티
    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        const now = new Date();
        const date = new Date(timeStr);
        const diff = (now - date) / 1000; // 초 단위

        if (diff < 60) return '방금 전';
        if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
        return timeStr.split(' ')[0]; // 날짜만 표시
    };

    if (loading) {
        return (
            <div className="bg-[#F8F9FA] min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-[#004D40] font-black">메시지 불러오는 중...</div>
            </div>
        );
    }

    return (
        <div className="bg-[#f7f9fb] text-[#191c1e] min-h-[100dvh] pb-40 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-[20px] border-b border-slate-100">
                <div className="flex justify-between items-center w-full px-6 pt-8 pb-4 max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/driver-dashboard')} className="text-[#004e47] hover:opacity-80 transition-opacity">
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                        <h1 className="text-[#004e47] font-headline font-extrabold tracking-tighter text-3xl">busTaams</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-slate-200 overflow-hidden ring-2 ring-[#a1f1e5]">
                            <img alt="User profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCQKXRoBCeLV07vgTChHmqvi_NRAZXUqrhpqN8AbLegLS8VjYTymtrKWXeyE0UgCnxmjd6Z9z_psP9elE65_2EmmAVEl7ghuLcqsd-cQE7r6oa6Gkiw_j2FTp9fNI_DVbgJN2jMYf5uSfckIxhOQMUSR3wFXvxUeGSlW22qeXfGvG7eXWJypKF0PVF_uiYVAXCxislNYYMqDcFsDB4S7OYRwC0Fp9Knhp9wnVItFORMfdeQFLvUz1TJfgR6NKSyggPQuF4Oytl2Q8Q"/>
                        </div>
                    </div>
                </div>
            </header>

            <main className="pt-32 px-6 max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom duration-1000 text-left">
                {/* Header Section */}
                <section>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="max-w-xl">
                            <h2 className="font-headline font-extrabold text-5xl md:text-6xl text-[#004e47] tracking-tight leading-[1.1] mb-4">
                                메시지 목록
                            </h2>
                            <p className="font-body text-[#3e4947] text-lg max-w-sm">
                                진행 중인 입찰 문의를 관리하고 실시간으로 운송 물류를 조율하세요.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button className="bg-slate-100 px-6 py-3 rounded-full font-bold text-sm text-[#004e47] flex items-center gap-2 hover:bg-slate-200 transition-colors">
                                <span className="material-symbols-outlined text-lg">archive</span>
                                보관함
                            </button>
                            <button className="bg-[#00685f] text-white px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 shadow-lg shadow-[#004e47]/20 hover:scale-105 transition-transform">
                                <span className="material-symbols-outlined text-lg">chat_add_on</span>
                                새 브로드캐스트
                            </button>
                        </div>
                    </div>
                </section>

                {chats.length > 0 ? (
                    <div className="space-y-12 text-left">
                        {/* Bento Grid: Featured & Secondary */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-left">
                            {/* Featured Conversation (Most Recent) */}
                            <div className="md:col-span-8 group cursor-pointer" onClick={() => navigate(`/chat-room/${chats[0].resId}`)}>
                                <div className="bg-white p-8 rounded-[2rem] shadow-[0_20px_40px_-15px_rgba(0,104,95,0.08)] relative overflow-hidden transition-all duration-300 hover:shadow-[0_30px_60px_-15px_rgba(0,104,95,0.12)] border-l-4 border-[#9d4300]">
                                    {chats[0].sourceType === 'RESERVATION' && (
                                        <div className="absolute top-0 right-0 bg-[#00685f] text-white px-4 py-1 rounded-bl-xl text-[10px] font-bold uppercase tracking-widest z-10">
                                            새로운 예약 문의
                                        </div>
                                    )}
                                    <div className="flex flex-col md:flex-row gap-6 items-start">
                                        <div className="relative">
                                            <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-inner bg-slate-50">
                                                {chats[0].otherUser?.USER_IMAGE ? (
                                                    <img 
                                                        src={chats[0].otherUser.USER_IMAGE.startsWith('http') ? 
                                                            chats[0].otherUser.USER_IMAGE : 
                                                            `${import.meta.env.VITE_API_BASE_URL || ''}${chats[0].otherUser.USER_IMAGE}`} 
                                                        className="w-full h-full object-cover" 
                                                        alt={chats[0].otherUser?.USER_NM} 
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                        <span className="material-symbols-outlined text-4xl">person</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="absolute -bottom-2 -right-2 bg-[#9d4300] text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter">
                                                {chats[0].otherUser?.PART_TYPE === 'TRAVELER' ? '진행 중인 고객' : '파트너'}
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-headline font-bold text-2xl text-[#191c1e]">
                                                    {chats[0].otherUser?.USER_NM || '알 수 없는 사용자'}
                                                </h3>
                                                <span className="font-label text-xs font-bold text-[#9d4300] uppercase tracking-widest">{formatTime(chats[0].lastMsgTime)}</span>
                                            </div>
                                            <p className={`font-body text-[#3e4947] text-lg leading-relaxed mb-4 line-clamp-2 ${chats[0].sourceType === 'RESERVATION' ? 'text-[#00685f] font-bold' : 'italic'}`}>
                                                "{chats[0].lastMsg || '새로운 대화를 시작해보세요.'}"
                                            </p>
                                            <div className="flex items-center gap-4">
                                                <span className="flex items-center gap-1 text-[#004e47] text-xs font-bold uppercase tracking-widest">
                                                    <span className="material-symbols-outlined text-sm">confirmation_number</span>
                                                    예약번호 #{chats[0].resId}
                                                </span>
                                                <div className="h-1 w-1 bg-slate-200 rounded-full"></div>
                                                <button 
                                                    className="bg-[#004e47] text-white px-6 py-2 rounded-full text-xs font-bold hover:bg-[#9d4300] transition-colors shadow-md shadow-[#004e47]/10"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/chat-room/${chats[0].resId}`);
                                                    }}
                                                >
                                                    {chats[0].sourceType === 'RESERVATION' ? '첫 메시지 보내기' : '채팅 내용 보기'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Urgent Indicator */}
                                    <div className="absolute top-8 right-8">
                                        <div className="flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#9d4300] opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#9d4300]"></span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Secondary Conversations (2nd and 3rd) */}
                            <div className="md:col-span-4 flex flex-col gap-6">
                                {chats.slice(1, 3).map((chat, idx) => (
                                    <div 
                                        key={chat.resId} 
                                        onClick={() => navigate(`/chat-room/${chat.resId}`)}
                                        className={`bg-white p-6 rounded-[1.5rem] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] hover:bg-slate-50 transition-colors group cursor-pointer relative ${idx === 1 ? 'opacity-80' : ''}`}
                                    >
                                        {chat.sourceType === 'RESERVATION' && (
                                            <div className="absolute top-2 right-2 flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00685f] opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00685f]"></span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-4 mb-3">
                                            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-slate-50">
                                                {chat.otherUser?.USER_IMAGE ? (
                                                    <img 
                                                        src={chat.otherUser.USER_IMAGE.startsWith('http') ? 
                                                            chat.otherUser.USER_IMAGE : 
                                                            `${import.meta.env.VITE_API_BASE_URL || ''}${chat.otherUser.USER_IMAGE}`} 
                                                        className="w-full h-full object-cover" 
                                                        alt={chat.otherUser?.USER_NM} 
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                        <span className="material-symbols-outlined text-2xl">person</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 text-left">
                                                <h4 className="font-headline font-bold text-base truncate text-[#191c1e]">{chat.otherUser?.USER_NM}</h4>
                                                <p className="text-[10px] text-[#3e4947] uppercase tracking-widest truncate">예약번호 #{chat.resId}</p>
                                            </div>
                                            <div className="bg-[#004e47] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">
                                                <span className="material-symbols-outlined text-xs">chevron_right</span>
                                            </div>
                                        </div>
                                        <p className="text-sm text-[#3e4947] line-clamp-2 text-left">
                                            {chat.lastMsg || '메시지가 없습니다.'}
                                        </p>
                                    </div>
                                ))}
                                {chats.length === 1 && (
                                    <div className="bg-slate-50/50 border-2 border-dashed border-slate-100 p-6 rounded-[1.5rem] flex items-center justify-center h-full min-h-[150px]">
                                        <p className="text-slate-300 font-bold text-xs">추가 대화 없음</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recent Activity (Remaining Chats) */}
                        {chats.length > 3 && (
                            <div className="space-y-4 mt-8 text-left">
                                <div className="flex items-center justify-between px-2">
                                    <h5 className="font-headline font-bold text-xl text-[#00685f]">최근 활동</h5>
                                    <button className="text-[#004e47] font-bold text-xs uppercase tracking-widest hover:underline">모두 보기</button>
                                </div>
                                <div className="bg-slate-100/50 rounded-[2rem] p-4 space-y-2">
                                    {chats.slice(3).map(chat => (
                                        <div 
                                            key={chat.resId} 
                                            onClick={() => navigate(`/chat-room/${chat.resId}`)}
                                            className="bg-white flex items-center gap-6 p-4 rounded-2xl hover:translate-x-2 transition-transform cursor-pointer shadow-sm shadow-slate-200/50 relative"
                                        >
                                            {chat.sourceType === 'RESERVATION' && (
                                                <div className="absolute top-4 left-4 h-2 w-2 rounded-full bg-[#00685f]"></div>
                                            )}
                                            <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 grayscale hover:grayscale-0 transition-all bg-slate-50">
                                                {chat.otherUser?.USER_IMAGE ? (
                                                    <img 
                                                        src={chat.otherUser.USER_IMAGE.startsWith('http') ? 
                                                            chat.otherUser.USER_IMAGE : 
                                                            `${import.meta.env.VITE_API_BASE_URL || ''}${chat.otherUser.USER_IMAGE}`} 
                                                        className="w-full h-full object-cover" 
                                                        alt={chat.otherUser?.USER_NM} 
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                        <span className="material-symbols-outlined">person</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 text-left">
                                                <h4 className="font-headline font-bold text-lg text-[#191c1e]">{chat.otherUser?.USER_NM}</h4>
                                                <p className="text-sm text-[#3e4947] line-clamp-1">{chat.lastMsg || '메시지 없음'}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{formatTime(chat.lastMsgTime)}</span>
                                                <span className="material-symbols-outlined text-slate-300 text-lg">done_all</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-32 bg-white rounded-[4rem] border-2 border-dashed border-slate-100 shadow-inner">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8">
                            <span className="material-symbols-outlined text-5xl text-slate-200">chat_bubble</span>
                        </div>
                        <h3 className="text-2xl font-black text-[#004e47] italic uppercase tracking-tighter mb-2">채팅 내역 없음</h3>
                        <p className="text-slate-400 font-bold italic text-sm">현재 활성화된 채팅 내역이 없습니다.</p>
                    </div>
                )}
            </main>

            <BottomNavDriver activeTab="chat" />
        </div>
    );
};

export default ChatListDriver;
