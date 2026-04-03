import React from 'react';

const initialState = {
  title: '',
  boardingCount: 0,
  departure: { address: '', detail: '' },
  arrival: { address: '', detail: '' },
  waypoints: [],
  departureDate: '', // Set in useEffect
  departureTime: '00:00',
  arrivalDate: '',
  arrivalTime: '12:00',
  premiumQty: 0,
  standardQty: 0,
  premiumGoldQty: 0,
  vvipQty: 0,
  miniBusQty: 0,
  largeVanQty: 0,
};

function reducer(state, action) {
  console.log('Reducer Action:', action.type, action.payload);
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.name]: action.value };
    case 'SET_ADDRESS':
      if (action.addressType === 'waypoint') {
        const newWaypoints = state.waypoints.map((wp, i) => 
          i === action.index ? { ...wp, [action.field]: action.value } : wp
        );
        return { ...state, waypoints: newWaypoints };
      }
      return {
        ...state,
        [action.addressType]: { ...state[action.addressType], [action.field]: action.value }
      };
    case 'ADD_WAYPOINT':
      return { ...state, waypoints: [...state.waypoints, { id: Date.now(), address: '', detail: '' }] };
    case 'REMOVE_WAYPOINT':
      return { ...state, waypoints: state.waypoints.filter((_, i) => i !== action.index) };
    case 'ADJUST_QTY':
      return { ...state, [action.busType]: Math.max(0, (state[action.busType] || 0) + action.delta) };
    case 'SET_INITIAL_DATES':
      return { ...state, departureDate: action.today, arrivalDate: action.today };
    default:
      return state;
  }
}

const CreateBusRequest = ({ user: userProp, onBack, onSuccess }) => {
  const [formData, dispatch] = React.useReducer(reducer, initialState);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    dispatch({ type: 'SET_INITIAL_DATES', today });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const finalValue = name === 'boardingCount' ? (parseInt(value) || 0) : value;
    dispatch({ type: 'SET_FIELD', name, value: finalValue });
  };

  const handleAddressChange = (type, value, index = null) => {
    dispatch({ type: 'SET_ADDRESS', addressType: type, field: 'detail', value, index });
  };

  const openPostcode = (type, index = null) => {
    console.log('Opening Postcode for:', type, index);
    if (!window.daum || !window.daum.Postcode) {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    new window.daum.Postcode({
      oncomplete: (data) => {
        let fullAddress = data.address;
        let extraAddress = '';

        if (data.addressType === 'R') {
          if (data.bname !== '') extraAddress += data.bname;
          if (data.buildingName !== '') extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
          fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
        }
        
        console.log('Postcode oncomplete called:', fullAddress);
        dispatch({ type: 'SET_ADDRESS', addressType: type, field: 'address', value: fullAddress, index });
      }
    }).open();
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

  // 예상 견적 계산 (동적)
  const basePrice = 
    (formData.premiumQty || 0) * 850000 + 
    (formData.standardQty || 0) * 650000 + 
    (formData.premiumGoldQty || 0) * 1100000 + 
    (formData.vvipQty || 0) * 1300000 + 
    (formData.miniBusQty || 0) * 550000 + 
    (formData.largeVanQty || 0) * 450000;

  const distanceSurcharge = 85000 + (formData.waypoints.length * 20000); // 경유지당 추가금 가정
  const totalVehicles = (formData.premiumQty || 0) + (formData.standardQty || 0) + (formData.premiumGoldQty || 0) + (formData.vvipQty || 0) + (formData.miniBusQty || 0) + (formData.largeVanQty || 0);
  const total = basePrice + distanceSurcharge + 15000 + 25000;

  const handleSubmit = async () => {
    const errors = [];
    if (!formData.title.trim()) errors.push('여정 제목');
    if (formData.boardingCount <= 0) errors.push('승차 인원 (1명 이상)');
    if (!formData.departure.address) errors.push('출발지');
    if (!formData.arrival.address) errors.push('도착지');
    if (totalVehicles <= 0) errors.push('차량 선택 (최소 1대 이상)');

    if (errors.length > 0) {
      alert(`필수 입력 항목이 누락되었습니다:\n\n${errors.map(err => `• ${err}`).join('\n')}`);
      return;
    }

    setIsSubmitting(true);
    try {
      let currentUser = userProp;

      if (!currentUser) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          currentUser = JSON.parse(userStr);
        }
      }

      if (!currentUser || !currentUser.userUuid) {
        alert('로그인 정보가 없습니다. 다시 로그인해주세요.');
        return;
      }
      
      const payload = {
        userUuid: currentUser.userUuid,
        tripTitle: formData.title,
        startAddr: `${formData.departure.address} ${formData.departure.detail}`.trim(),
        endAddr: `${formData.arrival.address} ${formData.arrival.detail}`.trim(),
        startDt: `${formData.departureDate} ${formData.departureTime}:00`,
        endDt: `${formData.arrivalDate} ${formData.arrivalTime}:00`,
        passengerCnt: parseInt(formData.boardingCount),
        totalAmount: total,
        waypoints: formData.waypoints.map(wp => ({
          address: `${wp.address} ${wp.detail}`.trim()
        })),
        vehicles: [
          { type: 'STANDARD_28', qty: formData.standardQty },
          { type: 'PREMIUM_45', qty: formData.premiumQty },
          { type: 'GOLD_21', qty: formData.premiumGoldQty },
          { type: 'VVIP_16', qty: formData.vvipQty },
          { type: 'MINI_25', qty: formData.miniBusQty },
          { type: 'VAN_11', qty: formData.largeVanQty }
        ].filter(v => v.qty > 0)
      };

      const response = await fetch('http://localhost:8080/api/auction/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok) {
        alert('버스요청등록이 완료되었습니다.');
        if (onSuccess) {
          onSuccess();
        } else {
          onBack();
        }
      } else {
        alert(`저장 실패: ${result.error || '알 수 없는 오류가 발생했습니다.'}`);
      }
    } catch (error) {
      console.error('Submit Error:', error);
      alert('서버와의 통신 중 오류가 발생했습니다. 백엔드 서버가 실행 중인지 확인해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background text-on-surface font-body min-h-screen">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-xl border-b border-surface-variant/30 sticky top-0 z-40">
        <div className="max-w-[1440px] mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              type="button"
              id="back-button"
              onClick={onBack}
              className="p-2 hover:bg-surface-container-high rounded-full transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h2 className="font-headline font-bold text-xl tracking-tight">견적 요청하기</h2>
          </div>
          <div className="flex items-center gap-2 text-primary font-bold text-sm bg-primary/5 px-4 py-2 rounded-full">
            <span className="material-symbols-outlined text-sm">info</span>
            에디토리얼 벨로시티 프리미엄 서비스
          </div>
        </div>
      </nav>

      <main className="pt-12 pb-24 px-8 max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left: Editorial Form Section */}
          <div className="lg:col-span-8 space-y-16">
            {/* Journey Identity */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <span className="text-secondary font-bold uppercase tracking-widest text-xs mb-4 block">01단계</span>
              <h1 className="text-5xl md:text-6xl font-extrabold font-headline tracking-tighter mb-8 leading-tight">
                여정 <br/><span className="text-primary italic">정보</span>
              </h1>
              <div className="bg-surface-container-low p-8 rounded-xl shadow-sm space-y-6">
                <div>
                  <label className="block text-xs font-bold text-outline mb-2 uppercase tracking-tight">여정 제목</label>
                  <input 
                    className="w-full bg-surface-container-lowest border-none rounded-lg p-4 text-lg focus:ring-2 focus:ring-primary/20 placeholder:text-surface-dim transition-all shadow-inner" 
                    placeholder="예: 2024 하계 워크숍 부산행" 
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-outline mb-2 uppercase tracking-tight">승차 인원</label>
                  <div className="flex items-center gap-4">
                    <input 
                      className="w-32 bg-surface-container-lowest border-none rounded-lg p-4 text-lg focus:ring-2 focus:ring-primary/20 placeholder:text-surface-dim transition-all shadow-inner" 
                      placeholder="0" 
                      type="number"
                      name="boardingCount"
                      value={formData.boardingCount}
                      onChange={handleChange}
                      min="0"
                    />
                    <span className="text-on-surface font-bold">명</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Route Configuration */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
              <span className="text-secondary font-bold uppercase tracking-widest text-xs mb-4 block">02단계</span>
              <h2 className="text-4xl font-extrabold font-headline tracking-tight mb-8">경로 설정</h2>
              <div className="space-y-6">
                {/* Departure */}
                <div className="flex items-start gap-6 group">
                  <div className="mt-2 flex-none w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white shadow-lg">
                    <span className="material-symbols-outlined">location_on</span>
                  </div>
                  <div className="flex-grow space-y-2">
                    <div className="bg-surface-container-low p-4 rounded-xl flex items-center justify-between hover:bg-surface-container-high transition-colors">
                      <div className="flex-grow cursor-pointer" onClick={() => openPostcode('departure')}>
                        <label className="block text-[10px] font-bold text-outline uppercase">출발지</label>
                        <p className={`text-on-surface font-medium ${!formData.departure.address ? 'text-surface-dim' : ''}`}>
                          {formData.departure.address || '출발지를 검색하세요'}
                        </p>
                      </div>
                      <button type="button" id="search-departure" onClick={() => openPostcode('departure')} className="p-2 text-primary hover:bg-white rounded-full transition-all">
                        <span className="material-symbols-outlined">search</span>
                      </button>
                    </div>
                    {formData.departure.address && (
                      <input 
                        className="w-full bg-surface-container-lowest border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary/10 placeholder:text-surface-dim shadow-inner"
                        placeholder="상세 위치 (예: 역 앞 3번 출구)"
                        value={formData.departure.detail}
                        onChange={(e) => handleAddressChange('departure', e.target.value)}
                      />
                    )}
                  </div>
                </div>

                {/* Waypoints */}
                {formData.waypoints.map((wp, index) => (
                  <div key={wp.id} className="flex items-start gap-6 group animate-in slide-in-from-left-4 duration-300">
                    <div className="mt-2 flex-none w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-outline">
                      <span className="material-symbols-outlined">more_vert</span>
                    </div>
                    <div className="flex-grow space-y-2 relative">
                      <div className="bg-surface-container-low p-4 rounded-xl flex items-center justify-between hover:bg-surface-container-high transition-colors">
                        <div className="flex-grow cursor-pointer" onClick={() => openPostcode('waypoint', index)}>
                          <label className="block text-[10px] font-bold text-outline uppercase">경유지 {index + 1}</label>
                          <p className={`text-on-surface font-medium ${!wp.address ? 'text-surface-dim' : ''}`}>
                            {wp.address || '경유지를 검색하세요'}
                          </p>
                        </div>
                        <button type="button" id={`remove-waypoint-${index}`} onClick={() => removeWaypoint(index)} className="p-2 text-error hover:bg-error/10 rounded-full transition-all">
                          <span className="material-symbols-outlined">close</span>
                        </button>
                      </div>
                      {wp.address && (
                        <input 
                          className="w-full bg-surface-container-lowest border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary/10 placeholder:text-surface-dim shadow-inner"
                          placeholder="상세 위치 (선택 사항)"
                          value={wp.detail}
                          onChange={(e) => handleAddressChange('waypoint', e.target.value, index)}
                        />
                      )}
                    </div>
                  </div>
                ))}

                {/* Add Waypoint Button */}
                <div className="pl-18">
                  <button 
                    type="button"
                    id="add-waypoint-btn"
                    onClick={addWaypoint}
                    className="flex items-center gap-2 text-primary font-bold text-sm py-2 px-4 rounded-full border border-primary/20 hover:bg-primary/5 transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    경유지 추가
                  </button>
                </div>

                {/* Arrival */}
                <div className="flex items-start gap-6 group">
                  <div className="mt-2 flex-none w-12 h-12 rounded-full bg-gradient-to-br from-secondary to-secondary-container flex items-center justify-center text-white shadow-lg">
                    <span className="material-symbols-outlined">flag</span>
                  </div>
                  <div className="flex-grow space-y-2">
                    <div className="bg-surface-container-low p-4 rounded-xl flex items-center justify-between hover:bg-surface-container-high transition-colors">
                      <div className="flex-grow cursor-pointer" onClick={() => openPostcode('arrival')}>
                        <label className="block text-[10px] font-bold text-outline uppercase">도착지</label>
                        <p className={`text-on-surface font-medium ${!formData.arrival.address ? 'text-surface-dim' : ''}`}>
                          {formData.arrival.address || '도착지를 검색하세요'}
                        </p>
                      </div>
                      <button type="button" id="search-arrival" onClick={() => openPostcode('arrival')} className="p-2 text-primary hover:bg-white rounded-full transition-all">
                        <span className="material-symbols-outlined">search</span>
                      </button>
                    </div>
                    {formData.arrival.address && (
                      <input 
                        className="w-full bg-surface-container-lowest border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary/10 placeholder:text-surface-dim shadow-inner"
                        placeholder="상세 위치 (예: 호텔 로비 앞)"
                        value={formData.arrival.detail}
                        onChange={(e) => handleAddressChange('arrival', e.target.value)}
                      />
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Schedule */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
              <span className="text-secondary font-bold uppercase tracking-widest text-xs mb-4 block">03단계</span>
              <h2 className="text-4xl font-extrabold font-headline tracking-tight mb-8">일정 설정</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-surface-container-low p-6 rounded-xl">
                  <label className="block text-xs font-bold text-outline mb-4 uppercase tracking-tight">출발 일시</label>
                  <div className="flex gap-4">
                    <input 
                      className="bg-surface-container-lowest border-none rounded-lg p-3 w-full focus:ring-2 focus:ring-primary/20" 
                      type="date"
                      name="departureDate"
                      value={formData.departureDate}
                      onChange={handleChange}
                    />
                    <input 
                      className="bg-surface-container-lowest border-none rounded-lg p-3 w-32 focus:ring-2 focus:ring-primary/20" 
                      type="time"
                      name="departureTime"
                      value={formData.departureTime}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="bg-surface-container-low p-6 rounded-xl border-l-4 border-secondary">
                  <label className="block text-xs font-bold text-outline mb-4 uppercase tracking-tight">도착 일시</label>
                  <div className="flex gap-4">
                    <input 
                      className="bg-surface-container-lowest border-none rounded-lg p-3 w-full focus:ring-2 focus:ring-primary/20" 
                      type="date"
                      name="arrivalDate"
                      value={formData.arrivalDate}
                      onChange={handleChange}
                    />
                    <input 
                      className="bg-surface-container-lowest border-none rounded-lg p-3 w-32 focus:ring-2 focus:ring-primary/20" 
                      type="time"
                      name="arrivalTime"
                      value={formData.arrivalTime}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Bus Selection */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
              <span className="text-secondary font-bold uppercase tracking-widest text-xs mb-4 block">04단계</span>
              <h2 className="text-4xl font-extrabold font-headline tracking-tight mb-8">차량 선택</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {/* Premium Gold Bus */}
                <div className="group bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                  <div className="h-40 relative overflow-hidden">
                    <img 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                      alt="Premium Gold" 
                      src="/images/buses/premium_gold.png"
                    />
                    <div className="absolute top-4 left-4 bg-[#D4AF37] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">Gold</div>
                  </div>
                  <div className="p-5">
                    <div className="mb-4">
                      <h3 className="text-lg font-bold font-headline">프리미엄 골드 (21석)</h3>
                      <p className="text-[10px] text-outline">최고급 전용 좌석, 프라이빗 커튼</p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-surface-variant/30">
                      <p className="text-sm font-extrabold text-primary">₩1,100,000</p>
                      <div className="flex items-center gap-3 bg-surface-container-high rounded-full px-2 py-1">
                        <button type="button" onClick={() => adjustQty('premiumGoldQty', -1)} className="w-6 h-6 rounded-full hover:bg-white text-primary flex items-center justify-center transition-all">
                          <span className="material-symbols-outlined text-[14px]">remove</span>
                        </button>
                        <span className="text-sm font-bold">{formData.premiumGoldQty}</span>
                        <button type="button" onClick={() => adjustQty('premiumGoldQty', 1)} className="w-6 h-6 rounded-full hover:bg-white text-primary flex items-center justify-center transition-all">
                          <span className="material-symbols-outlined text-[14px]">add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* V-VIP Bus */}
                <div className="group bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                  <div className="h-40 relative overflow-hidden">
                    <img 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                      alt="V-VIP" 
                      src="/images/buses/v_vip.png"
                    />
                    <div className="absolute top-4 left-4 bg-black text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">V-VIP</div>
                  </div>
                  <div className="p-5">
                    <div className="mb-4">
                      <h3 className="text-lg font-bold font-headline">V-VIP (16석)</h3>
                      <p className="text-[10px] text-outline">최상위 의전용, 리무진 시트</p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-surface-variant/30">
                      <p className="text-sm font-extrabold text-primary">₩1,300,000</p>
                      <div className="flex items-center gap-3 bg-surface-container-high rounded-full px-2 py-1">
                        <button type="button" onClick={() => adjustQty('vvipQty', -1)} className="w-6 h-6 rounded-full hover:bg-white text-primary flex items-center justify-center transition-all">
                          <span className="material-symbols-outlined text-[14px]">remove</span>
                        </button>
                        <span className="text-sm font-bold">{formData.vvipQty}</span>
                        <button type="button" onClick={() => adjustQty('vvipQty', 1)} className="w-6 h-6 rounded-full hover:bg-white text-primary flex items-center justify-center transition-all">
                          <span className="material-symbols-outlined text-[14px]">add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Premium Bus (28) */}
                <div className="group bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                  <div className="h-40 relative overflow-hidden">
                    <img 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                      alt="Premium Bus" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAGncAn9mwP0CppdRcVNcRyyp7BM0Fwr-7IAo-UukujgT7dSh2z_8Ba0-8jHE15cYFNL1CW_lTPzVeSOiKP9OvIwyPH7sUwITsY_pZIwfEo8Us4ucyhl70uOHt6njBNLkODWl9T37DIWWsUWRerSxgzmhYBw7L-a45ye0ewYfPS9sY9Dj9O2wx2Q62XKSoHR7t0ol0eOTUQGqVGpnA0hqylsq4zJc6AmqSUSV_9IzmJGprI0TaVm5kP2ih028fYvHDVfAjM1oqvTLE"
                    />
                    <div className="absolute top-4 left-4 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">Premium</div>
                  </div>
                  <div className="p-5">
                    <div className="mb-4">
                      <h3 className="text-lg font-bold font-headline">우등 고속 (28석)</h3>
                      <p className="text-[10px] text-outline">쾌적한 공간, USB 포트 완비</p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-surface-variant/30">
                      <p className="text-sm font-extrabold text-primary">₩850,000</p>
                      <div className="flex items-center gap-3 bg-surface-container-high rounded-full px-2 py-1">
                        <button type="button" id="remove-premium" onClick={() => adjustQty('premiumQty', -1)} className="w-6 h-6 rounded-full hover:bg-white text-primary flex items-center justify-center transition-all">
                          <span className="material-symbols-outlined text-[14px]">remove</span>
                        </button>
                        <span className="text-sm font-bold">{formData.premiumQty}</span>
                        <button type="button" id="add-premium" onClick={() => adjustQty('premiumQty', 1)} className="w-6 h-6 rounded-full hover:bg-white text-primary flex items-center justify-center transition-all">
                          <span className="material-symbols-outlined text-[14px]">add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mid/Mini Bus (25) */}
                <div className="group bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                  <div className="h-40 relative overflow-hidden">
                    <img 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                      alt="Mini Bus" 
                      src="/images/buses/mini_bus.png"
                    />
                    <div className="absolute top-4 left-4 bg-secondary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">Mini</div>
                  </div>
                  <div className="p-5">
                    <div className="mb-4">
                      <h3 className="text-lg font-bold font-headline">중형/미니 (25석)</h3>
                      <p className="text-[10px] text-outline">소규모 단체, 경제적 이동</p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-surface-variant/30">
                      <p className="text-sm font-extrabold text-primary">₩550,000</p>
                      <div className="flex items-center gap-3 bg-surface-container-high rounded-full px-2 py-1">
                        <button type="button" id="remove-mini" onClick={() => adjustQty('miniBusQty', -1)} className="w-6 h-6 rounded-full hover:bg-white text-primary flex items-center justify-center transition-all">
                          <span className="material-symbols-outlined text-[14px]">remove</span>
                        </button>
                        <span className="text-sm font-bold">{formData.miniBusQty}</span>
                        <button type="button" id="add-mini" onClick={() => adjustQty('miniBusQty', 1)} className="w-6 h-6 rounded-full hover:bg-white text-primary flex items-center justify-center transition-all">
                          <span className="material-symbols-outlined text-[14px]">add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Standard Bus (45) */}
                <div className="group bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                  <div className="h-40 relative overflow-hidden">
                    <img 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                      alt="Standard Bus" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAfK78k5ZUsYSniO-ql0ZmiRyc1AoDCtW69CIjw1G3fTvwXaM1WWnx61DQshz68pgzkuOrTbpW-B4_scGSd1XIdySNfhJkSxYFdvur9B5KpmX3CYtQox2eqsSZz0jRCDYbDnLr6cuy_GAOlx3wl7CJW_h2BtJGU-zroRQYQy35IvU5-eweGfcCFLRdaOkScLoUdn4B3rdiS4Mb-7xWuAHQKFhKLuIBuk654T5MMPKbt2cIwMoS1KcLILRtEGlFw4wBHN2o_oisl0go"
                    />
                    <div className="absolute top-4 left-4 bg-outline text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">Standard</div>
                  </div>
                  <div className="p-5">
                    <div className="mb-4">
                      <h3 className="text-lg font-bold font-headline">일반 고속 (45석)</h3>
                      <p className="text-[10px] text-outline">대규모 단체 최적화, 합리적</p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-surface-variant/30">
                      <p className="text-sm font-extrabold text-primary">₩650,000</p>
                      <div className="flex items-center gap-3 bg-surface-container-high rounded-full px-2 py-1">
                        <button type="button" id="remove-standard" onClick={() => adjustQty('standardQty', -1)} className="w-6 h-6 rounded-full hover:bg-white text-primary flex items-center justify-center transition-all">
                          <span className="material-symbols-outlined text-[14px]">remove</span>
                        </button>
                        <span className="text-sm font-bold">{formData.standardQty}</span>
                        <button type="button" id="add-standard" onClick={() => adjustQty('standardQty', 1)} className="w-6 h-6 rounded-full hover:bg-white text-primary flex items-center justify-center transition-all">
                          <span className="material-symbols-outlined text-[14px]">add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Large Van (11) */}
                <div className="group bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                  <div className="h-40 relative overflow-hidden">
                    <img 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                      alt="Large Van" 
                      src="/images/buses/large_van.png"
                    />
                    <div className="absolute top-4 left-4 bg-primary-container text-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase">Van</div>
                  </div>
                  <div className="p-5">
                    <div className="mb-4">
                      <h3 className="text-lg font-bold font-headline">대형 밴 (11석)</h3>
                      <p className="text-[10px] text-outline">VIP 소수 인원, 도심 이동 최적</p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-surface-variant/30">
                      <p className="text-sm font-extrabold text-primary">₩450,000</p>
                      <div className="flex items-center gap-3 bg-surface-container-high rounded-full px-2 py-1">
                        <button type="button" id="remove-van" onClick={() => adjustQty('largeVanQty', -1)} className="w-6 h-6 rounded-full hover:bg-white text-primary flex items-center justify-center transition-all">
                          <span className="material-symbols-outlined text-[14px]">remove</span>
                        </button>
                        <span className="text-sm font-bold">{formData.largeVanQty}</span>
                        <button type="button" id="add-van" onClick={() => adjustQty('largeVanQty', 1)} className="w-6 h-6 rounded-full hover:bg-white text-primary flex items-center justify-center transition-all">
                          <span className="material-symbols-outlined text-[14px]">add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right: Cost Breakdown Sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-8 animate-in fade-in zoom-in-95 duration-500 delay-500">
              <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-xl relative overflow-hidden border border-surface-variant/20">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16"></div>
                <h2 className="text-2xl font-extrabold font-headline mb-8">예상 견적 상세</h2>
                <div className="space-y-6">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-outline font-medium">기본 대여료</span>
                    <span className="font-bold">₩{basePrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-outline font-medium">거리 할증 {formData.waypoints.length > 0 && `(경유지 ${formData.waypoints.length}곳 포함)`}</span>
                    <span className="font-bold">₩{distanceSurcharge.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-primary font-bold bg-primary/5 p-2 rounded-lg">
                    <span className="text-[10px] uppercase">선택 차량 수</span>
                    <span>{(formData.premiumQty + formData.standardQty + formData.premiumGoldQty + formData.vvipQty + formData.miniBusQty + formData.largeVanQty)}대</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-outline font-medium">시간 외 수당</span>
                    <span className="font-bold text-secondary">+ ₩15,000</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-outline font-medium">부대비용 (톨비/주차/유류비)</span>
                    <span className="font-bold">₩25,000</span>
                  </div>
                  <div className="pt-6 border-t border-surface-variant/50">
                    <div className="flex justify-between items-end mb-8">
                      <div>
                        <p className="text-[10px] font-bold text-outline uppercase tracking-widest">총 요청 견적</p>
                        <p className="text-4xl font-extrabold font-headline text-primary">
                          ₩{total.toLocaleString()}
                        </p>
                      </div>
                      <span className="text-xs text-outline italic">부가세 포함</span>
                    </div>
                    <button 
                      type="button"
                      id="submit-request-btn"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className={`w-full py-5 rounded-full bg-gradient-to-br from-primary to-primary-container text-white font-bold text-lg hover:shadow-2xl hover:scale-[1.02] transition-all active:scale-95 shadow-lg shadow-primary/20 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          제출 중...
                        </span>
                      ) : (
                        '견적 요청하기'
                      )}
                    </button>
                    <p className="text-center text-[10px] text-outline mt-4 font-medium leading-relaxed">
                      클릭 시 이용 약관 및 컨시어지 서비스 정책에 동의하는 것으로 간주됩니다.
                    </p>
                  </div>
                </div>
              </div>
              {/* Side Info Card */}
              <div className="bg-primary/5 p-6 rounded-2xl border-l-4 border-primary">
                <div className="flex gap-4">
                  <span className="material-symbols-outlined text-primary">verified_user</span>
                  <div>
                    <h4 className="font-bold text-sm">에디토리얼 보증</h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed mt-1">
                      검증된 파트너 드라이버와 24/7 VIP 컨시어지 지원을 약속드립니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateBusRequest;
