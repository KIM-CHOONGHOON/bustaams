import React, { useState, useEffect } from 'react';

const BusRequestModal = ({ close, userId }) => {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
    busType: '대형(45인승)',
    passengerCnt: 1,
    startDt: '',
    endDt: '',
    roundTripYn: 'N',
    startAddr: '',
    startDetailAddr: '',
    startLat: null,
    startLng: null,
    endAddr: '',
    endDetailAddr: '',
    endLat: null,
    endLng: null,
    waypoints: [], // { addr, detail, lat, lng }
    comment: '',
    tipPrice: 0,
    calcBusCnt: 1, // 시스템 계산치 추가
    busCnt: 1,     // 최종 입력치
  });

  // Calculated States
  const [estimate, setEstimate] = useState(null);
  const [days, setDays] = useState(0);
  const [nights, setNights] = useState(0);

  // 1. 일정 기반 운행 기간(박/일) 계산
  useEffect(() => {
    if (formData.startDt && formData.endDt) {
      const start = new Date(formData.startDt);
      const end = new Date(formData.endDt);
      const diffTime = end - start;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0) {
        setDays(diffDays + 1);
        setNights(diffDays);
      }
    }
  }, [formData.startDt, formData.endDt]);

  // 1-1. 차량 대수 자동 계산 로직
  useEffect(() => {
    const capacities = {
      '대형(45인승)': 45,
      '우등(28인승)': 28,
      '중형(25인승)': 25,
      '미니(15인승)': 15
    };
    const capacity = capacities[formData.busType] || 45;
    const autoCnt = Math.ceil(formData.passengerCnt / capacity);
    setFormData(prev => ({ ...prev, calcBusCnt: autoCnt, busCnt: autoCnt }));
  }, [formData.passengerCnt, formData.busType]);

  // 2. 주소 검색 (Daum Postcode)
  const handleAddressSearch = (field) => {
    new window.daum.Postcode({
      oncomplete: function(data) {
        // 주소 정보를 위경도로 변환하려면 Kakao Maps Local API가 필요하지만, 
        // 여기서는 주소 텍스트만 먼저 처리하고 좌표는 Mock으로 세팅 (실제 운영 시 좌표 추출 로직 추가 필수)
        const addr = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;
        
        if (field === 'start') {
          setFormData(prev => ({ ...prev, startAddr: addr, startLat: 37.5665, startLng: 126.9780 })); // Mock Lat/Lng
        } else if (field === 'end') {
          setFormData(prev => ({ ...prev, endAddr: addr, endLat: 35.1796, endLng: 129.0756 })); // Mock Lat/Lng
        } else if (field.startsWith('waypoint')) {
          const idx = parseInt(field.split('-')[1]);
          const newWaypoints = [...formData.waypoints];
          newWaypoints[idx] = { ...newWaypoints[idx], addr: addr, lat: 36.3504, lng: 127.3845 };
          setFormData(prev => ({ ...prev, waypoints: newWaypoints }));
        }
      }
    }).open();
  };

  // 3. 견적 조회 API 호출
  const getEstimate = async () => {
    if (!formData.startAddr || !formData.endAddr) return alert('출발지와 도착지를 입력해주세요.');
    
    setLoading(true);
    try {
      // [보안/안정성] 좌표가 없는 경우(주소만 검색하고 선택 안함 등) 기본값 세팅 시도 (테스트용)
      const lat = formData.startLat || 37.5665;
      const lng = formData.startLng || 126.9780;
      const eLat = formData.endLat || 35.1796;
      const eLng = formData.endLng || 129.0756;

      const res = await fetch(`${API_BASE}/api/bid/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startLat: lat,
          startLng: lng,
          endLat: eLat,
          endLng: eLng,
          waypoints: formData.waypoints,
          busType: formData.busType
        })
      });

      // [핵심] JSON 응답이 아닐 경우(404 HTML 등)를 대비한 텍스트 우선 확인
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const textError = await res.text();
        console.error('Non-JSON Response:', textError);
        throw new Error(`서버 응답 오류 (JSON 형식 아님). API 주소를 확인해주세요. (${res.status})`);
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '알 수 없는 서버 오류');

      // 부대비용 계산 (명세서 로직 기반)
      const mealPrice = (days * 30000); // 일수 * 3만원 (운전기사 식대)
      const lodgingPrice = (nights * 70000); // 박수 * 7만원 (숙박비)
      const fuelCost = (data.summary.distance / 1000 / 4.5) * data.fuelPrice; // 거리/연비 * 유가
      
      const incidentalSubtotal = mealPrice + lodgingPrice + data.summary.fare.toll;

      setEstimate({
        ...data,
        mealPrice,
        lodgingPrice,
        fuelCost,
        incidentalSubtotal,
        totalToll: data.summary.fare.toll,
        distanceKm: (data.summary.distance / 1000).toFixed(1),
        durationMin: Math.floor(data.summary.duration / 60)
      });
      setStep(3);
    } catch (err) {
      alert(`견적 조회 실패: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 4. 최종 요청 등록
  const submitRequest = async () => {
    setLoading(true);
    try {
      const body = {
        userId: userId || 'anonymous_user', // 실제 연동 시 현재 로그인 유저 ID
        busType: formData.busType,
        busFuelEff: 4.5,
        passengerCnt: formData.passengerCnt,
        calcBusCnt: formData.calcBusCnt,
        busCnt: formData.busCnt,
        startDt: formData.startDt,
        endDt: formData.endDt,
        roundTripYn: formData.roundTripYn,
        startAddr: formData.startAddr,
        startDetailAddr: formData.startDetailAddr,
        startLat: formData.startLat,
        startLng: formData.startLng,
        endAddr: formData.endAddr,
        endDetailAddr: formData.endDetailAddr,
        endLat: formData.endLat,
        endLng: formData.endLng,
        totalDistanceKm: estimate.distanceKm,
        totalDurationMin: estimate.durationMin,
        restAreaCnt: estimate.restAreaCount,
        fuelPricePerL: estimate.fuelPrice,
        estFuelCost: estimate.fuelCost,
        totalTollFee: estimate.totalToll,
        mealPrice: estimate.mealPrice,
        lodgingPrice: estimate.lodgingPrice,
        tipPrice: formData.tipPrice,
        incidentalSubtotal: estimate.incidentalSubtotal + Number(formData.tipPrice),
        comment: formData.comment,
        estTotalServicePrice: 0, // 기본료 등 추가 로직 필요 시 반영
        waypoints: formData.waypoints.map((wp, i) => ({
          addr: wp.addr,
          detail: wp.detail,
          lat: wp.lat,
          lng: wp.lng,
          order: i + 1
        }))
      };

      const res = await fetch(`${API_BASE}/api/bid/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert('입찰 요청이 등록되었습니다!');
      close();
    } catch (err) {
      alert(`등록 실패: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0" onClick={close}></div>
      
      <div className="relative w-full max-w-xl md:max-w-2xl bg-surface-lowest rounded-[1.5rem] md:rounded-[2rem] shadow-ambient overflow-hidden flex flex-col max-h-[90vh] md:max-h-[85vh] animate-in zoom-in-95 duration-300">
        
        {/* Header with Step Indicator */}
        <header className="px-6 py-4 md:px-10 md:py-6 border-b border-surface-container-low bg-white/50 sticky top-0 z-10">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <div>
              <h2 className="font-display text-xl md:text-3xl font-extrabold text-primary tracking-tight">버스를 불러주세요</h2>
              <p className="text-gray-500 font-body mt-0.5 text-[10px] md:text-sm font-medium">단 1분이면 전국 기사님께 견적을 받을 수 있습니다.</p>
            </div>
            <button onClick={close} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl bg-surface hover:bg-surface-container-low text-gray-400 transition-all">
              <span className="material-symbols-outlined text-xl md:text-2xl">close</span>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-3">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className="flex-1 flex flex-col gap-2">
                <div className={`h-1.5 rounded-full transition-all duration-500 ${step >= s ? 'bg-primary' : 'bg-surface-container-high'}`}></div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${step === s ? 'text-primary' : 'text-gray-300'}`}>Step {s}</span>
              </div>
            ))}
          </div>
        </header>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 md:px-10 md:py-8 no-scrollbar font-body">
          
          {step === 1 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              {/* 항목 0: 희망 버스 종류 */}
              <section className="space-y-3 md:space-y-4">
                <label className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest px-1">희망 버스 종류</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  {['대형(45인승)', '우등(28인승)', '중형(25인승)', '미니(15인승)'].map(type => (
                    <button 
                      key={type}
                      onClick={() => setFormData(prev => ({ ...prev, busType: type }))}
                      className={`p-3 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all flex flex-col items-center gap-1.5 md:gap-3 ${formData.busType === type ? 'border-primary bg-primary/5 shadow-sm' : 'border-surface-container-high bg-surface-container-low hover:border-gray-300'}`}
                    >
                      <span className="material-symbols-outlined text-xl md:text-3xl text-primary/60">directions_bus</span>
                      <span className={`text-xs md:text-sm font-bold ${formData.busType === type ? 'text-primary' : 'text-gray-600'}`}>{type.split('(')[0]}</span>
                      <span className="text-[9px] md:text-[10px] font-medium opacity-50">{type.split('(')[1].replace(')', '')}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* 항목 1: 총 탑승인원 */}
              <section className="space-y-3 md:space-y-4">
                <label className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest px-1">1. 총 탑승객 수</label>
                <div className="flex items-center gap-4 md:gap-6 bg-surface-container-low p-4 md:p-6 rounded-xl md:rounded-2xl">
                   <button 
                     onClick={() => setFormData(prev => ({ ...prev, passengerCnt: Math.max(1, prev.passengerCnt - 1) }))}
                     className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all"
                   >
                     <span className="material-symbols-outlined text-xl md:text-2xl">remove</span>
                   </button>
                   <div className="flex-1 flex items-center justify-center">
                     <input
                       type="number"
                       min="1"
                       value={formData.passengerCnt}
                       onChange={e => {
                         const val = e.target.value;
                         if (val === '') {
                           setFormData(prev => ({ ...prev, passengerCnt: '' }));
                         } else {
                           const num = parseInt(val, 10);
                           if (!isNaN(num) && num >= 0) {
                             setFormData(prev => ({ ...prev, passengerCnt: num }));
                           }
                         }
                       }}
                       onBlur={e => {
                         const num = parseInt(e.target.value, 10);
                         if (!num || num < 1) {
                           setFormData(prev => ({ ...prev, passengerCnt: 1 }));
                         }
                       }}
                       className="w-24 md:w-32 text-center font-display text-2xl md:text-4xl font-black text-gray-900 bg-transparent border-none outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                     />
                     <span className="text-sm md:text-xl font-bold text-gray-500 -ml-2">명</span>
                   </div>
                   <button 
                     onClick={() => setFormData(prev => ({ ...prev, passengerCnt: prev.passengerCnt + 1 }))}
                     className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all"
                   >
                     <span className="material-symbols-outlined text-xl md:text-2xl">add</span>
                   </button>
                </div>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 항목 2: 계산된 필요 차량 대수 (읽기 전용) */}
                <section className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                     <label className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest">2. 계산 대수</label>
                  </div>
                  <div className="flex items-center gap-4 bg-gray-50 p-4 md:p-5 rounded-xl border-2 border-gray-100 opacity-80">
                     <span className="material-symbols-outlined text-gray-400 text-lg md:text-xl">calculate</span>
                     <span className="flex-1 text-center font-display text-xl md:text-2xl font-black text-gray-400">{formData.calcBusCnt}<span className="text-xs md:text-sm font-bold ml-0.5 opacity-60">대</span></span>
                  </div>
                </section>

                {/* 항목 3: 소비자가 직접 입력한 필요 차량 대수 (수정 가능) */}
                <section className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                     <label className="text-[10px] md:text-xs font-black text-primary uppercase tracking-widest font-bold">3. 최종 필요 대수</label>
                  </div>
                  <div className="flex items-center gap-4 bg-primary/5 p-4 md:p-5 rounded-xl border-2 border-primary/20 shadow-sm transition-all hover:border-primary">
                     <button 
                       onClick={() => setFormData(prev => ({ ...prev, busCnt: Math.max(1, prev.busCnt - 1) }))}
                       className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all"
                     >
                       <span className="material-symbols-outlined text-lg">remove</span>
                     </button>
                     <span className="flex-1 text-center font-display text-xl md:text-2xl font-black text-primary">{formData.busCnt}<span className="text-xs md:text-sm font-bold ml-0.5 opacity-60">대</span></span>
                     <button 
                       onClick={() => setFormData(prev => ({ ...prev, busCnt: prev.busCnt + 1 }))}
                       className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all"
                     >
                       <span className="material-symbols-outlined text-lg">add</span>
                     </button>
                  </div>
                </section>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 md:space-y-8 animate-in slide-in-from-right-4 duration-300">
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest px-1">출발 일시</label>
                  <input 
                    type="datetime-local" 
                    value={formData.startDt}
                    onChange={e => setFormData(prev => ({ ...prev, startDt: e.target.value }))}
                    className="w-full bg-surface-container-high rounded-xl p-3 md:p-4 font-bold text-gray-900 border-2 border-transparent focus:border-primary/20 transition-all outline-none text-sm md:text-base"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest px-1">도착 일시</label>
                  <input 
                    type="datetime-local"
                    value={formData.endDt}
                    onChange={e => setFormData(prev => ({ ...prev, endDt: e.target.value }))}
                    className="w-full bg-surface-container-high rounded-xl p-3 md:p-4 font-bold text-gray-900 border-2 border-transparent focus:border-primary/20 transition-all outline-none text-sm md:text-base"
                  />
                </div>
              </section>

              <section className="space-y-3 md:space-y-4">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest">운행 경로</label>
                  <button 
                    onClick={() => setFormData(prev => ({ ...prev, waypoints: [...prev.waypoints, { addr: '', detail: '', lat: null, lng: null }] }))}
                    className="text-primary font-bold text-[10px] md:text-xs flex items-center gap-1 hover:underline"
                    disabled={formData.waypoints.length >= 3}
                  >
                    <span className="material-symbols-outlined text-sm md:text-base">add_circle</span>
                    경유지 추가 ({formData.waypoints.length}/3)
                  </button>
                </div>

                <div className="space-y-3 md:space-y-4">
                  {/* Start Point */}
                  <div className="relative pl-8 md:pl-10">
                    <div className="absolute left-0 top-0 bottom-0 w-6 md:w-8 flex flex-col items-center">
                       <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-primary ring-4 ring-primary/10 mb-1"></div>
                       <div className="flex-1 w-0.5 bg-dashed border-l-2 border-dashed border-primary/20"></div>
                    </div>
                    <input 
                       readOnly 
                       onClick={() => handleAddressSearch('start')}
                       placeholder="출발지를 입력해주세요" 
                       value={formData.startAddr}
                       className="w-full bg-surface-container-low rounded-xl p-3 md:p-4 font-bold text-gray-900 cursor-pointer hover:bg-surface-container-high transition-colors outline-none text-xs md:text-sm"
                    />
                  </div>

                  {/* Waypoints */}
                  {formData.waypoints.map((wp, idx) => (
                    <div key={idx} className="relative pl-8 md:pl-10 animate-in slide-in-from-left-2 transition-all">
                      <div className="absolute left-0 top-0 bottom-0 w-6 md:w-8 flex flex-col items-center">
                         <div className="flex-1 w-0.5 border-l-2 border-dashed border-primary/20"></div>
                         <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-secondary ring-4 ring-secondary/10 my-1.5 md:my-2"></div>
                         <div className="flex-1 w-0.5 border-l-2 border-dashed border-primary/20"></div>
                      </div>
                      <div className="flex gap-2">
                         <input 
                           readOnly 
                           onClick={() => handleAddressSearch(`waypoint-${idx}`)}
                           placeholder="경유지를 입력해주세요" 
                           value={wp.addr}
                           className="flex-1 bg-surface-container-low rounded-xl p-3 md:p-4 font-bold text-gray-900 cursor-pointer hover:bg-surface-container-high transition-colors outline-none text-xs md:text-sm"
                         />
                         <button 
                           onClick={() => setFormData(prev => ({ ...prev, waypoints: prev.waypoints.filter((_, i) => i !== idx) }))}
                           className="p-3 md:p-4 bg-red-50 text-red-400 rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors"
                         >
                           <span className="material-symbols-outlined text-base md:text-xl">delete</span>
                         </button>
                      </div>
                    </div>
                  ))}

                  {/* End Point */}
                  <div className="relative pl-8 md:pl-10">
                    <div className="absolute left-0 top-0 bottom-0 w-6 md:w-8 flex flex-col items-center">
                       <div className="flex-1 w-0.5 border-l-2 border-dashed border-primary/20 mb-1"></div>
                       <div className="w-3 h-3 md:w-4 md:h-4 rounded-md bg-secondary ring-4 ring-secondary/10"></div>
                    </div>
                    <input 
                      readOnly 
                      onClick={() => handleAddressSearch('end')}
                      placeholder="도착지를 입력해주세요" 
                      value={formData.endAddr}
                      className="flex-1 w-full bg-surface-container-low rounded-xl p-3 md:p-4 font-bold text-gray-900 cursor-pointer hover:bg-surface-container-high transition-colors outline-none text-xs md:text-sm"
                    />
                  </div>
                </div>
              </section>
            </div>
          )}

          {step === 3 && estimate && (
            <div className="space-y-4 md:space-y-8 animate-in slide-in-from-right-4 duration-300">
               <div className="bg-gradient-to-br from-primary to-primary-container p-5 md:p-8 rounded-2xl md:rounded-3xl text-white shadow-lg relative overflow-hidden">
                  <div className="relative z-10">
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] opacity-80">예상 경로 분석 결과</span>
                    <h3 className="text-2xl md:text-4xl font-black mt-1 md:mt-2 leading-none">{estimate.distanceKm}<span className="text-sm md:text-xl ml-1 opacity-70">km</span></h3>
                    <div className="flex gap-4 md:gap-6 mt-4 md:mt-6 opacity-90 text-[10px] md:text-sm font-bold">
                       <div className="flex items-center gap-1.5 md:gap-2"><span className="material-symbols-outlined text-base md:text-[18px]">schedule</span> {estimate.durationMin}분</div>
                       <div className="flex items-center gap-1.5 md:gap-2"><span className="material-symbols-outlined text-base md:text-[18px]">local_gas_station</span> {estimate.restAreaCount}개 휴게소</div>
                    </div>
                  </div>
                  <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
                    <span className="material-symbols-outlined text-[100px] md:text-[200px]">map</span>
                  </div>
               </div>

               <section className="space-y-2 md:space-y-4">
                  <label className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest px-1">부대비용 상세 (기본 포함)</label>
                  <div className="bg-surface rounded-xl md:rounded-2xl p-4 md:p-6 space-y-3 md:space-y-4 border border-surface-container-low">
                     <div className="flex justify-between items-center text-[11px] md:text-sm font-bold">
                        <span className="text-gray-500">통행료 (실비 정산)</span>
                        <span className="text-gray-900">{estimate.totalToll.toLocaleString()}원</span>
                     </div>
                     <div className="flex justify-between items-center text-[11px] md:text-sm font-bold">
                        <span className="text-gray-500">기사님 식대 ({days}일)</span>
                        <span className="text-gray-900">{estimate.mealPrice.toLocaleString()}원</span>
                     </div>
                     <div className="flex justify-between items-center text-[11px] md:text-sm font-bold">
                        <span className="text-gray-500">기사님 숙박비 ({nights}박)</span>
                        <span className="text-gray-900">{estimate.lodgingPrice.toLocaleString()}원</span>
                     </div>
                     <div className="pt-3 md:pt-4 border-t border-surface-container-high flex justify-between items-center font-black">
                        <span className="text-primary italic text-xs md:text-sm">TOTAL 부대비용</span>
                        <span className="text-xl md:text-2xl text-primary">{estimate.incidentalSubtotal.toLocaleString()}원</span>
                     </div>
                  </div>
               </section>

               <section className="space-y-2 md:space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest text-[#fd761a]">기사님 수고비 (선택)</label>
                  </div>
                  <div className="relative">
                    <input 
                      type="number"
                      placeholder="0"
                      value={formData.tipPrice}
                      onChange={e => setFormData(prev => ({ ...prev, tipPrice: e.target.value }))}
                      className="w-full bg-[#fd761a]/5 rounded-xl p-3 md:p-5 font-display text-xl md:text-2xl font-black text-[#9d4300] border-2 border-[#fd761a]/20 focus:border-[#fd761a] transition-all outline-none text-right pr-10 md:pr-12"
                    />
                    <span className="absolute right-4 md:right-5 top-1/2 -translate-y-1/2 font-bold text-[#fd761a] text-sm md:text-base">원</span>
                  </div>
               </section>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 md:space-y-8 animate-in slide-in-from-right-4 duration-300 text-center">
               <div className="w-16 h-16 md:w-24 md:h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 ring-8 ring-primary/5">
                  <span className="material-symbols-outlined text-3xl md:text-5xl text-primary">contact_support</span>
               </div>
               <h3 className="text-xl md:text-2xl font-black text-gray-900">거의 다 됐습니다!</h3>
               <p className="text-xs md:text-sm text-gray-500 px-4 md:px-6 leading-relaxed">입력하신 정보가 정확한지 마지막으로 확인해주시고,<br/>기사님들께 전달할 추가 요청사항이 있다면 적어주세요.</p>
               
               <textarea 
                 value={formData.comment}
                 onChange={e => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                 className="w-full bg-surface-container-low rounded-xl md:rounded-2xl p-4 md:p-6 font-bold text-gray-700 border-2 border-transparent focus:border-primary/20 transition-all outline-none min-h-[100px] md:min-h-[150px] resize-none text-sm md:text-base"
                 placeholder="예: 아이들이 타고 있어요, 경유지에서 1시간 대기 예정입니다 등"
               ></textarea>

               <div className="bg-surface-container-low p-4 md:p-6 rounded-xl md:rounded-2xl text-left space-y-2 md:space-y-3">
                  <div className="flex justify-between text-[10px] md:text-xs font-bold"><span className="text-gray-400">여행 유형</span><span className="text-gray-900">{formData.busType} / {formData.passengerCnt}명 / {formData.busCnt}대</span></div>
                  <div className="flex justify-between text-[10px] md:text-xs font-bold"><span className="text-gray-400">일정</span><span className="text-gray-900">{days}일 ({nights}박)</span></div>
                  <div className="flex justify-between text-[10px] md:text-xs font-bold items-start truncate"><span className="text-gray-400 flex-shrink-0 mr-4">경로</span><span className="text-gray-900 truncate">{formData.startAddr.split(' ')[1]} → {formData.endAddr.split(' ')[1]}</span></div>
               </div>
            </div>
          )}

        </div>

        {/* Action Bar */}
        <footer className="p-6 md:p-10 border-t border-surface-container-low bg-white/50 sticky bottom-0 z-10 flex gap-4">
           {step > 1 && (
             <button 
               onClick={() => setStep(prev => prev - 1)}
               className="h-14 md:h-16 px-6 md:px-8 bg-surface text-gray-500 font-black rounded-xl md:rounded-2xl hover:bg-gray-100 transition-all flex items-center justify-center"
             >
               이전
             </button>
           )}
           
           <button 
             disabled={loading}
             onClick={() => {
               if (step === 1) setStep(2);
               else if (step === 2) getEstimate();
               else if (step === 3) setStep(4);
               else if (step === 4) submitRequest();
             }}
             className="flex-1 h-14 md:h-16 bg-gradient-to-br from-primary to-primary-container text-white font-black text-lg md:text-xl rounded-xl md:rounded-2xl shadow-ambient hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center group disabled:opacity-50"
           >
             {loading ? (
               <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
             ) : (
               <>
                 {step === 4 ? '입찰 요청 날리기' : '계속하기'}
                 <span className="material-symbols-outlined ml-2 group-hover:translate-x-1 transition-transform">arrow_forward</span>
               </>
             )}
           </button>
        </footer>
      </div>
    </div>
  );
};

export default BusRequestModal;
