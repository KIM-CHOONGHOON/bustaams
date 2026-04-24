import React, { useState, useEffect } from 'react';
import CancelReservationModal from './CancelReservationModal';

const ReservationCompletedList = ({ user, onBack }) => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReqForCancel, setSelectedReqForCancel] = useState(null);

  const fetchConfirmedReservations = () => {
    if (user && user.userUuid) {
      setLoading(true);
      fetch(`http://localhost:8080/api/auction/confirmed/${user.userUuid}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setReservations(data);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching confirmed reservations:', err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfirmedReservations();
  }, [user]);

  const handleCancelReservation = async (reqId) => {
    if (!window.confirm('정말로 이 예약을 취소하시겠습니까?')) return;

    try {
      const response = await fetch('http://localhost:8080/api/auction/cancel-reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reqId })
      });

      if (response.ok) {
        alert('예약이 성공적으로 취소되었습니다.');
        fetchConfirmedReservations(); // List refresh
      } else {
        const errorData = await response.json();
        alert(errorData.error || '취소 도중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('Cancel error:', err);
      alert('서버와 통신 중 오류가 발생했습니다.');
    }
  };

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

  const getVehicleLabel = (type) => {
    if (!type) return '';
    const map = {
      'STANDARD_28': '일반 고속 (45인승)',
      'STANDARD_45': '일반 고속 (45인승)',
      'PREMIUM_45': '우등 고속 (28인승)',
      'PREMIUM_28': '우등 고속 (28인승)',
      'GOLD_21': '프리미엄 골드 (21인승)',
      'VVIP_16': 'V-VIP (16인승)',
      'MINI_25': '중형/미니 (25인승)',
      'VAN_11': '대형 밴 (11인승)'
    };
    return map[type] || type;
  };

  return (
    <div className="flex bg-background font-body text-on-surface min-h-[calc(100vh-96px)]">
      {/* SideNavBar */}
      <aside className="w-72 bg-slate-50 flex flex-col py-12 gap-2 shrink-0 border-r border-slate-200/50">
        <div className="px-8 mb-8">
          <h2 className="font-headline text-xl font-extrabold text-[#004e47] tracking-tight">고객 포털</h2>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">확정 여정 전용 관리</p>
        </div>
        <nav className="flex flex-col gap-1">
          <button onClick={onBack} className="flex items-center gap-4 px-8 py-4 text-slate-500 hover:text-[#004e47] transition-all font-medium text-sm text-left">
            <span className="material-symbols-outlined">arrow_back</span> 대시보드로 돌아가기
          </button>
          <a className="flex items-center gap-4 px-8 py-4 bg-white text-[#004e47] shadow-sm rounded-r-full mr-4 transition-all font-bold text-sm" href="#">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span> 예약 완료 내역
          </a>
          <a className="flex items-center gap-4 px-8 py-4 text-slate-500 hover:text-[#004e47] transition-all font-medium text-sm" href="#">
            <span className="material-symbols-outlined">description</span> 영수증 발급
          </a>
          <a className="flex items-center gap-4 px-8 py-4 text-slate-500 hover:text-[#004e47] transition-all font-medium text-sm" href="#">
            <span className="material-symbols-outlined">rate_review</span> 후기 작성
          </a>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <main className="pt-12 pb-20 px-12 max-w-7xl">
          <section className="mb-16">
            <span className="text-[#004e47] font-bold tracking-[0.2em] uppercase text-xs mb-4 block">확정 내역</span>
            <h1 className="font-headline text-5xl font-extrabold text-on-surface tracking-tighter leading-none mb-6">
              나의 예약 완료 목록
            </h1>
            <p className="text-on-surface-variant max-w-xl text-lg leading-relaxed">
              성공적으로 확정된 프리미엄 버스 여정입니다. 기사님 연락처와 상세 티켓 정보를 확인할 수 있습니다.
            </p>
          </section>

          {loading ? (
            <div className="py-20 text-center text-slate-500">데이터를 불러오는 중입니다...</div>
          ) : reservations.length === 0 ? (
            <div className="py-20 text-center text-slate-500 bg-surface-container-lowest rounded-2xl border border-dashed border-slate-200">
              <span className="material-symbols-outlined text-5xl mb-4 text-slate-300">verified</span>
              <p className="text-lg font-bold">완료된 예약이 없습니다.</p>
              <p className="text-sm mt-2">견적 진행 중인 여정을 확정해 보세요.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-12">
              {reservations.map((item, idx) => {
                const vehicleLabel = getVehicleLabel(item.BUS_TYPE_CD);
                const vehicleStr = item.BUS_TYPE_CD ? `${vehicleLabel} ${item.REQ_BUS_CNT || 1}대` : `${item.PASSENGER_CNT}명`;
                const dateStr = formatDate(item.START_DT);
                const imageSrc = "https://lh3.googleusercontent.com/aida-public/AB6AXuBg9J8iJdgo8HEhMiaVDvFzsYgyrdwtu7TSwoAIHqz2XQ-Vq9iGUvcL_rPwFT5qW86-wIU2ySC3AuSDyuYYD_5FVRyhuMP5Ey3U5qs5CZtZ-QCHstmbXFzb-Hgw0ow2vZ5zINObREN5oYY1Bn9oDECyHaRPDHmT8oXXVnWz426pyihThXiiL8kejXMgdmQK5geAh3WA7A3pBE5Xd-0-gZ88xi9bfvTGmgARcl1HwiOWYpON4-d9QHEr5ur7Nc7sKgCECTF8DbHOfIY";

                return (
                  <div key={item.REQ_UUID_STR || idx} className="group relative flex flex-col lg:flex-row bg-white rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all border border-slate-100">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#004e47] z-10"></div>
                    
                    <div className="lg:w-1/3 h-64 lg:h-auto overflow-hidden bg-slate-100">
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
                            <span className="px-3 py-1 bg-[#004e47] text-white text-[11px] font-bold rounded-full uppercase tracking-wider">
                              예약확정
                            </span>
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[11px] font-bold rounded-full uppercase tracking-wider">
                              {vehicleStr}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-medium">참조번호: {item.REQ_UUID_STR ? item.REQ_UUID_STR.substring(0,8).toUpperCase() : 'N/A'}</p>
                        </div>
                        <h3 className="font-headline text-3xl font-extrabold text-[#004e47] mb-2 line-clamp-1">{item.START_ADDR} → {item.END_ADDR}</h3>
                        <p className="text-xl font-bold text-slate-800 mb-8">{dateStr}</p>
                        
                        <div className="grid grid-cols-3 gap-8 p-6 bg-slate-50 rounded-xl border border-slate-100">
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">여정</p>
                            <p className="font-bold text-slate-800 line-clamp-1">{item.TRIP_TITLE || '일반 여정'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">인원</p>
                            <p className="font-bold text-slate-800">{item.PASSENGER_CNT}명</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">결제 금액</p>
                            <p className="font-bold text-[#004e47]">{item.REQ_AMT ? Number(item.REQ_AMT).toLocaleString() + '원' : '금액 미정'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-10 flex gap-4">
                        <button
                          onClick={() => setSelectedReqForCancel(item)}
                          className="flex-1 bg-rose-700 text-white py-4 rounded-full font-bold text-sm shadow-lg hover:bg-rose-800 transition-all">
                          예약취소
                        </button>
                        <button className="px-8 py-4 border border-slate-200 text-slate-600 rounded-full font-bold text-sm hover:bg-slate-50 transition-all">
                          채팅 문의
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {selectedReqForCancel && (
        <CancelReservationModal
          reqData={selectedReqForCancel}
          onClose={() => setSelectedReqForCancel(null)}
          onRefresh={() => {
            fetchConfirmedReservations();
            setSelectedReqForCancel(null);
          }}
        />
      )}
    </div>
  );
};

export default ReservationCompletedList;
