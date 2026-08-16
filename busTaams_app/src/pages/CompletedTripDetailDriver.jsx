import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import BottomNavDriver from '../components/BottomNavDriver';

/**
 * 기사님 운행 완료 상세 페이지
 * '32운행완료상세_기사' 디자인을 반영하여 프리미엄 Bento Grid 레이아웃으로 구현되었습니다.
 */
const CompletedTripDetailDriver = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [trip, setTrip] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTripDetail = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/app/driver/mission-detail/${id}`);
                if (response.success) {
                    setTrip(response.data);
                }
            } catch (error) {
                console.error('Failed to fetch trip detail:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTripDetail();
    }, [id]);

    if (loading) {
        return (
            <div className="bg-background min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!trip) {
        return (
            <div className="bg-background min-h-screen flex flex-col items-center justify-center p-6">
                <p className="text-on-surface/60 mb-6">운행 정보를 찾을 수 없습니다.</p>
                <button onClick={() => navigate(-1)} className="px-8 py-3 bg-primary text-white rounded-2xl font-bold">뒤로 가기</button>
            </div>
        );
    }

    // 경로 요약 데이터 추출 (주소에서 시/군 단위 추출)
    const getCity = (addr) => {
        if (!addr) return '';
        const parts = addr.split(' ');
        return parts.length > 1 ? `${parts[0]} ${parts[1]}` : parts[0];
    };

    const startCity = getCity(trip.waypoints?.find(wp => wp.type === 'START')?.addr) || '출발지';
    const endCity = getCity(trip.waypoints?.find(wp => wp.type === 'END')?.addr) || '도착지';

    return (
        <div className="bg-background text-on-surface min-h-[100dvh] pb-48 font-body text-left">
            {/* 상단 헤더 */}
            <header className="fixed top-0 w-full z-50 bg-white/40 backdrop-blur-3xl border-b border-white/20 py-6">
                <div className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto">
                    <div className="flex items-center gap-6 text-left">
                        <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-xl text-primary shadow-xl shadow-teal-900/5 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                        </button>
                        <h1 className="font-headline font-black tracking-tighter text-3xl text-primary italic uppercase">운행 상세 정보</h1>
                    </div>
                </div>
            </header>

            <main className="pt-40 px-6 max-w-3xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom duration-1000 text-left">
                {/* 제목 표시 */}
                <section className="px-2 space-y-2">
                    <h2 className="text-[24px] font-black text-[#1E293B] tracking-tight leading-tight">
                        {trip.title}
                    </h2>
                </section>

                {/* Section 1: 요청정보 요약 */}
                <section className="space-y-6">
                    <div className="flex justify-end items-center px-2">
                        <span className="px-4 py-1.5 rounded-xl bg-[#E2E8F0] text-[#64748B] text-[11px] font-black uppercase tracking-wider">운행 완료</span>
                    </div>

                    <div className="bg-white rounded-[3.5rem] p-12 shadow-2xl shadow-teal-900/[0.03] border border-slate-50 text-left space-y-10">
                        {/* 운행 일정 */}
                        <div className="flex items-center gap-4 border-b border-slate-100 pb-8 text-left">
                            <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shadow-sm">
                                <span className="material-symbols-outlined text-orange-600 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_today</span>
                            </div>
                            <div className="flex flex-col text-left">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic mb-1">
                                    운행 일정
                                </p>
                                <p className="text-lg font-black text-[#1E293B] leading-snug">
                                    {trip.startDate ? `${trip.startDate.split(' ')[0].replace(/[-/]/g, '.')} ${trip.startDate.split(' ')[1] || ''} -` : ''}
                                </p>
                                <p className="text-lg font-black text-[#1E293B] leading-snug">
                                    {trip.endDate ? `${trip.endDate.split(' ')[0].replace(/[-/]/g, '.')} ${trip.endDate.split(' ')[1] || ''}` : ''}
                                </p>
                            </div>
                        </div>

                        {/* 전체 운행 경로 */}
                        <div className="space-y-8">
                            <h2 className="text-2xl font-black pb-4 border-b border-slate-50 flex items-center gap-3 italic text-teal-700">
                                <span className="material-symbols-outlined text-primary" style={{fontVariationSettings: "'FILL' 1"}}>route</span>
                                전체 운행 경로
                            </h2>
                            <div className="mt-8 space-y-10 relative">
                                <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-100"></div>
                                {trip.waypoints?.map((wp, idx) => {
                                    const isStart = wp.type === 'START';
                                    const isEnd = wp.type === 'END';
                                    const isDest = wp.type === 'ROUND' || wp.type === 'ROUND_TRIP';
                                    const title = isStart ? '출발지' : isEnd ? '도착지' : isDest ? '목적지' : '경유지';
                                    const pointType = isStart ? 'START' : isEnd ? 'END' : isDest ? 'ROUND_TRIP' : 'WAYPOINT';

                                    return (
                                        <div key={idx} className="relative pl-12">
                                            <div className={`absolute left-0 top-1.5 w-8 h-8 rounded-full border-4 border-white shadow-md z-10 flex items-center justify-center ${
                                                pointType === 'START' ? 'bg-teal-600 text-white shadow-teal-200' : 
                                                pointType === 'END' ? 'bg-rose-500 text-white shadow-rose-200' : 
                                                pointType === 'ROUND_TRIP' ? 'bg-indigo-600 text-white shadow-indigo-100' :
                                                'bg-amber-400 text-white shadow-amber-100'
                                            }`}>
                                                <span className="material-symbols-outlined text-[16px] font-black">
                                                    {pointType === 'START' ? 'location_on' : 
                                                     pointType === 'END' ? 'flag' : 
                                                     pointType === 'ROUND_TRIP' ? 'near_me' : 'more_horiz'}
                                                </span>
                                            </div>
                                            <div className="flex flex-col text-left">
                                                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                                                    pointType === 'START' ? 'text-teal-600' : 
                                                    pointType === 'END' ? 'text-rose-500' : 
                                                    pointType === 'ROUND_TRIP' ? 'text-indigo-500' : 'text-amber-500'
                                                }`}>
                                                    {title}
                                                </p>
                                                <h4 className="text-lg font-black tracking-tight text-on-surface text-left">
                                                    {wp.addr}
                                                </h4>
                                                {wp.time && (
                                                    <p className="text-xs text-slate-400 font-bold mt-1 opacity-70 italic text-left">
                                                        {wp.time}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </section>

                {/* 차량 정보 벤토 그리드 */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                    <div className="bg-slate-50 p-8 rounded-xl flex flex-col justify-between min-h-[180px] transition-all hover:bg-white hover:shadow-2xl hover:shadow-teal-900/5 group text-left border border-transparent hover:border-slate-100">
                        <span className="material-symbols-outlined text-primary text-4xl group-hover:scale-110 transition-transform duration-500">airport_shuttle</span>
                        <div className="text-left">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 italic">운행 차량 모델</p>
                            <h4 className="text-xl font-black text-primary italic uppercase tracking-tight text-left">{trip.model || '차종 정보 없음'}</h4>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-8 rounded-xl flex flex-col justify-between min-h-[180px] transition-all hover:bg-white hover:shadow-2xl hover:shadow-teal-900/5 group text-left border border-transparent hover:border-slate-100">
                        <span className="material-symbols-outlined text-secondary text-4xl group-hover:scale-110 transition-transform duration-500">id_card</span>
                        <div className="text-left">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 italic">차량 등록 번호</p>
                            <h4 className="text-xl font-black text-secondary italic uppercase tracking-widest text-left">{trip.busNumber || '차량 번호 없음'}</h4>
                        </div>
                    </div>
                </section>

                {/* 정산 내역 상세 */}
                <section className="space-y-6">
                    <h2 className="text-xl font-black text-[#1E293B] tracking-tight px-2">정산 내역 상세</h2>
                    <div className="bg-white rounded-2xl p-10 shadow-sm border border-slate-100 space-y-8">
                        <div className="flex justify-between items-center py-2">
                            <span className="text-[16px] font-black text-[#1E293B]">청약 확정 금액</span>
                            <span className="text-[20px] font-black text-[#1E293B]">₩ {Number(trip.price || 0).toLocaleString()}</span>
                        </div>

                        <div className="bg-[#00685F] p-8 rounded-2xl shadow-xl shadow-teal-900/10 flex items-center justify-between text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                            <div className="flex items-baseline gap-3">
                                <span className="text-[16px] font-black opacity-90">정산 완료</span>
                                <span className="text-[24px] font-black tracking-tighter">
                                    ₩ {Number(trip.price || 0).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 고객 평점 및 후기 섹션 */}
                <section className="space-y-6 text-left pb-10">
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-primary px-4 text-left">고객 평점 및 후기</h3>
                    {trip.reviewRating ? (
                        <div className="bg-white rounded-2xl p-10 shadow-[0_40px_60px_rgba(0,104,95,0.04)] relative overflow-hidden text-left border border-slate-50">
                            <div className="absolute top-10 right-10 flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                    <span key={i} className={`material-symbols-outlined text-2xl ${i < trip.reviewRating ? 'text-secondary' : 'text-slate-200'}`} style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                                ))}
                            </div>
                            
                            <div className="flex items-center gap-6 mb-8 text-left">
                                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                                    {trip.customerImage ? (
                                        <img className="w-full h-full object-cover" src={trip.customerImage} alt="customer" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-50">
                                            <span className="material-symbols-outlined text-slate-300 text-3xl">person</span>
                                        </div>
                                    )}
                                </div>
                                <div className="text-left space-y-1">
                                    <p className="font-black text-primary italic text-xl">{trip.customerName} 고객님</p>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{trip.reviewDate} 작성</p>
                                </div>
                            </div>
                            
                            <p className="text-xl font-bold italic text-slate-600 leading-relaxed text-left">
                                "{trip.reviewComment}"
                            </p>

                            {trip.replyText && (
                                <div className="mt-8 pt-8 border-t border-slate-50 text-left animate-in fade-in slide-in-from-top duration-700">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-primary text-sm">subdirectory_arrow_right</span>
                                        </div>
                                        <span className="px-4 py-1 bg-primary text-white rounded-xl text-[9px] font-black tracking-[0.2em] uppercase italic">기사님 답변</span>
                                    </div>
                                    <div className="bg-slate-50/80 p-8 rounded-xl border border-slate-100 relative">
                                        <p className="text-lg font-bold italic text-slate-500 leading-relaxed">
                                            {trip.replyText}
                                        </p>
                                        <div className="absolute -top-3 left-8 w-6 h-6 bg-slate-50 rotate-45 border-l border-t border-slate-100"></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl p-16 text-center border-2 border-dashed border-slate-100 shadow-sm">
                             <span className="material-symbols-outlined text-slate-200 text-6xl mb-4">rate_review</span>
                             <p className="text-slate-400 font-bold italic">아직 작성된 고객 후기가 없습니다.</p>
                        </div>
                    )}
                </section>

                {/* 하단 액션 버튼 */}
                <section className="flex flex-col gap-6 py-8 text-left pb-12">
                    <button onClick={() => navigate(`/chat-room/${id}`)} className="w-full py-4 rounded-xl bg-white text-primary font-black text-sm italic uppercase tracking-[0.4em] shadow-xl shadow-teal-900/5 hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-6 border border-slate-100">
                        <span className="material-symbols-outlined">forum</span>
                        버스탐즈 톡 채팅 내역
                    </button>
                    <button onClick={() => navigate(`/rating-reply-driver/${id}`)} className="w-full py-4 rounded-xl bg-gradient-to-br from-primary to-teal-800 text-white font-black text-sm italic uppercase tracking-[0.4em] shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-6">
                        <span className="material-symbols-outlined">star</span>
                        평점 및 후기 관리
                    </button>
                </section>
            </main>

            <BottomNavDriver />
        </div>
    );
};

export default CompletedTripDetailDriver;
