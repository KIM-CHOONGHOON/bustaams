import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { notify } from '../utils/toast';
import BottomNavCustomer from '../components/BottomNavCustomer';

/**
 * busTaams Talk - 실시간 채팅 화면
 * 기사와 여행자 간의 소통을 담당
 */
const ChatRoom = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // resId 혹은 chatSeq
    const [message, setMessage] = useState('');
    const [chatRoom, setChatRoom] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const scrollRef = useRef(null);

    // 사용자 정보 로드
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        setCurrentUser(user);
    }, []);

    // 채팅방 정보 및 내역 로드
    useEffect(() => {
        const fetchRoomData = async () => {
            try {
                // 1. 채팅방 정보 가져오기 (resId 기준)
                const roomRes = await api.get(`/app/chat/room/${id}`);
                if (roomRes.success) {
                    setChatRoom(roomRes.data);
                    
                    // 2. 초기 내역 가져오기
                    const histRes = await api.get(`/app/chat/history/${roomRes.data.chatSeq}`);
                    if (histRes.success) {
                        setHistory(histRes.data);
                    }
                } else {
                    notify.error('오류', '채팅방을 불러올 수 없습니다.');
                }
            } catch (err) {
                console.error('Chat init error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchRoomData();
    }, [id]);

    // 폴링 (3초마다 내역 갱신)
    useEffect(() => {
        if (!chatRoom) return;

        const interval = setInterval(async () => {
            try {
                const histRes = await api.get(`/app/chat/history/${chatRoom.chatSeq}`);
                if (histRes.success) {
                    // 메시지 개수가 다를 때만 업데이트 (간단한 동기화)
                    if (histRes.data.length !== history.length) {
                        setHistory(histRes.data);
                    }
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [chatRoom, history.length]);

    // 스크롤 하단 이동
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history]);

    // 메시지 전송
    const handleSendMessage = async () => {
        if (!message.trim() || !chatRoom) return;

        const originalMsg = message;
        setMessage(''); // 즉시 비우기 (UX)

        try {
            const res = await api.post('/app/chat/send', {
                chatSeq: chatRoom.chatSeq,
                msgBody: originalMsg,
                msgKind: 'TEXT'
            });

            if (res.success) {
                // 내역 즉시 갱신
                const histRes = await api.get(`/app/chat/history/${chatRoom.chatSeq}`);
                if (histRes.success) {
                    setHistory(histRes.data);
                }
            } else {
                notify.error('전송 실패', '메시지를 보낼 수 없습니다.');
                setMessage(originalMsg); // 복구
            }
        } catch (err) {
            notify.error('오류', '메시지 전송 중 오류가 발생했습니다.');
            setMessage(originalMsg);
        }
    };

    if (loading) {
        return (
            <div className="bg-[#F8F9FA] min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-[#004D40] font-black">busTaams Talk 연결 중...</div>
            </div>
        );
    }

    return (
        <div className="bg-[#F8F9FA] text-[#1D3557] min-h-screen flex flex-col font-body overflow-hidden">
            {/* 상단 헤더 */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="flex justify-between items-center px-6 py-4 max-w-2xl mx-auto w-full">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="text-[#004D40]">
                            <span className="material-symbols-outlined text-2xl">arrow_back</span>
                        </button>
                        <div className="flex flex-col">
                            <h2 className="font-black text-lg text-[#004D40] tracking-tighter italic">busTaams Talk</h2>
                            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">실시간 채팅 지원</span>
                        </div>
                    </div>

                    {/* 상대방 프로필 (마커스 반스 예시 스타일 적용) */}
                    <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-50">
                        <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-100">
                            {chatRoom?.otherUser?.USER_IMAGE ? (
                                <img 
                                    src={chatRoom.otherUser.USER_IMAGE.startsWith('http') ? 
                                        chatRoom.otherUser.USER_IMAGE : 
                                        `${import.meta.env.VITE_API_BASE_URL || ''}${chatRoom.otherUser.USER_IMAGE}`} 
                                    alt="Other" 
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                                    <span className="material-symbols-outlined text-xl">person</span>
                                </div>
                            )}
                            <div className="absolute bottom-0 right-0 w-2 h-2 bg-teal-500 rounded-full border border-white"></div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[11px] font-black leading-none">{chatRoom?.otherUser?.USER_NM || '사용자'}</span>
                            <span className="text-[9px] text-gray-400 font-bold">{chatRoom?.otherUser?.PART_TYPE === 'TRAVELER' ? '여행자' : '파트너'}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* 메시지 영역 */}
            <main 
                ref={scrollRef}
                className="flex-1 pt-24 px-6 pb-40 overflow-y-auto space-y-6 no-scrollbar max-w-2xl mx-auto w-full"
            >
                <div className="flex justify-center mb-8">
                    <span className="px-4 py-1.5 bg-gray-100 text-gray-400 text-[10px] font-bold rounded-full">오늘</span>
                </div>

                {history.map((msg, idx) => {
                    // 내가 보낸 메시지인지 확인
                    const isMe = msg.SENDER_CUST_ID === currentUser?.custId;
                    
                    return (
                        <div key={idx} className={`flex flex-col gap-2 ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${
                                isMe 
                                ? 'bg-[#004D40] text-white rounded-tr-none' 
                                : 'bg-white text-[#1D3557] rounded-tl-none border border-gray-50'
                            }`}>
                                <p className="text-[14px] leading-relaxed font-medium">{msg.MSG_BODY}</p>
                            </div>
                            <div className={`flex items-center gap-2 ${isMe ? 'mr-1' : 'ml-1'}`}>
                                <span className="text-[9px] font-bold text-gray-300 uppercase">
                                    {msg.regDt.split(' ')[1].substring(0, 5)}
                                </span>
                                {isMe && (
                                    <span className="material-symbols-outlined text-[12px] text-[#004D40]" style={{fontVariationSettings: "'FILL' 1"}}>done_all</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </main>

            {/* 입력 영역 */}
            <div className="fixed bottom-24 left-0 right-0 bg-gradient-to-t from-[#F8F9FA]/80 via-[#F8F9FA]/40 to-transparent z-40">
                <div className="max-w-2xl mx-auto px-6 py-4">
                    <div className="bg-white p-2 rounded-[2rem] shadow-xl border border-gray-100 flex items-center gap-2">
                        <button className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-[#004D40] transition-colors">
                            <span className="material-symbols-outlined text-2xl">add_circle</span>
                        </button>
                        <input 
                            className="flex-1 bg-transparent border-none focus:ring-0 text-[14px] font-bold text-[#1D3557] placeholder:text-gray-200 py-2" 
                            placeholder="메시지를 입력하세요..." 
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        />
                        <button 
                            onClick={handleSendMessage}
                            disabled={!message.trim()}
                            className="bg-[#004D40] text-white w-10 h-10 flex items-center justify-center rounded-full shadow-lg active:scale-90 transition-all disabled:opacity-30"
                        >
                            <span className="material-symbols-outlined text-xl" style={{fontVariationSettings: "'FILL' 1"}}>send</span>
                        </button>
                    </div>
                </div>
            </div>

            <BottomNavCustomer />
        </div>
    );
};

export default ChatRoom;
