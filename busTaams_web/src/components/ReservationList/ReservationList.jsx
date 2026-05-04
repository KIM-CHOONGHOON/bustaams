import React, { useState, useEffect } from 'react';
import QuotationList from '../QuotationList/QuotationList';
import QuotationDetail from '../QuotationDetail/QuotationDetail';
import CancelTripReasonModal from './CancelTripReasonModal';
import BusReRegistrationModal from './BusReRegistrationModal';

const ReservationList = ({ user, onBack }) => {
  console.log('[DEBUG] ReservationList Rendered, user:', user);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReqId, setSelectedReqId] = useState(null);
  const [selectedBidId, setSelectedBidId] = useState(null);
  const [showQuotationList, setShowQuotationList] = useState(false);
  const [showCancelReasonModal, setShowCancelReasonModal] = useState(false);
  const [cancelTripData, setCancelTripData] = useState(null);
  const [showBusReRegModal, setShowBusReRegModal] = useState(false);
  const [reRegReqId, setReRegReqId] = useState(null);


  const fetchReservations = () => {
    // [수정] prop으로 넘어온 user가 없으면 localStorage에서 시도
    let currentUser = user;
    if (!currentUser || !currentUser.custId) {
      const stored = localStorage.getItem('user');
      if (stored) currentUser = JSON.parse(stored);
    }

    console.log('[DEBUG] fetchReservations triggered, currentUser.custId:', currentUser?.custId);

    if (currentUser && currentUser.custId) {
      setLoading(true);
      fetch(`http://localhost:8080/api/auction/history/${currentUser.custId}`)
        .then(res => res.json())
        .then(data => {
          console.log('[DEBUG] History API result:', data);
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
      console.warn('[DEBUG] No valid currentUser or custId found.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [user]);

  const handleCancelTrip = (trip) => {
    setCancelTripData(trip);
    setShowCancelReasonModal(true);
  };

  const handleBusChange = async (bus) => {
    if (!window.confirm(`선택하신 ${getVehicleLabel(bus.BUS_TYPE_CD)} 차량을 예약 목록에서 취소(삭제)하시겠습니까?`)) return;

    try {
      const response = await fetch('http://localhost:8080/api/auction/bus-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reqId: bus.REQ_ID,
          reqBusSeq: bus.REQ_BUS_SEQ,
          custId: user?.custId 
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert('이전 버스가 취소되었습니다. 새로운 버스를 선택해주세요.');
        fetchReservations(); // 목록 갱신
        
        setReRegReqId(bus.REQ_ID);
        setShowBusReRegModal(true);
      } else {
        alert(result.error || '버스 변경 처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Bus Change Error:', error);
      alert('서버와 통신 중 오류가 발생했습니다.');
    }
  };

  const handleBusCancel = async (bus) => {
    if (window.confirm(`선택하신 ${getVehicleLabel(bus.BUS_TYPE_CD)}의 기사를 변경하시겠습니까?\n(기사 변경은 여정당 최대 1회만 가능합니다.)`)) {
      try {
        const response = await fetch('http://localhost:8080/api/auction/bus-cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            reqId: bus.REQ_ID, 
            reqBusSeq: bus.REQ_BUS_SEQ,
            custId: user?.custId
          })
        });

        if (response.ok) {
          alert('버스가 성공적으로 취소되었습니다.');
          fetchReservations(); // 목록 새로고침
        } else {
          const err = await response.json();
          alert(err.error || '취소 실패');
        }
      } catch (error) {
        console.error('Bus Cancel Error:', error);
        alert('서버와 통신 중 오류가 발생했습니다.');
      }
    }
  };

  const handleOpenQuotations = (reqId) => {
    setSelectedReqId(reqId);
    setShowQuotationList(true);
  };

  const handleCloseQuotations = () => {
    setShowQuotationList(false);
    setSelectedReqId(null);
  };

  const handleViewDetail = (bidId) => {
    setSelectedBidId(bidId);
  };

  const trimAddress = (addr) => {
    if (!addr || typeof addr !== 'string') return '';
    const parts = addr.trim().split(/\s+/);
    return parts.slice(0, 2).join(' ');
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
    if (!type) return '일반 버스 (45석)';
    const map = {
      'NORMAL_45': '일반 버스 (45석)',
      'PRESTIGE_28': '우등 버스 (28석)',
      'PREMIUM_21': '프리미엄 골드 (21석)',
      'VVIP_16': 'V-VIP (16석)',
      'MINI_25': '중형/미니 버스 (25석)',
      'VAN_11': '대형 밴 (11석)',
      'STANDARD_45': '일반 버스 (45석)',
      'STANDARD_28': '우등 버스 (28석)',
      'GOLD_21': '프리미엄 골드 (21석)'
    };
    return map[type] || type;
  };

  return (
    <div className="flex bg-background font-body text-on-surface h-full overflow-hidden flex-col">
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="pt-16 pb-24 px-6 md:px-16 lg:px-24 max-w-6xl mx-auto w-full">
          <nav className="flex justify-between items-center mb-16">
            <button 
              onClick={onBack} 
              className="flex items-center gap-3 text-slate-400 hover:text-primary transition-all font-bold text-sm group"
            >
              <span className="material-symbols-outlined text-xl group-hover:-translate-x-1 transition-transform">arrow_back</span> 
              대시보드로 돌아가기
            </button>
            <div className="flex items-center gap-3">
               <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
               <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">실시간 예약 현황</p>
            </div>
          </nav>

          <section className="mb-12 text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
               <div className="w-8 h-[1px] bg-primary/20"></div>
               <span className="text-primary font-black tracking-[0.4em] uppercase text-[8px]">나의 예약 포트폴리오</span>
               <div className="w-8 h-[1px] bg-primary/20"></div>
            </div>
            <h1 className="font-headline text-4xl font-black text-on-surface tracking-tightest leading-none mb-6">
              나의 <span className="text-primary/10 italic">예약</span> 내역
            </h1>
            <p className="text-on-surface-variant max-w-2xl mx-auto text-base leading-relaxed font-medium">
              프리미엄 버스 서비스 예약 현황을 한눈에 확인하고 여정을 관리하세요.<br/> 
              각 여정 카드를 통해 실시간 견적 확인 및 차량별 제어가 가능합니다.
            </p>
          </section>

          {loading ? (
            <div className="py-20 text-center text-slate-500">데이터를 불러오는 중입니다...</div>
          ) : reservations.length === 0 ? (
            <div className="py-20 text-center text-slate-500 bg-surface-container-lowest rounded-3xl border border-dashed border-slate-200">
              <span className="material-symbols-outlined text-6xl mb-6 text-slate-200">inventory_2</span>
              <p className="text-xl font-bold text-slate-400">예약 내역이 없습니다.</p>
              <p className="text-sm mt-2 text-slate-300">새로운 프리미엄 버스 여정을 등록해보세요.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8">
              {Object.values(reservations.reduce((acc, curr) => {
                // 취소된 버스는 목록에서 제외 (BUS_STAT 기준)
                if (curr.BUS_STAT === 'TRAVELER_CANCEL' || curr.BUS_STAT === 'BUS_CANCEL') {
                  return acc;
                }
                
                if (!acc[curr.REQ_ID]) {
                  acc[curr.REQ_ID] = { ...curr, buses: [] };
                }
                acc[curr.REQ_ID].buses.push(curr);
                return acc;
              }, {})).map((trip, idx) => {
                const dateStr = formatDate(trip.START_DT);
                const imageSrc = idx % 2 === 0 
                  ? "https://lh3.googleusercontent.com/aida-public/AB6AXuBg9J8iJdgo8HEhMiaVDvFzsYgyrdwtu7TSwoAIHqz2XQ-Vq9iGUvcL_rPwFT5qW86-wIU2ySC3AuSDyuYYD_5FVRyhuMP5Ey3U5qs5CZtZ-QCHstmbXFzb-Hgw0ow2vZ5zINObREN5oYY1Bn9oDECyHaRPDHmT8oXXVnWz426pyihThXiiL8kejXMgdmQK5geAh3WA7A3pBE5Xd-0-gZ88xi9bfvTGmgARcl1HwiOWYpON4-d9QHEr5ur7Nc7sKgCECTF8DbHOfIY"
                  : "https://lh3.googleusercontent.com/aida-public/AB6AXuD1A-gP1H5XqL3rv3CYdw9jJtEPpIeRuQkZpT9r-9MxBPZPTcHZXH5iddUvv_4M-j9nQr5dthrcTl50VB7qbfT_U03lWPpqVW4CcBqJqLXA97Gdq5t7lg82hAKFEL1vjvDt5iTOuw24PCYX-O32c2InmJvzXBAItblQriopcPN4zPMAqk6ra6n_FzjBXbb3YTyCLTPh-E_e8gs1pBu-QNIxL85sQQDsSnBLUnFG-V1sq7IGkbIbAt3GXXfPuNATRFpEY9kabf7fzDQ";

                return (
                  <div key={trip.REQ_ID} className="group relative flex flex-col bg-surface-container-lowest rounded-2xl overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,40,35,0.06)] border border-surface-variant/10 text-left transition-all hover:shadow-[0_50px_80px_-20px_rgba(0,40,35,0.08)]">
                    <div className="flex flex-col md:flex-row border-b border-surface-variant/5">
                      <div className="md:w-64 h-48 md:h-auto overflow-hidden">
                        <img 
                          alt="trip thumb" 
                          className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-105" 
                          src={imageSrc}
                        />
                      </div>
                      <div className="flex-1 p-6 flex flex-col justify-center relative bg-white">
                         <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                               <span className={`w-1.5 h-1.5 rounded-full ${trip.DATA_STAT === 'CONFIRM' ? 'bg-primary' : 'bg-amber-400 animate-pulse'}`}></span>
                               <span className={`${trip.DATA_STAT === 'CONFIRM' ? 'text-primary' : 'text-amber-500'} text-[9px] font-black uppercase tracking-[0.3em]`}>
                                  {trip.DATA_STAT === 'CONFIRM' ? '확정된 여정' : '견적 입찰 진행 중'}
                               </span>
                            </div>
                         </div>
                         <h3 className="text-2xl font-black font-headline text-on-surface tracking-tightest mb-1.5 leading-tight">
                           {trimAddress(trip.START_ADDR)} → {trimAddress(trip.END_ADDR)}
                         </h3>
                         <p className="text-base font-bold text-slate-400 mb-4">{dateStr}</p>
                         <div className="flex items-center gap-4">
                            <p className="text-[10px] text-outline font-bold uppercase tracking-widest">테마: <span className="text-on-surface ml-1">{trip.TRIP_TITLE || '프리미엄 투어'}</span></p>
                         </div>
                      </div>
                    </div>

                    <div className="p-6 bg-slate-50/30">
                      <div className="flex items-center justify-between mb-4">
                         <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                               <span className="material-symbols-outlined text-base">directions_bus</span>
                            </div>
                            <h4 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">요청 차량 ({trip.buses.length}대)</h4>
                         </div>
                         <div className="flex items-center gap-3">
                            <button 
                              onClick={() => handleOpenQuotations(trip.REQ_ID)}
                              className="px-5 py-2.5 bg-primary text-white text-[10px] font-black rounded-full hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-95 flex items-center gap-2 uppercase tracking-widest"
                            >
                               <span className="material-symbols-outlined text-sm">verified</span>
                               예약확정
                            </button>
                            <button 
                              onClick={() => handleCancelTrip(trip)}
                              className="px-5 py-2.5 text-[10px] font-black text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all flex items-center gap-2 uppercase tracking-widest border border-slate-100 hover:border-red-100"
                            >
                               <span className="material-symbols-outlined text-sm">cancel</span>
                               전체 예약취소
                            </button>
                         </div>
                      </div>
                      <div className="grid grid-cols-1 gap-6">
                        {trip.buses.map((bus, bIdx) => {
                          const vehicleLabel = getVehicleLabel(bus.BUS_TYPE_CD);
                          return (
                            <div key={bus.REQ_BUS_SEQ || bIdx} className="bg-white rounded-xl p-4 flex items-center justify-between border border-slate-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all group/bus">
                               <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover/bus:bg-primary group-hover/bus:text-white transition-all transform group-hover/bus:rotate-3">
                                     <span className="material-symbols-outlined text-xl">commute</span>
                                  </div>
                                  <div>
                                     <p className="text-sm font-black text-on-surface tracking-tight mb-0.5">{vehicleLabel}</p>
                                     <p className="text-[10px] text-outline font-bold">금액: <span className="text-primary">{Number(bus.FINAL_CONFIRM_AMT || bus.UNIT_REQ_AMT || 0).toLocaleString()}원</span></p>
                                  </div>
                               </div>
                               <div className="flex items-center gap-2 shrink-0 ml-4">
                                  <button 
                                    onClick={() => handleBusChange(bus)}
                                    className="px-5 py-2.5 bg-slate-100 text-slate-600 text-[11px] font-black rounded-full hover:bg-slate-200 transition-all shadow-sm border border-slate-200 whitespace-nowrap" 
                                  >
                                     버스취소
                                  </button>
                                  {bus.RES_STAT && (
                                    <button 
                                      onClick={() => handleBusCancel(bus)}
                                      className="px-5 py-2.5 bg-red-50 text-red-400 text-[11px] font-black rounded-full hover:bg-red-500 hover:text-white transition-all shadow-sm border border-red-100 whitespace-nowrap" 
                                    >
                                       기사변경
                                    </button>
                                  )}
                               </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {showQuotationList && selectedReqId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-4 flex flex-col">
          <div className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-10 py-6 border-b border-slate-100 bg-white/80 sticky top-0 z-10 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined font-bold">request_quote</span>
                </div>
                <h2 className="text-2xl font-black tracking-tight text-slate-800">견적 현황 리스트</h2>
              </div>
              <button onClick={handleCloseQuotations} className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 transition-all">
                <span className="material-symbols-outlined font-bold">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-50/50">
              <QuotationList 
                user={user} 
                reqId={selectedReqId} 
                onBack={handleCloseQuotations}
                onViewDetail={handleViewDetail}
                isModal={true}
                onConfirmSuccess={() => {
                   handleCloseQuotations();
                   fetchReservations();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showCancelReasonModal && (
        <CancelTripReasonModal
          tripData={cancelTripData}
          currentCustId={user?.custId}
          onClose={() => setShowCancelReasonModal(false)}
          onSuccess={fetchReservations}
        />
      )}

      {showBusReRegModal && (
        <BusReRegistrationModal
          reqId={reRegReqId}
          user={user}
          onClose={() => setShowBusReRegModal(false)}
          onSuccess={() => {
            setShowBusReRegModal(false);
            fetchReservations();
          }}
        />
      )}

      {/* 기사 상세 정보 모달 */}
      {selectedBidId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/60 backdrop-blur-lg p-4">
          <div className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="absolute top-6 right-8 z-50">
               <button 
                 onClick={() => setSelectedBidId(null)} 
                 className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all shadow-sm"
               >
                 <span className="material-symbols-outlined font-bold">close</span>
               </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <QuotationDetail 
                bidId={selectedBidId} 
                onBack={() => setSelectedBidId(null)} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReservationList;
