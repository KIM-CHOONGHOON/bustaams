import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DaumPostcodeEmbed from 'react-daum-postcode';
import api from '../api';
import Swal from 'sweetalert2';
import { notify } from '../utils/toast';
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
    // const [customDetails, setCustomDetails] = useState(''); // 삭제됨
    
    // Bus types from DB
    const [busTypes, setBusTypes] = useState([]);
    const [busCounts, setBusCounts] = useState({});
    const [quoteAmounts, setQuoteAmounts] = useState({});

    // Fetch bus types from DB
    useEffect(() => {
        const fetchBusTypes = async () => {
            try {
                const response = await api.get('/common/codes/BUS_TYPE');
                if (response.success) {
                    setBusTypes(response.data);
                    // Initialize counts to 0
                    const initialCounts = {};
                    response.data.forEach(bus => {
                        initialCounts[bus.code] = 0;
                    });
                    setBusCounts(initialCounts);
                }
            } catch (err) {
                console.error('Bus types fetch error:', err);
            }
        };
        fetchBusTypes();
    }, []);

    const handleQuoteChange = (index, value) => {
        const numStr = value.replace(/[^0-9]/g, '');
        const num = numStr ? parseInt(numStr, 10) : 0;
        setQuoteAmounts(prev => ({ ...prev, [index]: num }));
    };

    const updateBusCount = (key, delta) => {
        setBusCounts(prev => {
            const newVal = Math.max(0, (prev[key] || 0) + delta);
            return { ...prev, [key]: newVal };
        });
    };

    // Address states
    const [depAddress, setDepAddress] = useState(''); // 출발지
    const [stops, setStops] = useState([]); // 출발 경유지
    const [arrAddress, setArrAddress] = useState(''); // 회차지
    const [returnStops, setReturnStops] = useState([]); // 복귀 경유지
    const [endAddress, setEndAddress] = useState(''); // 최종 도착지

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
    busTypes.forEach(bus => {
        const count = busCounts[bus.code] || 0;
        for (let i = 0; i < count; i++) {
            selectedBuses.push({
                id: bus.code,
                name: bus.name,
                code: bus.code
            });
        }
    });

    const expensesPerBus = 250000; // 톨비(10만) + 유류비(15만) (숙박비 제외)
    const grandTotal = selectedBuses.reduce((acc, bus, idx) => {
        return acc + (quoteAmounts[idx] || 0);
    }, 0);

    const handlePostcodeComplete = (data) => {
        const fullAddress = data.address;
        if (postcodeTarget === 'dep') {
            setDepAddress(fullAddress);
            if (!endAddress) setEndAddress(fullAddress);
        } else if (postcodeTarget === 'arr') {
            setArrAddress(fullAddress);
        } else if (postcodeTarget === 'end') {
            setEndAddress(fullAddress);
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
            notify.warn('알림', '배차할 버스를 선택해주세요.');
            return;
        }
        if(!depAddress || !arrAddress || !endAddress) {
            notify.warn('알림', '출발지, 회차지, 최종도착지를 모두 입력해주세요.');
            return;
        }
        if(!depDateTime || !arrDateTime) {
            notify.warn('알림', '일시를 설정해주세요.');
            return;
        }

        try {
            const token = localStorage.getItem('accessToken');
            const vias = [];
            
            // 1. 출발지 (START_NODE)
            vias.push({ viaType: 'START_NODE', addr: depAddress });
            
            // 2. 출발 경유지 (START_WAY)
            stops.forEach(s => s && vias.push({ viaType: 'START_WAY', addr: s }));
            
            // 3. 회차지 (ROUND_TRIP)
            vias.push({ viaType: 'ROUND_TRIP', addr: arrAddress });
            
            // 4. 복귀 경유지 (END_WAY)
            returnStops.forEach(s => s && vias.push({ viaType: 'END_WAY', addr: s }));
            
            // 5. 최종 도착지 (END_NODE)
            vias.push({ viaType: 'END_NODE', addr: endAddress });

            const payload = {
                startAddr: depAddress,
                endAddr: endAddress,
                startDt: depDateTime,
                endDt: arrDateTime,
                tripTitle: tripName || `${depAddress.split(' ')[0]} 여정`,
                passengerCnt: 1, 
                buses: selectedBuses.map((bus, idx) => ({
                    busTypeCd: bus.code,
                    tollsAmt: 100000,
                    fuelCost: 150000,
                    reqAmt: quoteAmounts[idx] || 0
                })),
                vias
            };

            const response = await api.post('/app/customer/auction-req', payload);

            if(response.success) {
                await notify.success('성공', '차량 견적 요청이 성공적으로 접수되었습니다.');
                navigate('/customer-dashboard');
            } else {
                notify.error('실패', response.error || '요청 중 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error('[RequestSubmit Error]', error);
            const errorMsg = error.response?.data?.error || error.response?.data?.detail || '서버와 통신 중 오류가 발생했습니다.';
            notify.error('오류', errorMsg);
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

        import('sweetalert2').then(({ default: Swal }) => {
            Swal.fire({
                title: `<h3 class="font-headline font-black text-2xl text-teal-950">${type === 'dep' ? '출발 일시 설정' : '도착 일시 설정'}</h3>`,
                html: `
                    <div class="flex flex-col gap-4 mt-6 text-left font-body">
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">날짜 선택</label>
                            <input type="date" id="swal-date" class="w-full p-5 bg-slate-50 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-teal-600/20 font-bold text-teal-900 transition-all shadow-inner" value="${currentDate}">
                        </div>
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">시간 선택</label>
                            <input type="time" id="swal-time" class="w-full p-5 bg-slate-50 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-teal-600/20 font-bold text-teal-900 transition-all shadow-inner" value="${currentTime}">
                        </div>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: '설정하기',
                cancelButtonText: '취소',
                buttonsStyling: false,
                customClass: {
                    popup: 'rounded-[2.5rem] p-10 border-none shadow-2xl',
                    confirmButton: 'bg-teal-700 text-white font-headline font-bold py-4 px-8 rounded-full shadow-lg hover:bg-teal-800 transition-all mx-2 flex-1',
                    cancelButton: 'bg-slate-100 text-slate-500 font-headline font-bold py-4 px-8 rounded-full hover:bg-slate-200 transition-all mx-2 flex-1',
                    actions: 'flex gap-2 w-full mt-10',
                },
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
                                     <div className="flex items-center gap-4 mb-8">
                                         <div className="w-1.5 h-8 bg-red-600 rounded-full"></div>
                                         <h3 className="font-headline font-black text-3xl text-teal-950 tracking-tight">어디로 가시나요?</h3>
                                     </div>
                                    
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

                                        {/* 회차지 */}
                                        <div className="space-y-2 pt-4">
                                            <label className="font-label text-xs font-bold uppercase tracking-wider text-slate-500 ml-2">회차지 <span className="text-red-500">*</span></label>
                                            <div className="relative group cursor-pointer" onClick={() => openPostcode('arr')}>
                                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-teal-600 transition-colors">flag</span>
                                                <input className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all font-bold text-teal-900 cursor-pointer placeholder-slate-400 outline-none" placeholder="클릭하여 회차지 주소 검색" readOnly type="text" value={arrAddress} />
                                            </div>
                                        </div>


                                        {/* 복귀 경유지 */}
                                        {returnStops.map((stop, index) => (
                                            <div key={`retStop-${index}`} className="space-y-2 relative pl-6 border-l-2 border-dashed border-slate-200 ml-4 animate-fade-in">
                                                <div className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-slate-300 rounded-full"></div>
                                                <label className="font-label text-[10px] font-bold text-slate-400 ml-2">복귀 경유지</label>
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
                                                <span>복귀 경로 경유지 추가</span>
                                            </button>
                                        )}

                                        {/* 최종 도착지 */}
                                        <div className="space-y-2 pt-4">
                                            <label className="font-label text-xs font-bold uppercase tracking-wider text-slate-500 ml-2">최종 도착지 <span className="text-red-500">*</span></label>
                                            <div className="relative group cursor-pointer" onClick={() => openPostcode('end')}>
                                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-teal-600 transition-colors">location_home</span>
                                                <input className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all font-bold text-teal-900 cursor-pointer placeholder-slate-400 outline-none" placeholder="클릭하여 최종 도착지 주소 검색" readOnly type="text" value={endAddress} />
                                            </div>
                                        </div>
                                    </div>
                                 </section>

                                 <section>
                                     <h3 className="font-headline font-black text-2xl text-teal-950 mb-8 tracking-tight">필수 정보</h3>
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
                                         <h3 className="font-headline font-black text-[15px] text-teal-950/70 uppercase tracking-widest ml-2">버스 구분 표준화 (차종 선택)</h3>
                                         <div className="grid grid-cols-1 gap-3">
                                             {busTypes.map((bus) => (
                                                 <div key={bus.code} className="flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-100 shadow-sm hover:border-teal-600/30 hover:shadow-md transition-all duration-300">
                                                     <div>
                                                         <p className="font-headline font-bold text-teal-900">{bus.name}</p>
                                                         <p className="text-[11px] text-slate-500 font-medium">{bus.description}</p>
                                                     </div>
                                                     <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl p-1 shadow-sm">
                                                         <button onClick={(e) => { e.preventDefault(); updateBusCount(bus.code, -1); }} className="w-8 h-8 flex items-center justify-center text-teal-700 hover:bg-slate-50 rounded-lg transition-colors" type="button"><span className="material-symbols-outlined text-lg">remove</span></button>
                                                         <span className="w-6 text-center font-bold text-teal-900">{busCounts[bus.code] || 0}</span>
                                                         <button onClick={(e) => { e.preventDefault(); updateBusCount(bus.code, 1); }} className="w-8 h-8 flex items-center justify-center text-teal-700 hover:bg-slate-50 rounded-lg transition-colors" type="button"><span className="material-symbols-outlined text-lg">add</span></button>
                                                     </div>
                                                 </div>
                                             ))}
                                         </div>
                                     </div>
                                 </section>

                                {selectedBuses.length > 0 && (
                                    <section className="bg-slate-50/50 rounded-[3rem] p-6 md:p-10 space-y-10 border border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <h3 className="font-headline font-black text-2xl text-teal-950">계산된 예상 견적 상세</h3>
                                            </div>
                                            <span className="px-4 py-2 rounded-full bg-white text-teal-800 text-[10px] font-extrabold uppercase tracking-widest border border-teal-800/10 shadow-sm">실시간 자동 업데이트</span>
                                        </div>
                                        <div className="space-y-6">
                                            {selectedBuses.map((bus, idx) => (
                                                <div key={`quote-${bus.id}-${idx}`} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 space-y-8 animate-fade-in">
                                                    <div className="flex justify-between items-center border-b border-slate-50 pb-6">
                                                        <div className="flex items-center gap-4">
                                                            <span className="w-10 h-10 rounded-full bg-teal-800/10 flex items-center justify-center text-teal-800 font-bold text-sm">{String(idx + 1).padStart(2, '0')}</span>
                                                            <div>
                                                                <p className="font-headline font-bold text-xl text-teal-950">{bus.name}</p>
                                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Selected x 1 unit</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-5 px-1 text-left">
                                                        <div className="flex justify-between items-center text-[13px] text-slate-600 font-medium">
                                                            <span>톨비 / 주차</span>
                                                            <span className="font-bold text-teal-900">₩ 100,000</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-[13px] text-slate-600 font-medium">
                                                            <span>유류비</span>
                                                            <span className="font-bold text-teal-900">₩ 150,000</span>
                                                        </div>
                                                        <div className="flex justify-between items-center pt-5 border-t border-dashed border-slate-100">
                                                            <span className="text-sm font-black text-teal-900 uppercase">총 예상 경비</span>
                                                            <span className="font-black text-teal-900">₩ 250,000</span>
                                                        </div>
                                                        
                                                        <div className="pt-6">
                                                            <div className="bg-slate-50/80 rounded-[2rem] p-6 space-y-4 border border-slate-100">
                                                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1 text-center">고객 요청 견적 금액 (REQUESTED AMOUNT)</span>
                                                                <div className="relative">
                                                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-teal-800 font-black text-xl">₩</span>
                                                                    <input 
                                                                        type="text" 
                                                                        value={quoteAmounts[idx] !== undefined && quoteAmounts[idx] !== 0 ? quoteAmounts[idx].toLocaleString() : ''}
                                                                        onChange={(e) => handleQuoteChange(idx, e.target.value)}
                                                                        className="w-full pl-8 pr-0 py-1 bg-transparent border-none focus:ring-0 transition-all text-teal-900 font-black text-3xl text-right placeholder-slate-300 outline-none" 
                                                                        placeholder="0" 
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Grand Total Section */}
                                        <div className="pt-8 border-t-2 border-teal-800/10">
                                            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-orange-950/30 relative overflow-hidden group">
                                                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                                                    <div className="space-y-1">
                                                        <p className="font-label text-xs font-extrabold uppercase tracking-[0.2em] opacity-80">전체 견적 합계 (GRAND TOTAL)</p>
                                                        <h4 className="font-headline font-black text-5xl tracking-tighter">₩ {grandTotal.toLocaleString()}</h4>
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
