import React, { useState, useEffect } from 'react';
import DetailBusRequestModal from './DetailBusRequestModal';
import TripHistoryModal from './ReservationList/TripHistoryModal';
import ReviewManageModal from './ReservationList/ReviewManageModal';

const CustomerDashboard = ({ user, setShowAccountSettings, onBusRegister, onViewReservationList, onViewConfirmedList, onOpenLiveChat, refreshTrigger }) => {
  const [recentRequests, setRecentRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [showTripHistory, setShowTripHistory] = useState(false);
  const [showReviewManage, setShowReviewManage] = useState(false);

  useEffect(() => {
    if (user && user.custId) {
      const apiPath = `/api/auction/user/${encodeURIComponent(user.custId)}`;
      fetch(`http://localhost:8080${apiPath}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setRecentRequests(data);
          } else if (data && !data.error && !data.message) {
            setRecentRequests([data]);
          }
        })
        .catch(err => console.error('Error fetching recent request:', err));
    }
  }, [user, refreshTrigger]); // [수정] refreshTrigger 추가

  // [추가] 서브 모달 오픈 시 배경 스크롤 차단
  useEffect(() => {
    if (selectedRequestId || showTripHistory) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedRequestId, showTripHistory]);

  // 주소에서 시/도 + 시군구만 추출 (앞 두 단어)
  const trimAddress = (addr) => {
    if (!addr || typeof addr !== 'string') return '';
    const parts = addr.trim().split(/\s+/); // 연속 공백도 처리
    return parts.slice(0, 2).join(' ');
  };

  // 날짜 포맷 함수
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch (e) {
      return dateStr;
    }
  };
  
  // 차량 정보 문자열 생성
  const getVehicleDisplay = (req) => {
    if (!req) return '45인승 대형 · 1대';

    const getVehicleLabel = (type) => {
      if (!type) return '';
      const map = {
        'STANDARD_28': '일반 고속 (28인승)',
        'STANDARD_45': '일반 고속 (45인승)',
        'PREMIUM_45': '우등 고속 (45인승)',
        'PREMIUM_28': '우등 고속 (28인승)',
        'GOLD_21': '프리미엄 골드 (21인승)',
        'VVIP_16': 'V-VIP (16인승)',
        'MINI_25': '중형/미니 (25인승)',
        'VAN_11': '대형 밴 (11인승)'
      };
      return map[type] || type;
    };
    
    // [수정] 서버 API 필드명 대응 (ALL_BUS_TYPES, TOTAL_BUS_CNT)
    if (req.ALL_BUS_TYPES) {
      // "TYPE:PRICE,TYPE:PRICE" 형식을 파싱
      const rawTypes = req.ALL_BUS_TYPES.split(',');
      const typesOnly = rawTypes.map(item => item.split(':')[0]);
      const uniqueTypes = [...new Set(typesOnly)];
      const typeLabel = uniqueTypes.map(t => getVehicleLabel(t)).join(', ');
      return `${typeLabel} ${req.TOTAL_BUS_CNT || 1}대`;
    }

    if (!req.vehicles || req.vehicles.length === 0) return '차량 정보 없음';
    
    const vehicleStr = req.vehicles
      .map(v => `${getVehicleLabel(v.BUS_TYPE_CD || v.busTypeCd)} ${v.REQ_BUS_CNT || v.qty}대`)
      .join(', ');
    
    return vehicleStr;
  };

  return (
    <div className="bg-surface min-h-screen font-body text-on-surface">
      {/* 
         주석: App.jsx의 Header가 이미 상단에 있으므로, 
         Dashboard 내의 중복된 TopNavBar는 제거하거나 서브 네비게이션으로 처리합니다.
         여기서는 디자인을 '그대로' 재현하기 위해 메인 컨텐츠 영역만 집중 구현합니다.
      */}
      
      <main className="max-w-[1440px] mx-auto px-8 py-6">
        {/* Middle Section: Service Grid — Radiant Traveler 스타일 적용 */}
        <section className="mb-10">
          <header className="mb-6">
            <span className="text-secondary font-bold tracking-[0.2em] uppercase text-[9px] mb-2 block">Elevated Travel</span>
            <h3 className="font-headline text-2xl font-extrabold text-teal-900 tracking-tight italic">주요 서비스</h3>
          </header>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { id: 'onBusRegister',       icon: 'directions_bus',   label: '여행버스 예약 등록', action: onBusRegister },
              { id: 'onViewReservationList', icon: 'event_available', label: '예약 목록 조회',     action: onViewReservationList },
              { id: 'onViewConfirmedList',   icon: 'task_alt',         label: '확정 예약 목록',     action: onViewConfirmedList },
              { id: 'onShowTripHistory',     icon: 'history',          label: '이용 내역 확인',     action: () => setShowTripHistory(true) },
              { id: 'onReviewManage',        icon: 'rate_review',      label: '리뷰 관리',          action: () => setShowReviewManage(true) },
              { id: 'onOpenLiveChat',        icon: 'forum',            label: '실시간 채팅',        action: onOpenLiveChat },
            ].map((srv) => (
              <div 
                key={srv.id}
                onClick={() => {
                  if (srv.id === 'onBusRegister') {
                    const cancelCnt = user?.cancelManage?.cancelTravelerAllCnt || 0;
                    if (cancelCnt >= 3) {
                      alert(`안내: 취소 건수가 ${cancelCnt}회 누적되어, 새로운 여행 등록을 하실 수 없습니다.`);
                      return;
                    }
                  }
                  srv.action?.();
                }}
                className="bg-surface-container-low p-5 rounded-2xl flex flex-col items-center text-center group cursor-pointer hover:bg-primary transition-all duration-500 shadow-sm hover:shadow-xl hover:-translate-y-1 no-line-rule"
              >
                <div className="w-12 h-12 bg-surface-container-lowest rounded-xl flex items-center justify-center mb-3 group-hover:bg-primary-container transition-colors duration-500 shadow-inner">
                  <span className="material-symbols-outlined text-xl text-primary group-hover:text-on-primary-container">{srv.icon}</span>
                </div>
                <span className="font-bold text-[11px] tracking-tight group-hover:text-white transition-colors duration-500">{srv.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Hero Section: Active Requests — Editorial High-End Approach */}
        <section className="mb-20 relative">
          {recentRequests.length === 0 ? (
            <div className="bg-surface-container-low rounded-[2rem] p-10 text-center flex flex-col items-center justify-center min-h-[300px] border border-outline-variant/5 shadow-inner">
              <div className="w-16 h-16 bg-surface-container-lowest rounded-full flex items-center justify-center mb-6 shadow-sm">
                <span className="material-symbols-outlined text-3xl text-primary/30">explore</span>
              </div>
              <h1 className="text-2xl font-headline font-extrabold text-teal-900 mb-2 tracking-tighter italic">새로운 여정을 시작해 보세요</h1>
              <p className="text-outline max-w-md text-base leading-relaxed">아직 등록된 견적 요청이 없습니다.<br/>지금 바로 최적의 프리미엄 버스를 예약해 보세요.</p>
              <button 
                onClick={() => {
                  const cancelCnt = user?.cancelManage?.cancelTravelerAllCnt || 0;
                  if (cancelCnt >= 3) {
                    alert(`안내: 취소 건수가 ${cancelCnt}회 누적되어, 새로운 여행 등록을 하실 수 없습니다.`);
                    return;
                  }
                  onBusRegister();
                }}
                className="mt-6 bg-primary text-white px-8 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-3"
              >
                <span className="material-symbols-outlined text-sm">add_circle</span>
                버스 예약하기
              </button>
            </div>
          ) : (
            <div className="space-y-12">
              {recentRequests.map((req, idx) => {
                const startAddrDisplay = trimAddress(req.VIA_START_ADDR || req.START_ADDR) || '출발지 미정';
                const endAddrDisplay = trimAddress(req.VIA_END_ADDR || req.END_ADDR) || '도착지 미정';
                const tripTitleDisplay = req.TRIP_TITLE || '대형 전세버스 패키지';
                const startDtDisplay = formatDate(req.START_DT);
                const isActive = selectedRequestId === req.REQ_ID;

                return (
                  <div 
                    key={req.REQ_ID || idx} 
                    className={`relative overflow-hidden rounded-[1.5rem] transition-all duration-700 ${
                      isActive 
                        ? 'bg-teal-950 text-white min-h-[250px] shadow-2xl scale-[1.01]' 
                        : 'bg-surface-container-low text-on-surface min-h-[180px] shadow-sm hover:shadow-xl'
                    }`}
                  >
                    {/* Background Decorative Element */}
                    <div className={`absolute top-[-10%] right-[-10%] w-[800px] h-[800px] rounded-full blur-[120px] transition-all duration-1000 ${
                      isActive ? 'bg-primary/20 opacity-100' : 'bg-primary/5 opacity-0'
                    }`} />

                    <div className="relative z-10 p-6 flex flex-col lg:flex-row items-center justify-between h-full gap-6">
                      <div className="flex-1 space-y-4">
                        <header className="space-y-4">
                          <div className="flex items-center gap-4">
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${
                              isActive ? 'bg-primary text-white' : 'bg-primary-container/20 text-primary'
                            }`}>
                              {req.DATA_STAT === 'AUCTION' ? '입찰중' : 
                               req.DATA_STAT === 'BIDDING' ? '견적중' : 
                               req.DATA_STAT === 'CONFIRM' ? '예약확정' : 
                               req.DATA_STAT === 'BUS_CANCEL' ? '버스취소' : 
                               req.DATA_STAT || '진행중'}
                            </span>
                          </div>
                          <h1 className="text-2xl font-headline font-black leading-[1.1] tracking-tight mb-1">
                            {req.START_ADDR_CITY || startAddrDisplay} 
                            <span className="material-symbols-outlined text-xl align-middle mx-2 text-outline/30">arrow_forward</span>
                            {req.END_ADDR_CITY || endAddrDisplay}
                          </h1>
                          <p className={`text-xs font-medium mb-4 ${isActive ? 'text-white/70' : 'text-outline/80'}`}>
                            {tripTitleDisplay}
                          </p>
                        </header>

                        <div className="grid grid-cols-2 gap-6 max-w-lg">
                          <div className="space-y-0.5">
                            <p className={`text-[8px] font-black uppercase tracking-[0.2em] ${isActive ? 'text-white/40' : 'text-outline/60'}`}>출발 일시</p>
                            <p className="text-sm font-bold font-headline">{startDtDisplay}</p>
                          </div>
                          <div className="space-y-0.5">
                             <p className={`text-[8px] font-black uppercase tracking-[0.2em] ${isActive ? 'text-white/40' : 'text-outline/60'}`}>차량 정보</p>
                            <p className="text-sm font-bold font-headline">{getVehicleDisplay(req)}</p>
                          </div>
                        </div>

                        <div className="pt-4 flex gap-4">
                          <button 
                            onClick={() => setSelectedRequestId(isActive ? null : req.REQ_ID)}
                            className={`px-5 py-2.5 rounded-full font-bold transition-all duration-300 flex items-center gap-2 text-[11px] ${
                              isActive 
                                ? 'bg-white text-teal-950 hover:bg-primary-container hover:text-white' 
                                : 'bg-primary text-white shadow-lg hover:shadow-primary/20 hover:-translate-y-1'
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm">{isActive ? 'close' : 'receipt_long'}</span>
                            {isActive ? '정보 닫기' : '견적서 보기'}
                          </button>
                        </div>
                      </div>

                      {/* Asymmetric Visual Element */}
                      <div className="relative w-full lg:w-[35%] h-[160px] group">
                        <div className={`absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-[1rem] transition-opacity duration-700 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                        <img 
                          alt="Premium Bus" 
                          className={`w-full h-full object-contain transition-all duration-1000 ${
                            isActive ? 'scale-125 rotate-[-5deg] drop-shadow-[0_35px_35px_rgba(0,0,0,0.5)]' : 'scale-100 opacity-80 group-hover:scale-110'
                          }`} 
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCnB-qy8bgCj68b05tkEWLpYiY4ZwW78YbL6_ihG9UV2iKi91YT8DInWGGQPzO8hqj_oE3V7tLKiRBDwtBsvZd0IEjssiPTCBonMM8MLCDhEVK1aQRkjr7oF3QPUpb2SQ4BGc4OCC3xmZM6w9wz-9r2AVBOidU8Zqt-f9oLAlKp17FRpveMs5Pmt7QZ6vF-vhEMPIk4SjEUJQFSe4wCMRy5_3l8fE36gm_83HigLyeQTf8DRLh2vFSnxs0i8uMGZXQpU_B3bH6Rweo" 
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </main>

      {/* Footer — Radiant Traveler Theme */}
      <footer className="bg-white border-t border-slate-100 w-full py-12 mt-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 px-12 max-w-[1440px] mx-auto">
          <div className="space-y-8">
            <div className="text-3xl font-black text-primary font-headline italic tracking-tighter">busTaams</div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs font-medium">
              국내 최대 규모의 프리미엄 버스 예약 플랫폼.<br/>격이 다른 여행의 시작, busTaams와 함께하세요.
            </p>
          </div>
          <div>
            <h5 className="text-[10px] uppercase tracking-[0.3em] font-black text-teal-900 mb-8">Navigation</h5>
            <ul className="space-y-5 text-sm font-bold text-slate-400">
              <li><a className="hover:text-primary transition-all flex items-center gap-2" href="#"><span className="w-1 h-1 rounded-full bg-primary/20"></span>이용약관</a></li>
              <li><a className="hover:text-primary transition-all flex items-center gap-2" href="#"><span className="w-1 h-1 rounded-full bg-primary/20"></span>개인정보 처리방침</a></li>
              <li><a className="hover:text-primary transition-all flex items-center gap-2" href="#"><span className="w-1 h-1 rounded-full bg-primary/20"></span>기업 제휴 문의</a></li>
            </ul>
          </div>
          <div>
            <h5 className="text-[10px] uppercase tracking-[0.3em] font-black text-teal-900 mb-8">Support</h5>
            <ul className="space-y-5 text-sm font-bold text-slate-400">
              <li><a className="hover:text-primary transition-all flex items-center gap-2" href="#"><span className="w-1 h-1 rounded-full bg-primary/20"></span>고객센터 1588-0000</a></li>
              <li><a className="hover:text-primary transition-all flex items-center gap-2" href="#"><span className="w-1 h-1 rounded-full bg-primary/20"></span>자주 묻는 질문</a></li>
            </ul>
          </div>
          <div className="flex flex-col justify-between">
            <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">© 2024 busTaams. Luxury Redefined.</p>
            <div className="flex space-x-4 mt-8">
              {[ {i: 'share', l: 'Share'}, {i: 'mail', l: 'Contact'} ].map(s => (
                <div key={s.i} className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center cursor-pointer hover:bg-primary hover:text-white transition-all duration-300 group">
                  <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">{s.i}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {selectedRequestId && (
        <DetailBusRequestModal 
          reqData={recentRequests.find(r => r.REQ_ID === selectedRequestId)} 
          onClose={() => setSelectedRequestId(null)} 
        />
      )}

      {showTripHistory && (
        <TripHistoryModal 
          user={user}
          onClose={() => setShowTripHistory(false)} 
        />
      )}

      {showReviewManage && (
        <ReviewManageModal 
          user={user}
          onClose={() => setShowReviewManage(false)} 
        />
      )}
    </div>
  );
};

export default CustomerDashboard;
