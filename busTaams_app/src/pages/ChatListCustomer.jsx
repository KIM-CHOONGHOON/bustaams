import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { notify } from '../utils/toast';
import BottomNavCustomer from '../components/BottomNavCustomer';

const ChatListCustomer = () => {
    const navigate = useNavigate();
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState(null);
    const [imageVersion] = useState(Date.now());

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

        const fetchProfile = async () => {
            try {
                const res = await api.get('/app/customer/profile');
                if (res.success && res.data) {
                    setUserProfile({
                        userName: res.data.name || res.data.userName || '고객님',
                        userImage: res.data.profileImage || null
                    });
                }
            } catch (err) {
                console.error('Profile fetch error:', err);
            }
        };

        fetchChats();
        fetchProfile();
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
            <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-[20px] border-b border-slate-100 h-20">
                <div className="flex justify-between items-center w-full px-6 h-full max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="text-[#004e47] hover:opacity-80 transition-opacity flex items-center gap-2">
                            <span className="material-symbols-outlined text-2xl">arrow_back</span>
                            <h1 className="text-[#004e47] font-headline font-extrabold tracking-tight text-xl">메시지 목록</h1>
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <div 
                            className="h-10 w-10 rounded-xl bg-slate-200 overflow-hidden ring-2 ring-[#a1f1e5] cursor-pointer hover:shadow-md transition-all"
                            onClick={() => navigate('/user-profile')}
                        >
                            {userProfile?.userImage ? (
                                <img 
                                    alt="User profile" 
                                    className="w-full h-full object-cover" 
                                    src={userProfile.userImage.startsWith('http') ? 
                                        `${userProfile.userImage}${userProfile.userImage.includes('?') ? '&' : '?'}t=${imageVersion}` : 
                                        `${import.meta.env.VITE_API_BASE_URL || ''}${userProfile.userImage.startsWith('/') ? '' : '/'}${userProfile.userImage}${userProfile.userImage.includes('?') ? '&' : '?'}t=${imageVersion}`} 
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    <span className="material-symbols-outlined">person</span>
                                </div>
                            )}
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
                                매칭된 버스 기사님들과 실시간 대화를 나누고 세부 운송 내용을 조율하세요.
                            </p>
                        </div>
                    </div>
                </section>

                {chats.length > 0 ? (
                    <div className="flex flex-col gap-4 text-left">
                        {chats.map((chat) => (
                            <div 
                                key={chat.resId} 
                                onClick={() => navigate(`/chat-room/${chat.resId}`)}
                                className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-100 hover:shadow-[0_15px_40px_rgba(0,104,95,0.08)] hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer relative flex flex-col md:flex-row gap-5 items-start md:items-center justify-between text-left"
                            >
                                {chat.sourceType === 'RESERVATION' && (
                                    <div className="absolute top-0 right-0 bg-[#00685f] text-white px-3 py-1 rounded-tr-2xl rounded-bl-xl text-[10px] font-bold uppercase tracking-wider z-10">
                                        새 대화 대기
                                    </div>
                                )}
                                
                                <div className="flex flex-1 gap-5 items-center w-full">
                                    {/* 프로필 이미지 */}
                                    <div className="relative shrink-0">
                                        <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-inner bg-slate-50 border border-slate-100">
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
                                                    <span className="material-symbols-outlined text-3xl">person</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 bg-[#9d4300] text-white text-[9px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-tight">
                                            {chat.otherUser?.PART_TYPE === 'DRIVER' ? '기사님' : '고객'}
                                        </div>
                                        {/* 안 읽은 메시지 수 뱃지 표시 (한글 주석) */}
                                        {chat.unreadCount > 0 && (
                                            <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-pulse">
                                                {chat.unreadCount}
                                            </div>
                                        )}
                                    </div>

                                    {/* 본문 정보 */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                            <h3 className="font-headline font-bold text-lg text-[#191c1e] truncate">
                                                {chat.otherUser?.USER_NM || '알 수 없는 사용자'}
                                            </h3>
                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                                                예약 #{chat.resId}
                                            </span>
                                        </div>
                                        
                                        {/* 여행 제목 정보 */}
                                        <div className="flex items-center gap-2 mb-1.5 bg-[#f0f9f8] px-3 py-1.5 rounded-xl border border-[#a1f1e5]/30 w-fit max-w-full">
                                            <span className="material-symbols-outlined text-[#00685f] text-sm shrink-0">directions_bus</span>
                                            <span className="text-xs font-bold text-[#00685f] break-words">
                                                {chat.tripTitle || '일정 정보 없음'}
                                            </span>
                                        </div>
                                        
                                        {/* 여행 일자 정보 */}
                                        <div className="flex items-center gap-2 mb-2 bg-[#fff4ec] px-3 py-1 rounded-xl border border-[#ffe4d3]/50 w-fit">
                                            <span className="material-symbols-outlined text-[#9d4300] text-sm shrink-0">calendar_month</span>
                                            <span className="text-[11px] font-bold text-[#9d4300] shrink-0">
                                                {chat.tripDate || '날짜 미정'}
                                            </span>
                                        </div>

                                        <p className={`font-body text-sm leading-relaxed truncate ${chat.sourceType === 'RESERVATION' ? 'text-[#00685f] font-semibold' : 'text-slate-500'}`}>
                                            {chat.lastMsg || '새로운 대화를 시작해보세요.'}
                                        </p>
                                    </div>
                                </div>

                                {/* 우측 상태 / 액션 영역 */}
                                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center w-full md:w-auto shrink-0 border-t border-slate-100 md:border-t-0 pt-4 md:pt-0 gap-4">
                                    <span className="text-xs font-bold text-slate-400 shrink-0">
                                        {formatTime(chat.lastMsgTime || chat.lastMsgDt)}
                                    </span>
                                    <button className="bg-[#004e47] text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-[#9d4300] transition-colors shadow-md shadow-[#004e47]/10 group-hover:scale-105 duration-200">
                                        {chat.sourceType === 'RESERVATION' ? '대화 시작하기' : '대화하기'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-32 bg-white rounded-2xl border-2 border-dashed border-slate-100 shadow-inner">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8">
                            <span className="material-symbols-outlined text-5xl text-slate-200">chat_bubble</span>
                        </div>
                        <h3 className="text-2xl font-black text-[#004e47] italic uppercase tracking-tighter mb-2">채팅 내역 없음</h3>
                        <p className="text-slate-400 font-bold italic text-sm">기사님과의 활성화된 채팅 내역이 없습니다.</p>
                    </div>
                )}
            </main>

            <BottomNavCustomer />
        </div>
    );
};

export default ChatListCustomer;
