import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, request } from '../api';

const NotificationList = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('알림 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleNotificationClick = async (notif) => {
    try {
      if (notif.READ_YN === 'N') {
        await markNotificationAsRead(notif.SEQ);
        // 로컬 상태 업데이트
        setNotifications(prev => 
          prev.map(item => item.SEQ === notif.SEQ ? { ...item, READ_YN: 'Y' } : item)
        );
      }
      
      if (notif.LINK) {
        // 한글 주석: 결제 완료 알림 등의 경우 실시간 여정 상태에 따라 분기 라우팅 수행
        try {
          const url = new URL(notif.LINK, window.location.origin);
          const reqId = url.searchParams.get('reqId');
          const resId = url.searchParams.get('resId');
          
          if (reqId && resId) {
            const statusRes = await request(`/app/driver/bids/status?reqId=${reqId}&resId=${resId}`);
            if (statusRes.success && statusRes.status) {
              const status = statusRes.status;
              // 기사 데이터 결제와 관련된 건(링크에 tab=driver_pay 포함)인 경우
              const isDriverPayNotif = notif.LINK && notif.LINK.includes('tab=driver_pay');
              if (isDriverPayNotif) {
                if (status === 'DRIVER_PAY_WAIT') {
                  navigate(`/approval-pending-driver?tab=driver_pay`);
                } else {
                  // 이미 결제 완료(FINAL_APPROVAL_WAIT, CONFIRM 등) 또는 다른 상태 -> 안내 팝업 및 기사 메인대시보드로 리다이렉트
                  alert('이미 결제가 완료되었거나 진행할 수 없는 상태입니다.');
                  navigate('/driver-dashboard');
                }
              } else {
                if (status === 'DRIVER_PAY_WAIT') {
                  navigate(`/approval-pending-driver?tab=driver_pay`);
                } else if (status === 'FINAL_APPROVAL_WAIT') {
                  navigate(`/approval-pending-driver?tab=final_approval_wait`);
                } else if (status === 'CONFIRM') {
                  navigate(`/upcoming-trip-detail-driver/${resId}`);
                } else {
                  alert('유효하지 않은 여정이거나 현재 진행 중인 단계가 아닙니다.');
                  navigate('/driver-dashboard');
                }
              }
              return;
            }
          }
        } catch (routeErr) {
          console.error('동적 라우팅 파싱 에러:', routeErr);
        }

        let targetLink = notif.LINK;
        if (targetLink.startsWith('/app/')) {
          targetLink = targetLink.replace(/^\/app/, '');
        } else if (targetLink === '/app') {
          targetLink = '/';
        }
        navigate(targetLink);
      }
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error);
    }
  };

  const handleDelete = async (e, seq) => {
    e.stopPropagation();
    if (!window.confirm('이 알림을 삭제하시겠습니까?')) return;
    
    try {
      await deleteNotification(seq);
      setNotifications(prev => prev.filter(item => item.SEQ !== seq));
    } catch (error) {
      console.error('알림 삭제 실패:', error);
    }
  };

  const handleReadAll = async () => {
    if (notifications.length === 0) return;
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(item => ({ ...item, READ_YN: 'Y' })));
    } catch (error) {
      console.error('전체 읽음 처리 실패:', error);
    }
  };

  // 알림 타입별 아이콘 및 색상 설정
  const getNotifStyle = (type) => {
    switch (type) {
      case 'CHAT':
        return { icon: 'chat', color: 'bg-blue-100 text-blue-600', label: '채팅' };
      case 'BID':
        return { icon: 'local_shipping', color: 'bg-amber-100 text-amber-600', label: '입찰' };
      case 'RESERVATION':
        return { icon: 'event_available', color: 'bg-teal-100 text-teal-600', label: '예약' };
      case 'CANCEL':
        return { icon: 'cancel', color: 'bg-red-100 text-red-600', label: '취소' };
      default:
        return { icon: 'notifications', color: 'bg-slate-100 text-slate-600', label: '공지' };
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-body">
      {/* 프리미엄 헤더 */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-all active:scale-90"
          >
            <span className="material-symbols-outlined text-slate-600">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold text-slate-900 font-headline tracking-tight">알림 센터</h1>
        </div>
        {notifications.some(n => n.READ_YN === 'N') && (
          <button 
            onClick={handleReadAll}
            className="text-sm font-bold text-primary hover:text-teal-700 px-3 py-1.5 rounded-lg hover:bg-teal-50 transition-colors"
          >
            모두 읽음
          </button>
        )}
      </header>

      <main className="p-6 max-w-2xl mx-auto">
        {loading ? (
          // 로딩 스켈레톤
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-100 rounded w-1/4" />
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-24 h-24 bg-gradient-to-tr from-slate-50 to-slate-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <span className="material-symbols-outlined text-slate-300 text-5xl">notifications_off</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">알림이 비어있습니다</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              새로운 소식이 도착하면 <br/>가장 먼저 알려드릴게요!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notif) => {
              const style = getNotifStyle(notif.NOTIF_TYPE);
              return (
                <div 
                  key={notif.SEQ}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group bg-white p-5 rounded-2xl border ${notif.READ_YN === 'N' ? 'border-primary/20 shadow-md shadow-primary/5' : 'border-slate-100 shadow-sm'} hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer relative overflow-hidden active:scale-[0.98]`}
                >
                  {/* 읽지 않음 표시 */}
                  {notif.READ_YN === 'N' && (
                    <div className="absolute top-4 right-4 w-2 h-2 bg-primary rounded-full animate-pulse" />
                  )}
                  
                  <div className="flex gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${style.color}`}>
                      <span className="material-symbols-outlined text-2xl">{style.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                          {style.label} • {new Date(notif.REG_DT || notif.CREATED_AT).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                      <h4 className={`font-bold truncate ${notif.READ_YN === 'N' ? 'text-slate-900' : 'text-slate-500'}`}>
                        {notif.TITLE}
                      </h4>
                      <p className="text-sm text-slate-600 leading-relaxed mt-1 line-clamp-2">
                        {notif.BODY}
                      </p>
                    </div>
                  </div>

                  {/* 삭제 버튼 (호버 시 노출) */}
                  <button 
                    onClick={(e) => handleDelete(e, notif.SEQ)}
                    className="absolute bottom-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <span className="material-symbols-outlined text-xl">delete</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <style jsx>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default NotificationList;
