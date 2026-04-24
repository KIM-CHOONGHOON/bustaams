import React from 'react';

const initialState = {
  title: '',
  departure: { address: '', detail: '', lat: null, lng: null, distFromPrev: 0 },
  arrival: { address: '', detail: '', lat: null, lng: null, distFromPrev: 0 },
  waypoints: [],
  returnWaypoints: [],
  finalArrival: { address: '', detail: '', lat: null, lng: null, distFromPrev: 0 },
  departureDate: '',
  departureTime: '00:00',
  arrivalDate: '',
  arrivalTime: '12:00',
  premiumQty: 0,
  standardQty: 0,
  premiumGoldQty: 0,
  vvipQty: 0,
  miniBusQty: 0,
  largeVanQty: 0,
  premiumPrice: 0,
  standardPrice: 0,
  premiumGoldPrice: 0,
  vvipPrice: 0,
  miniBusPrice: 0,
  largeVanPrice: 0,
  busTypes: [], // Store CD_FNUM information
};

function formatComma(num) {
  if (!num && num !== 0) return '';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function parseComma(str) {
  if (!str) return 0;
  return parseInt(str.toString().replace(/,/g, '')) || 0;
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.name]: action.value };
    case 'SET_ADDRESS': {
      if (action.addressType === 'waypoint') {
        const newWaypoints = state.waypoints.map((wp, i) => 
          i === action.index ? { ...wp, [action.field || 'address']: action.value } : wp
        );
        return { ...state, waypoints: newWaypoints };
      }
      if (action.addressType === 'returnWaypoint') {
        const newWaypoints = state.returnWaypoints.map((wp, i) => 
          i === action.index ? { ...wp, [action.field || 'address']: action.value } : wp
        );
        return { ...state, returnWaypoints: newWaypoints };
      }
      return {
        ...state,
        [action.addressType]: { ...state[action.addressType], [action.field || 'address']: action.value }
      };
    }
    case 'UPDATE_FULL_ADDRESS': {
       const { addressType, index, address, lat, lng } = action.payload;
       let nextState = { ...state };
       if (addressType === 'waypoint') {
         nextState.waypoints = state.waypoints.map((wp, i) => 
           i === index ? { ...wp, address, lat, lng } : wp
         );
       } else if (addressType === 'returnWaypoint') {
         nextState.returnWaypoints = state.returnWaypoints.map((wp, i) => 
           i === index ? { ...wp, address, lat, lng } : wp
         );
       } else {
         nextState[addressType] = { ...state[addressType], address, lat, lng };
       }
       return nextState;
    }
    case 'ADD_WAYPOINT':
      return { ...state, waypoints: [...state.waypoints, { id: Date.now(), address: '', detail: '', lat: null, lng: null, distFromPrev: 0 }] };
    case 'REMOVE_WAYPOINT':
      return { ...state, waypoints: state.waypoints.filter((_, i) => i !== action.index) };
    case 'ADD_RETURN_WAYPOINT':
      return { ...state, returnWaypoints: [...state.returnWaypoints, { id: Date.now(), address: '', detail: '', lat: null, lng: null, distFromPrev: 0 }] };
    case 'REMOVE_RETURN_WAYPOINT':
      return { ...state, returnWaypoints: state.returnWaypoints.filter((_, i) => i !== action.index) };
    case 'ADJUST_QTY':
      return { ...state, [action.busType]: Math.max(0, (state[action.busType] || 0) + action.delta) };
    case 'SET_INITIAL_DATES':
      return { ...state, departureDate: action.today, arrivalDate: action.today };
    case 'SET_BUS_TYPES':
      return { ...state, busTypes: action.payload };
    case 'SET_OPTIMIZED_PATH': {
      const { waypoints, returnWaypoints, totalDistance } = action.payload;
      return { ...state, waypoints, returnWaypoints, totalDistance };
    }
    default:
      return state;
  }
}

const BusCard = ({ title, img, type, qty, price, desc, color, fuelCost, adjustQty, handleChange }) => (
  <div className="group bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden hover:shadow-xl transition-all p-4">
    <div className="flex gap-4 mb-4">
      <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 border border-white shadow-sm">
        <img className="w-full h-full object-cover" src={img} alt={title} />
      </div>
      <div className="flex-1">
        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1 text-white bg-${color}`}>
          {title.split(' ')[0]}
        </div>
        <h4 className="font-bold text-slate-800 text-sm">{title}</h4>
        <p className="text-[10px] text-slate-400 mt-1">{desc}</p>
      </div>
    </div>
    
    <div className="space-y-3 pt-3 border-t border-slate-200/50">
      <div className="flex items-center justify-between">
         <span className="text-[11px] font-bold text-slate-500 uppercase">차량 대수</span>
         <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-full px-2 py-1">
           <button type="button" onClick={() => adjustQty(`${type}Qty`, -1)} className="w-6 h-6 rounded-full hover:bg-slate-100 text-primary flex items-center justify-center">
             <span className="material-symbols-outlined text-[14px]">remove</span>
           </button>
           <span className="text-sm font-black w-4 text-center">{qty}</span>
           <button type="button" onClick={() => adjustQty(`${type}Qty`, 1)} className="w-6 h-6 rounded-full hover:bg-slate-100 text-primary flex items-center justify-center">
             <span className="material-symbols-outlined text-[14px]">add</span>
           </button>
         </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500">
         <div className="bg-white p-2 rounded-lg border border-slate-100">
           <p className="font-bold mb-1">연료비</p>
           <p className={fuelCost > 0 ? "text-primary font-black" : "text-slate-400"}>
             {fuelCost > 0 ? `₩${formatComma(fuelCost)}` : "자동 계산 예정"}
           </p>
         </div>
         <div className="bg-white p-2 rounded-lg border border-slate-100">
           <p className="font-bold mb-1">톨게이트 비</p>
           <p className="text-slate-400">자동 계산 예정</p>
         </div>
      </div>

      <div>
         <p className="text-[11px] font-bold text-slate-500 uppercase mb-1">버스 가격 (1대당)</p>
         <div className="relative">
           <input 
             type="text"
             name={`${type}Price`}
             value={formatComma(price)}
             onChange={handleChange}
             placeholder="0"
             className="w-full bg-white border border-slate-200 rounded-lg p-2 text-right pr-6 font-bold text-primary focus:ring-2 focus:ring-primary/20 transition-all"
           />
           <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">원</span>
         </div>
      </div>
    </div>
  </div>
);

const CreateBusRequest = ({ user: userProp, onBack, onSuccess }) => {
  const [formData, dispatch] = React.useReducer(reducer, initialState);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const modalRef = React.useRef(null);

  React.useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    dispatch({ type: 'SET_INITIAL_DATES', today });
    
    // Fetch Bus Types for Fuel Efficiency (CD_FNUM)
    const fetchBusTypes = async () => {
       try {
          const res = await fetch('http://localhost:8080/api/common-codes?grpCd=BUS_TYPE');
          if (res.ok) {
             const data = await res.json();
             dispatch({ type: 'SET_BUS_TYPES', payload: data.items });
          }
       } catch (err) { console.error('Failed to fetch bus types:', err); }
    };
    fetchBusTypes();

    if (modalRef.current) {
      modalRef.current.focus();
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.endsWith('Price')) {
        dispatch({ type: 'SET_FIELD', name, value: parseComma(value) });
        return;
    }
    dispatch({ type: 'SET_FIELD', name, value });
  };

  const handleAddressChange = (type, value, index = null, field = 'detail') => {
    dispatch({ type: 'SET_ADDRESS', addressType: type, field, value, index });
  };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return parseFloat((R * c).toFixed(2));
  };

  const openPostcode = (type, index = null) => {
    // Get existing address to use as search query
    let initialQuery = '';
    if (type === 'waypoint') initialQuery = formData.waypoints[index]?.address;
    else if (type === 'returnWaypoint') initialQuery = formData.returnWaypoints[index]?.address;
    else initialQuery = formData[type]?.address || '';

    if (!window.daum || !window.daum.Postcode) {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    new window.daum.Postcode({
      oncomplete: (data) => {
        const fullAddress = data.address;
        
        // Use Kakao Geocoder to get coordinates
        if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
           const geocoder = new window.kakao.maps.services.Geocoder();
           geocoder.addressSearch(fullAddress, (result, status) => {
              if (status === window.kakao.maps.services.Status.OK) {
                 const lat = parseFloat(result[0].y);
                 const lng = parseFloat(result[0].x);
                 dispatch({ 
                    type: 'UPDATE_FULL_ADDRESS', 
                    payload: { addressType: type, index, address: fullAddress, lat, lng }
                 });
              } else {
                 // Fallback if geocoding fails
                 dispatch({ type: 'SET_ADDRESS', addressType: type, field: 'address', value: fullAddress, index });
              }
           });
        } else {
           dispatch({ type: 'SET_ADDRESS', addressType: type, field: 'address', value: fullAddress, index });
        }
      }
    }).open({
      q: initialQuery // Pass existing text as search query
    });
  };

  const handleKeyDown = (e, type, index = null) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      openPostcode(type, index);
    }
  };

  const addWaypoint = () => {
    dispatch({ type: 'ADD_WAYPOINT' });
  };

  const removeWaypoint = (index) => {
    dispatch({ type: 'REMOVE_WAYPOINT', index });
  };

  const adjustQty = (busType, delta) => {
    dispatch({ type: 'ADJUST_QTY', busType, delta });
  };

  const calculateAndSortPath = async () => {
    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
      alert('카카오 지도 라이브러리가 로드되지 않았습니다.');
      return;
    }

    const geocoder = new window.kakao.maps.services.Geocoder();

    const getCoords = (addr) => {
      return new Promise((resolve) => {
        if (!addr) return resolve(null);
        geocoder.addressSearch(addr, (result, status) => {
          if (status === window.kakao.maps.services.Status.OK) {
            resolve({ lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) });
          } else {
            resolve(null);
          }
        });
      });
    };

    const processPoint = async (point) => {
      if (point.lat && point.lng) return point;
      const coords = await getCoords(point.address);
      return coords ? { ...point, ...coords } : point;
    };

    // Geocode all points that might be missing coordinates
    const updatedDeparture = await processPoint(formData.departure);
    const updatedArrival = await processPoint(formData.arrival);
    const updatedFinalArrival = await processPoint(formData.finalArrival);
    
    const updatedWaypoints = await Promise.all(
      formData.waypoints.map(wp => processPoint(wp))
    );
    const updatedReturnWaypoints = await Promise.all(
      formData.returnWaypoints.map(wp => processPoint(wp))
    );

    const sortPoints = (start, candidates) => {
       let sorted = [];
       let current = start;
       let pool = [...candidates].filter(c => c.lat && c.lng);
       
       while (pool.length > 0) {
          let nearestIdx = 0;
          let minDist = Infinity;
          for(let i=0; i<pool.length; i++) {
             const d = getDistance(current.lat, current.lng, pool[i].lat, pool[i].lng);
             if(d < minDist) { minDist = d; nearestIdx = i; }
          }
          current = pool[nearestIdx];
          sorted.push(current);
          pool.splice(nearestIdx, 1);
       }
       return sorted;
    };

    // [근본 해결] 경유지 목록에서 출발지 또는 도착지와 주소가 중복되는 항목 제거
    const filterDuplicates = (candidates, ...pointsToExclude) => {
      const addressesToExclude = pointsToExclude.map(p => p.address?.trim()).filter(Boolean);
      return candidates.filter(cp => {
        const addr = cp.address?.trim();
        return addr && !addressesToExclude.includes(addr);
      });
    };

    const uniqueWaypoints = filterDuplicates(updatedWaypoints, updatedDeparture, updatedArrival);
    const uniqueReturnWaypoints = filterDuplicates(updatedReturnWaypoints, updatedArrival, updatedFinalArrival);

    // 1. Sort Start Waypoints
    const sortedWaypoints = sortPoints(updatedDeparture, uniqueWaypoints);
    
    // 2. Sort Return Waypoints
    const sortedReturnWaypoints = sortPoints(updatedArrival, uniqueReturnWaypoints);

    // 3. Calculate Total Distance
    let totalDist = 0;
    const finalPoints = [
      updatedDeparture,
      ...sortedWaypoints,
      updatedArrival,
      ...sortedReturnWaypoints,
      updatedFinalArrival
    ].filter(p => p.lat && p.lng);

    for(let i=1; i<finalPoints.length; i++) {
       totalDist += getDistance(finalPoints[i-1].lat, finalPoints[i-1].lng, finalPoints[i].lat, finalPoints[i].lng);
    }

    dispatch({ 
      type: 'SET_OPTIMIZED_PATH', 
      payload: { 
        waypoints: sortedWaypoints, 
        returnWaypoints: sortedReturnWaypoints, 
        totalDistance: totalDist 
      } 
    });
    alert(`경로 최적화 및 연비 계산이 완료되었습니다.\n총 예상 이동 거리: ${totalDist.toFixed(1)}km`);
  };

  const getFuelCost = (busType) => {
    if (!formData.totalDistance) return 0;
    const busInfo = formData.busTypes.find(b => b.dtlCd === busType);
    if (!busInfo || !busInfo.cdFnum || busInfo.cdFnum <= 0) return 0;
    
    const fuelPrice = 1600; // 고정 유가 (디젤 기준)
    const cost = (formData.totalDistance / busInfo.cdFnum) * fuelPrice;
    return Math.floor(cost / 100) * 100; // 100원 단위 절사
  };

  const getBusTotal = (qty, price) => (qty || 0) * (price || 0);
  
  const totalAmount = 
    getBusTotal(formData.premiumQty, formData.premiumPrice) +
    getBusTotal(formData.standardQty, formData.standardPrice) +
    getBusTotal(formData.premiumGoldQty, formData.premiumGoldPrice) +
    getBusTotal(formData.vvipQty, formData.vvipPrice) +
    getBusTotal(formData.miniBusQty, formData.miniBusPrice) +
    getBusTotal(formData.largeVanQty, formData.largeVanPrice);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
        let currentUser = userProp || JSON.parse(localStorage.getItem('user'));
        
        // Prepare journey point sequence for database storage
        // Sequence: Departure -> Waypoints -> Arrival -> ReturnWaypoints -> FinalArrival
        const mainJourney = [
          { ...formData.departure, type: 'START_NODE' },
          ...formData.waypoints.map(wp => ({ ...wp, type: 'START_WAY' })),
          { ...formData.arrival, type: 'ROUND_TRIP' }
        ];

        const returnJourney = [
          ...formData.returnWaypoints.map(wp => ({ ...wp, type: 'END_WAY' })),
          { ...formData.finalArrival, type: 'END_NODE' }
        ];

        // [중복 제거] 주소가 비어있거나, 이전 지점과 공백 제외 주소가 완전히 동일한 경우 필터링
        const cleanedPoints = [...mainJourney, ...returnJourney].filter((p, i, arr) => {
          const currentAddr = p.address?.replace(/\s/g, ''); // 공백 제거 후 비교
          if (!currentAddr) return false;
          if (i > 0) {
            const prevAddr = arr[i-1].address?.replace(/\s/g, '');
            if (currentAddr === prevAddr) return false;
          }
          return true;
        });

        const allPoints = cleanedPoints;

        // Format for backend with sequential VIA_ORD
        const enrichedWaypoints = allPoints.map((p, i) => {
            // 강제 타입 지정: 첫 번째는 무조건 START_NODE, 나머지는 원래 타입 유지하되 START_NODE가 또 나오면 START_WAY로 교정
            let type = p.type;
            if (i === 0) type = 'START_NODE';
            else if (type === 'START_NODE') type = 'START_WAY';
            
            return {
                address: `${p.address} ${p.detail || ''}`.trim(),
                lat: p.lat,
                lng: p.lng,
                type: type,
                ord: i + 1
            };
        });

        const payload = {
            custId: currentUser.custId,   // [수정] 10자리 숫자 식별자 전달
            userId: currentUser.userId,   // 로그인 아이디(이메일) 전달
            tripTitle: formData.title,
            startAddr: enrichedWaypoints[0].address,
            endAddr: enrichedWaypoints[enrichedWaypoints.length - 1].address,
            startDt: `${formData.departureDate} ${formData.departureTime}:00`,
            endDt: `${formData.arrivalDate} ${formData.arrivalTime}:00`,
            passengerCnt: 0, // 승차인원 항목 삭제에 따른 기본값 처리
            totalAmount: totalAmount,
            waypoints: enrichedWaypoints,
            vehicles: [
                { type: 'STANDARD_28', qty: formData.standardQty, price: Number(String(formData.standardPrice || 0).replace(/[^0-9]/g, '')) || 0 },
                { type: 'PREMIUM_45', qty: formData.premiumQty, price: Number(String(formData.premiumPrice || 0).replace(/[^0-9]/g, '')) || 0 },
                { type: 'GOLD_21', qty: formData.premiumGoldQty, price: Number(String(formData.premiumGoldPrice || 0).replace(/[^0-9]/g, '')) || 0 },
                { type: 'VVIP_16', qty: formData.vvipQty, price: Number(String(formData.vvipPrice || 0).replace(/[^0-9]/g, '')) || 0 },
                { type: 'MINI_25', qty: formData.miniBusQty, price: Number(String(formData.miniBusPrice || 0).replace(/[^0-9]/g, '')) || 0 },
                { type: 'VAN_11', qty: formData.largeVanQty, price: Number(String(formData.largeVanPrice || 0).replace(/[^0-9]/g, '')) || 0 }
            ].filter(v => v.qty > 0)
        };

        // [디버깅] 전송 전 사용자에게 데이터 확인 받기
        const confirmMsg = `[데이터 전송 확인]\n\n` +
                           `1. 총 금액: ${totalAmount}원\n` +
                           `2. 경로 순서:\n${enrichedWaypoints.map(w => `${w.ord}. [${w.type}] ${w.address}`).join('\n')}\n\n` +
                           `위 데이터로 등록하시겠습니까?`;
        
        if (!window.confirm(confirmMsg)) {
            setIsSubmitting(false);
            return;
        }

        console.log('[DEBUG] Reservation Payload:', JSON.stringify(payload, null, 2));

        const response = await fetch('http://localhost:8080/api/auction/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            alert('버스요청등록이 완료되었습니다.');
            onSuccess();
        } else {
            alert('저장 실패');
        }
    } catch (e) {
        alert('통신 오류');
    } finally {
        setIsSubmitting(false);
    }
  };


  return (
    <div 
      ref={modalRef}
      tabIndex="-1"
      className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md overflow-y-auto animate-in fade-in duration-300 flex items-center justify-center p-4 outline-none"
    >
      <div className="w-full max-w-[1240px] h-[95vh] bg-white rounded-[40px] shadow-2xl relative overflow-y-auto overflow-x-hidden animate-in zoom-in-95 duration-300 border border-white/20">
      <nav className="bg-white/90 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-50 rounded-full transition-all">
              <span className="material-symbols-outlined text-slate-600">close</span>
            </button>
            <div>
               <h2 className="font-black text-2xl tracking-tighter text-slate-800">여행버스 예약 등록</h2>
               <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Premium Concierge Service</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
             <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">실시간 총 견적</p>
                <p className="text-2xl font-black text-primary">₩{formatComma(totalAmount)}</p>
             </div>
             <button 
               onClick={handleSubmit} 
               disabled={isSubmitting}
               className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-primary/20 active:scale-95 transition-all"
             >
               등록 완료
             </button>
          </div>
        </div>
      </nav>

      <div className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-8 space-y-20">
            <section>
              <h3 className="text-3xl font-black tracking-tight mb-8 flex items-center gap-3">
                <span className="w-1.5 h-8 bg-primary rounded-full"></span>
                여정 정보
              </h3>
              <div className="space-y-8 bg-slate-50/50 p-8 rounded-3xl border border-slate-100 shadow-sm transition-all hover:bg-white hover:shadow-xl group">
                <div className="grid grid-cols-2 gap-8">
                   <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">출발 일시</label>
                      <div className="flex gap-3">
                         <input type="date" name="departureDate" value={formData.departureDate} onChange={handleChange} className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 text-xl font-black text-slate-700 shadow-sm focus:ring-4 focus:ring-primary/5 transition-all" />
                         <input type="time" name="departureTime" value={formData.departureTime} onChange={handleChange} className="w-32 bg-white border border-slate-200 rounded-2xl p-4 text-xl font-black text-slate-700 shadow-sm focus:ring-4 focus:ring-primary/5 transition-all" />
                      </div>
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">도착 일시</label>
                      <div className="flex gap-3">
                         <input type="date" name="arrivalDate" value={formData.arrivalDate} onChange={handleChange} className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 text-xl font-black text-slate-700 shadow-sm focus:ring-4 focus:ring-primary/5 transition-all" />
                         <input type="time" name="arrivalTime" value={formData.arrivalTime} onChange={handleChange} className="w-32 bg-white border border-slate-200 rounded-2xl p-4 text-xl font-black text-slate-700 shadow-sm focus:ring-4 focus:ring-primary/5 transition-all" />
                      </div>
                   </div>
                </div>
                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">여정 제목</label>
                   <input 
                     type="text" 
                     name="title"
                     value={formData.title}
                     onChange={handleChange}
                     className="w-full bg-white border border-slate-200 rounded-2xl p-6 text-xl font-bold placeholder:text-slate-300 focus:ring-4 focus:ring-primary/5 transition-all"
                     placeholder="예: 2024년 하계 정기 워크숍"
                   />
                </div>
              </div>
            </section>
            <section>
              <h3 className="text-3xl font-black tracking-tight mb-8">경로 설정</h3>
              <div className="space-y-4 relative">
                <div className="bg-slate-50 p-6 rounded-2xl space-y-4 border border-slate-200/50">
                   <div className="flex items-start gap-4">
                     <span className="material-symbols-outlined text-primary mt-1">location_on</span>
                     <div className="flex-1">
                        <div className="flex gap-2">
                           <input value={formData.departure.address} onKeyDown={(e) => handleKeyDown(e, 'departure')} onChange={(e) => handleAddressChange('departure', e.target.value, null, 'address')} placeholder="출발지를 검색하거나 입력하세요" className="flex-1 bg-white border border-slate-200 rounded-lg p-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                           <button onClick={() => openPostcode('departure')} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold">검색</button>
                        </div>
                        <input placeholder="상세 위치" value={formData.departure.detail} onChange={(e) => handleAddressChange('departure', e.target.value)} className="w-full mt-2 bg-white/50 border border-slate-200 rounded-lg p-2 text-xs" />
                     </div>
                   </div>
                   {formData.waypoints.map((wp, i) => (
                     <div key={wp.id} className="flex items-start gap-4 animate-in slide-in-from-left-2 duration-200">
                        <span className="material-symbols-outlined text-slate-400 mt-1">more_vert</span>
                        <div className="flex-1">
                            <div className="flex gap-2">
                               <input value={wp.address} onKeyDown={(e) => handleKeyDown(e, 'waypoint', i)} onChange={(e) => handleAddressChange('waypoint', e.target.value, i, 'address')} placeholder={`경유지 ${i+1}`} className="flex-1 bg-white border border-slate-200 rounded-lg p-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                               <button onClick={() => openPostcode('waypoint', i)} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold">검색</button>
                               <button onClick={() => removeWaypoint(i)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                            </div>
                        </div>
                     </div>
                   ))}
                   <button onClick={addWaypoint} className="ml-10 text-xs font-black text-primary border-b border-primary/30 pb-0.5">+ 경유지 추가</button>
                   <div className="flex items-start gap-4 pt-4 border-t border-slate-200/40">
                     <span className="material-symbols-outlined text-secondary mt-1">flag</span>
                     <div className="flex-1">
                        <div className="flex gap-2">
                           <input value={formData.arrival.address} onKeyDown={(e) => handleKeyDown(e, 'arrival')} onChange={(e) => handleAddressChange('arrival', e.target.value, null, 'address')} placeholder="목적지를 검색하거나 입력하세요" className="flex-1 bg-white border border-slate-200 rounded-lg p-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                           <button onClick={() => openPostcode('arrival')} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold">검색</button>
                        </div>
                        <input placeholder="상세 위치" value={formData.arrival.detail} onChange={(e) => handleAddressChange('arrival', e.target.value, null, 'detail')} className="w-full mt-2 bg-white/50 border border-slate-200 rounded-lg p-2 text-xs" />
                        
                        <button onClick={() => dispatch({ type: 'ADD_RETURN_WAYPOINT' })} className="mt-4 text-xs font-black text-primary border-b border-primary/30 pb-0.5 whitespace-nowrap">
                           + 경유지 추가
                        </button>
                        
                        <div className="mt-6 space-y-4">
                           {formData.returnWaypoints.map((wp, i) => (
                              <div key={wp.id} className="flex items-start gap-4 animate-in slide-in-from-left-2 duration-200">
                                  <span className="material-symbols-outlined text-slate-400 mt-1">more_vert</span>
                                  <div className="flex-1">
                                      <div className="flex gap-2">
                                        <input value={wp.address} onKeyDown={(e) => handleKeyDown(e, 'returnWaypoint', i)} onChange={(e) => handleAddressChange('returnWaypoint', e.target.value, i, 'address')} placeholder={`도착지 검색 ${i+1}`} className="flex-1 bg-white border border-slate-200 rounded-lg p-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                                        <button onClick={() => openPostcode('returnWaypoint', i)} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold">검색</button>
                                        <button onClick={() => dispatch({ type: 'REMOVE_RETURN_WAYPOINT', index: i })} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                      </div>
                                  </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
                  <div className="flex items-start gap-4 pt-4 border-t border-slate-200/40">
                     <span className="material-symbols-outlined text-primary mt-1">location_on</span>
                     <div className="flex-1">
                        <div className="flex gap-2">
                           <input value={formData.finalArrival.address} onKeyDown={(e) => handleKeyDown(e, 'finalArrival')} onChange={(e) => handleAddressChange('finalArrival', e.target.value, null, 'address')} placeholder="최종 도착지를 검색하세요" className="flex-1 bg-white border border-slate-200 rounded-lg p-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                           <button onClick={() => openPostcode('finalArrival')} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold">검색</button>
                        </div>
                        <input placeholder="상세 위치" value={formData.finalArrival.detail} onChange={(e) => handleAddressChange('finalArrival', e.target.value, null, 'detail')} className="w-full mt-2 bg-white/50 border border-slate-200 rounded-lg p-2 text-xs" />
                     </div>
                  </div>
                 </div>
              </div>
            </section>
            <section>
              <div className="flex items-end justify-between mb-8">
                 <h3 className="text-3xl font-black tracking-tight">차량 선택</h3>
                 <button 
                  onClick={calculateAndSortPath}
                  className="flex items-center gap-2 px-5 py-2 bg-primary/10 text-primary font-bold rounded-full text-xs hover:bg-primary/20 transition-all shadow-sm active:scale-95"
                 >
                    <span className="material-symbols-outlined text-[18px]">auto_fix</span>
                    연비 계산 및 경로 최적화
                 </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <BusCard title="프리미엄 골드 (21석)" img="/images/buses/premium_gold.png" type="premiumGold" qty={formData.premiumGoldQty} price={formData.premiumGoldPrice} color="[#D4AF37]" fuelCost={getFuelCost('GOLD_21')} desc="최고급 전용 좌석" adjustQty={adjustQty} handleChange={handleChange} />
                 <BusCard title="V-VIP 리무진 (16석)" img="/images/buses/v_vip.png" type="vvip" qty={formData.vvipQty} price={formData.vvipPrice} color="black" fuelCost={getFuelCost('VVIP_16')} desc="최상위 의전용 차량" adjustQty={adjustQty} handleChange={handleChange} />
                 <BusCard title="우등 고속 (28석)" img="https://lh3.googleusercontent.com/aida-public/AB6AXuAGncAn9mwP0CppdRcVNcRyyp7BM0Fwr-7IAo-UukujgT7dSh2z_8Ba0-8jHE15cYFNL1CW_lTPzVeSOiKP9OvIwyPH7sUwITsY_pZIwfEo8Us4ucyhl70uOHt6njBNLkODWl9T37DIWWsUWRerSxgzmhYBw7L-a45ye0ewYfPS9sY9Dj9O2wx2Q62XKSoHR7t0ol0eOTUQGqVGpnA0hqylsq4zJc6AmqSUSV_9IzmJGprI0TaVm5kP2ih028fYvHDVfAjM1oqvTLE" type="premium" qty={formData.premiumQty} price={formData.premiumPrice} color="primary" fuelCost={getFuelCost('STANDARD_28')} desc="안락한 우등 버스" adjustQty={adjustQty} handleChange={handleChange} />
                 <BusCard title="일반 고속 (45석)" img="https://lh3.googleusercontent.com/aida-public/AB6AXuAfK78k5ZUsYSniO-ql0ZmiRyc1AoDCtW69CIjw1G3fTvwXaM1WWnx61DQshz68pgzkuOrTbpW-B4_scGSd1XIdySNfhJkSxYFdvur9B5KpmX3CYtQox2eqsSZz0jRCDYbDnLr6cuy_GAOlx3wl7CJW_h2BtJGU-zroRQYQy35IvU5-eweGfcCFLRdaOkScLoUdn4B3rdiS4Mb-7xWuAHQKFhKLuIBuk654T5MMPKbt2cIwMoS1KcLILRtEGlFw4wBHN2o_oisl0go" type="standard" qty={formData.standardQty} price={formData.standardPrice} color="slate-400" fuelCost={getFuelCost('PREMIUM_45')} desc="합리적인 단체 이동" adjustQty={adjustQty} handleChange={handleChange} />
                 <BusCard title="중형 미니버스 (25석)" img="/images/buses/mini_bus.png" type="miniBus" qty={formData.miniBusQty} price={formData.miniBusPrice} color="secondary" fuelCost={getFuelCost('MINI_25')} desc="소규모 실속 여정" adjustQty={adjustQty} handleChange={handleChange} />
                 <BusCard title="대형 밴 (11석)" img="/images/buses/large_van.png" type="largeVan" qty={formData.largeVanQty} price={formData.largeVanPrice} color="primary" fuelCost={getFuelCost('VAN_11')} desc="소수 VIP 전문 차량" adjustQty={adjustQty} handleChange={handleChange} />
              </div>
            </section>
          </div>
          <div className="lg:col-span-4">
             <div className="sticky top-32 bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl shadow-slate-900/20 overflow-hidden">
                <div className="relative z-10">
                   <h4 className="text-xs font-black text-slate-400 uppercase tracking-[4px] mb-8">Summary</h4>
                   <h2 className="text-2xl font-black mb-10 leading-tight">예상 견적 상세</h2>
                   <div className="space-y-6 mb-12">
                      {[
                        { label: '프리미엄 골드 (21석)', qty: formData.premiumGoldQty, price: formData.premiumGoldPrice },
                        { label: 'V-VIP 리무진 (16석)', qty: formData.vvipQty, price: formData.vvipPrice },
                        { label: '우등 고속 (28석)', qty: formData.premiumQty, price: formData.premiumPrice },
                        { label: '일반 고속 (45석)', qty: formData.standardQty, price: formData.standardPrice },
                        { label: '중형 미니버스 (25석)', qty: formData.miniBusQty, price: formData.miniBusPrice },
                        { label: '대형 밴 (11석)', qty: formData.largeVanQty, price: formData.largeVanPrice }
                      ].filter(v => v.qty > 0).map((v, i) => (
                        <div key={i} className="flex justify-between items-end animate-in fade-in slide-in-from-bottom-2">
                           <div className="text-slate-400">
                             <p className="text-[10px] font-bold uppercase">{v.label}</p>
                             <p className="text-sm font-medium">₩{formatComma(v.price)} × {v.qty}대</p>
                           </div>
                           <p className="text-lg font-black text-primary-fixed">₩{formatComma(v.price * v.qty)}</p>
                        </div>
                      ))}
                      {totalAmount === 0 && (
                        <p className="text-sm text-slate-500 italic py-8 border-y border-white/10 text-center">선택한 차량이 없습니다.</p>
                      )}
                   </div>
                   <div className="pt-8 border-t border-white/10">
                      <div className="flex justify-between items-end mb-10">
                         <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Amount</p>
                            <p className="text-5xl font-black tracking-tighter text-white">
                               <span className="text-primary-fixed text-3xl mr-1">₩</span>
                               {formatComma(totalAmount)}
                            </p>
                         </div>
                      </div>
                      <button 
                        onClick={handleSubmit}
                        disabled={isSubmitting || totalAmount === 0}
                        className={`w-full py-6 rounded-2xl bg-white text-slate-900 font-black text-xl hover:bg-primary-fixed hover:text-white transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:pointer-events-none`}
                      >
                        등록 신청하기
                      </button>
                   </div>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl -ml-32 -mb-32"></div>
             </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default CreateBusRequest;

