import React, { useEffect } from 'react';

const DetailBusRequestModal = ({ reqData, onClose }) => {
  const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').trim().replace(/\/$/, '');
  const [allBuses, setAllBuses] = React.useState([]);
  const [waypoints, setWaypoints] = React.useState([]);

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
      
      // 버스 정보 가져오기
      fetch(`${API_BASE}/api/auction/req-buses/${id}`)
        .then(res => res.json())
        .then(data => {
           if (Array.isArray(data)) setAllBuses(data);
        })
        .catch(err => console.error('Error fetching buses:', err));

      // 경유지 정보 직접 가져오기 (데이터 정합성 확보)
      fetch(`${API_BASE}/api/auction/view/${id}?_t=${Date.now()}`)
        .then(res => res.json())
        .then(data => {
           if (data && data.waypoints) {
             setWaypoints(data.waypoints);
           }
        })
        .catch(err => console.error('Error fetching waypoints:', err));
    }
  }, [reqData, API_BASE]);

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

  if (!reqData) return null;

  // 대소문자 혼용 대응을 위한 데이터 추출
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
  const isPremium = allBuses.some(b => {
    const t = b.BUS_TYPE_CD || '';
    return t.includes('우등') || t.includes('PREMIUM') || t.includes('GOLD') || t.includes('VVIP') || t.includes('21') || t.includes('16') || t.includes('28');
  });

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-xl sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined font-bold">route</span>
            </div>
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Reservation Detail</p>
               <p className="text-sm font-black text-slate-800">예약 상세 정보</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="overflow-y-auto max-h-[85vh] no-scrollbar">
          {/* Hero Banner */}
          <section className="relative p-10 flex flex-col justify-end min-h-[160px] overflow-hidden">
            <div className={`absolute inset-0 z-0 ${isPremium ? 'bg-gradient-to-br from-slate-900 to-primary' : 'bg-gradient-to-br from-primary to-emerald-700'}`}>
               <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            </div>
            <div className="relative z-10">
               <h1 className="text-3xl font-black text-white leading-tight mb-2 tracking-tight">{displayTitle}</h1>
               <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-white/20 backdrop-blur-md border border-white/30 text-white text-[9px] font-black rounded-md uppercase tracking-widest">
                    {reqData.DATA_STAT || 'AUCTION'}
                  </span>
                  <span className="text-white/60 text-[10px] font-bold">인원: {passengerCnt}명</span>
               </div>
            </div>
          </section>

          <div className="p-10 space-y-12">
            {/* Waypoints Section */}
            <section>
              <div className="flex items-center gap-2 mb-8">
                <span className="w-1 h-4 bg-primary rounded-full"></span>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">경로 정보</h3>
              </div>
              
              <div className="space-y-0 relative">
                {(() => {
                  const typeLabels = {
                    'START_NODE': '출발지',
                    'START_WAY': '출발경유지',
                    'ROUND_TRIP': '목적지',
                    'END_WAY': '도착경유지',
                    'END_NODE': '도착지'
                  };

                  const targetVias = (waypoints && waypoints.length > 0) ? waypoints : (reqData.waypoints || []);
                  let points = [];
                  
                  if (targetVias.length > 0) {
                    points = targetVias.map((wp, idx) => {
                      const rawType = wp.via_type || wp.VIA_TYPE || wp.type || '';
                      let vType = String(rawType).trim().toUpperCase();
                      
                      const total = targetVias.length;
                      const mid = Math.floor(total / 2);
                      
                      if (!vType || vType === 'NO_TYPE' || vType === 'UNDEFINED') {
                        if (idx === 0) vType = 'START_NODE';
                        else if (idx === total - 1) vType = 'END_NODE';
                        else if (idx === mid) vType = 'ROUND_TRIP';
                        else if (idx < mid) vType = 'START_WAY';
                        else vType = 'END_WAY';
                      }

                      return {
                        label: typeLabels[vType] || '경유지',
                        address: wp.address || wp.VIA_ADDR,
                        type: vType
                      };
                    });
                  } else {
                    points = [
                      { label: '출발지', address: startAddr, type: 'START_NODE' },
                      { label: '도착지', address: endAddr, type: 'END_NODE' }
                    ];
                  }

                  return points.map((pt, idx) => {
                    const isLast = idx === points.length - 1;
                    const vType = pt.type;
                    let icon = 'more_vert';
                    let iconColor = 'bg-white border-2 border-slate-200 text-slate-400';

                    if (vType === 'START_NODE') { icon = 'location_on'; iconColor = 'bg-slate-900 text-white'; }
                    else if (vType === 'END_NODE') { icon = 'flag'; iconColor = 'bg-primary text-white'; }
                    else if (vType === 'ROUND_TRIP') { icon = 'tour'; iconColor = 'bg-teal-600 text-white'; }

                    return (
                      <div key={idx} className="relative flex gap-6 pb-10 last:pb-0 group">
                        {!isLast && (
                          <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-slate-100 group-hover:bg-primary/20 transition-colors"></div>
                        )}
                        <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-sm shrink-0 ${iconColor}`}>
                          <span className="material-symbols-outlined text-[20px]">{icon}</span>
                        </div>
                        <div className="flex-1 bg-slate-50/50 p-5 rounded-2xl border border-transparent hover:border-slate-200 hover:bg-white transition-all duration-300">
                          <span className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${vType === 'START_NODE' ? 'text-slate-900' : vType === 'END_NODE' ? 'text-primary' : 'text-slate-400'}`}>
                            {pt.label}
                          </span>
                          <p className="text-sm font-bold text-slate-800 leading-snug">{pt.address}</p>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </section>

            {/* Price Detail Section */}
            <section className="bg-slate-900 text-white p-10 rounded-[2.5rem] shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-primary opacity-10 rounded-full blur-3xl -mr-32 -mt-32"></div>
               <h3 className="text-xs font-black opacity-40 uppercase tracking-widest mb-8">Pricing Summary</h3>
               
               <div className="space-y-4 mb-10">
                  <div className="flex justify-between items-center text-sm">
                    <span className="opacity-40">기본 대여료</span>
                    <span className="font-bold">{Number(baseFare).toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="opacity-40">거리/시간 할증</span>
                    <span className="font-bold">{Number(surge).toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="opacity-40">부대 비용</span>
                    <span className="font-bold">{Number(extra).toLocaleString()}원</span>
                  </div>
               </div>

               <div className="pt-8 border-t border-white/10 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Estimated Total</p>
                    <p className="text-4xl font-black tracking-tight">{Number(reqAmt).toLocaleString()}원</p>
                  </div>
                  <span className="text-[9px] opacity-30 font-bold bg-white/10 px-2 py-1 rounded">VAT 포함</span>
               </div>
            </section>

            {/* Vehicle List Section */}
            <section className="pb-10">
              <div className="flex items-center gap-2 mb-6">
                 <span className="w-1 h-4 bg-slate-300 rounded-full"></span>
                 <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">요청 차량 상세</h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                 {allBuses.length > 0 ? allBuses.map((bus, idx) => (
                    <div key={idx} className="bg-white rounded-2xl p-5 flex items-center justify-between border border-slate-100 group/bus hover:bg-slate-50 transition-all">
                       <div className="flex items-center gap-4 text-left">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover/bus:bg-primary group-hover/bus:text-white transition-all">
                             <span className="material-symbols-outlined text-xl">directions_bus</span>
                          </div>
                          <div>
                             <p className="text-sm font-black text-slate-900 tracking-tight">{getVehicleLabel(bus.BUS_TYPE_CD)}</p>
                             <p className="text-[10px] text-slate-400 font-bold">배차 상태: <span className="text-primary">{bus.BUS_STAT || '진행중'}</span></p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-sm font-black text-slate-800">{Number(bus.UNIT_REQ_AMT || 0).toLocaleString()}원</p>
                       </div>
                    </div>
                 )) : (
                    <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                       <p className="text-xs font-bold text-slate-400 italic">차량 정보를 불러오고 있습니다...</p>
                    </div>
                 )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailBusRequestModal;
