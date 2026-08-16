import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import BottomNavCustomer from '../components/BottomNavCustomer';

const ReservationList = () => {
    const navigate = useNavigate();
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [profileImage, setProfileImage] = useState(null);
    const [imageVersion, setImageVersion] = useState(Date.now());

    useEffect(() => {
        const fetchReservations = async () => {
            setLoading(true);
            try {
                const res = await api.get('/app/customer/reservations');
                console.log('[ReservationList] API Response:', res);
                if (res.success) {
                    setReservations(res.data);
                }
            } catch (err) {
                console.error('[ReservationList] Failed to fetch reservations:', err);
            } finally {
                setLoading(false);
            }
        };

        const fetchProfile = async () => {
            try {
                const res = await api.get('/app/customer/profile');
                if (res.success && res.data.profileImage) {
                    setProfileImage(res.data.profileImage);
                    setImageVersion(Date.now());
                }
            } catch (err) {
                console.error('Fetch profile error:', err);
            }
        };

        fetchReservations();
        fetchProfile();
    }, []);

    const getStatusLabel = (code) => {
        switch(code) {
            case 'CONFIRM': return '예약 확정';
            case 'DONE': return '운행 완료';
            case 'UPCOMING': return '운행 예정';
            default: return code;
        }
    };

    return (
        <div className="bg-background text-on-surface font-body min-h-screen pb-32">
            {/* TopAppBar */}
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
                                예약 리스트
                            </h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest -mt-1">BusTaams Premium</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div 
                            className="w-11 h-11 rounded-2xl bg-white p-0.5 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:border-teal-600/20 transition-all duration-300 overflow-hidden"
                            onClick={() => navigate('/profile-customer')}
                        >
                            <div className="w-full h-full rounded-[14px] overflow-hidden bg-slate-50 flex items-center justify-center relative group">
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
                                            if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
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

            <main className="pt-24 pb-32 px-6 max-w-5xl mx-auto text-left">

                <div className="grid grid-cols-1 gap-8">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-slate-400 font-bold">내역을 불러오는 중...</p>
                        </div>
                    ) : reservations.length > 0 ? (
                        reservations.map((res, idx) => (
                            <div 
                                key={res.id}
                                onClick={() => res.statusCode !== 'DONE' && navigate(`/reservation-detail/${res.id}`)}
                                className={`group relative bg-white rounded-2xl shadow-sm border border-slate-50 overflow-hidden transition-all duration-300 hover:shadow-xl hover:translate-y-[-4px] cursor-pointer ${res.statusCode === 'DONE' ? 'opacity-60 bg-slate-50/50' : ''}`}
                            >
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${res.statusCode === 'CONFIRM' ? 'bg-primary' : 'bg-slate-200'}`}></div>
                                <div className="p-8 flex flex-col md:flex-row gap-8">
                                    <div className="w-full md:w-1/3 h-48 rounded-xl overflow-hidden relative shadow-sm bg-slate-100 flex items-center justify-center">
                                        {res.img ? (
                                            <img 
                                                className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${res.statusCode === 'DONE' ? 'grayscale' : ''}`} 
                                                src={res.img.startsWith('http') ? res.img : `${import.meta.env.VITE_API_BASE_URL || ''}${res.img}`} 
                                                alt="Vehicle" 
                                            />
                                        ) : (
                                            <span className="material-symbols-outlined text-slate-300 text-6xl">directions_bus</span>
                                        )}
                                        <div className={`absolute top-4 left-4 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-md ${res.statusCode === 'CONFIRM' ? 'bg-primary' : 'bg-slate-400'}`}>
                                            {getStatusLabel(res.statusCode)}
                                        </div>
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between text-left">
                                        <div>
                                            <div className="flex justify-between items-start mb-4 text-left">
                                                <div className="text-left w-full">
                                                    {/* 여행 제목 */}
                                                    <h3 className="text-2xl font-black font-headline text-slate-800 leading-tight tracking-tight mb-2">
                                                        {res.title || '나의 여행 일정'}
                                                    </h3>
                                                    
                                                    {/* 운행 일정 */}
                                                    <div className="flex items-center gap-2 mt-4 mb-6 text-left">
                                                        <span className="material-symbols-outlined text-teal-600 text-base">event</span>
                                                        <p className="text-sm font-semibold text-slate-500 tracking-wide">
                                                            {res.startDt ? res.startDt.split(' ')[0].replace(/\./g, '-') : ''} ~ {res.endDt ? res.endDt.split(' ')[0].replace(/\./g, '-') : ''}
                                                        </p>
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
                                            </div>
                                            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-50 text-left">
                                                <div className="text-left">
                                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">차량 정보</p>
                                                    <p className="text-on-surface font-semibold text-sm">{res.busType || '정보 없음'}</p>
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">청약요금</p>
                                                    <p className="text-primary font-black text-sm">₩{Number(res.totalOfferPrice).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-8 flex gap-4 text-left">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); navigate(`/reservation-detail/${res.id}`); }}
                                                className="bg-primary text-white w-full min-h-[58px] px-4 py-4 sm:px-6 sm:py-5 rounded-2xl font-extrabold text-[15px] tracking-wide shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2.5 whitespace-nowrap"
                                            >
                                                <span className="material-symbols-outlined text-sm">visibility</span>
                                                상세 내역 보기
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-white rounded-2xl p-16 flex flex-col items-center justify-center text-center space-y-6 border border-slate-100 shadow-sm">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                                <span className="material-symbols-outlined text-4xl">event_busy</span>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-slate-800">예약 내역이 없습니다</h3>
                                <p className="text-slate-400 text-sm font-medium">새로운 여행을 계획하고 예약을 시작해보세요.</p>
                            </div>
                            <button onClick={() => navigate('/customer-dashboard')} className="bg-primary text-white px-10 py-3 rounded-full font-bold text-sm shadow-lg shadow-primary/10 active:scale-95 transition-all">
                                대시보드로 돌아가기
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* BottomNavBar */}
            <BottomNavCustomer />
        </div>
    );
};

export default ReservationList;
