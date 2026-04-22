import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DaumPostcodeEmbed from 'react-daum-postcode';
import api from '../api';
import Swal from 'sweetalert2';
import BottomNavCustomer from '../components/BottomNavCustomer';

const BUS_INFO = [
    { id: 'bus45', name: '45인승 일반', basePrice: 1200000, desc: '대형 | 표준 좌석' },
    { id: 'bus28', name: '28인승 우등', basePrice: 1500000, desc: '대형 | 안락한 독립 좌석' },
    { id: 'bus35', name: '35인승 중형', basePrice: 1100000, desc: '중형 | 실속형 단체 이동' },
    { id: 'bus25', name: '25인승 중형', basePrice: 900000,  desc: '소규모 단체 | 콤팩트한 이동' },
    { id: 'bus15', name: '15인승 소형', basePrice: 700000,  desc: '승합 | 빠른 소수 이동' },
    { id: 'bus12', name: '12인승 미니', basePrice: 800000,  desc: '미니밴 | 프리미엄 승합' },
    { id: 'busPremium', name: '21인승 이하 프리미엄', basePrice: 2500000, desc: '최고급 | 우등 이상의 편안함' },
];

const RequestBus = () => {
    const navigate = useNavigate();
    
    const [tripName, setTripName] = useState('');
    const [customDetails, setCustomDetails] = useState('');
    // Bus type states
    const [busCounts, setBusCounts] = useState({
        bus45: 0,
        bus28: 0,
        bus35: 0,
        bus25: 0,
        bus15: 0,
        bus12: 0,
        busPremium: 0
    });

    const [quoteAmounts, setQuoteAmounts] = useState({});

    const handleQuoteChange = (index, value) => {
        const numStr = value.replace(/[^0-9]/g, '');
        const num = numStr ? parseInt(numStr, 10) : 0;
        setQuoteAmounts(prev => ({ ...prev, [index]: num }));
    };

    const updateBusCount = (key, delta) => {
        setBusCounts(prev => {
            const newVal = Math.max(0, prev[key] + delta);
            return { ...prev, [key]: newVal };
        });
    };

    // Address states
    const [depAddress, setDepAddress] = useState('');
    const [stops, setStops] = useState([]);
    const [arrAddress, setArrAddress] = useState('');
    const [returnStops, setReturnStops] = useState([]);

    // DateTime states (YYYY-MM-DD HH:mm)
    const [depDateTime, setDepDateTime] = useState('');
    const [arrDateTime, setArrDateTime] = useState('');

    // Postcode Modal state
    const [postcodeOpen, setPostcodeOpen] = useState(false);
    const [postcodeTarget, setPostcodeTarget] = useState(null);

    const addStop = () => {
        if (stops.length < 3) setStops([...stops, '']);
    };
    const removeStop = (index) => {
        setStops(stops.filter((_, i) => i !== index));
    };

    const addReturnStop = () => {
        if (returnStops.length < 3) setReturnStops([...returnStops, '']);
    };
    const removeReturnStop = (index) => {
        setReturnStops(returnStops.filter((_, i) => i !== index));
    };

    const openPostcode = (target) => {
        setPostcodeTarget(target);
        setPostcodeOpen(true);
    };

    const selectedBuses = [];
    BUS_INFO.forEach(bus => {
        for (let i = 0; i < busCounts[bus.id]; i++) selectedBuses.push(bus);
    });

    const grandTotal = selectedBuses.reduce((acc, bus, idx) => {
        return acc + (quoteAmounts[idx] || 0);
    }, 0);

    const handlePostcodeComplete = (data) => {
        const fullAddress = data.address;
        if (postcodeTarget === 'dep') {
            setDepAddress(fullAddress);
        } else if (postcodeTarget === 'arr') {
            setArrAddress(fullAddress);
        } else if (postcodeTarget.startsWith('stop-')) {
            const idx = parseInt(postcodeTarget.split('-')[1]);
            const newStops = [...stops];
            newStops[idx] = fullAddress;
            setStops(newStops);
        } else if (postcodeTarget.startsWith('returnStop-')) {
            const idx = parseInt(postcodeTarget.split('-')[1]);
            const newRetStops = [...returnStops];
            newRetStops[idx] = fullAddress;
            setReturnStops(newRetStops);
        }
        setPostcodeOpen(false);
    };

    const handleRequestSubmit = async (e) => {
        e.preventDefault();
        if(selectedBuses.length === 0) {
            Swal.fire('알림', '배차할 버스를 선택해주세요.', 'warning');
            return;
        }
        if(!depAddress || !arrAddress) {
            Swal.fire('알림', '출발지와 도착지를 입력해주세요.', 'warning');
            return;
        }
        if(!depDateTime || !arrDateTime) {
            Swal.fire('알림', '일시를 설정해주세요.', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                Swal.fire('인증 오류', '로그인이 필요하거나 토큰이 만료되었습니다. 다시 로그인해주세요.', 'error');
                return;
            }
            const vias = [];
            // 1. 출발지 (START_NODE)
            vias.push({ viaType: 'START_NODE', addr: depAddress });
            
            // 2. 가는길 경유지 (START_WAY)
            stops.forEach(s => s && vias.push({ viaType: 'START_WAY', addr: s }));
            
            // 3. 도착지/회차지 (ROUND_TRIP)
            vias.push({ viaType: 'ROUND_TRIP', addr: arrAddress });
            
            // 4. 오는길 경유지 (END_WAY)
            returnStops.forEach(s => s && vias.push({ viaType: 'END_WAY', addr: s }));
            
            // 5. 최종도착지 (END_NODE) - 보통 출발지로 다시 돌아옴
            vias.push({ viaType: 'END_NODE', addr: depAddress });

            const payload = {
                startAddr: depAddress,
                endAddr: arrAddress,
                startDt: depDateTime,
                endDt: arrDateTime,
                tripTitle: tripName,
                passengerCnt: 20, // 기본 승객수 임시
                buses: selectedBuses.map((bus, idx) => {
                    let typeCd = 'NORMAL_45';
                    if(bus.id === 'bus28') typeCd = 'PRESTIGE_28';
                    if(bus.id === 'busPremium') typeCd = 'PREMIUM_21';
                    if(bus.id === 'bus35') typeCd = 'NORMAL_35';
                    if(bus.id === 'bus25') typeCd = 'MINI_25';
                    if(bus.id === 'bus15') typeCd = 'VAN_15'; 
                    if(bus.id === 'bus12') typeCd = 'MINI_12'; 
                    return {
                        busTypeCd: typeCd,
                        tollsAmt: 100000,
                        fuelCost: 150000,
                        reqAmt: quoteAmounts[idx] || 0
                    };
                }),
                vias
            };

            const response = await fetch('/api/app/customer/auction-req', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if(data.success) {
                Swal.fire('성공', '차량 견적 요청이 성공적으로 접수되었습니다.', 'success').then(() => {
                    navigate('/customer-dashboard');
                });
            } else {
                Swal.fire('실패', data.error || '요청 중 오류가 발생했습니다.', 'error');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('오류', '서버와 통신 중 오류가 발생했습니다.', 'error');
        }
    };

    const openDateTimePopup = (type) => {
        let currentDate = '';
        let currentTime = type === 'dep' ? '08:00' : '18:00';

        if (type === 'dep' && depDateTime) {
            [currentDate, currentTime] = depDateTime.split(' ');
        } else if (type === 'arr' && arrDateTime) {
            [currentDate, currentTime] = arrDateTime.split(' ');
        } else if (type === 'arr' && depDateTime) {
            currentDate = depDateTime.split(' ')[0];
        }

        Swal.fire({
            title: `<h3 class="font-bold text-xl">${type === 'dep' ? '출발 일시 설정' : '도착 일시 설정'}</h3>`,
            html: `
                <div class="flex flex-col gap-4 mt-6 text-left">
                    <div class="space-y-2">
                        <label class="text-xs font-bold text-slate-500">날짜 선택</label>
                        <input type="date" id="swal-date" class="w-full p-4 border border-slate-200 rounded-xl outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600" value="${currentDate}">
                    </div>
                    <div class="space-y-2">
                        <label class="text-xs font-bold text-slate-500">시간 선택</label>
                        <input type="time" id="swal-time" class="w-full p-4 border border-slate-200 rounded-xl outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600" value="${currentTime}">
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '선택',
            cancelButtonText: '취소',
            customClass: {
                popup: 'rounded-3xl p-6',
                confirmButton: 'bg-teal-700 text-white px-6 py-3 rounded-xl font-bold w-full mx-1 hover:bg-teal-800 transition-colors',
                cancelButton: 'bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-bold w-full mx-1 hover:bg-slate-200 transition-colors',
                actions: 'flex gap-2 w-full mt-6',
            },
            buttonsStyling: false,
            preConfirm: () => {
                const d = document.getElementById('swal-date').value;
                const t = document.getElementById('swal-time').value;
                if (!d || !t) {
                    Swal.showValidationMessage('날짜와 시간을 모두 선택해주세요.');
                    return false;
                }
                return `${d} ${t}`;
            }
        }).then((res) => {
            if (res.isConfirmed) {
                if (type === 'dep') {
                    setDepDateTime(res.value);
                    if (!arrDateTime) {
                        const selectedDate = res.value.split(' ')[0];
                        setArrDateTime(`${selectedDate} 18:00`);
                    }
                } else {
                    setArrDateTime(res.value);
                }
            }
        });
    };

    return (
        <div className="bg-background font-body text-on-background min-h-screen pb-32 relative">
            {/* Postcode Modal */}
            {postcodeOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl overflow-hidden w-full max-w-lg relative shadow-2xl animate-fade-in">
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-teal-900">주소 검색</h3>
                            <button onClick={() => setPostcodeOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors">
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>
                        <div className="h-[450px]">
                            <DaumPostcodeEmbed 
                                onComplete={handlePostcodeComplete} 
                                style={{ height: '100%', width: '100%' }} 
                            />
                        </div>
                    </div>
                </div>
            )}

            <header className="bg-transparent text-teal-800 docked full-width top-0 z-40">
                <div className="flex justify-between items-center w-full px-6 pt-8 pb-4 max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="hover:opacity-80 transition-opacity active:scale-95 duration-200">
                            <span className="material-symbols-outlined text-3xl">arrow_back</span>
                        </button>
                        <h1 className="font-headline font-extrabold tracking-tight text-3xl text-teal-900 text-[24px]">요청서 작성</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 pt-6 pb-32">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Side */}
                    <div className="col-span-12 lg:col-span-5 flex flex-col justify-center mb-8 lg:mb-0">
                        <span className="text-teal-600 font-headline font-bold uppercase tracking-[0.3em] mb-4 block text-[12px]">전세 서비스</span>
                        <h2 className="font-headline font-extrabold text-5xl lg:text-7xl leading-[1.1] text-teal-900 mb-8 tracking-tight text-[48px]">
                            당신만을 위한<br/>전용 버스.
                        </h2>
                        <p className="text-slate-600 text-lg lg:text-xl leading-relaxed max-w-md text-[18px]">
                            일생에 단 한 번뿐인 특별한 여정을 정의하세요. 럭셔리 비즈니스 코치부터 지속 가능한 운송 솔루션까지, 귀하의 단체에 꼭 필요한 사양을 요청하실 수 있습니다.
                        </p>

                        <div className="mt-12 relative rounded-2xl overflow-hidden h-64 w-full shadow-xl">
                            <img alt="Bus" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCz878BnQd8uirQZS16lTczMSsapv5qs4qZPfOQxFRYi3OW0p-2zDSuiwWyAD_HIV9ilP6hEIC5JSbP3laJx9zkoMeQLMfC7G1UQxZD58i_ZpXCTUCTvamqt_-ap-545hcLovNaBPkNJGYRpfTyzltMPomzBwTuKptb_I1wquU_GdmO0CMeWjdgsmvlzyZisBNylO15Gztlwd1yoZWLIeWpv54WA3SO5V--fxRyp6Dt8dlmB3tE01oDz_XWHFW2onY5E9x8_ZpPr3o" />
                            <div className="absolute inset-0 bg-gradient-to-t from-teal-900/60 to-transparent"></div>
                            <div className="absolute bottom-6 left-6 text-white text-left">
                                <p className="font-headline font-bold text-lg">VIP 경험</p>
                                <p className="text-sm opacity-90">맞춤형 노선 계획 포함</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: The Form Canvas */}
                    <div className="col-span-12 lg:col-span-7">
                        <div className="bg-white rounded-[2rem] p-8 lg:p-12 shadow-2xl relative border border-slate-100">
                            <form className="space-y-10 text-left">
                                <section>
                                    <h3 className="font-headline font-black text-2xl text-teal-900 mb-6 text-[22px]">여정 정보</h3>
                                    
                                    <div className="space-y-6">
                                        {/* 여행 명칭 */}
                                        <div className="space-y-2">
                                            <label className="font-label text-xs font-bold uppercase tracking-wider text-slate-500 ml-2">여행 명칭</label>
                                            <div className="relative group">
                                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors">edit_note</span>
                                                <input 
                                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all font-bold text-teal-900 outline-none" 
                                                    placeholder="예: 2024년 추계 워크숍" 
                                                    type="text" 
                                                    value={tripName}
                                                    onChange={(e) => setTripName(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        {/* 출발지 */}
                                        <div className="space-y-2">
                                            <label className="font-label text-xs font-bold uppercase tracking-wider text-slate-500 ml-2">출발지 <span className="text-red-500">*</span></label>
                                            <div className="relative group cursor-pointer" onClick={() => openPostcode('dep')}>
                                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-teal-600 transition-colors">search</span>
                                                <input className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all font-bold text-teal-900 cursor-pointer placeholder-slate-400 outline-none" placeholder="클릭하여 출발지 주소 검색" readOnly type="text" value={depAddress} />
                                            </div>
                                        </div>

                                        {/* 출발 경유지 */}
                                        {stops.map((stop, index) => (
                                            <div key={`stop-${index}`} className="space-y-2 relative pl-6 border-l-2 border-dashed border-slate-200 ml-4 animate-fade-in">
                                                <div className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-slate-300 rounded-full"></div>
                                                <label className="font-label text-[10px] font-bold text-slate-400 ml-2">경유지</label>
                                                <div className="relative group cursor-pointer" onClick={() => openPostcode(`stop-${index}`)}>
                                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] group-hover:text-teal-600 transition-colors">more_vert</span>
                                                    <input className="w-full pl-10 pr-12 py-3 bg-white border border-slate-100 rounded-xl text-sm font-bold text-teal-900 cursor-pointer placeholder-slate-400 outline-none shadow-sm" placeholder={`클릭하여 주소 검색`} readOnly type="text" value={stop} />
                                                    <button onClick={(e) => { e.stopPropagation(); removeStop(index); }} type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 transition-colors flex items-center justify-center p-1 bg-slate-50 rounded-full shadow-sm hover:bg-red-50">
                                                        <span className="material-symbols-outlined text-sm">close</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {stops.length < 3 && (
                                            <button onClick={addStop} type="button" className="flex items-center gap-2 text-teal-600 font-bold text-sm ml-4 hover:opacity-70 transition-opacity">
                                                <span className="material-symbols-outlined text-lg">add_circle</span>
                                                <span>도중 경유지 추가</span>
                                            </button>
                                        )}

                                        {/* 도착지 (회차지) */}
                                        <div className="space-y-2 pt-4">
                                            <label className="font-label text-xs font-bold uppercase tracking-wider text-slate-500 ml-2">도착지 (회차지) <span className="text-red-500">*</span></label>
                                            <div className="relative group cursor-pointer" onClick={() => openPostcode('arr')}>
                                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-teal-600 transition-colors">flag</span>
                                                <input className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all font-bold text-teal-900 cursor-pointer placeholder-slate-400 outline-none" placeholder="클릭하여 도착지(회차지) 주소 검색" readOnly type="text" value={arrAddress} />
                                            </div>
                                        </div>

                                        {/* 회차 경유지 */}
                                        {returnStops.map((stop, index) => (
                                            <div key={`retStop-${index}`} className="space-y-2 relative pl-6 border-l-2 border-dashed border-slate-200 ml-4 animate-fade-in">
                                                <div className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-slate-300 rounded-full"></div>
                                                <label className="font-label text-[10px] font-bold text-slate-400 ml-2">회차 경유지</label>
                                                <div className="relative group cursor-pointer" onClick={() => openPostcode(`returnStop-${index}`)}>
                                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] group-hover:text-teal-600 transition-colors">more_vert</span>
                                                    <input className="w-full pl-10 pr-12 py-3 bg-white border border-slate-100 rounded-xl text-sm font-bold text-teal-900 cursor-pointer placeholder-slate-400 outline-none shadow-sm" placeholder={`클릭하여 주소 검색`} readOnly type="text" value={stop} />
                                                    <button onClick={(e) => { e.stopPropagation(); removeReturnStop(index); }} type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 transition-colors flex items-center justify-center p-1 bg-slate-50 rounded-full shadow-sm hover:bg-red-50">
                                                        <span className="material-symbols-outlined text-sm">close</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {returnStops.length < 3 && (
                                            <button onClick={addReturnStop} type="button" className="flex items-center gap-2 text-teal-600 font-bold text-sm ml-4 hover:opacity-70 transition-opacity">
                                                <span className="material-symbols-outlined text-lg">add_circle</span>
                                                <span>회차 경로 경유지 추가</span>
                                            </button>
                                        )}
                                    </div>
                                </section>

                                <section>
                                    <h3 className="font-headline font-black text-2xl text-teal-900 mb-6 text-[22px]">필수 정보</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div className="space-y-2 cursor-pointer" onClick={() => openDateTimePopup('dep')}>
                                            <label className="font-label text-xs font-bold uppercase tracking-wider text-slate-500 ml-2">출발 일시 <span className="text-red-500">*</span></label>
                                            <div className="relative group">
                                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-teal-600">calendar_month</span>
                                                <input className="w-full pl-12 pr-4 py-4 bg-teal-50 border border-teal-100 rounded-xl focus:ring-2 focus:ring-teal-600/20 transition-all font-bold text-teal-900 cursor-pointer placeholder-teal-700/50 outline-none" type="text" placeholder="일시 설정 클릭" value={depDateTime} readOnly />
                                            </div>
                                        </div>
                                        <div className="space-y-2 cursor-pointer" onClick={() => openDateTimePopup('arr')}>
                                            <label className="font-label text-xs font-bold uppercase tracking-wider text-slate-500 ml-2">도착(회차) 일시 <span className="text-red-500">*</span></label>
                                            <div className="relative group">
                                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-teal-600">event_available</span>
                                                <input className="w-full pl-12 pr-4 py-4 bg-teal-50 border border-teal-100 rounded-xl focus:ring-2 focus:ring-teal-600/20 transition-all font-bold text-teal-900 cursor-pointer placeholder-teal-700/50 outline-none" type="text" placeholder="일시 설정 클릭" value={arrDateTime} readOnly />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="font-label text-xs font-bold uppercase tracking-wider text-slate-500 ml-2">차종 선택</label>
                                        <div className="grid grid-cols-1 gap-3">
                                            {BUS_INFO.map((bus) => (
                                                <div key={bus.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-teal-600/20 transition-all">
                                                    <div>
                                                        <p className="font-headline font-bold text-teal-900">{bus.name}</p>
                                                        <p className="text-[11px] text-slate-500 font-medium">{bus.desc}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl p-1 shadow-sm">
                                                        <button onClick={(e) => { e.preventDefault(); updateBusCount(bus.id, -1); }} className="w-8 h-8 flex items-center justify-center text-teal-700 hover:bg-slate-50 rounded-lg transition-colors" type="button"><span className="material-symbols-outlined text-lg">remove</span></button>
                                                        <span className="w-6 text-center font-bold text-teal-900">{busCounts[bus.id]}</span>
                                                        <button onClick={(e) => { e.preventDefault(); updateBusCount(bus.id, 1); }} className="w-8 h-8 flex items-center justify-center text-teal-700 hover:bg-slate-50 rounded-lg transition-colors" type="button"><span className="material-symbols-outlined text-lg">add</span></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <h3 className="font-headline font-black text-2xl text-teal-900 mb-6 text-[22px]">맞춤 상세 내용</h3>
                                    <div className="space-y-2">
                                        <label className="font-label text-xs font-bold uppercase tracking-wider text-slate-500 ml-2">특별 요청 사항 및 편의시설</label>
                                        <textarea 
                                            value={customDetails}
                                            onChange={(e) => setCustomDetails(e.target.value)}
                                            className="w-full p-6 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all text-teal-900 placeholder-slate-400 font-medium resize-none outline-none" 
                                            placeholder="Wi-Fi, 휠체어 리프트, 수하물 요구 사항 또는 특정 버스 모델 선호 사항 등..." 
                                            rows="3"
                                        ></textarea>
                                    </div>
                                </section>

                                {selectedBuses.length > 0 && (
                                    <section className="bg-teal-800/5 rounded-[2.5rem] p-8 lg:p-10 space-y-8 border border-teal-800/10">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <h3 className="font-headline font-extrabold text-2xl text-teal-900">계산된 예상 견적 상세</h3>
                                            </div>
                                            <span className="px-4 py-2 rounded-full bg-teal-800/10 text-teal-800 text-[10px] font-extrabold uppercase tracking-widest border border-teal-800/10 hidden md:inline-block">실시간 자동 업데이트</span>
                                        </div>
                                        <div className="space-y-6">
                                            {selectedBuses.map((bus, idx) => (
                                                <div key={`quote-${bus.id}-${idx}`} className="bg-white rounded-3xl p-6 shadow-sm border border-teal-800/5 space-y-5">
                                                    <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                                                        <div className="flex items-center gap-3">
                                                            <span className="w-8 h-8 rounded-full bg-teal-800/10 flex items-center justify-center text-teal-800 font-bold text-xs">{String(idx + 1).padStart(2, '0')}</span>
                                                            <p className="font-headline font-bold text-lg text-teal-800">{bus.name} <span className="text-sm font-medium text-slate-400 ml-1">x 1대</span></p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-slate-500 font-medium">톨비 / 주차</span>
                                                            <span className="font-bold text-teal-900">₩ 100,000</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-slate-500 font-medium">유류비</span>
                                                            <span className="font-bold text-teal-900">₩ 150,000</span>
                                                        </div>
                                                        <div className="flex justify-between items-center pt-3 border-t border-dashed border-slate-100">
                                                            <span className="text-sm font-bold text-teal-800">총 예상 경비</span>
                                                            <span className="font-bold text-teal-800">₩ 250,000</span>
                                                        </div>
                                                        <div className="pt-4 space-y-2">
                                                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">견적 요청 금액 입력</label>
                                                            <div className="relative">
                                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-800 font-bold">₩</span>
                                                                <input 
                                                                    type="text" 
                                                                    value={quoteAmounts[idx] !== undefined && quoteAmounts[idx] !== 0 ? quoteAmounts[idx].toLocaleString() : ''}
                                                                    onChange={(e) => handleQuoteChange(idx, e.target.value)}
                                                                    className="w-full pl-9 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-teal-600/20 transition-all text-teal-900 font-extrabold text-right placeholder-slate-300 outline-none" 
                                                                    placeholder="0" 
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Grand Total Section */}
                                        <div className="pt-8 border-t-2 border-teal-800/10">
                                            <div className="bg-gradient-to-br from-teal-800 to-teal-600 rounded-[2rem] p-8 text-white shadow-xl shadow-teal-900/20">
                                                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                                                    <div className="space-y-1">
                                                        <p className="font-label text-xs font-extrabold uppercase tracking-[0.2em] opacity-80">전체 견적 합계 (GRAND TOTAL)</p>
                                                        <h4 className="font-headline font-black text-4xl">₩ {grandTotal.toLocaleString()}</h4>
                                                    </div>
                                                    <div className="text-left md:text-right pb-1">
                                                        <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">부가가치세 포함</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                )}

                                <div className="pt-8">
                                    <button onClick={handleRequestSubmit} className="w-full py-5 px-8 rounded-2xl bg-teal-700 text-white font-headline font-extrabold text-xl shadow-lg hover:shadow-xl hover:shadow-teal-900/20 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3">
                                        <span>여정 요청하기</span>
                                        <span className="material-symbols-outlined">arrow_forward</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </main>

            <BottomNavCustomer />
        </div>
    );
};

export default RequestBus;
