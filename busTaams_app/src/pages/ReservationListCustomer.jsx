import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import BottomNavCustomer from '../components/BottomNavCustomer';

const ReservationListCustomer = () => {
    const navigate = useNavigate();
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [customerProfile, setCustomerProfile] = useState(null);
    const [imageVersion, setImageVersion] = useState(Date.now());

    useEffect(() => {
        const fetchReservations = async () => {
            setLoading(true);
            try {
                const res = await api.get('/app/customer/reservations');
                if (res.success) {
                    setReservations(res.data);
                }
            } catch (err) {
                console.error('Failed to fetch reservations:', err);
            } finally {
                setLoading(false);
            }
        };

        const fetchProfile = async () => {
            try {
                const res = await api.get('/app/customer/profile');
                if (res.success) {
                    setCustomerProfile(res.data);
                    setImageVersion(Date.now());
                }
            } catch (err) {
                console.error('Failed to fetch profile:', err);
            }
        };

        fetchReservations();
        fetchProfile();
    }, []);

    const getBusStatusDisplay = (status) => {
        const config = {
            'AUCTION': { label: '입찰 대기중', color: 'bg-slate-100 text-slate-400' },
            'CUSTOMER_PAY_WAIT': { label: '고객 결제 대기', color: 'bg-orange-100 text-orange-700' },
            'DRIVER_PAY_WAIT': { label: '기사 결제 대기', color: 'bg-purple-100 text-purple-700' },
            'FINAL_APPROVAL_WAIT': { label: '최종 승인 대기', color: 'bg-amber-100 text-amber-700' },
            'CANCEL_UNPENDING': { label: '미결제 자동취소', color: 'bg-rose-100 text-rose-700' },
            'CONFIRM': { label: '예약 확정', color: 'bg-teal-100 text-teal-700' },
            'DONE': { label: '운행 종료', color: 'bg-slate-100 text-slate-500' },
            'TRAVELER_CANCEL': { label: '전체 취소', color: 'bg-red-100 text-red-700' },
            'DRIVER_CANCEL': { label: '기사 취소', color: 'bg-red-100 text-red-700' },
            'BUS_CHANGE': { label: '변경 요청', color: 'bg-purple-100 text-purple-700' },
            'BUS_CANCEL': { label: '대수 취소', color: 'bg-gray-100 text-gray-600' }
        };
        return config[status] || { label: status || '상태 대기', color: 'bg-slate-100 text-slate-400' };
    };

    return (
        <div className="bg-background text-on-surface min-h-screen pb-40 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-3xl border-b border-white py-4 shadow-sm">
                <div className="flex items-center justify-between px-6 h-18 w-full max-w-7xl mx-auto">
                    <div className="flex items-center gap-5">
                        <button onClick={() => navigate(-1)} className="text-teal-800 hover:bg-slate-50 p-2 rounded-full transition-all">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <h1 className="text-3xl font-black text-teal-900 tracking-tighter font-headline">예약 내역</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div 
                            className="w-11 h-11 rounded-xl bg-white p-0.5 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:border-teal-600/20 transition-all duration-300 overflow-hidden"
                            onClick={() => navigate('/user-profile')}
                        >
                            <div className="w-full h-full rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center relative group">
                                {customerProfile?.profileImage ? (
                                    <img 
                                        alt="Customer Profile" 
                                        src={customerProfile.profileImage.startsWith('http') ? 
                                            `${customerProfile.profileImage}${customerProfile.profileImage.includes('?') ? '&' : '?'}t=${imageVersion}` : 
                                            `${import.meta.env.VITE_API_BASE_URL || ''}${customerProfile.profileImage.startsWith('/') ? '' : '/'}${customerProfile.profileImage}${customerProfile.profileImage.includes('?') ? '&' : '?'}t=${imageVersion}`} 
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
                                {customerProfile?.profileImage && (
                                    <span className="material-symbols-outlined text-teal-600 text-2xl hidden items-center justify-center w-full h-full">account_circle</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="pt-28 px-6 max-w-6xl mx-auto space-y-16">

                {/* Reservations List */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-6">
                            <div className="w-16 h-16 border-[6px] border-teal-600/20 border-t-teal-600 rounded-full animate-spin"></div>
                            <p className="text-slate-400 font-bold tracking-widest uppercase text-xs">여행 일정을 불러오는 중입니다...</p>
                        </div>
                    ) : reservations.length > 0 ? (
                        reservations.map((res, idx) => (
                            <div 
                                key={res.id}
                                onClick={() => navigate(`/reservation-detail/${res.id}`)}
                                className={`group relative bg-white rounded-2xl shadow-2xl shadow-teal-900/[0.04] overflow-hidden transition-all duration-700 hover:shadow-teal-900/10 cursor-pointer animate-in fade-in slide-in-from-bottom-12 border border-slate-100/50 ${res.statusCode === 'DONE' ? 'opacity-70 grayscale-[0.3]' : ''}`}
                                style={{ animationDelay: `${idx * 150}ms` }}
                            >
                                {/* Vertical Status Accent */}
                                <div className={`absolute left-0 top-0 bottom-0 w-3 transition-all duration-700 group-hover:w-4 ${res.statusCode === 'CONFIRM' ? 'bg-teal-500' : 'bg-slate-200'}`}></div>
                                
                                <div className="p-10 md:p-14">
                                    {/* 카드 상단: 운행 노선 및 제목 */}
                                    <div className="mb-10 border-b border-slate-50 pb-8">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <span className="bg-teal-50 text-teal-700 text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] border border-teal-100/50 shadow-sm">확정된 여행</span>
                                            </div>
                                        </div>
                                        
                                        {/* 여행 제목 */}
                                        <h3 className="text-2xl md:text-4xl font-headline font-black text-slate-900 tracking-tight leading-tight italic group-hover:text-teal-600 transition-colors mb-6">
                                            {res.title || '나의 여행 일정'}
                                        </h3>
                                        
                                        {/* 운행 일정 */}
                                        <div className="flex items-start gap-2 mt-4 mb-6 text-left">
                                            <span className="material-symbols-outlined text-teal-600 text-base mt-0.5">event</span>
                                            <div className="text-sm font-semibold text-slate-500 tracking-wide space-y-1">
                                                <p>{res.startDt ? `${res.startDt.split(' ')[0].replace(/\./g, '-')} ${res.startDt.split(' ')[1] || ''} ~` : ''}</p>
                                                <p>{res.endDt ? `${res.endDt.split(' ')[0].replace(/\./g, '-')} ${res.endDt.split(' ')[1] || ''}` : ''}</p>
                                            </div>
                                        </div>

                                        {/* 운행 경로 세로 Bento 스타일 */}
                                        <div className="space-y-5 text-left py-2 mb-6">
                                            <div className="flex flex-col text-left">
                                                <p className="text-xs font-bold text-slate-400 mb-1">출발</p>
                                                <p className="font-black text-base text-slate-800">{res.startAddr}</p>
                                            </div>
                                            {res.routeDetail?.via && (
                                                <div className="flex flex-col text-left">
                                                    <p className="text-xs font-bold text-teal-600 mb-1">목적지</p>
                                                    <p className="font-black text-base text-slate-800">{res.routeDetail.via}</p>
                                                </div>
                                            )}
                                            <div className="flex flex-col text-left">
                                                <p className="text-xs font-bold text-slate-400 mb-1">도착</p>
                                                <p className="font-black text-base text-slate-800">{res.endAddr}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-10">
                                        {/* 배정된 기사 및 차량 정보 리스트 */}
                                        {res.buses && res.buses.length > 0 && (
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="material-symbols-outlined text-teal-600">assignment_ind</span>
                                                    <p className="text-slate-900 font-black text-sm uppercase tracking-widest italic">배정된 기사 및 차량 정보</p>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {res.buses.map((bus, busIdx) => (
                                                        <div key={busIdx} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-start justify-between group/bus hover:border-teal-200 transition-all">
                                                            <div className="flex items-start gap-5">
                                                                {/* 기사 프로필 이미지 */}
                                                                <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white shadow-md shrink-0">
                                                                    {bus.driverImage ? (
                                                                        <img 
                                                                            src={bus.driverImage.startsWith('http') ? bus.driverImage : `${import.meta.env.VITE_API_BASE_URL || ''}${bus.driverImage}`} 
                                                                            alt={bus.driverName} 
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                                                                            <span className="material-symbols-outlined text-3xl">person</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {/* 기사 및 차량 정보 텍스트 (세로 4줄 정렬) */}
                                                                <div className="space-y-1">
                                                                    <p className="text-slate-900 font-black text-base tracking-tight italic">{bus.driverNm || bus.driverName} 기사님</p>
                                                                    <p className="text-teal-700 text-xs font-bold tracking-widest">{bus.vehicleNo}</p>
                                                                    <p className="text-slate-500 text-xs font-bold">{bus.modelNm}</p>
                                                                    {bus.driverPhone && (
                                                                        <p className="text-slate-600 font-bold text-xs tracking-tight">
                                                                            {bus.driverPhone.replace(/[^0-9]/g, "").replace(/^(\d{2,3})(\d{3,4})(\d{4})$/, `$1-$2-$3`)}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {/* 전화 걸기 버튼 */}
                                                            <div className="flex items-center self-center shrink-0">
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (bus.driverPhone) window.location.href = `tel:${bus.driverPhone}`;
                                                                    }}
                                                                    className="w-12 h-12 bg-teal-600 text-white rounded-xl flex items-center justify-center hover:bg-teal-700 transition-all shadow-lg shadow-teal-200"
                                                                >
                                                                    <span className="material-symbols-outlined">call</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex-1 flex flex-col justify-between py-2">
                                            <div className="space-y-10">
                                                <div className="flex flex-col gap-6">

                                                    <div className="flex items-center gap-6 border-b border-slate-50 pb-3">
                                                        <span className="w-24 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] shrink-0">차량 정보</span>
                                                        <div className="flex items-center gap-3">
                                                            <span className="material-symbols-outlined text-teal-600 text-xl">minor_crash</span>
                                                            <p className="text-slate-900 font-black tracking-tight text-base md:text-lg italic">{res.busType || '대형버스 (45인승)'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-6 border-b border-slate-50 pb-3">
                                                        <span className="w-24 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] shrink-0">총 버스 대수</span>
                                                        <div className="flex items-center gap-3">
                                                            <span className="material-symbols-outlined text-teal-600 text-xl">directions_bus</span>
                                                            <p className="text-slate-900 font-black text-base md:text-lg italic">{res.busCount}대</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-6 border-b border-slate-50 pb-3">
                                                        <span className="w-24 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] shrink-0">상태</span>
                                                        <span className={`${res.statusCode === 'DONE' ? 'text-slate-400' : 'text-teal-600'} font-black text-sm uppercase tracking-widest flex items-center gap-2`}>
                                                            <span className="material-symbols-outlined text-xl" style={{fontVariationSettings: "'FILL' 1"}}>{res.statusCode === 'DONE' ? 'history' : 'verified_user'}</span>
                                                            {getBusStatusDisplay(res.statusCode).label}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center text-sm border-t border-slate-100 pt-4 mt-6">
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-teal-600 text-xl">payments</span>
                                                        <span className="text-slate-400 font-bold uppercase tracking-tighter text-[11px]">총 결제 금액</span>
                                                    </div>
                                                    <span className="font-black text-[#004e47] text-lg">
                                                        {res.totalOfferPrice ? `${Number(res.totalOfferPrice).toLocaleString()}원` : '금액 정보 없음'}
                                                    </span>
                                                </div>
                                                
                                                <div className="mt-6">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/reservation-detail/${res.id}`);
                                                        }}
                                                        className="w-full bg-teal-700 text-white py-4 rounded-xl font-black text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg btn-primary flex items-center justify-center gap-2.5"
                                                    >
                                                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                                                        상세내역보기
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-white rounded-2xl p-24 flex flex-col items-center justify-center text-center space-y-8 border border-slate-100 shadow-sm">
                                                            <div className="w-28 h-28 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 border border-slate-100 shadow-inner">
                                                                <span className="material-symbols-outlined text-6xl">event_busy</span>
                                                            </div>
                                                            <div className="space-y-3">
                                                                <h3 className="text-3xl font-black text-slate-800 tracking-tight">예약 내역이 없습니다</h3>
                                                                <p className="text-slate-400 font-bold text-lg">새로운 여행을 계획하고 예약을 시작해보세요.</p>
                                                            </div>
                                                            <button onClick={() => navigate('/customer-dashboard')} className="bg-primary text-white px-12 py-5 rounded-xl font-black text-sm shadow-2xl shadow-primary/30 hover:scale-105 active:scale-[0.98] transition-all uppercase tracking-widest">
                                                                시작하기
                                                            </button>
                                                        </div>
                    )}
            </main>

            {/* Premium Bottom Nav */}
            <BottomNavCustomer />
        </div>
    );
};

export default ReservationListCustomer;
