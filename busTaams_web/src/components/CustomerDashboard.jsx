import React, { useState, useEffect } from 'react';
import DetailBusRequestModal from './DetailBusRequestModal';
import TripHistoryModal from './ReservationList/TripHistoryModal';

const CustomerDashboard = ({ user, setShowAccountSettings, onBusRegister, onViewReservationList, onViewConfirmedList, onOpenLiveChat }) => {
  const [recentRequests, setRecentRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [showTripHistory, setShowTripHistory] = useState(false);

  useEffect(() => {
    if (user && user.userUuid) {
      fetch(`http://localhost:8080/api/auction/user/${user.userUuid}`)
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
  }, [user]);

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
        'STANDARD_28': '일반 고속 (45인승)', // 기존 데이터 매핑 오류 대응
        'STANDARD_45': '일반 고속 (45인승)',
        'PREMIUM_45': '우등 고속 (28인승)',  // 기존 데이터 매핑 오류 대응
        'PREMIUM_28': '우등 고속 (28인승)',
        'GOLD_21': '프리미엄 골드 (21인승)',
        'VVIP_16': 'V-VIP (16인승)',
        'MINI_25': '중형/미니 (25인승)',
        'VAN_11': '대형 밴 (11인승)'
      };
      return map[type] || type;
    };
    
    // api/auction/user/ 로 받아오는 경우 BUS_TYPE_CD, REQ_BUS_CNT 가 바로 존재할 수 있습니다.
    if (req.BUS_TYPE_CD) {
       return `${req.PASSENGER_CNT}명 (${getVehicleLabel(req.BUS_TYPE_CD)} ${req.REQ_BUS_CNT || 1}대)`;
    }

    if (!req.vehicles || req.vehicles.length === 0) return `${req.PASSENGER_CNT || 0}명`;
    
    const vehicleStr = req.vehicles
      .map(v => `${getVehicleLabel(v.BUS_TYPE_CD)} ${v.REQ_BUS_CNT}대`)
      .join(', ');
    
    return `${req.PASSENGER_CNT}명 (${vehicleStr})`;
  };

  return (
    <div className="bg-surface min-h-screen font-body text-on-surface">
      {/* 
         주석: App.jsx의 Header가 이미 상단에 있으므로, 
         Dashboard 내의 중복된 TopNavBar는 제거하거나 서브 네비게이션으로 처리합니다.
         여기서는 디자인을 '그대로' 재현하기 위해 메인 컨텐츠 영역만 집중 구현합니다.
      */}
      
      <main className="max-w-[1440px] mx-auto px-8 py-12">
        {/* Hero Section: Active Requests */}
        <section className="mb-16 space-y-6">
          {recentRequests.length === 0 ? (
             <div className="hero-gradient rounded-3xl p-12 text-white flex flex-col items-center justify-center relative overflow-hidden tonal-stacking text-center">
               <h1 className="text-3xl font-headline font-extrabold mb-4 mt-8">현재 진행 중인 요청이 없습니다.</h1>
               <p className="text-primary-fixed mb-8">새로운 여정을 등록하고 최적의 견적을 받아보세요.</p>
             </div>
          ) : (
            recentRequests.map((req, idx) => {
              const startAddrDisplay = trimAddress(req.VIA_START_ADDR || req.START_ADDR) || '출발지 미정';
              const endAddrDisplay = trimAddress(req.VIA_END_ADDR || req.END_ADDR) || '도착지 미정';
              const tripTitleDisplay = req.TRIP_TITLE || '대형 전세버스 패키지';
              const startDtDisplay = formatDate(req.START_DT) || '2024년 10월 24일 09:00';
              const passengerCntDisplay = getVehicleDisplay(req);

              return (
                <div key={req.REQ_UUID_STR || idx} className="hero-gradient rounded-3xl p-12 text-white flex flex-col md:flex-row items-center justify-between relative overflow-hidden tonal-stacking">
                  <div className="relative z-10 max-w-2xl pt-4">
                    <h1 className="text-5xl font-headline font-extrabold mb-8 leading-tight tracking-tighter">
                      {startAddrDisplay} → {endAddrDisplay}<br/>
                      <span className="text-primary-fixed">{tripTitleDisplay}</span>
                    </h1>
                    <div className="grid grid-cols-2 gap-8 mb-10">
                      <div>
                        <p className="text-primary-fixed/60 text-xs uppercase font-bold tracking-widest mb-1">출발 일시</p>
                        <p className="text-xl font-semibold">{startDtDisplay}</p>
                      </div>
                    </div>
                  </div>
                  <button 
                    className={`hidden lg:block absolute right-[-10%] bottom-[-20%] w-[600px] h-[600px] transition-all duration-300 group/btn cursor-pointer ${selectedRequestId === req.REQ_UUID_STR ? 'opacity-100 z-20' : 'opacity-40 hover:opacity-80 z-10'}`}
                    onClick={() => setSelectedRequestId(req.REQ_UUID_STR === selectedRequestId ? null : req.REQ_UUID_STR)}
                  >
                    <img 
                      alt="Premium Bus" 
                      className={`w-full h-full object-contain transition-transform duration-700 ${selectedRequestId === req.REQ_UUID_STR ? 'scale-110 drop-shadow-2xl' : 'group-hover/btn:scale-105 drop-shadow-lg'}`} 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCnB-qy8bgCj68b05tkEWLpYiY4ZwW78YbL6_ihG9UV2iKi91YT8DInWGGQPzO8hqj_oE3V7tLKiRBDwtBsvZd0IEjssiPTCBonMM8MLCDhEVK1aQRkjr7oF3QPUpb2SQ4BGc4OCC3xmZM6w9wz-9r2AVBOidU8Zqt-f9oLAlKp17FRpveMs5Pmt7QZ6vF-vhEMPIk4SjEUJQFSe4wCMRy5_3l8fE36gm_83HigLyeQTf8DRLh2vFSnxs0i8uMGZXQpU_B3bH6Rweo" 
                    />
                    <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${selectedRequestId === req.REQ_UUID_STR ? 'opacity-100' : 'opacity-0 group-hover/btn:opacity-100'}`}>
                      <span className={`font-bold px-6 py-3 rounded-full shadow-lg transition-all duration-300 flex items-center gap-2 ${selectedRequestId === req.REQ_UUID_STR ? 'bg-primary text-white scale-110' : 'bg-white text-primary transform translate-y-4 group-hover/btn:translate-y-0'}`}>
                        <span className="material-symbols-outlined">
                          {selectedRequestId === req.REQ_UUID_STR ? 'check_circle' : 'receipt_long'}
                        </span>
                        {selectedRequestId === req.REQ_UUID_STR ? '열기' : '견적서 상세'}
                      </span>
                    </div>
                  </button>
                </div>
              );
            })
          )}
        </section>

        {/* Middle Section: Service Grid */}
        <section className="mb-24">
          <h3 className="font-headline text-3xl font-extrabold text-teal-900 mb-10 tracking-tight">주요 서비스</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {/* Register Bus */}
            <div 
              onClick={onBusRegister}
              className="bg-surface-container-lowest p-8 rounded-2xl tonal-stacking flex flex-col items-center text-center group cursor-pointer hover:bg-primary hover:text-on-primary transition-all duration-300 no-line-rule"
            >
              <div className="w-14 h-14 bg-surface-container-high rounded-full flex items-center justify-center mb-6 group-hover:bg-primary-container">
                <span className="material-symbols-outlined text-primary group-hover:text-on-primary-container">directions_bus</span>
              </div>
              <span className="font-bold text-sm">여행버스 예약 등록</span>
            </div>
            {/* Reservation List (Moved to 2nd position) */}
            <div 
              onClick={onViewReservationList}
              className="bg-surface-container-lowest p-8 rounded-2xl tonal-stacking flex flex-col items-center text-center group cursor-pointer hover:bg-primary hover:text-on-primary transition-all duration-300 no-line-rule"
            >
              <div className="w-14 h-14 bg-surface-container-high rounded-full flex items-center justify-center mb-6 group-hover:bg-primary-container">
                <span className="material-symbols-outlined text-primary group-hover:text-on-primary-container">event_available</span>
              </div>
              <span className="font-bold text-sm">예약 목록</span>
            </div>
            {/* Trip History (Moved to 4th position or similar) */}
            <div 
              onClick={onViewConfirmedList}
              className="bg-surface-container-lowest p-8 rounded-2xl tonal-stacking flex flex-col items-center text-center group cursor-pointer hover:bg-primary hover:text-on-primary transition-all duration-300 no-line-rule"
            >
              <div className="w-14 h-14 bg-surface-container-high rounded-full flex items-center justify-center mb-6 group-hover:bg-primary-container">
                <span className="material-symbols-outlined text-primary group-hover:text-on-primary-container">task_alt</span>
              </div>
              <span className="font-bold text-sm">확정 예약 목록</span>
            </div>
            {/* Trip History */}
            <div 
              onClick={() => setShowTripHistory(true)}
              className="bg-surface-container-lowest p-8 rounded-2xl tonal-stacking flex flex-col items-center text-center group cursor-pointer hover:bg-primary hover:text-on-primary transition-all duration-300 no-line-rule"
            >
              <div className="w-14 h-14 bg-surface-container-high rounded-full flex items-center justify-center mb-6 group-hover:bg-primary-container">
                <span className="material-symbols-outlined text-primary group-hover:text-on-primary-container">history</span>
              </div>
              <span className="font-bold text-sm">이용 내역</span>
            </div>
            {/* Reviews */}
            <div className="bg-surface-container-lowest p-8 rounded-2xl tonal-stacking flex flex-col items-center text-center group cursor-pointer hover:bg-primary hover:text-on-primary transition-all duration-300 no-line-rule">
              <div className="w-14 h-14 bg-surface-container-high rounded-full flex items-center justify-center mb-6 group-hover:bg-primary-container">
                <span className="material-symbols-outlined text-primary group-hover:text-on-primary-container">rate_review</span>
              </div>
              <span className="font-bold text-sm">리뷰 관리</span>
            </div>
            {/* 실시간 채팅 (기사와 동일 견적 스레드) */}
            <div
              onClick={() => onOpenLiveChat?.()}
              className="bg-surface-container-lowest p-8 rounded-2xl tonal-stacking flex flex-col items-center text-center group cursor-pointer hover:bg-primary hover:text-on-primary transition-all duration-300 no-line-rule"
            >
              <div className="w-14 h-14 bg-surface-container-high rounded-full flex items-center justify-center mb-6 group-hover:bg-primary-container">
                <span className="material-symbols-outlined text-primary group-hover:text-on-primary-container">chat</span>
              </div>
              <span className="font-bold text-sm">실시간 채팅</span>
            </div>
            {/* Member Info */}
            <div 
              onClick={() => setShowAccountSettings(true)}
              className="bg-surface-container-lowest p-8 rounded-2xl tonal-stacking flex flex-col items-center text-center group cursor-pointer hover:bg-primary hover:text-on-primary transition-all duration-300 no-line-rule"
            >
              <div className="w-14 h-14 bg-surface-container-high rounded-full flex items-center justify-center mb-6 group-hover:bg-primary-container">
                <span className="material-symbols-outlined text-primary group-hover:text-on-primary-container">person</span>
              </div>
              <span className="font-bold text-sm">회원 정보</span>
            </div>
          </div>
        </section>

        {/* Bottom Section: Recommended Banners */}
        <section>
          <h3 className="font-headline text-3xl font-extrabold text-teal-900 mb-10 tracking-tight">추천 서비스</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Banner 1 */}
            <div className="group relative h-[450px] rounded-3xl overflow-hidden tonal-stacking cursor-pointer">
              <img 
                alt="VIP Service" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAZ8ns1S5rBu3lNocUMReeJvuLjuv8XE2XFY_2gQGdDmos2bcCnUZ1vn7GWHkvlxG0IR08q-9KMxVNQ8eBmst0OU1F2kcXcJ9hF59lNu3qQMTIs0Ums7QAgnI8MaYcny1xxg8Vy3qvz12i09bLRdqm-iT8bV7fr7s2Vs1xOjvPKhdgRoWwmJuyEK8H_taMIVSobYKbJpsXCRFr6mzxh_e6LxhDfSu4lByBfYRJ3Ju5Bb0g1-Z3UEKWTxUvuhO1IIfKW7brDB5YyBKA" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-teal-950/90 via-teal-900/20 to-transparent p-12 flex flex-col justify-end">
                <p className="text-primary-fixed font-bold tracking-widest text-xs uppercase mb-4">VIP 컨시어지</p>
                <h4 className="text-white text-4xl font-headline font-bold mb-6 leading-tight">의전 및 기업 행사 전용<br/>프리미엄 라운지 서비스</h4>
                <div className="w-12 h-1 bg-secondary transition-all duration-300 group-hover:w-24"></div>
              </div>
            </div>
            {/* Banner 2 */}
            <div className="group relative h-[450px] rounded-3xl overflow-hidden tonal-stacking cursor-pointer">
              <img 
                alt="Group Travel" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCegHMQz24j1T0iMs83q3v5FRDlxeQcpigVdcybtaYznVi4igtArIBtwG-ecXg8_FK3rfLdthmpK4iCXjWYz0kH-KFKZfR2-a1xcqIB_Zq0R1C6dFjhcK6BuDIqOlw0zwAlnbGKiptNWnH7F5ZTgf4wb4aAS1lTyzWRNRJ79EfqcKzfYXOw_S5urwh7Rhcq22bijvlBfF1Oi3HG2DYE30vnOBqbE0aUP644NnlEcIYXT0raVl96CVKPKz9vQNJrsBn1AAdMlj5alpU" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-teal-950/90 via-teal-900/20 to-transparent p-12 flex flex-col justify-end">
                <p className="text-primary-fixed font-bold tracking-widest text-xs uppercase mb-4">단체 패키지</p>
                <h4 className="text-white text-4xl font-headline font-bold mb-6 leading-tight">단체 관광 및 워크숍<br/>맞춤형 올인원 패키지</h4>
                <div className="w-12 h-1 bg-secondary transition-all duration-300 group-hover:w-24"></div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/50 w-full py-16 mt-32">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 px-12 max-w-[1440px] mx-auto">
          <div className="space-y-6">
            <div className="text-xl font-bold text-teal-800 font-headline italic">busTaams</div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-xs">국내 최대 규모의 버스 입찰 플랫폼으로, 투명하고 효율적인 예약 경험을 제공합니다.</p>
          </div>
          <div>
            <h5 className="text-xs uppercase tracking-widest font-bold text-teal-700 mb-6">서비스</h5>
            <ul className="space-y-4 text-xs uppercase tracking-widest text-slate-400">
              <li><a className="hover:text-secondary transition-all" href="#">이용약관</a></li>
              <li><a className="hover:text-secondary transition-all" href="#">개인정보 처리방침</a></li>
              <li><a className="hover:text-secondary transition-all" href="#">탁송 서비스</a></li>
            </ul>
          </div>
          <div>
            <h5 className="text-xs uppercase tracking-widest font-bold text-teal-700 mb-6">고객 지원</h5>
            <ul className="space-y-4 text-xs uppercase tracking-widest text-slate-400">
              <li><a className="hover:text-secondary transition-all" href="#">고객센터 문의</a></li>
              <li><a className="hover:text-secondary transition-all" href="#">프레스 킷</a></li>
            </ul>
          </div>
          <div className="flex flex-col justify-between">
            <p className="text-slate-400 text-[10px] leading-relaxed">© 2024 busTaams. All rights reserved.</p>
            <div className="flex space-x-4 mt-6">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer hover:bg-primary hover:text-white transition-colors">
                <span className="material-symbols-outlined text-lg">share</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer hover:bg-primary hover:text-white transition-colors">
                <span className="material-symbols-outlined text-lg">mail</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {selectedRequestId && (
        <DetailBusRequestModal 
          reqData={recentRequests.find(r => r.REQ_UUID_STR === selectedRequestId)} 
          onClose={() => setSelectedRequestId(null)} 
        />
      )}

      {showTripHistory && (
        <TripHistoryModal 
          user={user}
          onClose={() => setShowTripHistory(false)} 
        />
      )}
    </div>
  );
};

export default CustomerDashboard;
