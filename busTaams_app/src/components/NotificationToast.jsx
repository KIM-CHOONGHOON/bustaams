import React, { useState, useEffect } from 'react';
import { onMessage } from 'firebase/messaging';
import { messaging } from '../firebase-config';
import { useNavigate } from 'react-router-dom';
import { request } from '../api';

const NotificationToast = () => {
  const [show, setShow] = useState(false);
  const [notification, setNotification] = useState(null);
  const navigate = useNavigate();

  // 한글 주석: Web Audio API를 이용해 파일 리소스 없이 맑은 '도-미' 알림음 동적 생성 및 재생
  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // 첫 번째 음 (C5, 도)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); 
      gain1.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
      
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.12);

      // 두 번째 높은 음 (E5, 미 - 80ms 딜레이)
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); 
        gain2.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
        
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.22);
      }, 80);
    } catch (e) {
      console.warn('AudioContext 알림음 재생 차단됨 (사용자 인터랙션 이전이거나 미지원 브라우저):', e);
    }
  };

  // 한글 주석: 모바일 기기(안드로이드 등) 진동 유도 (100ms 진동 -> 50ms 대기 -> 100ms 진동)
  const triggerVibration = () => {
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch (e) {
      console.warn('진동 API 실행 실패:', e);
    }
  };

  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('포그라운드 알림 수신:', payload);
      
      const newNotif = {
        title: payload.notification?.title || '알림',
        body: payload.notification?.body || '',
        data: payload.data || {}
      };

      setNotification(newNotif);
      setShow(true);

      // 알림음 및 진동 효과 실행
      playNotificationSound();
      triggerVibration();

      // 6초 후 자동 닫기 (사용자가 읽을 시간을 충분히 줌)
      const timer = setTimeout(() => setShow(false), 6000);
      return () => clearTimeout(timer);
    });

    return () => unsubscribe();
  }, []);

  if (!show || !notification) return null;

  return (
    <div 
      className="fixed top-6 left-4 right-4 z-[9999] max-w-md mx-auto animate-premium-slide-in"
      onClick={async () => {
        setShow(false);
        const link = notification.data?.link;
        if (link) {
          try {
            const url = new URL(link, window.location.origin);
            const reqId = url.searchParams.get('reqId');
            const resId = url.searchParams.get('resId');
            
            if (reqId && resId) {
              const statusRes = await request(`/app/driver/bids/status?reqId=${reqId}&resId=${resId}`);
              if (statusRes.success && statusRes.status) {
                const status = statusRes.status;
                if (status === 'DRIVER_PAY_WAIT') {
                  navigate(`/approval-pending-driver?tab=driver_pay`);
                } else if (status === 'FINAL_APPROVAL_WAIT') {
                  navigate(`/approval-pending-driver?tab=final_approval_wait`);
                } else if (status === 'CONFIRM') {
                  navigate(`/upcoming-trip-detail-driver/${resId}`);
                } else {
                  navigate(link);
                }
                return;
              }
            }
          } catch (routeErr) {
            console.error('토스트 동적 라우팅 파싱 에러:', routeErr);
          }
          navigate(link);
        }
      }}
    >
      <div className="bg-white/90 backdrop-blur-2xl border border-white/40 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-[24px] p-5 flex items-start gap-4 cursor-pointer active:scale-95 transition-all group overflow-hidden relative">
        {/* 장식용 그라데이션 배경 */}
        <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-primary to-teal-400" />
        
        <div className="w-14 h-14 bg-gradient-to-br from-primary to-teal-500 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
          <span className="material-symbols-outlined text-white text-2xl">notifications_active</span>
        </div>
        
        <div className="flex-1 min-w-0 py-1">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] font-bold text-primary/70 uppercase tracking-widest">실시간 알림</span>
            <span className="text-[10px] text-slate-400">방금 전</span>
          </div>
          <h4 className="font-bold text-slate-900 truncate text-base mb-0.5">{notification.title}</h4>
          <p className="text-sm text-slate-600 line-clamp-1 leading-relaxed">{notification.body}</p>
        </div>

        <button 
          onClick={(e) => {
            e.stopPropagation();
            setShow(false);
          }}
          className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
      
      <style jsx>{`
        @keyframes premium-slide-in {
          0% { transform: translateY(-30px) scale(0.95); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        .animate-premium-slide-in {
          animation: premium-slide-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default NotificationToast;
