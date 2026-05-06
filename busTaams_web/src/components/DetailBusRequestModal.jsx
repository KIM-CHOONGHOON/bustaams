import React, { useEffect } from 'react';

const DetailBusRequestModal = ({ reqData, onClose }) => {
  const [allBuses, setAllBuses] = React.useState([]);

  // 모달이 열려있을 때 뒤 배경 스크롤 방지
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  React.useEffect(() => {
    if (reqData && (reqData.REQ_ID || reqData.REQ_UUID_STR)) {
      const id = reqData.REQ_ID || reqData.REQ_UUID_STR;
      fetch(`http://localhost:8080/api/auction/req-buses/${id}`)
        .then(res => res.json())
        .then(data => {
           if (Array.isArray(data)) setAllBuses(data);
        })
        .catch(err => console.error('Error fetching buses:', err));
    }
  }, [reqData]);

  const getVehicleLabel = (type) => {
    if (!type) return '일반 버스 (45석)';
    const map = {
      'NORMAL_45': '일반 버스 (45석)',
      'PRESTIGE_28': '우등 버스 (28석)',
      'PREMIUM_21': '프리미엄 골드 (21석)',
      'VVIP_16': 'V-VIP (16석)',
      'MINI_25': '중형/미니 버스 (25석)',
      'VAN_11': '대형 밴 (11석)',
      // 호환성을 위한 구버전 매핑 유지 (필요 시)
      'STANDARD_45': '일반 버스 (45석)',
      'STANDARD_28': '우등 버스 (28석)',
      'GOLD_21': '프리미엄 골드 (21석)'
    };
    return map[type] || type;
  };

  if (!reqData) return null;

  // Destructure with fallbacks to handle both upper/lower case or missing data
  const {
    TRIP_TITLE, tripTitle = TRIP_TITLE,
    PASSENGER_CNT, passengerCnt = PASSENGER_CNT,
    REQ_AMT, reqAmt = REQ_AMT || 0,
    START_ADDR, startAddr = START_ADDR,
    END_ADDR, endAddr = END_ADDR,
    START_DT, startDt = START_DT,
    END_DT, endDt = END_DT,
    BASE_FARE, baseFare = BASE_FARE || 0,
    SURGE_AMT, surge = SURGE_AMT || 0,
    EXTRA_AMT, extra = EXTRA_AMT || 0
  } = reqData;

  const displayTitle = tripTitle || `${startAddr} ↔ ${endAddr}` || '상세 예약 정보';

  const uniqueBusTypes = [...new Set(allBuses.map(b => getVehicleLabel(b.BUS_TYPE_CD)))];
  const busTypeLabel = uniqueBusTypes.length > 0 ? uniqueBusTypes.join(', ') : (getVehicleLabel(reqData.BUS_TYPE_CD) || '일반 고속 (45인승)');
  
  const isPremium = allBuses.some(b => {
    const t = b.BUS_TYPE_CD || '';
    return t.includes('우등') || t.includes('PREMIUM') || t.includes('GOLD') || t.includes('VVIP') || t.includes('21') || t.includes('16') || t.includes('28');
  }) || (reqData.BUS_TYPE_CD && (reqData.BUS_TYPE_CD.includes('우등') || reqData.BUS_TYPE_CD.includes('PREMIUM')));

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto duration-300 transition-opacity"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-3xl my-8 relative shadow-2xl flex flex-col transform transition-all scale-100 opacity-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header / Close Button */}
        <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl px-8 py-4 border-b border-slate-100 flex justify-between items-center rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-xl font-bold">assignment_turned_in</span>
            </div>
            <p className="text-xs font-black text-slate-800 uppercase tracking-widest">예약 상세 정보</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[85vh] no-scrollbar">
          {/* 01: Hero Banner Section */}
          <section className="relative h-64 flex items-end p-10 overflow-hidden">
            {/* Dynamic Background */}
            <div className={`absolute inset-0 z-0 ${isPremium ? 'bg-gradient-to-br from-slate-900 via-primary to-emerald-900' : 'bg-gradient-to-br from-primary to-emerald-700'}`}>
               <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
               <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            </div>
            
            {/* Banner Content */}
            <div className="relative z-10 w-full">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] font-black rounded-full uppercase tracking-[0.2em]">
                  RESERVATION DETAIL
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none drop-shadow-2xl">
                {displayTitle}
              </h1>
              <p className="mt-4 text-white/70 font-bold flex items-center gap-2">
                 <span className="material-symbols-outlined text-sm">group</span> {passengerCnt || 0}명 탑승 예정
              </p>
            </div>
          </section>

          <div className="p-10 space-y-12">
            {/* 요약 카드 섹션 삭제됨 */}

          {/* 02: Route Configuration */}
          <section>
            <div className="flex items-center gap-2 mb-6">
               <span className="w-1 h-4 bg-primary rounded-full"></span>
               <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">경로 정보</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-5 group">
                <div className="flex-none w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white shadow-lg">
                  <span className="material-symbols-outlined text-lg">location_on</span>
                </div>
                <div className="flex-grow bg-slate-50 border border-slate-100 p-5 rounded-2xl transition-all hover:bg-white hover:shadow-md">
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">출발지</label>
                  <p className="text-sm font-bold text-slate-900">{startAddr}</p>
                </div>
              </div>

              <div className="flex items-center gap-5 group">
                <div className="flex-none w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-lg">
                  <span className="material-symbols-outlined text-lg">flag</span>
                </div>
                <div className="flex-grow bg-slate-50 border border-slate-100 p-5 rounded-2xl transition-all hover:bg-white hover:shadow-md">
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">도착지</label>
                  <p className="text-sm font-bold text-slate-900">{endAddr}</p>
                </div>
              </div>
            </div>
          </section>

          {/* 03: Schedule & Expense */}
          <section>
            <div className="flex items-center gap-2 mb-6">
               <span className="w-1 h-4 bg-secondary rounded-full"></span>
               <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">일정 및 경비 상세</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <label className="block text-[9px] font-black text-slate-400 mb-2 uppercase tracking-widest">출발 일시</label>
                <p className="text-sm font-extrabold text-slate-900">{new Date(startDt).toLocaleString('ko-KR')}</p>
              </div>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <label className="block text-[9px] font-black text-slate-400 mb-2 uppercase tracking-widest">도착 일시</label>
                <p className="text-sm font-extrabold text-slate-900">{new Date(endDt).toLocaleString('ko-KR')}</p>
              </div>
            </div>

            {/* Expense Panel */}
            <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-primary opacity-20 rounded-full -mr-24 -mt-24 blur-3xl pointer-events-none"></div>
                <h3 className="text-base font-black mb-8 opacity-60 uppercase tracking-widest">견적 상세 내역</h3>
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="opacity-50 font-bold">기본 대여료</span>
                        <span className="font-black tracking-tight">{Number(baseFare).toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="opacity-50 font-bold">거리 할증</span>
                        <span className="font-black tracking-tight">{Number(surge).toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="opacity-50 font-bold">부대비용 (톨비 등)</span>
                        <span className="font-black tracking-tight">{Number(extra).toLocaleString()}원</span>
                    </div>
                    <div className="pt-8 mt-4 border-t border-white/10">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">총 견적 금액</p>
                                <p className="text-4xl font-black tracking-tighter text-white">{Number(reqAmt).toLocaleString()}원</p>
                            </div>
                            <span className="text-[9px] font-black opacity-30 bg-white/10 px-2 py-1 rounded-lg">부가세 포함</span>
                        </div>
                    </div>
                </div>
            </div>
          </section>

          {/* 04: Bus Information List */}
          <section className="pb-10">
             <div className="flex items-center gap-2 mb-6">
                <span className="w-1 h-4 bg-slate-300 rounded-full"></span>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">요청 차량 상세</h3>
             </div>
             <div className="grid grid-cols-1 gap-3">
                {allBuses.map((bus, idx) => {
                  const vehicleLabel = getVehicleLabel(bus.BUS_TYPE_CD);
                  const price = bus.UNIT_REQ_AMT;
                  
                  return (
                    <div key={idx} className="bg-white rounded-2xl p-5 flex items-center justify-between border border-slate-100 group/bus hover:bg-slate-50 transition-all">
                       <div className="flex items-center gap-4 text-left">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover/bus:bg-primary group-hover/bus:text-white transition-all">
                             <span className="material-symbols-outlined text-xl">commute</span>
                          </div>
                          <div>
                             <p className="text-sm font-black text-slate-900 tracking-tight">{vehicleLabel}</p>
                             <p className="text-[10px] text-slate-400 font-bold">단가: <span className="text-primary">{price ? Number(price).toLocaleString() : '0'}원</span></p>
                          </div>
                       </div>
                       <span className="material-symbols-outlined text-slate-200 text-lg">chevron_right</span>
                    </div>
                  );
                })}
              </div>
          </section>
        </div>
      </div>
    </div>
  </div>
);
};

export default DetailBusRequestModal;

