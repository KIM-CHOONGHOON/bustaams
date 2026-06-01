import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { getImageUrl } from '../api';
import BottomNavCustomer from '../components/BottomNavCustomer';

const ReservationDetailCustomer = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [reservation, setReservation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null); // 에러 상태 추가
    const [customerProfile, setCustomerProfile] = useState(null);
    const [imageVersion, setImageVersion] = useState(Date.now());

    // 취소 모달 관련 상태들 (Early Return 이전에 호출되도록 최상단 배치)
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelCode, setCancelCode] = useState('06');
    const [cancelReasonText, setCancelReasonText] = useState('');
    const [cancelFile, setCancelFile] = useState(null);
    const [isCancelling, setIsCancelling] = useState(false);

    useEffect(() => {
        const fetchDetail = async () => {
            setLoading(true);
            setError(null); // 초기화
            try {
                const res = await api.get(`/app/customer/reservation/${id}`);
                console.log('[ReservationDetail] Fetched data:', res);
                if (res.success) {
                    setReservation(res.data);
                } else {
                    console.error('[ReservationDetail] API returned success:false', res.error);
                    setError(res.error || '예약 정보를 불러오는데 실패했습니다.');
                }
            } catch (err) {
                console.error('[ReservationDetail] Failed to fetch reservation detail:', err);
                // 403 에러 등의 경우 api.js에서 에러를 throw하므로 여기서 처리
                if (err.message && err.message.includes('403')) {
                    setError('이 예약 정보에 접근할 권한이 없습니다.');
                } else if (err.message && err.message.includes('404')) {
                    setError('요청하신 예약 정보를 찾을 수 없습니다.');
                } else {
                    setError('예약 정보를 불러오는 중 오류가 발생했습니다.');
                }
            } finally {
                setLoading(false);
            }
        };

        const fetchProfile = async () => {
            try {
                const profileRes = await api.get('/app/customer/profile');
                if (profileRes.success) {
                    setCustomerProfile(profileRes.data);
                    setImageVersion(Date.now());
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            }
        };

        fetchDetail();
        fetchProfile();
    }, [id]);

    const getBusStatusDisplay = (status) => {
        const config = {
            'AUCTION': { label: '청약대기중..', color: 'bg-slate-100 text-slate-400' },
            'BIDDING': { label: '승인대기중..', color: 'bg-orange-100 text-orange-700' },
            'CONFIRM': { label: '예약 확정..', color: 'bg-teal-100 text-teal-700' },
            'DONE': { label: '운행 종료..', color: 'bg-slate-100 text-slate-500' },
            'TRAVELER_CANCEL': { label: '전체 취소', color: 'bg-red-100 text-red-700' },
            'DRIVER_CANCEL': { label: '기사 취소', color: 'bg-red-100 text-red-700' },
            'BUS_CHANGE': { label: '변경 요청', color: 'bg-purple-100 text-purple-700' },
            'BUS_CANCEL': { label: '대수 취소', color: 'bg-gray-100 text-gray-600' }
        };
        return config[status] || { label: status || '상태 대기', color: 'bg-slate-100 text-slate-400' };
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="font-black text-primary animate-pulse tracking-widest uppercase text-xs">로딩 중...</p>
                </div>
            </div>
        );
    }

    if (error || !reservation) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
                <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">error</span>
                <p className="text-slate-400 font-bold text-center">{error || '예약 정보를 찾을 수 없습니다.'}</p>
                <button onClick={() => navigate(-1)} className="mt-8 px-8 py-3 bg-slate-100 text-slate-600 rounded-full font-bold transition-all hover:bg-slate-200">
                    뒤로 가기
                </button>
            </div>
        );
    }

    const handleComplete = async () => {
        if (!window.confirm('여행이 완료되었습니까? 확인을 누르시면 상태가 운행 종료로 변경됩니다.')) return;

        try {
            const res = await api.post('/app/customer/reservation/complete', { reqId: id });
            if (res.success) {
                alert('여행이 완료 처리되었습니다. 이용해 주셔서 감사합니다!');
                window.location.reload(); // 페이지 새로고침하여 상태 반영
            } else {
                alert(res.error || '처리 중 오류가 발생했습니다.');
            }
        } catch (err) {
            console.error('Failed to complete trip:', err);
            alert('서버와 통신 중 오류가 발생했습니다.');
        }
    };



    const handleCancel = async () => {
        if (!cancelReasonText.trim()) {
            alert('상세 취소 사유를 입력해주세요.');
            return;
        }

        setIsCancelling(true);
        try {
            const formData = new FormData();
            formData.append('reqId', id);
            formData.append('cancelCode', cancelCode);
            formData.append('cancelReasonText', cancelReasonText);
            if (cancelFile) {
                formData.append('file', cancelFile);
            }

            const res = await api.post('/app/customer/cancel-request', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.success) {
                alert('여행이 성공적으로 취소되었습니다.');
                navigate('/reservation-list');
            } else {
                alert(res.error || '취소 처리 중 오류가 발생했습니다.');
            }
        } catch (err) {
            console.error('Failed to cancel request:', err);
            alert('서ver와 통신 중 오류가 발생했습니다.');
        } finally {
            setIsCancelling(false);
            setShowCancelModal(false);
        }
    };

    // 예약 확정된 버스들 필터링
    const confirmedBuses = reservation?.requestedBuses?.filter(b => b.resStatus === 'CONFIRM' || b.status === 'CONFIRM') || [];
    const routeData = reservation?.route || [];

    return (
        <div className="bg-background text-on-surface min-h-screen pb-40 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-50 shadow-sm">
                <div className="flex items-center justify-between px-6 h-20 w-full max-w-7xl mx-auto py-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="material-symbols-outlined text-slate-400 hover:bg-slate-50 p-2 rounded-full transition-all">arrow_back</button>
                        <h1 className="font-headline text-lg font-black tracking-tighter text-teal-800 italic">여행 상세 정보</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 overflow-hidden border-2 border-white shadow-sm transition-transform hover:scale-110 active:scale-95 cursor-pointer" onClick={() => navigate('/profile-customer')}>
                            {customerProfile?.profileImage ? (
                                <img 
                                    src={getImageUrl(customerProfile.profileImage, imageVersion)} 
                                    alt="Profile" 
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="material-symbols-outlined text-slate-400">account_circle</span>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="pt-28 px-6 max-w-7xl mx-auto">
                {customerProfile && customerProfile.restrictStat && customerProfile.restrictStat !== 'N' && (
                    <div className="mb-8 p-6 rounded-[2rem] bg-rose-500 text-white shadow-xl shadow-rose-500/20 flex items-center gap-4 animate-pulse">
                        <span className="material-symbols-outlined text-3xl">warning</span>
                        <div>
                            <p className="font-black text-sm uppercase tracking-widest">현재 서비스 이용 제한 상태입니다</p>
                            <p className="text-xs font-bold opacity-90">
                                {customerProfile.restrictStat === 'P' ? 
                                    '무기한 이용 제한 상태입니다. 고객센터에 문의해주세요.' : 
                                    `${customerProfile.restrictEndDt}까지 이용이 제한됩니다.`}
                            </p>
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
                    <div className="lg:col-span-8 space-y-16">
                        {/* Trip Summary Header */}
                        <section className="text-left">
                            <div className="space-y-4">
                                <span className="text-secondary font-black text-[10px] tracking-[0.4em] uppercase">확정된 여행 상세 정보</span>
                                <h2 className="text-[44px] font-black tracking-tighter text-on-surface leading-tight italic">
                                    {reservation.tripName}
                                </h2>
                                <div className="flex items-center gap-4">
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${getBusStatusDisplay(reservation.status).color}`}>
                                        {reservation.statusText}
                                    </span>
                                    <span className="text-slate-400 text-sm font-bold">{reservation.start_date} ~ {reservation.end_date}</span>
                                </div>
                            </div>
                        </section>

                        {/* Route Summary */}
                        <section className="bg-white rounded-[3.5rem] p-12 shadow-2xl shadow-teal-900/[0.03] border border-slate-50 text-left">
                            <div className="text-xl font-black tracking-tight border-b border-slate-50 pb-6 italic text-teal-700 flex items-center gap-2">
                                <span className="material-symbols-outlined">route</span>
                                전체 운행 경로
                            </div>
                            <div className="mt-8 space-y-10 relative">
                                <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-100"></div>
                                {routeData.map((point, idx) => {
                                    const isRoundTrip = point.type === 'ROUND_TRIP' || point.type === 'DEST';
                                    return (
                                        <div key={idx} className="relative pl-12">
                                            <div className={`absolute left-0 top-1.5 w-8 h-8 rounded-full border-4 border-white shadow-md z-10 flex items-center justify-center ${
                                                point.type === 'START' ? 'bg-teal-600 text-white shadow-teal-200' : 
                                                point.type === 'END' ? 'bg-rose-500 text-white shadow-rose-200' : 
                                                isRoundTrip ? 'bg-indigo-600 text-white shadow-indigo-100' :
                                                'bg-amber-400 text-white shadow-amber-100'
                                            }`}>
                                                <span className="material-symbols-outlined text-[16px] font-black">
                                                    {point.type === 'START' ? 'location_on' : 
                                                     point.type === 'END' ? 'flag' : 
                                                     isRoundTrip ? 'near_me' : 'more_horiz'}
                                                </span>
                                            </div>
                                            <div className="flex flex-col text-left">
                                                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                                                    point.type === 'START' ? 'text-teal-600' : 
                                                    point.type === 'END' ? 'text-rose-500' : 
                                                    isRoundTrip ? 'text-indigo-500' : 'text-amber-500'
                                                }`}>
                                                    {point.title}
                                                </p>
                                                <h4 className="text-lg font-black tracking-tight text-on-surface text-left">
                                                    {point.addr}
                                                </h4>
                                                {point.time && (
                                                    <p className="text-xs text-slate-400 font-bold mt-1 opacity-70 italic text-left">
                                                        {point.time}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                            {/* Confirmed Drivers/Buses */}
                            {confirmedBuses.length > 0 ? (
                                <section className="space-y-16">
                                    <h3 className="text-3xl font-black tracking-tighter italic border-l-8 border-teal-500 pl-6">확정된 차량 및 기사님 정보</h3>
                                    {confirmedBuses.map((bus, idx) => (
                                        <div key={idx} className="space-y-12 pb-16 border-b border-slate-100 last:border-0">
                                            {/* Driver Profile Style - 대형 이미지 제거 및 1열 레이아웃 */}
                                            <div className="space-y-6 text-left">
                                                <div className="flex items-center gap-3">
                                                    <span className="bg-teal-50 text-teal-600 text-[10px] font-black px-4 py-1.5 rounded-full flex items-center gap-1.5 uppercase tracking-widest border border-teal-100">
                                                        <span className="material-symbols-outlined text-[14px]" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>
                                                        확정된 기사님
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-teal-100 shadow-sm flex-shrink-0">
                                                        <img 
                                                            src={bus.driverAvatar ? getImageUrl(bus.driverAvatar, imageVersion) : 'https://via.placeholder.com/300?text=Driver'} 
                                                            alt="Driver Avatar" 
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <h2 className="text-[32px] md:text-[36px] font-black tracking-tighter text-on-surface leading-none italic">{bus.driverName} 기사님</h2>
                                                </div>
                                                <div className="grid grid-cols-2 gap-8 py-6 border-y border-slate-100">
                                                    <div>
                                                        <p className="text-slate-300 text-[10px] font-black uppercase tracking-widest mb-1">차량 번호</p>
                                                        <p className="text-xl font-black">{bus.busNo}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-300 text-[10px] font-black uppercase tracking-widest mb-1">기사 연락처</p>
                                                        <p className="text-xl font-black">{bus.driverHp || '010-0000-0000'}</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => navigate(`/chat-room/${bus.resId}`)} 
                                                    className="w-full md:w-auto inline-flex items-center justify-center gap-4 px-12 py-6 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-indigo-700 text-white font-black text-lg uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[0_20px_50px_rgba(79,70,229,0.4)] ring-4 ring-indigo-50 group relative overflow-hidden"
                                                >
                                                    <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12"></div>
                                                    <span className="material-symbols-outlined animate-bounce group-hover:animate-none">chat_bubble</span>
                                                    기사님과 1:1 대화하기
                                                </button>
                                            </div>

                                            {/* Vehicle Info Style */}
                                            <div className="bg-white rounded-[3rem] p-12 shadow-2xl shadow-teal-900/[0.03] border border-slate-50 space-y-12 text-left">
                                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                                    <div className="space-y-1">
                                                        <h3 className="text-3xl font-black tracking-tighter text-teal-700 leading-tight italic">{bus.busModel}</h3>
                                                        <p className="text-on-surface-variant font-bold opacity-50 uppercase tracking-widest text-xs">
                                                            {bus.busType} 등급 • {bus.busNo}
                                                        </p>
                                                    </div>
                                                    <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100">
                                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">최종 예약 금액</p>
                                                        <p className="text-2xl font-black text-teal-600">₩ {Number(bus.confirmedPrice || 0).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                
                                                {/* 차량 이미지 복구 및 렌더링 */}
                                                {bus.busImage && (
                                                    <div className="relative group rounded-[2.5rem] overflow-hidden aspect-[16/9] bg-slate-100 border border-slate-100 shadow-md">
                                                        <img 
                                                            src={getImageUrl(bus.busImage, imageVersion)} 
                                                            alt={bus.busModel} 
                                                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent"></div>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-4 pt-10 border-t border-slate-50">
                                                    <div className="flex justify-between items-center py-3 border-b border-slate-50">
                                                        <span className="text-slate-400 font-bold uppercase text-[11px] tracking-widest">차량 번호</span>
                                                        <span className="font-black text-on-surface">{bus.busNo || '-'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center py-3 border-b border-slate-50">
                                                        <span className="text-slate-400 font-bold uppercase text-[11px] tracking-widest">운행 상태</span>
                                                        <span className="px-3 py-1 bg-teal-50 text-teal-600 rounded-full font-black text-[10px] tracking-widest uppercase border border-teal-100">배차 확정</span>
                                                    </div>
                                                    <div className="flex justify-between items-center py-3 border-b border-slate-50 md:col-span-2">
                                                        <span className="text-slate-400 font-bold uppercase text-[11px] tracking-widest">안전장치(AEBS)</span>
                                                        <span className={`font-black ${bus.hasAdas === 'Y' ? 'text-teal-600' : 'text-slate-500'}`}>
                                                            {bus.hasAdas === 'Y' ? '장착 완료' : '미장착'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* 차량 편의 시설 및 옵션 추가 */}
                                                <div className="pt-10 border-t border-slate-50 space-y-6">
                                                    <div className="flex items-center gap-2 text-teal-700">
                                                        <span className="material-symbols-outlined text-lg">settings_suggest</span>
                                                        <h4 className="text-sm font-black uppercase tracking-widest italic">차량 편의 시설 및 옵션</h4>
                                                    </div>
                                                    <div className="flex flex-wrap gap-3">
                                                        {(() => {
                                                            try {
                                                                const amenityData = typeof bus.amenities === 'string' ? JSON.parse(bus.amenities) : bus.amenities;
                                                                if (Array.isArray(amenityData) && amenityData.length > 0) {
                                                                    return amenityData.map((item, idx) => (
                                                                        <span key={idx} className="px-5 py-2.5 bg-slate-50 text-slate-600 rounded-2xl text-[11px] font-black border border-slate-100 flex items-center gap-2 shadow-sm">
                                                                            <span className="material-symbols-outlined text-[16px] text-teal-500" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>
                                                                            {item}
                                                                        </span>
                                                                    ));
                                                                }
                                                                return <p className="text-xs text-slate-300 font-bold italic py-4">제공되는 편의 시설 정보가 없습니다.</p>;
                                                            } catch (e) {
                                                                return <p className="text-xs text-slate-300 font-bold italic py-4">제공되는 편의 시설 정보가 없습니다.</p>;
                                                            }
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </section>
                            ) : (
                            <section className="bg-white rounded-[3rem] p-16 flex flex-col items-center justify-center text-center space-y-6 border border-slate-100 shadow-sm">
                                <span className="material-symbols-outlined text-6xl text-slate-200">pending_actions</span>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-slate-800 italic">차량 매칭 진행 중</h3>
                                    <p className="text-slate-400 text-sm font-bold">기사님들의 응찰을 기다리고 있습니다.</p>
                                </div>
                                <button onClick={() => navigate(`/estimate-list/${id}`)} className="bg-primary text-white px-10 py-4 rounded-full font-black text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all italic">
                                    전체 응찰 현황 보기
                                </button>
                            </section>
                        )}
                    </div>

                    {/* Right Column Sticky Payment */}
                    <div className="lg:col-span-4">
                        <aside className="sticky top-28 bg-slate-900 p-12 rounded-[3.5rem] shadow-2xl shadow-slate-900/40 border border-white/5 space-y-10 text-left">
                            <div className="space-y-2">
                                <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">총 예약 정보</h4>
                                <h3 className="text-2xl font-black tracking-tight text-white italic">최종 결제 금액</h3>
                            </div>
                            <div className="pt-8 border-t border-white/10">
                                <div className="flex justify-between items-baseline mb-6">
                                    <span className="text-5xl font-black tracking-tighter text-white">₩ {Number(reservation.total_price || 0).toLocaleString()}</span>
                                    <span className="material-symbols-outlined text-primary text-3xl">verified</span>
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold leading-relaxed italic">
                                    * 모든 세금 및 봉사료가 포함된 최종 금액입니다.
                                </p>
                            </div>
                            <div className="space-y-4">
                                {reservation.status === 'CONFIRM' && (
                                    <button 
                                        onClick={handleComplete} 
                                        className="w-full py-6 rounded-full bg-teal-500 text-white font-black text-xs uppercase tracking-[0.4em] shadow-2xl shadow-teal-900/50 hover:scale-[1.03] active:scale-95 transition-all italic flex items-center justify-center gap-3"
                                    >
                                        <span className="material-symbols-outlined text-lg">check_circle</span>
                                        여행 완료 처리
                                    </button>
                                )}
                                {reservation.status !== 'DONE' && reservation.status !== 'TRAVELER_CANCEL' && (
                                    <button onClick={() => setShowCancelModal(true)} className="w-full py-5 rounded-full bg-white/5 text-red-400 border border-white/10 font-black text-[10px] uppercase tracking-[0.4em] hover:bg-red-500 hover:text-white transition-all italic">
                                        여행 취소하기
                                    </button>
                                )}
                            </div>
                        </aside>
                    </div>
                </div>
            </main>

            {/* Cancel Modal */}
            {showCancelModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
                        <div className="space-y-2 text-center">
                            <h3 className="text-3xl font-black tracking-tighter text-slate-900 italic">여행 취소 요청</h3>
                            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 space-y-2">
                                <p className="text-rose-600 text-[10px] font-black uppercase tracking-widest">취소 패널티 안내</p>
                                <p className="text-slate-600 text-xs font-bold leading-relaxed">
                                    취소 횟수에 따라 서비스 이용이 제한될 수 있습니다.<br/>
                                    (1회: 3개월, 2회: 6개월, 3회: 9개월, 4회 이상: 무기한)
                                </p>
                            </div>
                            <p className="text-slate-400 text-sm font-bold">원활한 서비스 개선을 위해 취소 사유를 입력해주세요.</p>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">취소 사유 선택</label>
                                <select 
                                    value={cancelCode} 
                                    onChange={(e) => setCancelCode(e.target.value)}
                                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all appearance-none"
                                >
                                    <option value="01">단순 변심</option>
                                    <option value="02">일정 변경</option>
                                    <option value="03">타 서비스 이용</option>
                                    <option value="04">기사 불친절/불만족</option>
                                    <option value="05">서비스 장애</option>
                                    <option value="06">기타</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">상세 사유 내용</label>
                                <textarea 
                                    value={cancelReasonText}
                                    onChange={(e) => setCancelReasonText(e.target.value)}
                                    placeholder="구체적인 취소 사유를 입력해주세요 (필수)"
                                    className="w-full h-32 px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all resize-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">관련 서류 (선택)</label>
                                <div className="relative group">
                                    <input 
                                        type="file" 
                                        id="cancel-file"
                                        onChange={(e) => setCancelFile(e.target.files[0])}
                                        className="hidden"
                                    />
                                    <label 
                                        htmlFor="cancel-file"
                                        className="flex items-center justify-between px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold text-slate-400 cursor-pointer hover:bg-slate-100 transition-all group-hover:border-teal-200"
                                    >
                                        <span className="truncate">{cancelFile ? cancelFile.name : '파일을 선택하세요'}</span>
                                        <span className="material-symbols-outlined text-slate-300">attach_file</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button 
                                onClick={() => setShowCancelModal(false)}
                                className="flex-1 py-5 rounded-full bg-slate-100 text-slate-500 font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all italic"
                            >
                                창 닫기
                            </button>
                            <button 
                                onClick={handleCancel}
                                disabled={isCancelling}
                                className="flex-1 py-5 rounded-full bg-teal-500 text-white font-black text-[11px] uppercase tracking-widest shadow-lg shadow-teal-500/20 hover:scale-[1.02] active:scale-95 transition-all italic disabled:opacity-50 disabled:scale-100"
                            >
                                {isCancelling ? '처리 중...' : '취소 신청하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <BottomNavCustomer />
        </div>
    );
};

export default ReservationDetailCustomer;
