import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getDriverProfile } from '../api';
import { notify } from '../utils/toast';
import BottomNavDriver from '../components/BottomNavDriver';

const CompletedTripsDriver = () => {
    const navigate = useNavigate();
    const [trips, setTrips] = useState([]);
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

                // 2. 운행 완료 목록 조회
                const res = await api.get('/app/driver/completed-missions');
                if (res.success) {
                    setTrips(res.data);
                } else {
                    notify.error('오류', '운행 완료 목록을 불러올 수 없습니다.');
                }
            } catch (err) {
                console.error('Fetch completed trips error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const getShortAddr = (addr) => {
        if (!addr) return '';
        return addr.split(' ').slice(0, 2).join(' ');
    };

    return (
        <div className="bg-[#F7F9FB] text-[#191C1E] min-h-[100dvh] pb-32 font-body text-left">
            {/* 상단바 - 표준화된 스타일 적용 */}
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-white/20 px-4 h-16 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
                        <span className="material-symbols-outlined text-slate-600">arrow_back</span>
                    </button>
                    <h1 className="text-lg font-bold text-slate-800">운행 완료 목록</h1>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#eceef0] overflow-hidden border-2 border-white shadow-sm flex items-center justify-center">
                    {userProfileImg ? (
                        <img alt="User Profile" src={userProfileImg} className="w-full h-full object-cover" />
                    ) : (
                        <span className="material-symbols-outlined text-[#bec9c6]">person</span>
                    )}
                </div>
            </header>

            <main className="pt-24 px-6 max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom duration-1000 text-left">
                {/* 헤더 섹션 */}
                <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end text-left">
                    <div className="md:col-span-7 space-y-4 text-left">
                        <span className="text-[#9D4300] font-black tracking-[0.4em] uppercase text-[10px] block px-2 italic">운행 완료 기록</span>
                        <h2 className="font-headline text-5xl md:text-7xl font-black text-[#004E47] leading-[1.1] tracking-tighter italic uppercase text-left">
                            운행 완료 <span className="text-[#9D4300] underline decoration-[#9D4300]/20 underline-offset-[12px]">목록</span>
                        </h2>
                    </div>
                    <div className="md:col-span-5 md:pl-12 text-left border-l-4 border-slate-100">
                        <p className="text-slate-400 text-lg font-bold italic tracking-tight leading-relaxed text-left">
                            성공적으로 완료된 모든 운행 내역과 최종 정산 금액을 확인하세요.
                        </p>
                    </div>
                </section>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <span className="material-symbols-outlined text-4xl text-[#004E47] animate-spin mb-4">progress_activity</span>
                        <p className="text-gray-400 font-medium">기록을 불러오는 중입니다...</p>
                    </div>
                ) : trips.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {trips.map((trip) => (
                            <div key={trip.id} className="group bg-white rounded-2xl p-10 relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-teal-900/5 hover:-translate-y-2 text-left border border-slate-50">
                                <div className="space-y-8 text-left">
                                    <div className="flex justify-between items-center text-left">
                                        <span className="px-5 py-2 rounded-xl bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest italic">
                                            운행 완료
                                        </span>
                                        <span className="material-symbols-outlined text-slate-100 group-hover:text-[#004E47]/20 transition-colors duration-500 text-4xl">verified</span>
                                    </div>

                                    <div className="space-y-4 text-left">
                                        <h3 className="font-headline text-2xl font-black text-[#004E47] italic uppercase tracking-tighter text-left group-hover:text-[#9D4300] transition-colors duration-500 leading-tight line-clamp-1">
                                            {trip.title}
                                        </h3>
                                        
                                        {/* 운행 일정 */}
                                        <div className="flex items-start gap-2">
                                            <span className="material-symbols-outlined text-teal-600 text-sm mt-0.5">event</span>
                                            <div className="flex flex-col text-left">
                                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                                                    {trip.startDate ? trip.startDate.replace(/[-/]/g, '.') : ''} ~
                                                </p>
                                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                                    {trip.endDate ? trip.endDate.replace(/[-/]/g, '.') : ''}
                                                </p>
                                            </div>
                                        </div>

                                        {/* 운행 경로 Bento 스타일 */}
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
                                    </div>

                                    <div className="space-y-4 text-left">
                                        <div className="flex justify-between items-center text-left border-b border-slate-50 pb-4">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-300 italic">운행 차량</span>
                                            <span className="font-black text-[#004E47] text-xs italic">{trip.model || '기본 정보 없음'}</span>
                                        </div>
                                        <div className="pt-4 flex justify-between items-end text-left">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-[#191C1E] italic">정산 금액</span>
                                            <span className="font-headline text-2xl font-black text-[#9D4300] italic tracking-tighter">₩{Number(trip.price).toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => navigate(`/completed-trip-detail-driver/${trip.id}`)} 
                                        className="w-full py-4 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.3em] hover:bg-primary transition-all active:scale-95 shadow-2xl shadow-slate-900/30 italic"
                                    >
                                        상세보기
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-32 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100">
                        <span className="material-symbols-outlined text-6xl text-slate-100 mb-6 block">history_edu</span>
                        <p className="text-slate-400 font-bold italic uppercase tracking-[0.2em]">운행 완료 내역이 없습니다.</p>
                    </div>
                )}
            </main>

            <BottomNavDriver activeTab="trips" />
        </div>
    );
};

export default CompletedTripsDriver;
