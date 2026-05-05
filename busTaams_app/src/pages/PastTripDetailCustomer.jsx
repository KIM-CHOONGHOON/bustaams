import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import BottomNavCustomer from '../components/BottomNavCustomer';

const PastTripDetailCustomer = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const response = await api.get(`/app/customer/completed-mission-detail/${id}`);
                if (response.success) {
                    setDetail(response.data);
                }
            } catch (error) {
                console.error('Fetch mission detail error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDetail();
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background opacity-30">
                <span className="material-symbols-outlined text-6xl animate-spin text-primary">progress_activity</span>
                <p className="mt-4 font-bold text-teal-900">상세 내역을 불러오고 있습니다...</p>
            </div>
        );
    }

    if (!detail) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
                <span className="material-symbols-outlined text-primary text-6xl mb-4">error</span>
                <h1 className="text-2xl font-black text-teal-900 mb-2">상세 내역을 찾을 수 없습니다.</h1>
                <button onClick={() => navigate(-1)} className="mt-8 bg-primary text-white font-black py-4 px-10 rounded-full shadow-lg">돌아가기</button>
            </div>
        );
    }

    // 여정 필터링 로직 (출발 -> 출발경유지 -> 회차지 -> 회차경유지 -> 도착지)
    const startNode = { type: 'START', addr: detail.startAddr, time: detail.startDt };
    
    // 경유지들을 순서대로 분류
    const waypoints = detail.waypoints || [];
    const roundIdx = waypoints.findIndex(w => w.type === 'ROUND_TRIP');
    
    const viaBeforeRound = roundIdx === -1 ? waypoints.filter(w => w.type === 'VIA') : waypoints.slice(0, roundIdx).filter(w => w.type === 'VIA');
    const roundNode = roundIdx !== -1 ? waypoints[roundIdx] : null;
    const viaAfterRound = roundIdx !== -1 ? waypoints.slice(roundIdx + 1).filter(w => w.type === 'VIA') : [];
    
    const endNode = { type: 'END', addr: detail.waypoints?.find(w => w.type === 'END_NODE')?.addr || detail.endAddrMaster, time: detail.endDt };

    // 결제 총액 (데이터가 없을 경우 0으로 처리)
    const totalPrice = detail.totalAmt || 0;

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-32">
            <header className="fixed top-0 w-full z-50 bg-white border-b border-slate-100 shadow-sm">
                <div className="flex items-center justify-between px-6 h-16 w-full max-w-4xl mx-auto">
                    <button onClick={() => navigate(-1)} className="material-symbols-outlined text-teal-700 hover:bg-slate-50 p-2 rounded-full transition-all">arrow_back</button>
                    <h1 className="font-bold text-[17px] text-[#1E293B]">주문 상세</h1>
                    <div className="text-[#94A3B8] font-bold text-[13px] tracking-tight">
                        #{detail.id}
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 pt-24 space-y-12">
                {/* 제목 및 여정 경로 표시 */}
                <section className="px-2 space-y-2">
                    <h2 className="text-[24px] font-black text-[#1E293B] tracking-tight leading-tight">
                        {detail.title}
                    </h2>
                    <div className="flex items-center flex-wrap gap-2 text-[14px] font-bold text-[#64748B]">
                        <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl">
                            <span className="material-symbols-outlined text-[16px] text-[#0F766E]">location_on</span>
                            <span className="text-[#1E293B]">{detail.startAddr?.split(' ').slice(0, 2).join(' ')}</span>
                        </div>
                        
                        <span className="material-symbols-outlined text-slate-300 text-[18px]">arrow_forward</span>

                        {viaBeforeRound.map((v, i) => (
                            <React.Fragment key={`via-b-${i}`}>
                                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                    <span className="text-slate-600">{v.addr?.split(' ').slice(0, 2).join(' ')}</span>
                                </div>
                                <span className="material-symbols-outlined text-slate-300 text-[18px]">arrow_forward</span>
                            </React.Fragment>
                        ))}

                        {roundNode && (
                            <>
                                <div className="flex items-center gap-1.5 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-100">
                                    <span className="material-symbols-outlined text-[16px] text-[#0F766E]">rebase_edit</span>
                                    <span className="text-[#0F766E] font-black">{roundNode.addr?.split(' ').slice(0, 2).join(' ')}</span>
                                </div>
                                <span className="material-symbols-outlined text-slate-300 text-[18px]">arrow_forward</span>
                            </>
                        )}

                        {viaAfterRound.map((v, i) => (
                            <React.Fragment key={`via-a-${i}`}>
                                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                    <span className="text-slate-600">{v.addr?.split(' ').slice(0, 2).join(' ')}</span>
                                </div>
                                <span className="material-symbols-outlined text-slate-300 text-[18px]">arrow_forward</span>
                            </React.Fragment>
                        ))}

                        <div className="flex items-center gap-1.5 bg-[#1E293B] px-3 py-1.5 rounded-xl shadow-sm">
                            <span className="material-symbols-outlined text-[16px] text-white">flag</span>
                            <span className="text-white font-black">{endNode.addr?.split(' ').slice(0, 2).join(' ')}</span>
                        </div>
                    </div>
                </section>

                {/* Section 1: 요청정보 요약 */}
                <section className="space-y-6">
                    <div className="flex justify-between items-center px-2">
                        <h2 className="text-xl font-black text-[#1E293B] tracking-tight">요청정보 요약</h2>
                        <span className="px-4 py-1.5 rounded-full bg-[#E2E8F0] text-[#64748B] text-[11px] font-black uppercase tracking-wider">운행 완료</span>
                    </div>
                    
                    <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100 space-y-10 relative overflow-hidden">
                        <div className="relative pl-10 space-y-12">
                            {/* Vertical Line */}
                            <div className="absolute left-[11px] top-2 bottom-2 w-[1px] bg-slate-100"></div>

                            {/* START */}
                            <div className="relative">
                                <div className="absolute -left-[30px] top-1.5 w-4 h-4 rounded-full bg-[#0F766E] border-4 border-white shadow-md z-10"></div>
                                <div className="space-y-1">
                                    <p className="text-[11px] font-bold text-[#94A3B8]">출발지</p>
                                    <p className="text-[17px] font-black tracking-tight">{detail.startAddr}</p>
                                    <p className="text-[12px] text-[#94A3B8] font-medium">출발일시 {detail.startDt}</p>
                                </div>
                            </div>

                            {/* 출발 경유지 */}
                            {viaBeforeRound.map((via, idx) => (
                                <div key={`via-before-${idx}`} className="relative">
                                    <div className="absolute -left-[30px] top-1.5 w-3 h-3 rounded-full border-2 border-slate-200 bg-white z-10"></div>
                                    <div className="space-y-1">
                                        <p className="text-[11px] font-bold text-[#94A3B8]">경유지 (갈 때)</p>
                                        <p className="text-[17px] font-black tracking-tight">{via.addr}</p>
                                    </div>
                                </div>
                            ))}

                            {/* ROUND TRIP */}
                            {roundNode && (
                                <div className="relative">
                                    <div className="absolute -left-[30px] top-1.5 w-4 h-4 rounded-full border-2 border-slate-900 bg-white z-10"></div>
                                    <div className="space-y-1">
                                        <p className="text-[11px] font-bold text-[#94A3B8]">회차지</p>
                                        <p className="text-[17px] font-black tracking-tight">{roundNode.addr}</p>
                                    </div>
                                </div>
                            )}

                            {/* 회차 경유지 */}
                            {viaAfterRound.map((via, idx) => (
                                <div key={`via-after-${idx}`} className="relative">
                                    <div className="absolute -left-[30px] top-1.5 w-3 h-3 rounded-full border-2 border-slate-200 bg-white z-10"></div>
                                    <div className="space-y-1">
                                        <p className="text-[11px] font-bold text-[#94A3B8]">경유지 (올 때)</p>
                                        <p className="text-[17px] font-black tracking-tight">{via.addr}</p>
                                    </div>
                                </div>
                            ))}

                            {/* END */}
                            <div className="relative">
                                <div className="absolute -left-[30px] top-1.5 w-4 h-4 rounded-full border-2 border-[#0F766E] bg-white z-10"></div>
                                <div className="space-y-1">
                                    <p className="text-[11px] font-bold text-[#94A3B8]">도착지</p>
                                    <p className="text-[17px] font-black tracking-tight">{endNode.addr}</p>
                                    <p className="text-[12px] text-[#94A3B8] font-medium">도착일시 {detail.endDt}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#E2E8F0]/50 p-6 rounded-3xl flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-[#64748B] uppercase tracking-widest">Request ID</p>
                                <p className="text-[14px] font-bold text-[#1E293B]">{detail.reqId}</p>
                            </div>
                            <button className="text-[#94A3B8] hover:text-[#1E293B] transition-colors">
                                <span className="material-symbols-outlined text-[20px]">content_copy</span>
                            </button>
                        </div>
                    </div>
                </section>

                {/* Section 2: 배차 및 운전자 정보 */}
                <section className="space-y-6">
                    <h2 className="text-xl font-black text-[#1E293B] tracking-tight px-2">배차 및 운전자 정보</h2>
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-5">
                                <div className="relative">
                                    {detail.driverImage ? (
                                        <img alt="Captain" className="w-20 h-20 rounded-2xl object-cover" src={`${import.meta.env.VITE_API_BASE_URL || ''}${detail.driverImage}`} />
                                    ) : (
                                        <div className="w-20 h-20 rounded-2xl bg-[#F1F5F9] flex items-center justify-center text-[#94A3B8]">
                                            <span className="material-symbols-outlined text-[40px]">person</span>
                                        </div>
                                    )}
                                    <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-lg shadow-sm border border-slate-50">
                                        <span className="material-symbols-outlined text-[#0F766E] text-[16px]" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-[#0F766E] mb-0.5">{detail.busModel}</p>
                                    <h3 className="text-[20px] font-black text-[#1E293B] tracking-tight">{detail.driverName} 기사님</h3>
                                    <p className="text-[13px] text-[#94A3B8] font-bold">{detail.busNo}</p>
                                </div>
                            </div>
                            <span className="px-3 py-1 bg-[#F8FAFB] text-[#94A3B8] text-[9px] font-black rounded-full uppercase tracking-widest border border-slate-50">Vehicle 01</span>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <button onClick={() => navigate(`/chat-room/${detail.id}`)} className="w-full py-5 rounded-3xl bg-[#E2E8F0] text-[#475569] font-black text-[14px] flex items-center justify-center gap-3 transition-all active:scale-[0.98]">
                                <span className="material-symbols-outlined text-[20px]">chat_bubble</span>
                                실시간 채팅 조회
                            </button>
                            {detail.isReviewed > 0 ? (
                                <button onClick={() => navigate(`/review-detail/${detail.id}`)} className="w-full py-5 rounded-3xl border border-[#F1F5F9] text-[#475569] font-black text-[14px] flex items-center justify-center gap-3 transition-all active:scale-[0.98]">
                                    <span className="material-symbols-outlined text-[18px] text-[#F97316]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                                    평점 조회 ({detail.rating || '4.9'})
                                </button>
                            ) : (
                                <button onClick={() => navigate(`/add-review/${detail.id}`)} className="w-full py-5 rounded-3xl bg-[#0D6B5E] text-white font-black text-[14px] flex items-center justify-center gap-3 shadow-lg shadow-teal-900/10 transition-all active:scale-[0.98]">
                                    <span className="material-symbols-outlined text-[18px]">edit_note</span>
                                    평점/감사글 작성
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                {/* Section 3: 결제 내역 상세 */}
                <section className="space-y-6">
                    <h2 className="text-xl font-black text-[#1E293B] tracking-tight px-2">결제 내역 상세</h2>
                    <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100 space-y-8">
                        <div className="flex justify-between items-center py-2">
                            <span className="text-[16px] font-black text-[#1E293B]">견적 요청 금액</span>
                            <span className="text-[20px] font-black text-[#1E293B]">₩ {totalPrice.toLocaleString()}</span>
                        </div>

                        <div className="bg-[#0D6B5E] p-10 rounded-[2rem] shadow-xl shadow-teal-900/10 flex items-center justify-between text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">Final Total Payment</p>
                                <p className="text-[14px] font-bold">결제 완료</p>
                            </div>
                            <div className="text-right">
                                <span className="text-[40px] font-black tracking-tighter leading-none flex items-start justify-end gap-2">
                                    <span className="text-[24px] mt-2">₩</span>
                                    {totalPrice.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button className="w-full flex items-center justify-center gap-3 text-[#0F766E] font-black text-[15px] py-10 hover:underline transition-all">
                        <span className="material-symbols-outlined">receipt_long</span>
                        매출전표/영수증 다운로드
                    </button>
                </section>
            </main>

            <BottomNavCustomer />
        </div>
    );
};

export default PastTripDetailCustomer;
