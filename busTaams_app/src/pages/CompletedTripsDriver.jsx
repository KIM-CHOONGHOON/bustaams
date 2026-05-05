import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { notify } from '../utils/toast';
import BottomNavDriver from '../components/BottomNavDriver';

const CompletedTripsDriver = () => {
    const navigate = useNavigate();
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTrips = async () => {
            setLoading(true);
            try {
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
        fetchTrips();
    }, []);

    const getShortAddr = (addr) => {
        if (!addr) return '';
        return addr.split(' ').slice(0, 2).join(' ');
    };

    return (
        <div className="bg-[#F7F9FB] text-[#191C1E] min-h-[100dvh] pb-32 font-body text-left">
            {/* 상단바 */}
            <header className="fixed top-0 w-full z-50 bg-white/40 backdrop-blur-3xl border-b border-white/20 py-6">
                <div className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto">
                    <div className="flex items-center gap-6 text-left">
                        <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl text-[#004D40] shadow-xl shadow-teal-900/5 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                        </button>
                        <h1 className="font-headline font-black tracking-tighter text-3xl text-[#004D40] italic uppercase">busTaams</h1>
                    </div>
                </div>
            </header>

            <main className="pt-32 px-6 max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom duration-1000 text-left">
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
                            <div key={trip.id} className="group bg-white rounded-[3rem] p-10 relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-teal-900/5 hover:-translate-y-2 text-left border border-slate-50">
                                <div className="space-y-8 text-left">
                                    <div className="flex justify-between items-center text-left">
                                        <span className="px-5 py-2 rounded-full bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest italic">
                                            운행 완료
                                        </span>
                                        <span className="material-symbols-outlined text-slate-100 group-hover:text-[#004E47]/20 transition-colors duration-500 text-4xl">verified</span>
                                    </div>

                                    <div className="space-y-2 text-left">
                                        <h3 className="font-headline text-2xl font-black text-[#004E47] italic uppercase tracking-tighter text-left group-hover:text-[#9D4300] transition-colors duration-500 leading-tight line-clamp-1">
                                            {trip.title}
                                        </h3>
                                        <p className="text-slate-400 font-bold italic text-xs leading-tight uppercase tracking-widest line-clamp-1">
                                            경로: {getShortAddr(trip.startAddr)}(출발)
                                            {trip.roundTrip && ` → ${getShortAddr(trip.roundTrip)}(회차)`}
                                            → {getShortAddr(trip.endAddr)}(도착지)
                                        </p>
                                    </div>

                                    <div className="space-y-4 text-left">
                                        <div className="flex justify-between items-center text-left border-b border-slate-50 pb-4">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-300 italic">운행 일정</span>
                                            <span className="font-black text-[#004E47] text-xs italic">{trip.startDate} ~ {trip.endDate}</span>
                                        </div>
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
                                        className="w-full py-6 rounded-[2.5rem] bg-slate-50 text-[#004E47] font-black text-[10px] uppercase tracking-[0.3em] hover:bg-[#004E47] hover:text-white transition-all active:scale-95 italic"
                                    >
                                        상세보기
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
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
