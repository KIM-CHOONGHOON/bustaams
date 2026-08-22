// busTaams - 버스 대절 예약 요청 페이지 (V2.0.2 - 캐시 갱신용 더미 주석 추가)
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import Swal from 'sweetalert2';
import { notify } from '../utils/toast';
import BottomNavCustomer from '../components/BottomNavCustomer';

const BUS_INFO = [
    { id: 'bus45', name: '45인승 일반', basePrice: 1200000, desc: '대형 | 표준 좌석' },
    { id: 'bus28', name: '28인승 우등', basePrice: 1500000, desc: '대형 | 안락한 독립 좌석' },
    { id: 'bus35', name: '35인승 중형', basePrice: 1100000, desc: '중형 | 실속형 단체 이동' },
    { id: 'bus25', name: '25인승 중형', basePrice: 900000, desc: '소규모 단체 | 콤팩트한 이동' },
    { id: 'bus15', name: '15인승 소형', basePrice: 700000, desc: '승합 | 빠른 소수 이동' },
    { id: 'bus12', name: '12인승 미니', basePrice: 800000, desc: '미니밴 | 프리미엄 승합' },
    { id: 'busPremium', name: '21인승 이하 프리미엄', basePrice: 2500000, desc: '최고급 | 우등 이상의 편안함' },
];

const RequestBus = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    const [tripName, setTripName] = useState('');

    // Bus types from DB
    const [busTypes, setBusTypes] = useState([]);
    const [busCounts, setBusCounts] = useState({});
    const [quoteAmounts, setQuoteAmounts] = useState({});
    const [profileImage, setProfileImage] = useState(null);
    const [imageVersion, setImageVersion] = useState(Date.now());

    // Address states
    const [depAddress, setDepAddress] = useState(''); // 출발지
    const [stops, setStops] = useState([]); // 출발 경유지
    const [arrAddress, setArrAddress] = useState(''); // 목적지
    const [returnStops, setReturnStops] = useState([]); // 도착 경유지
    const [endAddress, setEndAddress] = useState(''); // 최종 도착지

    // DateTime states (YYYY-MM-DD HH:mm)
    const [depDateTime, setDepDateTime] = useState('');
    const [arrDateTime, setArrDateTime] = useState('');

    const fetchProfile = async () => {
        try {
            const profileRes = await api.get('/app/customer/profile');
            if (profileRes.success && profileRes.data) {
                setProfileImage(profileRes.data.profileImage || null);
                setImageVersion(Date.now());

                // 이용 제한 체크
                const { restrictStat, restrictEndDt } = profileRes.data;
                const now = new Date();
                let isRestricted = false;
                let message = '';

                if (restrictStat === 'P') {
                    isRestricted = true;
                    message = '귀하는 현재 서비스 이용이 무기한 제한된 상태입니다.\n운영자에게 문의해주세요.';
                } else if (restrictStat === 'Y' && restrictEndDt) {
                    const endDt = new Date(restrictEndDt);
                    if (endDt > now) {
                        isRestricted = true;
                        message = `귀하는 현재 서비스 이용 제한 상태입니다.\n제한 종료일: ${restrictEndDt}\n해당 일자 이후에 다시 시도해주세요.`;
                    }
                }

                if (isRestricted) {
                    Swal.fire({
                        icon: 'warning',
                        title: '이용 제한 안내',
                        text: message,
                        confirmButtonText: '확인',
                        confirmButtonColor: '#0f766e', // teal-700
                        allowOutsideClick: false,
                    }).then(() => {
                        navigate('/customer-dashboard');
                    });
                }
            }
        } catch (err) {
            console.error('Fetch profile error:', err);
        }
    };

    // Fetch bus types and profile
    useEffect(() => {
        const fetchBusTypes = async () => {
            try {
                const response = await api.get('/common/codes/BUS_TYPE');
                if (response.data) {
                    setBusTypes(response.data);

                    if (id) {
                        const resDetail = await api.get(`/app/customer/auction-req/${id}`);
                        if (resDetail.success && resDetail.data) {
                            const data = resDetail.data;
                            setTripName(data.TRIP_TITLE || '');
                            setDepAddress(data.START_ADDR || '');
                            setEndAddress(data.END_ADDR || '');

                            const formatInputDt = (dt) => {
                                if (!dt) return '';
                                const dtStr = typeof dt === 'string' ? dt : new Date(dt).toISOString();
                                return dtStr.replace(' ', 'T').replace('Z', '').substring(0, 16);
                            };
                            setDepDateTime(formatInputDt(data.START_DT));
                            setArrDateTime(formatInputDt(data.END_DT));

                            const initialCounts = {};
                            const typeCounters = {};
                            if (response.data) {
                                response.data.forEach(bus => initialCounts[bus.code] = 0);
                            }

                            const initialQuotes = {};
                            if (data.buses && Array.isArray(data.buses)) {
                                data.buses.forEach((b) => {
                                    const code = b.BUS_TYPE_CD;
                                    initialCounts[code] = (initialCounts[code] || 0) + 1;
                                    
                                    const unitIdx = typeCounters[code] || 0;
                                    initialQuotes[`${code}_${unitIdx}`] = b.reqAmt;
                                    typeCounters[code] = unitIdx + 1;
                                });
                            }
                            setBusCounts(initialCounts);
                            setQuoteAmounts(initialQuotes);

                            if (data.vias && Array.isArray(data.vias)) {
                                const startNodes = data.vias.filter(v => v.VIA_TYPE === 'START_NODE');
                                const startWays = data.vias.filter(v => v.VIA_TYPE === 'START_WAY');
                                const roundTrips = data.vias.filter(v => v.VIA_TYPE === 'ROUND_TRIP');
                                const endWays = data.vias.filter(v => v.VIA_TYPE === 'END_WAY');
                                const endNodes = data.vias.filter(v => v.VIA_TYPE === 'END_NODE');

                                if (startNodes.length > 0) setDepAddress(startNodes[0].addr);
                                setStops(startWays.map(v => v.addr));
                                if (roundTrips.length > 0) setArrAddress(roundTrips[0].addr);
                                setReturnStops(endWays.map(v => v.addr));
                                if (endNodes.length > 0) setEndAddress(endNodes[0].addr);
                            }
                        }
                    } else {
                        const initialCounts = {};
                        response.data.forEach(bus => initialCounts[bus.code] = 0);
                        setBusCounts(initialCounts);
                    }
                }
            } catch (err) {
                console.error('Bus types fetch error:', err);
            }
        };

        fetchBusTypes();
        fetchProfile();
    }, [id]);


    const handleQuoteChange = (key, value) => {
        const numStr = value.replace(/[^0-9]/g, '');
        const num = numStr ? parseInt(numStr, 10) : 0;
        setQuoteAmounts(prev => ({ ...prev, [key]: num }));
    };

    const updateBusCount = (key, delta) => {
        setBusCounts(prev => {
            const currentCount = prev[key] || 0;
            const newCount = Math.max(0, currentCount + delta);
            return { ...prev, [key]: newCount };
        });
    };

    // 장소 검색 모달 관련 상태
    const [postcodeOpen, setPostcodeOpen] = useState(false);
    const [postcodeTarget, setPostcodeTarget] = useState(null);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isKakaoLoaded, setIsKakaoLoaded] = useState(false);
    const [kakaoError, setKakaoError] = useState(false);

    // 동적으로 카카오맵 SDK 로드 (중복 로드 방지 및 타이밍 개선 적용)
    useEffect(() => {
        // 카카오 지도 API 키 취득 (기본 폴백 키 포함, 한글 주석)
        const kakaoApiKey = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY || 'fdbe7b320906be89ddd194a26a1c6487';
        console.log('KAKAO KEY =', kakaoApiKey);

        if (!kakaoApiKey || kakaoApiKey === 'undefined' || kakaoApiKey === 'null') {
            console.error('VITE_KAKAO_JAVASCRIPT_KEY가 유효하지 않거나 없습니다. 현재 값:', kakaoApiKey);
            setIsKakaoLoaded(false);
            setKakaoError(true);
            return;
        }

        const loadKakao = () => {
            if (!window.kakao || !window.kakao.maps) {
                console.error('window.kakao.maps 객체가 없습니다.');
                setIsKakaoLoaded(false);
                setKakaoError(true);
                return;
            }

            window.kakao.maps.load(() => {
                if (window.kakao.maps.services) {
                    console.log('Kakao Maps SDK 로드 성공');
                    setIsKakaoLoaded(true);
                    setKakaoError(false);
                } else {
                    console.error('Kakao services 라이브러리 로드 실패');
                    setIsKakaoLoaded(false);
                    setKakaoError(true);
                }
            });
        };

        const existingScript = document.querySelector(
            'script[src*="dapi.kakao.com/v2/maps/sdk.js"]'
        );

        if (existingScript) {
            if (window.kakao?.maps?.services) {
                setIsKakaoLoaded(true);
                setKakaoError(false);
            } else {
                existingScript.addEventListener('load', loadKakao, { once: true });
                existingScript.addEventListener('error', () => {
                    console.error('기존 Kakao SDK 스크립트 로드 실패');
                    setIsKakaoLoaded(false);
                    setKakaoError(true);
                }, { once: true });
            }
            return;
        }

        const script = document.createElement('script');
        script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoApiKey}&libraries=services&autoload=false`;
        script.async = true;
        script.onload = loadKakao;
        script.onerror = (e) => {
            console.error('Kakao Maps SDK 로드 실패');
            console.error('요청 URL:', script.src);
            console.error('현재 도메인:', window.location.origin);
            console.error('Kakao Key:', kakaoApiKey);
            setIsKakaoLoaded(false);
            setKakaoError(true);
        };

        document.head.appendChild(script);
    }, []);

    // 키워드로 장소 검색 실행 함수 (한글 주석)
    const handlePlaceSearch = (e) => {
        if (e) e.preventDefault();
        if (!searchKeyword.trim()) {
            notify.warn('알림', '검색어를 입력해주세요.');
            return;
        }

        setIsSearching(true);

        if (isKakaoLoaded && window.kakao && window.kakao.maps && window.kakao.maps.services) {
            const ps = new window.kakao.maps.services.Places();
            ps.keywordSearch(searchKeyword, (data, status) => {
                setIsSearching(false);
                if (status === window.kakao.maps.services.Status.OK) {
                    setSearchResults(data);
                } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
                    setSearchResults([]);
                    notify.info('알림', '검색 결과가 없습니다.');
                } else {
                    setSearchResults([]);
                    notify.error('오류', '검색 중 오류가 발생했습니다.');
                }
            });
        } else {
            setIsSearching(false);
            setSearchResults([]);
            // 카카오 지도 API 미로드 시 Daum 우편번호 서비스 자동 실행 (한글 주석)
            openDaumPostcode();
        }
    };

    // 다음 우편번호 / 도로명주소 팝업 띄우기 함수 (한글 주석)
    const openDaumPostcode = () => {
        const runPostcode = () => {
            new window.daum.Postcode({
                oncomplete: (data) => {
                    const fullAddr = data.buildingName ? `${data.address} (${data.buildingName})` : data.address;
                    handlePlaceSelect({ place_name: fullAddr, address_name: data.address });
                }
            }).open();
        };

        if (window.daum && window.daum.Postcode) {
            runPostcode();
        } else {
            const script = document.createElement('script');
            script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
            script.onload = runPostcode;
            script.onerror = () => notify.error('오류', '우편번호 서비스를 불러올 수 없습니다.');
            document.body.appendChild(script);
        }
    };

    // 장소 선택 핸들러 (한글 주석)
    const handlePlaceSelect = (place) => {
        const addressDetail = place.road_address_name || place.address_name;
        const formattedAddress = `${place.place_name} (${addressDetail})`;

        if (postcodeTarget === 'dep') {
            setDepAddress(formattedAddress);
            if (!endAddress) setEndAddress(formattedAddress);
        } else if (postcodeTarget === 'arr') {
            setArrAddress(formattedAddress);
        } else if (postcodeTarget === 'end') {
            setEndAddress(formattedAddress);
        } else if (postcodeTarget.startsWith('stop-')) {
            const idx = parseInt(postcodeTarget.split('-')[1]);
            const newStops = [...stops];
            newStops[idx] = formattedAddress;
            setStops(newStops);
        } else if (postcodeTarget.startsWith('returnStop-')) {
            const idx = parseInt(postcodeTarget.split('-')[1]);
            const newRetStops = [...returnStops];
            newRetStops[idx] = formattedAddress;
            setReturnStops(newRetStops);
        }

        setPostcodeOpen(false);
        setSearchKeyword('');
        setSearchResults([]);
    };

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

    const grandTotal = Object.keys(busCounts).reduce((acc, code) => {
        const count = busCounts[code] || 0;
        let sum = 0;
        for (let i = 0; i < count; i++) {
            sum += (quoteAmounts[`${code}_${i}`] || 0);
        }
        return acc + sum;
    }, 0);

    const handleRequestSubmit = async (e) => {
        e.preventDefault();
        if (selectedBuses.length === 0) {
            notify.warn('알림', '배차할 버스를 선택해주세요.');
            return;
        }
        if (!depAddress || !arrAddress || !endAddress) {
            notify.warn('알림', '출발지, 목적지, 최종도착지를 모두 입력해주세요.');
            return;
        }
        if (!depDateTime || !arrDateTime) {
            notify.warn('알림', '일시를 설정해주세요.');
            return;
        }

        // 오늘로부터 6개월 제한 체크
        const limitDate = new Date();
        limitDate.setMonth(limitDate.getMonth() + 6);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (depDateTime) {
            const depDate = new Date(depDateTime.replace(' ', 'T'));
            const depDateOnly = new Date(depDate.getFullYear(), depDate.getMonth(), depDate.getDate());
            
            if (depDateOnly <= today) {
                Swal.fire({
                    icon: 'warning',
                    title: '날짜 선택 오류',
                    text: '출발일은 내일 이후 날짜만 선택할 수 있습니다.',
                    confirmButtonText: '확인',
                    confirmButtonColor: '#0f766e',
                });
                return;
            }

            if (depDate > limitDate) {
                Swal.fire({
                    icon: 'warning',
                    title: '날짜 제한 초과',
                    text: '출발일시는 오늘로부터 6개월을 넘을 수 없습니다.',
                    confirmButtonText: '확인',
                    confirmButtonColor: '#0f766e',
                });
                return;
            }
        }
        if (arrDateTime) {
            const arrDate = new Date(arrDateTime.replace(' ', 'T'));
            const arrDateOnly = new Date(arrDate.getFullYear(), arrDate.getMonth(), arrDate.getDate());

            if (arrDateOnly <= today) {
                Swal.fire({
                    icon: 'warning',
                    title: '날짜 선택 오류',
                    text: '도착일은 내일 이후 날짜만 선택할 수 있습니다.',
                    confirmButtonText: '확인',
                    confirmButtonColor: '#0f766e',
                });
                return;
            }

            if (arrDate > limitDate) {
                Swal.fire({
                    icon: 'warning',
                    title: '날짜 제한 초과',
                    text: '도착일시는 오늘로부터 6개월을 넘을 수 없습니다.',
                    confirmButtonText: '확인',
                    confirmButtonColor: '#0f766e',
                });
                return;
            }
        }


        try {
            const vias = [];

            // 1. 출발지 (START_NODE)
            vias.push({ viaType: 'START_NODE', addr: depAddress });

            // 2. 출발 경유지 (START_WAY)
            stops.forEach(s => s && vias.push({ viaType: 'START_WAY', addr: s }));

            // 3. 목적지 (ROUND_TRIP)
            vias.push({ viaType: 'ROUND_TRIP', addr: arrAddress });

            // 4. 도착 경유지 (END_WAY)
            returnStops.forEach(s => s && vias.push({ viaType: 'END_WAY', addr: s }));

            // 5. 최종 도착지 (END_NODE)
            vias.push({ viaType: 'END_NODE', addr: endAddress });

            const payload = {
                startAddr: depAddress,
                endAddr: endAddress,
                startDt: depDateTime,
                endDt: arrDateTime,
                tripTitle: tripName || `${depAddress.split(' ')[0]} 여행`,
                passengerCnt: 1,
                buses: (() => {
                    const busesPayload = [];
                    busTypes.forEach(bus => {
                        const count = busCounts[bus.code] || 0;
                        for (let i = 0; i < count; i++) {
                            busesPayload.push({
                                busTypeCd: bus.code,
                                tollsAmt: 0,
                                fuelCost: 0,
                                reqAmt: quoteAmounts[`${bus.code}_${i}`] || 0
                            });
                        }
                    });
                    return busesPayload;
                })(),
                vias
            };

            const response = id
                ? await api.put(`/app/customer/auction-req/${id}`, payload)
                : await api.post('/app/customer/auction-req', payload);

            if (response.success) {
                await notify.success('성공', id ? '예약 정보가 성공적으로 수정되었습니다.' : '차량 청약 요청이 성공적으로 접수되었습니다.');
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

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        // 만약 기존 날짜가 없거나 오늘/이전이면 내일 날짜로 디폴트 세팅
        if (!currentDate || new Date(currentDate) <= new Date(new Date().setHours(0,0,0,0))) {
            currentDate = tomorrowStr;
        }

        import('sweetalert2').then(({ default: Swal }) => {
            Swal.fire({
                title: `<h3 class="font-headline font-black text-2xl text-teal-950">${type === 'dep' ? '출발 일시 설정' : '도착 일시 설정'}</h3>`,
                html: `
                    <div class="flex flex-col gap-4 mt-6 text-left font-body">
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">날짜 선택</label>
                            <input type="date" id="swal-date" min="${tomorrowStr}" class="w-full p-5 bg-slate-50 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-teal-600/20 font-bold text-teal-900 transition-all shadow-inner" value="${currentDate}">
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
                    popup: 'rounded-[2rem] p-6 md:p-8 border-none shadow-2xl max-w-[90%] md:max-w-md',
                    confirmButton: 'bg-teal-700 text-white font-headline font-bold text-sm py-3 px-4 rounded-xl shadow-md hover:bg-teal-800 transition-all mx-1 flex-1 text-center justify-center items-center',
                    cancelButton: 'bg-slate-100 text-slate-500 font-headline font-bold text-sm py-3 px-4 rounded-xl hover:bg-slate-200 transition-all mx-1 flex-1 text-center justify-center items-center',
                    actions: 'flex gap-2 w-full mt-6 justify-between',
                },
                preConfirm: () => {
                    const d = document.getElementById('swal-date').value;
                    const t = document.getElementById('swal-time').value;
                    if (!d || !t) {
                        Swal.showValidationMessage('날짜와 시간을 모두 선택해주세요.');
                        return false;
                    }

                    const selectedDateTime = new Date(`${d}T${t}`);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    // 당일 및 이전일 제한 체크
                    const selectedDate = new Date(d);
                    selectedDate.setHours(0, 0, 0, 0);

                    if (selectedDate <= today) {
                        Swal.showValidationMessage('출발/도착일은 내일 이후 날짜만 선택할 수 있습니다.');
                        return false;
                    }

                    // 오늘로부터 6개월 제한 체크
                    const limitDate = new Date();
                    limitDate.setMonth(limitDate.getMonth() + 6);

                    if (selectedDateTime > limitDate) {
                        Swal.showValidationMessage('출발/도착 일시는 오늘로부터 6개월 이내로만 설정할 수 있습니다.');
                        return false;
                    }

                    return `${d} ${t}`;
                }
            }).then((res) => {
                if (res.isConfirmed) {
                    if (type === 'dep') {
                        setDepDateTime(res.value);
                        const selectedDate = res.value.split(' ')[0];
                        setArrDateTime(`${selectedDate} 18:00`);
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
                    <div className="bg-white rounded-2xl overflow-hidden w-full max-w-lg relative shadow-2xl animate-fade-in flex flex-col border border-slate-100 h-[600px]">
                        {/* 모달 헤더 (한글 주석) */}
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
                            <div>
                                <h3 className="font-headline font-black text-xl text-teal-900">장소 검색</h3>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                    {isKakaoLoaded && !kakaoError ? 'Kakao Maps API 연동 중' : 'Kakao Maps API 로드 실패'}
                                </p>
                            </div>
                            <button onClick={() => { setPostcodeOpen(false); setSearchKeyword(''); setSearchResults([]); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 transition-all active:scale-95">
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>

                        {/* 검색창 영역 (한글 주석) */}
                        <form onSubmit={handlePlaceSearch} className="p-6 border-b border-slate-100 flex gap-2">
                            <div className="relative flex-1">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                                <input 
                                    type="text" 
                                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all font-bold text-teal-900 outline-none"
                                    placeholder="장소명, 건물명, 지하철역 등 입력"
                                    value={searchKeyword}
                                    onChange={(e) => setSearchKeyword(e.target.value)}
                                />
                            </div>
                            <button type="submit" className="px-6 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl transition-colors active:scale-95">
                                검색
                            </button>
                        </form>

                        {/* 결과 목록 리스트 (한글 주석) */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/50">
                            {isSearching ? (
                                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                                    <div className="w-10 h-10 border-4 border-teal-600/20 border-t-teal-700 rounded-full animate-spin"></div>
                                    <span className="text-sm font-semibold text-slate-500">장소를 찾는 중입니다...</span>
                                </div>
                            ) : searchResults.length > 0 ? (
                                searchResults.map((place, idx) => (
                                    <div 
                                        key={idx} 
                                        onClick={() => handlePlaceSelect(place)}
                                        className="p-5 bg-white border border-slate-100 rounded-xl hover:border-teal-600/30 hover:shadow-md cursor-pointer transition-all duration-300 text-left group"
                                    >
                                        <h4 className="font-headline font-bold text-teal-950 group-hover:text-teal-700 transition-colors">{place.place_name}</h4>
                                        {place.road_address_name && (
                                            <p className="text-xs font-semibold text-slate-500 mt-2 flex items-center gap-1">
                                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600 font-bold">도로명</span>
                                                {place.road_address_name}
                                            </p>
                                        )}
                                        {place.address_name && (
                                            <p className="text-xs font-semibold text-slate-400 mt-1 flex items-center gap-1">
                                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-400 font-bold">지번</span>
                                                {place.address_name}
                                            </p>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-3">
                                    <span className="material-symbols-outlined text-4xl text-teal-600">travel_explore</span>
                                    <p className="text-sm font-bold text-slate-700">원하시는 장소나 건물명을 입력 후 검색해 보세요.</p>
                                    <p className="text-xs opacity-70">우편번호 또는 도로명 주소로도 직접 검색하실 수 있습니다.</p>
                                    <button 
                                        type="button"
                                        onClick={openDaumPostcode}
                                        className="mt-2 px-6 py-3.5 bg-[#004e47] hover:bg-teal-900 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 active:scale-95"
                                    >
                                        <span className="material-symbols-outlined text-lg">markunread_mailbox</span>
                                        우편번호 / 도로명 주소로 직접 찾기
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100/50 py-4">
                <div className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-teal-700 hover:bg-teal-50 transition-all duration-300 group"
                        >
                            <span className="material-symbols-outlined text-2xl group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
                        </button>
                        <div>
                            <h1 className="font-headline font-black tracking-tight text-xl text-teal-900">
                                {id ? '요청서 수정' : '요청서 작성'}
                            </h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest -mt-1">BusTaams Premium</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div
                            className="w-11 h-11 rounded-xl bg-white p-0.5 shadow-sm border border-slate-100 transition-all duration-300 overflow-hidden"
                        >
                            <div className="w-full h-full rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center relative group">
                                {profileImage ? (
                                    <img
                                        alt="Customer Profile"
                                        src={profileImage.startsWith('http') ?
                                            `${profileImage}${profileImage.includes('?') ? '&' : '?'}t=${imageVersion}` :
                                            `${import.meta.env.VITE_API_BASE_URL || ''}${profileImage.startsWith('/') ? '' : '/'}${profileImage}${profileImage.includes('?') ? '&' : '?'}t=${imageVersion}`}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.style.display = 'none';
                                            if (e.target.nextSibling) {
                                                e.target.nextSibling.style.display = 'flex';
                                            }
                                        }}
                                    />
                                ) : (
                                    <span className="material-symbols-outlined text-teal-600 text-2xl">account_circle</span>
                                )}
                                {profileImage && (
                                    <span className="material-symbols-outlined text-teal-600 text-2xl hidden items-center justify-center w-full h-full">account_circle</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 pt-24 pb-32">
                <div className="bg-white rounded-2xl p-8 lg:p-12 shadow-2xl relative border border-slate-100">
                    <form onSubmit={(e) => e.preventDefault()} className="space-y-10 text-left">
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
                                                <label className="font-label text-[10px] font-bold text-slate-400 ml-2">출발 경유지</label>
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
                                                <span>출발 경유지 추가</span>
                                            </button>
                                        )}

                                        {/* 목적지 */}
                                        <div className="space-y-2 pt-4">
                                            <label className="font-label text-xs font-bold uppercase tracking-wider text-slate-500 ml-2">목적지 <span className="text-red-500">*</span></label>
                                            <div className="relative group cursor-pointer" onClick={() => openPostcode('arr')}>
                                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-teal-600 transition-colors">flag</span>
                                                <input className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all font-bold text-teal-900 cursor-pointer placeholder-slate-400 outline-none" placeholder="클릭하여 목적지 주소 검색" readOnly type="text" value={arrAddress} />
                                            </div>
                                        </div>


                                        {/* 도착 경유지 */}
                                        {returnStops.map((stop, index) => (
                                            <div key={`retStop-${index}`} className="space-y-2 relative pl-6 border-l-2 border-dashed border-slate-200 ml-4 animate-fade-in">
                                                <div className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-slate-300 rounded-full"></div>
                                                <label className="font-label text-[10px] font-bold text-slate-400 ml-2">도착 경유지</label>
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
                                                <span>도착 경유지 추가</span>
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
                                            <label className="font-label text-xs font-bold uppercase tracking-wider text-slate-500 ml-2">도착(목적지) 일시 <span className="text-red-500">*</span></label>
                                            <div className="relative group">
                                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-teal-600">event_available</span>
                                                <input className="w-full pl-12 pr-4 py-4 bg-teal-50 border border-teal-100 rounded-xl focus:ring-2 focus:ring-teal-600/20 transition-all font-bold text-teal-900 cursor-pointer placeholder-teal-700/50 outline-none" type="text" placeholder="일시 설정 클릭" value={arrDateTime} readOnly />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="font-headline font-black text-[15px] text-teal-950/70 uppercase tracking-widest ml-2">버스 구분 표준화 (차종 선택)</h3>
                                        <div className="grid grid-cols-1 gap-4">
                                            {busTypes.map((bus) => {
                                                const count = busCounts[bus.code] || 0;
                                                return (
                                                    <div key={bus.code} className="space-y-3">
                                                        <div className="flex flex-col items-start p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-teal-600/30 hover:shadow-md transition-all duration-300 gap-4">
                                                            <div>
                                                                <p className="font-headline font-bold text-teal-900">{bus.name}</p>

                                                            </div>
                                                            <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl p-1 shadow-sm">
                                                                <button onClick={(e) => { e.preventDefault(); updateBusCount(bus.code, -1); }} className="w-8 h-8 flex items-center justify-center text-teal-700 hover:bg-slate-50 rounded-lg transition-colors" type="button"><span className="material-symbols-outlined text-lg">remove</span></button>
                                                                <span className="w-6 text-center font-bold text-teal-900">{count}</span>
                                                                <button onClick={(e) => { e.preventDefault(); updateBusCount(bus.code, 1); }} className="w-8 h-8 flex items-center justify-center text-teal-700 hover:bg-slate-50 rounded-lg transition-colors" type="button"><span className="material-symbols-outlined text-lg">add</span></button>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* +,- 선택시 하단에 생성되는 기수별 고객 요청 금액 입력부 */}
                                                        {count > 0 && (
                                                            <div className="pl-6 border-l-2 border-teal-600/30 space-y-3 ml-4 animate-fade-in text-left">
                                                                {Array.from({ length: count }).map((_, i) => {
                                                                    const key = `${bus.code}_${i}`;
                                                                    return (
                                                                        <div key={key} className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="w-6 h-6 rounded-full bg-teal-800/10 flex items-center justify-center text-teal-800 font-bold text-xs">{String(i + 1).padStart(2, '0')}</span>
                                                                                <span className="text-xs font-black text-slate-700">{bus.name} - {i + 1}호차</span>
                                                                            </div>
                                                                            <div className="flex-1 max-w-xs space-y-1">
                                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">고객 요청 금액</span>
                                                                                <div className="flex items-center bg-white rounded-xl px-3 py-2 border border-slate-200 shadow-inner overflow-hidden">
                                                                                    <span className="shrink-0 font-black text-sm text-teal-800 mr-1.5">₩</span>
                                                                                    <input
                                                                                        type="text"
                                                                                        inputMode="numeric"
                                                                                        value={quoteAmounts[key] !== undefined && quoteAmounts[key] !== 0 ? quoteAmounts[key].toLocaleString() : ''}
                                                                                        onChange={(e) => handleQuoteChange(key, e.target.value)}
                                                                                        onKeyDown={(e) => {
                                                                                            if (e.key === 'Enter') {
                                                                                                e.preventDefault();
                                                                                                // 화면에 활성화된 모든 요금 인풋들을 순서대로 가져옴 (한글 주석)
                                                                                                const inputs = Array.from(document.querySelectorAll('.quote-amount-input'));
                                                                                                const index = inputs.indexOf(e.target);
                                                                                                if (index !== -1 && index < inputs.length - 1) {
                                                                                                    // 다음 인풋으로 포커스 이동 (한글 주석)
                                                                                                    inputs[index + 1].focus();
                                                                                                } else {
                                                                                                    // 마지막 인풋이면 키보드를 내림 (한글 주석)
                                                                                                    e.target.blur();
                                                                                                }
                                                                                            }
                                                                                        }}
                                                                                        className="quote-amount-input flex-1 min-w-0 w-full bg-transparent border-none focus:ring-0 text-teal-950 font-black text-right outline-none p-0 text-sm"
                                                                                        placeholder="0"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </section>

                                {/* 총 예약 금액 표시 */}
                                {grandTotal > 0 && (
                                    <div className="pt-8 border-t border-teal-800/10">
                                        <div className="flex flex-col gap-1 px-4 text-left">
                                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">총 예약 금액</p>
                                            <div className="flex flex-wrap items-baseline gap-1.5">
                                                <span className="text-lg font-black text-teal-900/60">₩</span>
                                                <h4 className="font-headline font-black text-2xl sm:text-3xl tracking-tight text-teal-900">
                                                    {grandTotal.toLocaleString()}
                                                </h4>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-auto self-center">부가가치세 포함</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-8">
                                    <button onClick={handleRequestSubmit} className="w-full py-4 px-8 rounded-xl bg-primary text-white font-headline font-extrabold text-lg shadow-lg hover:shadow-xl hover:shadow-primary/20 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3">
                                        <span>여행 요청하기</span>
                                        <span className="material-symbols-outlined">arrow_forward</span>
                                    </button>
                                </div>
                            </form>
                </div>
            </main>

            <BottomNavCustomer />
        </div>
    );
};

export default RequestBus;
