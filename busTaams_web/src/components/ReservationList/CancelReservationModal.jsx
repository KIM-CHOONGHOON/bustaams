import React, { useEffect } from 'react';

const CancelReservationModal = ({ reqData, onClose, onRefresh }) => {
  // 모달이 열려있을 때 뒤 배경 스크롤 방지
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  if (!reqData) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}`;
    } catch (e) {
      return dateStr;
    }
  };

  const handleFullCancel = async () => {
    if (!window.confirm('여정 전체를 취소하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

    try {
      const response = await fetch('http://localhost:8080/api/auction/cancel-reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reqUuid: reqData.REQ_UUID_STR, cancelRole: 'CUSTOMER' })
      });

      if (response.ok) {
        alert('전체 예약이 취소되었습니다.');
        if (onRefresh) onRefresh();
        onClose(); // 성공 시 모달 닫기
      } else {
        const errorData = await response.json();
        alert(errorData.error || '전체 취소 도중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('Full cancel error:', err);
      alert('서버와 통신 중 오류가 발생했습니다.');
    }
  };

  const handleCancelIndividualBus = async (reqBusUuid) => {
    if (!window.confirm('이 차량만 취소하시겠습니까?')) return;

    try {
      const response = await fetch('http://localhost:8080/api/auction/cancel-bus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reqBusUuid })
      });

      if (response.ok) {
        alert('해당 차량이 취소되었습니다.');
        if (onRefresh) onRefresh();
      } else {
        const errorData = await response.json();
        alert(errorData.error || '취소 도중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('Cancel individual bus error:', err);
      alert('서버와 통신 중 오류가 발생했습니다.');
    }
  };

  const getBusImageUrl = (type) => {
    const isPremium = type && (type.includes('PREMIUM') || type.includes('GOLD') || type.includes('VVIP'));
    return isPremium 
      ? "https://lh3.googleusercontent.com/aida-public/AB6AXuDTje1m4b4ksJGvgcxT5GtFikn-df6-zP5iphb-l4-IFka7RdB1dkTGgyIsNW-3Rd1qQiU097o5bqxKihkXm6syDYkui2EsColZncpIj9dR1kfjbzoZ1_kf5jHCmFoPKURF0Kw8wdaPj6yPcZbkQ06wxqxNNonlNRaKTeSvyVntzTvCHA867iTk4LL-7Wg9feQvO7PAoy63zBXQMcbT49v3V3Znn-Ql49netExqGOyYipXu0t5rKLEJ9YH5_DTWgRSnroL5WGo8aT0"
      : "https://lh3.googleusercontent.com/aida-public/AB6AXuB1EIlAip2FzvbWWh-9sUVdwmXTBhAGZ4CSlzOgG9KWZFIAt1Ea9gSYC7ggagE91Fq79QyR3LLb4znF7CpRPWcOy0SQKd5onPakhCDM2YpykpMn4Ag_3mDjAgwC8dgmosEVGlxC1CDi6G0BJZLwCTQRZ8kQdtAJPReThNI_hHiE7D0jriGvfepXdDjeWM7BR0rvh79sBWVqy5G9O6TJkcyAF9lyB4ZDBNoZbAUVD7Wl5u4f3Bd00RCSH05s0NpghBgU5DAhQEOCMeA";
  };

  const getVehicleLabel = (type) => {
    if (!type) return '일반 버스';
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
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-6xl my-8 relative shadow-2xl overflow-hidden flex flex-col transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Content Wrapper */}
        <div className="flex-1 p-12 overflow-y-auto max-h-[90vh]">
          {/* Header Section */}
          <header className="mb-12">
            <div className="flex items-center gap-4 mb-4">
              <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">조치 필요</span>
            </div>
            <h1 className="text-4xl font-extrabold font-headline tracking-tighter text-on-surface mb-3">예약 취소 안내</h1>
            <p className="text-slate-500 max-w-2xl leading-relaxed">
              예약하신 여정의 취소 및 환불 절차를 진행합니다. 아래의 취소 규정을 반드시 확인하신 후 진행해 주시기 바랍니다.
            </p>
          </header>

          <div className="grid grid-cols-12 gap-12">
            {/* Left Column: Reservation Info & Policy */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">
              {/* Summary Card */}
              <div className="bg-slate-50 p-8 rounded-2xl border-l-4 border-rose-600 shadow-sm">
                <h4 className="font-headline font-bold text-xl mb-6">예약 요약</h4>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-400">여정명</span>
                    <span className="font-bold line-clamp-1">{reqData.TRIP_TITLE || '일반 여정'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-400">총 예약 차량</span>
                    <span className="font-bold">{reqData.vehicles ? reqData.vehicles.length : 0}대</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-400">이용 예정일</span>
                    <span className="font-bold">{formatDate(reqData.START_DT)}</span>
                  </div>
                </div>
              </div>

              {/* Policy Card */}
              <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 mb-6 text-rose-700">
                  <span className="material-symbols-outlined">info</span>
                  <h4 className="font-headline font-bold text-lg">취소 및 수수료 규정</h4>
                </div>
                <ul className="space-y-4 text-sm leading-relaxed text-slate-500">
                  <li className="flex gap-3">
                    <span className="font-bold text-primary shrink-0">이용 7일 전:</span>
                    <span>취소 수수료 없음 (100% 환불)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-primary shrink-0">이용 3~6일 전:</span>
                    <span>총 결제 금액의 20% 수수료 발생</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-primary shrink-0">이용 1~2일 전:</span>
                    <span>총 결제 금액의 50% 수수료 발생</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-rose-700 shrink-0">당일 취소:</span>
                    <span>환불 불가 (100% 수수료 발생)</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right Column: Vehicle List */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
              <h3 className="font-headline font-bold text-2xl mb-2">예약된 차량 목록</h3>
              
              {reqData.vehicles && reqData.vehicles.length > 0 ? (
                reqData.vehicles.map((v, idx) => (
                  <div key={v.REQ_BUS_UUID_STR || idx} className="bg-white border border-slate-100 p-6 rounded-2xl flex items-center gap-6 shadow-sm hover:shadow-md transition-shadow group relative">
                    {v.DATA_STAT === 'CANCELED' && (
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-2xl">
                         <span className="bg-rose-600 text-white px-4 py-2 rounded-full font-bold shadow-lg uppercase tracking-widest text-xs">이미 취소됨</span>
                      </div>
                    )}
                    <div className="w-40 h-28 rounded-xl overflow-hidden shrink-0 bg-slate-100 border border-slate-50">
                      <img 
                        alt="bus image" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                        src={getBusImageUrl(v.BUS_TYPE_CD)}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-[10px] font-bold text-primary mb-1 block uppercase tracking-widest">차량 상세</span>
                          <h5 className="font-headline font-bold text-lg">{getVehicleLabel(v.BUS_TYPE_CD)} {v.REQ_BUS_CNT}대</h5>
                        </div>
                        <span className="text-sm font-bold text-on-surface">{v.REQ_AMT ? Number(v.REQ_AMT).toLocaleString() : '0'}원</span>
                      </div>
                      <div className="flex gap-4 text-xs text-slate-400 mb-4">
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">person</span> {v.REQ_BUS_CNT * 45}석(추정)</span>
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">event_note</span> 2024년형</span>
                      </div>
                      <div className="flex justify-end">
                        <button 
                          disabled={v.DATA_STAT === 'CANCELED'}
                          onClick={() => handleCancelIndividualBus(v.REQ_BUS_UUID_STR)}
                          className={`px-6 py-2 rounded-full border text-sm font-bold transition-all ${v.DATA_STAT === 'CANCELED' ? 'border-slate-200 text-slate-300' : 'border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300'}`}
                        >
                          이 차량만 취소
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                  표시할 차량 정보가 없습니다.
                </div>
              )}

              {/* Actions */}
              <div className="mt-8 pt-12 border-t border-slate-100 flex flex-col items-center">
                <p className="text-sm text-slate-400 mb-6 text-center leading-relaxed font-medium">전체 예약을 취소하시려면 하단 버튼을 눌러주세요.<br/>이 작업은 마스터 여정 전체에 영향을 줄 수 있습니다.</p>
                <button 
                   className="w-full max-w-md bg-gradient-to-r from-rose-700 to-rose-900 text-white py-5 rounded-full font-headline font-extrabold text-xl shadow-xl shadow-rose-900/10 hover:scale-[1.02] active:scale-95 transition-all"
                   onClick={handleFullCancel}
                >
                  전체 예약 취소하기
                </button>
                <button 
                  onClick={onClose}
                  className="mt-6 text-slate-400 hover:text-[#004e47] font-bold transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">arrow_back</span> 취소하지 않고 돌아가기
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancelReservationModal;
