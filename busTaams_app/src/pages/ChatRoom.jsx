import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { notify } from '../utils/toast';
import BottomNavCustomer from '../components/BottomNavCustomer';
import BottomNavDriver from '../components/BottomNavDriver';

/**
 * JWT 토큰 또는 로컬스토리지에서 로그인된 사용자의 고객 ID를 가져오는 함수 (한글 주석)
 */
const getLoggedCustId = () => {
    try {
        const token = localStorage.getItem('accessToken');
        if (token) {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const decoded = JSON.parse(jsonPayload);
            if (decoded && decoded.custId) {
                return decoded.custId;
            }
        }
    } catch (e) {
        console.error('JWT parse error:', e);
    }
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.custId) {
            return user.custId;
        }
    } catch (e) {
        console.error('Localstorage user parse error:', e);
    }
    return '';
};

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
    const [profileImage, setProfileImage] = useState(null);
    const [imageVersion, setImageVersion] = useState(Date.now());
    const scrollRef = useRef(null);
    const myCustId = getLoggedCustId();

    // 사용자 정보 로드
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        setCurrentUser(user);
        
        const fetchProfile = async () => {
            try {
                if (user?.userType === 'DRIVER') {
                    const response = await api.get('/app/driver/dashboard');
                    if (response.success && response.data) {
                        setProfileImage(response.data.userImage);
                    }
                } else {
                    const response = await api.get('/app/customer/profile');
                    if (response.success && response.data) {
                        setProfileImage(response.data.profileImage);
                    }
                }
            } catch (error) {
                console.error('Fetch profile error:', error);
            }
        };
        fetchProfile();
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
                if (histRes.success && Array.isArray(histRes.data)) {
                    // 메시지 개수가 다를 때만 업데이트 (간단한 동기화)
                    if (histRes.data.length !== history.length) {
                        const prevLength = history.length;
                        setHistory(histRes.data);

                        // 최초 진입 시 알림음 재생 차단 (기존 대역폭 유지)
                        if (prevLength > 0 && histRes.data.length > prevLength) {
                            const latestMsg = histRes.data[histRes.data.length - 1];
                            const loggedId = myCustId || currentUser?.custId;

                            // 내가 보낸 메시지가 아닌 상대방이 보낸 신규 메시지일 때만 알림 발생
                            if (latestMsg && String(latestMsg.REG_ID) !== String(loggedId)) {
                                // 1. 진동 알림 (Vibrate)
                                if (navigator.vibrate) {
                                    navigator.vibrate([150, 100, 150]);
                                }

                                // 2. 알림음 재생 (Web Audio API)
                                try {
                                    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                                    
                                    // 첫 번째 부드러운 음 (D5)
                                    const osc1 = audioCtx.createOscillator();
                                    const gain1 = audioCtx.createGain();
                                    osc1.connect(gain1);
                                    gain1.connect(audioCtx.destination);
                                    osc1.type = 'sine';
                                    osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime);
                                    gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
                                    gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
                                    osc1.start(audioCtx.currentTime);
                                    osc1.stop(audioCtx.currentTime + 0.12);

                                    // 두 번째 맑은 음 (A5, 90ms 시차)
                                    setTimeout(() => {
                                        const osc2 = audioCtx.createOscillator();
                                        const gain2 = audioCtx.createGain();
                                        osc2.connect(gain2);
                                        gain2.connect(audioCtx.destination);
                                        osc2.type = 'sine';
                                        osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime);
                                        gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
                                        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.22);
                                        osc2.start(audioCtx.currentTime);
                                        osc2.stop(audioCtx.currentTime + 0.22);
                                    }, 90);
                                } catch (soundErr) {
                                    console.warn('Play notification sound failed:', soundErr);
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [chatRoom, history.length, myCustId, currentUser]);

    // 스크롤 하단 이동
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history]);

    // 메시지 전송 (한글 주석)
    const handleSendMessage = async () => {
        if (!message.trim()) return;

        let activeChatSeq = chatRoom?.chatSeq;

        // 채팅방 정보가 아직 준비되지 않은 경우 즉시 다시 로드 시도
        if (!activeChatSeq) {
            try {
                const roomRes = await api.get(`/app/chat/room/${id}`);
                if (roomRes.success && roomRes.data?.chatSeq) {
                    setChatRoom(roomRes.data);
                    activeChatSeq = roomRes.data.chatSeq;
                }
            } catch (retryErr) {
                console.error('Retry fetch chat room error:', retryErr);
            }
        }

        if (!activeChatSeq) {
            notify.error('전송 실패', '채팅방 정보가 아직 완전히 로드되지 않았습니다. 잠시 후 다시 시도해주세요.');
            return;
        }

        const originalMsg = message;
        setMessage(''); // 즉시 비우기 (UX)

        try {
            const res = await api.post('/app/chat/send', {
                chatSeq: activeChatSeq,
                msgBody: originalMsg,
                msgKind: 'TEXT'
            });

            if (res.success) {
                // 내역 즉시 갱신
                const histRes = await api.get(`/app/chat/history/${chatRoom.chatSeq}`);
                if (histRes.success && Array.isArray(histRes.data)) {
                    setHistory(histRes.data);
                }
            } else {
                notify.error('전송 실패', res.error || '메시지를 보낼 수 없습니다.');
                setMessage(originalMsg); // 복구
            }
        } catch (err) {
            console.error('Send message error:', err);
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
                        <button onClick={() => navigate(-1)} className="text-[#004D40] hover:opacity-80 transition-opacity flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl">arrow_back</span>
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center">
                                {chatRoom?.otherUser?.USER_IMAGE ? (
                                    <img 
                                        src={chatRoom.otherUser.USER_IMAGE.startsWith('http') ? 
                                            chatRoom.otherUser.USER_IMAGE : 
                                            `${import.meta.env.VITE_API_BASE_URL || ''}${chatRoom.otherUser.USER_IMAGE}`}
                                        className="w-full h-full object-cover" 
                                        alt={chatRoom.otherUser?.USER_NM} 
                                    />
                                ) : (
                                    <span className="material-symbols-outlined text-slate-300">person</span>
                                )}
                            </div>
                            <div className="flex flex-col text-left">
                                <h2 className="font-black text-base text-[#004D40] tracking-tight leading-tight">
                                    {chatRoom?.otherUser?.USER_NM || '대화 상대'}
                                </h2>
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">
                                    {chatRoom?.otherUser?.PART_TYPE === 'DRIVER' ? '배정 기사님' : 
                                     chatRoom?.otherUser?.PART_TYPE === 'TRAVELER' ? '예약 고객님' : '파트너'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 내 프로필 이미지 (마이페이지 이동) */}
                    <div 
                        className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden border border-gray-100 cursor-pointer shadow-sm active:scale-95 transition-transform"
                        onClick={() => {
                            if (currentUser?.userType === 'DRIVER') {
                                navigate('/driver-dashboard');
                            } else {
                                
                            }
                        }}
                    >
                        {profileImage ? (
                            <img 
                                alt="My Profile" 
                                src={profileImage.startsWith('http') ? 
                                    `${profileImage}${profileImage.includes('?') ? '&' : '?'}t=${imageVersion}` : 
                                    `${import.meta.env.VITE_API_BASE_URL || ''}${profileImage.startsWith('/') ? '' : '/'}${profileImage}${profileImage.includes('?') ? '&' : '?'}t=${imageVersion}`} 
                                className="w-full h-full object-cover" 
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                }}
                            />
                        ) : (
                            <span className="material-symbols-outlined text-gray-400 text-2xl">account_circle</span>
                        )}
                        {profileImage && (
                            <span className="material-symbols-outlined text-gray-400 text-2xl hidden items-center justify-center w-full h-full">account_circle</span>
                        )}
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
                    // 내가 보낸 메시지인지 정밀 판단 (내 CUST_ID와 일치할 때만 오른쪽) (한글 주석)
                    const senderCustId = String(msg.SENDER_CUST_ID || msg.senderCustId || msg.sender_cust_id || '').trim();
                    const loggedCustId = String(myCustId || currentUser?.custId || '').trim();

                    let isMe = false;
                    if (senderCustId && loggedCustId) {
                        isMe = (senderCustId.toLowerCase() === loggedCustId.toLowerCase()) || 
                               (parseInt(senderCustId, 10) > 0 && parseInt(senderCustId, 10) === parseInt(loggedCustId, 10));
                    }

                    return (
                        <div key={idx} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex flex-col gap-1.5 ${isMe ? 'items-end' : 'items-start'} max-w-[80%]`}>
                                {!isMe && (
                                    <span className="text-[10px] font-bold text-gray-400 ml-1">
                                        {chatRoom?.otherUser?.USER_NM || (currentUser?.userType === 'DRIVER' ? '여행 고객님' : '운행 기사님')}
                                    </span>
                                )}
                                <div className={`p-4 rounded-2xl shadow-sm ${
                                    isMe 
                                    ? 'bg-[#004D40] text-white rounded-tr-none' 
                                    : 'bg-white text-[#1D3557] rounded-tl-none border border-gray-100'
                                }`}>
                                    <p className="text-[14px] leading-relaxed font-medium whitespace-pre-wrap break-all">{msg.MSG_BODY}</p>
                                </div>
                                <div className={`flex items-center gap-1.5 ${isMe ? 'mr-1' : 'ml-1'}`}>
                                    <span className="text-[9px] font-bold text-gray-300 uppercase">
                                        {msg.regDt ? msg.regDt.split(' ')[1]?.substring(0, 5) : ''}
                                    </span>
                                    {isMe && (
                                        <span className="material-symbols-outlined text-[12px] text-[#004D40]" style={{fontVariationSettings: "'FILL' 1"}}>done_all</span>
                                    )}
                                </div>
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

            {currentUser?.userType === 'DRIVER' ? (
                <BottomNavDriver activeTab="chat" />
            ) : (
                <BottomNavCustomer />
            )}
        </div>
    );
};

export default ChatRoom;
