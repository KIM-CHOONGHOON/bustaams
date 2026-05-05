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
                        <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl text-primary shadow-xl shadow-teal-900/5 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                        </button>
                        <h1 className="font-headline font-black tracking-tighter text-3xl text-primary italic uppercase">운행 상세 정보</h1>
                    </div>
                </div>
            </header>

            <main className="pt-40 px-6 max-w-3xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom duration-1000 text-left">
                {/* 여정 요약 히어로 섹션 */}
                <section className="relative overflow-hidden bg-primary rounded-[3.5rem] p-10 text-white shadow-[0_40px_100px_-20px_rgba(0,104,95,0.4)] text-left">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                    <div className="relative z-10 flex flex-col gap-4 text-left">
                        <div className="flex flex-col gap-2 text-left">
                            <div className="flex items-center gap-3 text-left">
                                <span className="px-5 py-1.5 bg-white/20 rounded-full text-[10px] font-black tracking-[0.3em] uppercase italic">운행 완료</span>
                            </div>
                            <h3 className="text-xl font-black text-white/90 italic uppercase tracking-tight">{trip.title}</h3>
                        </div>
                        <h2 className="font-headline text-5xl font-black italic uppercase tracking-tighter text-left leading-none">
                            {startCity} <span className="text-secondary tracking-widest mx-2">→</span> {endCity}
                        </h2>
                        <div className="mt-6 flex flex-col text-left">
                            <span className="text-white/60 text-[10px] font-black uppercase tracking-widest italic mb-2">총 정산 금액</span>
                            <span className="text-6xl font-black italic headline tracking-tighter">₩{Number(trip.price || 0).toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="absolute bottom-8 right-12 opacity-10">
                        <span className="material-symbols-outlined text-[10rem]" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>
                    </div>
                </section>

                {/* 운행 경로 타임라인 */}
                <section className="space-y-6 text-left">
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-primary flex items-center gap-4 text-left">
                        <span className="material-symbols-outlined text-secondary">route</span> 운행 타임라인
                    </h3>
                    
                    <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl shadow-teal-900/5 relative text-left border border-white">
                        <div className="absolute left-14 top-20 bottom-20 w-0.5 bg-slate-100"></div>
                        <div className="space-y-10 text-left">
                            {trip.waypoints?.map((wp, idx) => (
                                <div key={idx} className="relative pl-16 text-left">
                                    <div className={`absolute left-0 top-1 w-6 h-6 rounded-full ${wp.type === 'START' ? 'bg-primary' : wp.type === 'END' ? 'bg-primary' : 'bg-secondary'} ring-8 ${wp.type === 'START' || wp.type === 'END' ? 'ring-primary/10' : 'ring-secondary/10'} z-10`}></div>
                                    <div className="text-left space-y-1">
                                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">
                                            {wp.type === 'START' ? '출발 지점' : wp.type === 'END' ? '최종 목적지' : '경유지'}
                                        </p>
                                        <h4 className="text-xl font-black text-primary italic uppercase tracking-tight text-left">{wp.addr}</h4>
                                        <p className="text-slate-400 text-xs font-bold italic tracking-tighter">{wp.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 차량 정보 벤토 그리드 */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                    <div className="bg-slate-50 p-8 rounded-[2.5rem] flex flex-col justify-between min-h-[180px] transition-all hover:bg-white hover:shadow-2xl hover:shadow-teal-900/5 group text-left border border-transparent hover:border-slate-100">
                        <span className="material-symbols-outlined text-primary text-4xl group-hover:scale-110 transition-transform duration-500">airport_shuttle</span>
                        <div className="text-left">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 italic">운행 차량 모델</p>
                            <h4 className="text-xl font-black text-primary italic uppercase tracking-tight text-left">{trip.model || '차종 정보 없음'}</h4>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-8 rounded-[2.5rem] flex flex-col justify-between min-h-[180px] transition-all hover:bg-white hover:shadow-2xl hover:shadow-teal-900/5 group text-left border border-transparent hover:border-slate-100">
                        <span className="material-symbols-outlined text-secondary text-4xl group-hover:scale-110 transition-transform duration-500">id_card</span>
                        <div className="text-left">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 italic">차량 등록 번호</p>
                            <h4 className="text-xl font-black text-secondary italic uppercase tracking-widest text-left">{trip.busNumber || '차량 번호 없음'}</h4>
                        </div>
                    </div>
                </section>

                {/* 고객 평점 및 후기 섹션 */}
                <section className="space-y-6 text-left pb-10">
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-primary px-4 text-left">고객 평점 및 후기</h3>
                    {trip.reviewRating ? (
                        <div className="bg-white rounded-[3.5rem] p-10 shadow-[0_40px_60px_rgba(0,104,95,0.04)] relative overflow-hidden text-left border border-slate-50">
                            <div className="absolute top-10 right-10 flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                    <span key={i} className={`material-symbols-outlined text-2xl ${i < trip.reviewRating ? 'text-secondary' : 'text-slate-200'}`} style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                                ))}
                            </div>
                            
                            <div className="flex items-center gap-6 mb-8 text-left">
                                <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 border border-slate-200">
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
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-primary text-sm">subdirectory_arrow_right</span>
                                        </div>
                                        <span className="px-4 py-1 bg-primary text-white rounded-full text-[9px] font-black tracking-[0.2em] uppercase italic">기사님 답변</span>
                                    </div>
                                    <div className="bg-slate-50/80 p-8 rounded-[2rem] border border-slate-100 relative">
                                        <p className="text-lg font-bold italic text-slate-500 leading-relaxed">
                                            {trip.replyText}
                                        </p>
                                        <div className="absolute -top-3 left-8 w-6 h-6 bg-slate-50 rotate-45 border-l border-t border-slate-100"></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white rounded-[3.5rem] p-16 text-center border-2 border-dashed border-slate-100 shadow-sm">
                             <span className="material-symbols-outlined text-slate-200 text-6xl mb-4">rate_review</span>
                             <p className="text-slate-400 font-bold italic">아직 작성된 고객 후기가 없습니다.</p>
                        </div>
                    )}
                </section>

                {/* 하단 액션 버튼 */}
                <section className="flex flex-col gap-6 py-8 text-left pb-12">
                    <button onClick={() => navigate(`/chat-room/${id}`)} className="w-full py-6 rounded-[2.5rem] bg-white text-primary font-black text-sm italic uppercase tracking-[0.4em] shadow-xl shadow-teal-900/5 hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-6 border border-slate-100">
                        <span className="material-symbols-outlined">forum</span>
                        버스탐즈 톡 채팅 내역
                    </button>
                    <button onClick={() => navigate(`/rating-reply-driver/${id}`)} className="w-full py-6 rounded-[2.5rem] bg-gradient-to-br from-primary to-teal-800 text-white font-black text-sm italic uppercase tracking-[0.4em] shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-6">
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
