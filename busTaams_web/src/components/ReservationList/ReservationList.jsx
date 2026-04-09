import React, { useState, useEffect } from 'react';

const ReservationList = ({ user, onBack }) => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.userUuid) {
      fetch(`http://localhost:8080/api/auction/user/${user.userUuid}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setReservations(data);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching reservations:', err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [user]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]}) · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} 출발`;
    } catch (e) {
      return dateStr;
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case 'BIDDING': return { label: '견적중', bg: 'bg-primary-container', text: 'text-on-primary-container' };
      case 'CONFIRMED': return { label: '예약확정', bg: 'bg-surface-container-highest', text: 'text-on-surface-variant' };
      default: return { label: '견적중', bg: 'bg-secondary-container', text: 'text-on-secondary-container' };
    }
  };

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

  console.log('ReservationList rendered, reservations:', reservations);
  return (
    <div className="flex bg-background font-body text-on-surface min-h-[calc(100vh-96px)]">
      {/* SideNavBar */}
      <aside className="w-72 bg-slate-50 flex flex-col py-12 gap-2 shrink-0 border-r border-slate-200/50">
        <div className="px-8 mb-8">
          <h2 className="font-headline text-xl font-extrabold text-primary tracking-tight">고객 포털</h2>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">스마트한 버스 여정 관리</p>
        </div>
        <nav className="flex flex-col gap-1">
          <button onClick={onBack} className="flex items-center gap-4 px-8 py-4 text-slate-500 hover:text-orange-600 transition-all font-medium text-sm text-left">
            <span className="material-symbols-outlined">arrow_back</span> 대시보드로 돌아가기
          </button>
          <a className="flex items-center gap-4 px-8 py-4 text-slate-500 hover:text-orange-600 transition-all font-medium text-sm" href="#">
            <span className="material-symbols-outlined">chat_bubble</span> 1:1 문의하기
          </a>
          <a className="flex items-center gap-4 px-8 py-4 text-slate-500 hover:text-orange-600 transition-all font-medium text-sm" href="#">
            <span className="material-symbols-outlined">history</span> 문의 내역
          </a>
          <a className="flex items-center gap-4 px-8 py-4 text-slate-500 hover:text-orange-600 transition-all font-medium text-sm" href="#">
            <span className="material-symbols-outlined">person_check</span> 프로필 설정
          </a>
          {/* Active Tab: Reservations */}
          <a className="flex items-center gap-4 px-8 py-4 bg-white text-teal-700 shadow-sm rounded-r-full mr-4 transition-all font-bold text-sm" href="#">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>event_available</span> 예약 내역
          </a>
          <a className="flex items-center gap-4 px-8 py-4 text-slate-500 hover:text-orange-600 transition-all font-medium text-sm" href="#">
            <span className="material-symbols-outlined">event_busy</span> 취소 내역
          </a>
          <a className="flex items-center gap-4 px-8 py-4 text-slate-500 hover:text-orange-600 transition-all font-medium text-sm" href="#">
            <span className="material-symbols-outlined">request_quote</span> 견적 확인
          </a>
          <a className="flex items-center gap-4 px-8 py-4 text-slate-500 hover:text-orange-600 transition-all font-medium text-sm" href="#">
            <span className="material-symbols-outlined">rate_review</span> 이용 후기
          </a>
          <a className="flex items-center gap-4 px-8 py-4 text-slate-500 hover:text-orange-600 transition-all font-medium text-sm" href="#">
            <span className="material-symbols-outlined">settings</span> 환경 설정
          </a>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Main Content */}
        <main className="pt-12 pb-20 px-12 max-w-7xl">
          {/* Header Section */}
          <section className="mb-16">
            <span className="text-secondary font-bold tracking-[0.2em] uppercase text-xs mb-4 block">예약 관리</span>
            <h1 className="font-headline text-5xl font-extrabold text-on-surface tracking-tighter leading-none mb-6">
              나의 예약 내역
            </h1>
            <p className="text-on-surface-variant max-w-xl text-lg leading-relaxed">
              프리미엄 버스 서비스 예약 현황을 확인하고 여정을 관리하세요. 각 카드를 통해 티켓 상세 확인 및 일정 변경이 가능합니다.
            </p>
          </section>

          {/* Reservation List */}
          {/* Reservation List Loading / Empty State */}
          {loading ? (
            <div className="py-20 text-center text-slate-500">데이터를 불러오는 중입니다...</div>
          ) : reservations.length === 0 ? (
            <div className="py-20 text-center text-slate-500 bg-surface-container-lowest rounded-2xl">
              <span className="material-symbols-outlined text-5xl mb-4 text-slate-300">inbox</span>
              <p className="text-lg font-bold">예약 내역이 없습니다.</p>
              <p className="text-sm mt-2">새로운 프리미엄 버스 여정을 등록해보세요.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-12">
              {reservations.map((item, idx) => {
                const statusInfo = getStatusLabel(item.REQ_STAT);
                const vehicleLabel = getVehicleLabel(item.BUS_TYPE_CD);
                const vehicleStr = item.BUS_TYPE_CD ? `${vehicleLabel} ${item.REQ_BUS_CNT || 1}대` : `${item.PASSENGER_CNT}명`;
                const dateStr = formatDate(item.START_DT);
                const imageSrc = idx % 2 === 0 
                  ? "https://lh3.googleusercontent.com/aida-public/AB6AXuBg9J8iJdgo8HEhMiaVDvFzsYgyrdwtu7TSwoAIHqz2XQ-Vq9iGUvcL_rPwFT5qW86-wIU2ySC3AuSDyuYYD_5FVRyhuMP5Ey3U5qs5CZtZ-QCHstmbXFzb-Hgw0ow2vZ5zINObREN5oYY1Bn9oDECyHaRPDHmT8oXXVnWz426pyihThXiiL8kejXMgdmQK5geAh3WA7A3pBE5Xd-0-gZ88xi9bfvTGmgARcl1HwiOWYpON4-d9QHEr5ur7Nc7sKgCECTF8DbHOfIY"
                  : "https://lh3.googleusercontent.com/aida-public/AB6AXuD1A-gP1H5XqL3rv3CYdw9jJtEPpIeRuQkZpT9r-9MxBPZPTcHZXH5iddUvv_4M-j9nQr5dthrcTl50VB7qbfT_U03lWPpqVW4CcBqJqLXA97Gdq5t7lg82hAKFEL1vjvDt5iTOuw24PCYX-O32c2InmJvzXBAItblQriopcPN4zPMAqk6ra6n_FzjBXbb3YTyCLTPh-E_e8gs1pBu-QNIxL85sQQDsSnBLUnFG-V1sq7IGkbIbAt3GXXfPuNATRFpEY9kabf7fzDQ";

                return (
                  <div key={item.REQ_UUID_STR || idx} className="group relative flex flex-col lg:flex-row bg-surface-container-lowest rounded-2xl overflow-hidden shadow-[0_40px_60px_-15px_rgba(0,104,95,0.06)] transition-all hover:-translate-y-1 border border-surface-variant/20">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary z-10"></div>
                    
                    <div className="lg:w-1/3 h-64 lg:h-auto overflow-hidden">
                      <img 
                        alt="bus image" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                        src={imageSrc}
                      />
                    </div>

                    <div className="flex-1 p-10 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex gap-2">
                            <span className={`px-3 py-1 ${statusInfo.bg} ${statusInfo.text} text-[11px] font-bold rounded-full uppercase tracking-wider`}>
                              {statusInfo.label}
                            </span>
                            <span className="px-3 py-1 bg-surface-container-highest text-on-surface-variant text-[11px] font-bold rounded-full uppercase tracking-wider">
                              {vehicleStr}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-medium">참조번호: {item.REQ_UUID_STR ? item.REQ_UUID_STR.substring(0,8).toUpperCase() : 'N/A'}</p>
                        </div>
                        <h3 className="font-headline text-3xl font-extrabold text-primary mb-2 line-clamp-1">{item.START_ADDR} → {item.END_ADDR}</h3>
                        <p className="text-xl font-bold text-on-surface mb-8">{dateStr}</p>
                        
                        <div className="grid grid-cols-3 gap-8 p-6 bg-surface-container-low rounded-xl">
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">여행 테마</p>
                            <p className="font-bold text-on-surface line-clamp-1">{item.TRIP_TITLE || '일반 투어'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">인원</p>
                            <p className="font-bold text-on-surface">{item.PASSENGER_CNT}명</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">희망/최대 금액</p>
                            <p className="font-bold text-on-surface text-primary">{item.REQ_AMT ? Number(item.REQ_AMT).toLocaleString() + '원' : '입찰 진행중'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-10 flex gap-4">
                        <button className="flex-1 bg-gradient-to-r from-primary to-primary-container text-white py-4 rounded-full font-bold text-sm tracking-tight shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all">
                          {item.REQ_STAT === 'BIDDING' ? '견적리스트 확인' : '티켓 확인'}
                        </button>
                        <button className="px-8 py-4 border border-outline-variant text-on-surface-variant rounded-full font-bold text-sm hover:bg-surface-container-high transition-all">
                          상세 변경
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-24 text-center">
            <button className="inline-flex items-center gap-4 text-primary font-bold tracking-tight hover:gap-6 transition-all group">
              <span className="text-lg">과거 예약 내역 더보기</span>
              <span className="material-symbols-outlined text-2xl group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ReservationList;

