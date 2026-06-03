import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getDriverProfile } from '../api';
import BottomNavDriver from '../components/BottomNavDriver';

const UpcomingTripsDriver = () => {
    const navigate = useNavigate();
    const [upcomingTrips, setUpcomingTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userProfileImg, setUserProfileImg] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. 기사 프로필 정보 조회 (헤더용)
                const profRes = await getDriverProfile();
                if (profRes.success && profRes.data) {
                    setUserProfileImg(profRes.data.driver?.profileImg || '');
                }

                // 2. 운행 일정 조회
                const res = await api.get('/app/driver/upcoming-trips');
                if (res.success) {
                    setUpcomingTrips(res.data);
                }
            } catch (err) {
                console.error('Fetch upcoming trips error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="bg-background text-on-surface min-h-[100dvh] pb-48 font-body text-left">
            {/* TopAppBar - 표준화된 헤더 스타일 */}
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-white/20 px-4 h-16 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
                        <span className="material-symbols-outlined text-slate-600">arrow_back</span>
                    </button>
                    <h1 className="text-lg font-bold text-slate-800">운행 예정 목록</h1>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#eceef0] overflow-hidden border-2 border-white shadow-sm flex items-center justify-center">
                    {userProfileImg ? (
                        <img alt="User Profile" src={userProfileImg} className="w-full h-full object-cover" />
                    ) : (
                        <span className="material-symbols-outlined text-[#bec9c6]">person</span>
                    )}
                </div>
            </header>

            <main className="pt-24 px-6 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom duration-1000 text-left">
                {/* Editorial Header Section */}
                <section className="mb-2">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                        <div className="md:col-span-12 text-left">
                            <p className="text-[#3e4947] text-sm font-medium leading-relaxed">
                                운행 예정 목록으로 운행 일정 확인하세요.
                            </p>
                        </div>
                    </div>
                </section>

                <nav className="flex gap-10 border-b-4 border-slate-50 pb-4 text-left">
                    <button className="text-primary font-black text-sm uppercase tracking-[0.3em] italic border-b-8 border-primary pb-4">
                        확정된 배차 ({upcomingTrips.length})
                    </button>
                </nav>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <span className="material-symbols-outlined text-4xl text-primary animate-spin mb-4">progress_activity</span>
                        <p className="text-gray-400 font-medium">운행 일정을 불러오는 중입니다...</p>
                    </div>
                ) : upcomingTrips.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 text-left">
                        {upcomingTrips.map((trip, idx) => {
                            const isFeatured = idx === 0;
                            return (
                                <div key={trip.id} className={`${isFeatured ? 'lg:col-span-2' : 'col-span-1'} group bg-white rounded-2xl p-8 relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-teal-900/5 hover:-translate-y-2 text-left shadow-lg`}>
                                    {isFeatured && <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-secondary"></div>}
                                    
                                    <div className="flex flex-col md:flex-row gap-10 text-left">
                                        <div className="flex-1 space-y-4 text-left">
                                            <div className="flex items-center justify-between text-left">
                                                <div className="flex items-center gap-4 text-left">
                                                    {isFeatured && <span className="flex h-3 w-3 rounded-full bg-secondary animate-pulse"></span>}
                                                    <span className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${isFeatured ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'}`}>
                                                        {isFeatured ? '다음 운행 예정' : '확정됨'}
                                                    </span>
                                                </div>
                                                {!isFeatured && <span className="material-symbols-outlined text-slate-200">more_vert</span>}
                                            </div>

                                            <div className="space-y-2 text-left">
                                                <h3 className="font-headline text-3xl font-black text-primary italic uppercase tracking-tighter text-left line-clamp-1">{trip.title || '여행 제목 없음'}</h3>
                                            </div>

                                            {/* 운행 일정 */}
                                            <div className="flex items-start gap-2">
                                                <span className="material-symbols-outlined text-teal-600 text-sm mt-0.5">event</span>
                                                <div className="flex flex-col text-left">
                                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                                                        {trip.startDt ? trip.startDt.replace(/[-/]/g, '.') : ''} ~
                                                    </p>
                                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                                        {trip.endDt ? trip.endDt.replace(/[-/]/g, '.') : ''}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* 운행 경로 */}
                                            {(() => {
                                                const formatAddr = (addr) => {
                                                    if (!addr) return '';
                                                    const parts = addr.split(' ');
                                                    if (parts.length >= 3 && (parts[2].endsWith('구') || parts[2].endsWith('군'))) {
                                                        return parts.slice(0, 3).join(' ');
                                                    }
                                                    return parts.slice(0, 2).join(' ');
                                                };

                                                return (
                                                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100/50 space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex-1">
                                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">출발</p>
                                                                <p className="font-bold text-xs text-slate-700">{formatAddr(trip.startAddr)}</p>
                                                            </div>
                                                            <div className="px-4 text-slate-200">
                                                                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                                            </div>
                                                            {trip.roundTrip ? (
                                                                <>
                                                                    <div className="flex-1 text-center">
                                                                        <p className="text-[8px] font-black text-teal-500 uppercase tracking-tighter mb-0.5">목적지</p>
                                                                        <p className="font-bold text-xs text-slate-700">{formatAddr(trip.roundTrip)}</p>
                                                                    </div>
                                                                    <div className="px-4 text-slate-200">
                                                                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                                                    </div>
                                                                </>
                                                            ) : null}
                                                            <div className="flex-1 text-right">
                                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">도착</p>
                                                                <p className="font-bold text-xs text-slate-700">{formatAddr(trip.endAddr)}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* 계약금액 */}
                                            <div className="flex justify-between items-center text-sm border-t border-slate-100 pt-4 mt-2">
                                                <span className="text-slate-400 font-bold uppercase tracking-tighter text-[11px]">계약 금액</span>
                                                <span className="font-black text-[#004e47] text-lg">₩{Number(trip.price).toLocaleString()}</span>
                                            </div>

                                            <button 
                                                onClick={() => navigate(`/upcoming-trip-detail-driver/${trip.id}`)} 
                                                className="w-full py-4 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.3em] hover:bg-primary transition-all active:scale-95 shadow-2xl shadow-slate-900/30 italic"
                                            >
                                                상세 내역 보기
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl px-4 py-16 sm:p-24 text-center border-2 border-dashed border-slate-100 shadow-inner">
                        <div className="w-24 h-24 bg-primary/5 rounded-xl mx-auto flex items-center justify-center mb-8">
                            <span className="material-symbols-outlined text-5xl text-primary/60">event_busy</span>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-2xl font-black text-primary italic uppercase tracking-tighter whitespace-nowrap">예정된 운행이 없습니다.</h3>
                            <p className="text-slate-400 font-bold italic text-lg whitespace-nowrap">새로운 운행 계약을 맺어보세요.</p>
                            <button 
                                onClick={() => navigate('/estimate-list-driver')}
                                className="mt-8 bg-primary text-white px-8 py-4 sm:px-12 rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
                            >
                                청약목록보러가기
                            </button>
                        </div>
                    </div>
                )}
            </main>

            <BottomNavDriver activeTab="trips" />
        </div>
    );
};

export default UpcomingTripsDriver;

