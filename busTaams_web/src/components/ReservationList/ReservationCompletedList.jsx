import React, { useState, useEffect } from 'react';
import CancelReservationModal from './CancelReservationModal';

const ReservationCompletedList = ({ user, onBack }) => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReqForCancel, setSelectedReqForCancel] = useState(null);

  const fetchConfirmedReservations = () => {
    if (user && user.custId) {
      setLoading(true);
      fetch(`http://localhost:8080/api/auction/confirmed/${user.custId}`)
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
    if (!type) return '미지정 차량';
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
    <div className="flex flex-col bg-white h-full w-full overflow-hidden font-body">
      {/* Premium Header Container */}
      <div className="bg-white border-b border-slate-100 px-12 py-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-8">
          <button 
            onClick={onBack}
            className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/5 transition-all group"
          >
            <span className="material-symbols-outlined text-2xl group-hover:-translate-x-1 transition-transform">arrow_back</span>
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">나의 예약 완료 목록</h1>
            <p className="text-sm text-slate-400 font-bold mt-1 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              성공적으로 확정된 프리미엄 여정
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="text-right mr-4">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-0.5">Account Type</p>
              <p className="text-xs font-black text-primary">PREMIUM TRAVELER</p>
           </div>
           <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">verified_user</span>
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50/50 scrollbar-hide p-12">
        <div className="max-w-[1100px] mx-auto space-y-12">
          {loading ? (
            <div className="py-40 flex flex-col items-center justify-center">
               <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-6"></div>
               <p className="text-slate-400 font-bold tracking-widest animate-pulse">데이터를 불러오는 중...</p>
            </div>
          ) : reservations.length === 0 ? (
            <div className="py-32 bg-white rounded-[3rem] border border-dashed border-slate-200 flex flex-col items-center justify-center shadow-sm">
               <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center mb-8">
                  <span className="material-symbols-outlined text-5xl text-slate-200">event_busy</span>
               </div>
               <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-3 text-center px-6">완료된 예약 내역이 없습니다.</h3>
               <p className="text-slate-400 font-medium mb-10 text-center px-6">대시보드에서 견적 진행 중인 여정을 확인해 보세요.</p>
               <button 
                  onClick={onBack}
                  className="px-10 py-4 bg-primary text-white font-black rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-all"
               >
                  대시보드로 돌아가기
               </button>
            </div>
          ) : (
            reservations.map((trip, idx) => (
              <div key={trip.REQ_ID || idx} className="bg-white rounded-[3.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden group/card transition-all hover:shadow-2xl">
                {/* Trip Header */}
                <div className="p-12 pb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-b border-slate-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-6">
                      <span className="px-4 py-1.5 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase tracking-widest">
                         확정 완료
                      </span>
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                         ID: {trip.REQ_ID?.substring(0, 8).toUpperCase()}
                      </span>
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-4 leading-tight group-hover/card:text-primary transition-colors">
                      {trip.START_ADDR} <span className="text-slate-200">→</span> {trip.END_ADDR}
                    </h2>
                    <div className="flex flex-wrap items-center gap-6 text-slate-500 font-bold">
                       <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary/40">calendar_today</span>
                          <span>{formatDate(trip.START_DT)}</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary/40">title</span>
                          <span className="text-slate-900">{trip.TRIP_TITLE || '일반 여정'}</span>
                       </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-6">
                    <div className="text-right">
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-2">Total Confirmed Amount</p>
                       <p className="text-4xl font-black text-primary tracking-tighter">
                         {trip.REQ_AMT ? Number(trip.REQ_AMT).toLocaleString() : '0'}
                         <span className="text-xl ml-1">원</span>
                       </p>
                    </div>
                    <button 
                      onClick={() => setSelectedReqForCancel(trip)}
                      className="px-10 py-4 bg-slate-900 text-white font-black text-xs rounded-full hover:bg-rose-600 transition-all shadow-lg shadow-slate-900/10"
                    >
                      여행취소
                    </button>
                  </div>
                </div>

                {/* Confirmed Buses Section */}
                <div className="p-12 bg-slate-50/30">
                  <div className="flex items-center gap-3 mb-8">
                     <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-lg">verified</span>
                     </div>
                     <h4 className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em]">배차 확정된 차량</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6">
                    {trip.vehicles && trip.vehicles.map((bus, bIdx) => (
                      <div key={bIdx} className="bg-white rounded-[2.5rem] p-8 flex flex-col md:flex-row md:items-center justify-between border border-slate-100 shadow-sm hover:shadow-md transition-all group/bus">
                        <div className="flex items-center gap-8">
                           <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover/bus:bg-primary group-hover/bus:text-white transition-all transform group-hover/bus:rotate-3 shrink-0">
                              <span className="material-symbols-outlined text-3xl">directions_bus</span>
                           </div>
                           <div>
                              <p className="text-xl font-black text-on-surface tracking-tight mb-2">{getVehicleLabel(bus.BUS_TYPE_CD)}</p>
                              <div className="flex items-center gap-4 text-xs font-bold">
                                 <span className="text-slate-400">차량번호: <span className="text-slate-900">{bus.BUS_NO || '데이터 없음'}</span></span>
                                 <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                 <span className="text-slate-400">기사님: <span className="text-primary">{bus.DRIVER_NAME || '정보 없음'}</span></span>
                              </div>
                           </div>
                        </div>
                        
                        <div className="mt-6 md:mt-0 flex items-center gap-6">
                           <div className="text-right">
                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">기사님 연락처</p>
                              <p className="text-sm font-black text-slate-800 tracking-widest">{bus.DRIVER_PHONE || '준비 중'}</p>
                           </div>
                           <button className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary/10 flex items-center justify-center transition-all group/chat">
                              <span className="material-symbols-outlined group-hover/chat:scale-110 transition-transform">forum</span>
                           </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
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
