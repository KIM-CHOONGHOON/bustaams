import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { notify } from '../utils/toast';

const ApprovalListCustomer = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const reqId = searchParams.get('reqId');

    const [tripSummary, setTripSummary] = useState(null);
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchEstimates = async () => {
        if (!reqId) return;
        try {
            const result = await api.get(`/app/customer/estimate-list/${reqId}`);
            if (result.success) {
                setTripSummary(result.data.tripSummary);
                setUnits(result.data.units);
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEstimates();
    }, [reqId]);

    const handleCancelBus = async (unitSeq) => {
        const confirmed = await notify.confirm('차량 견적 취소', `차량 #${unitSeq}의 견적 요청을 취소하시겠습니까?`);
        if (!confirmed) return;
        try {
            const res = await api.post(`/app/customer/cancel-bus`, { reqId, unitSeq });
            if (res.success) {
                notify.success('취소 완료', '해당 차량의 견적 요청이 취소되었습니다.');
                fetchEstimates();
            }
        } catch (error) {
            console.error('Cancel bus error:', error);
            notify.error('오류 발생', '취소 처리 중 오류가 발생했습니다.');
        }
    };

    const handleApproveBid = async (resId) => {
        const confirmed = await notify.confirm('견적 승인', '이 기사님의 견적을 승인하시겠습니까?');
        if (!confirmed) return;
        try {
            const res = await api.post('/app/customer/approve-bid', { resId });
            if (res.success) {
                notify.success('승인 완료', '승인이 완료되었습니다.');
                fetchEstimates();
            }
        } catch (error) {
            console.error('Approve bid error:', error);
            notify.error('오류 발생', '승인 처리 중 오류가 발생했습니다.');
        }
    };

    const handleApproveAll = async () => {
        const confirmed = await notify.confirm('전체 견적 승인', '진행 중인 모든 견적을 승인하시겠습니까?');
        if (!confirmed) return;
        try {
            const res = await api.post('/app/customer/approve-all', { reqId });
            if (res.success) {
                notify.success('전체 승인 완료', '모든 견적의 승인이 완료되었습니다.');
                fetchEstimates();
            }
        } catch (error) {
            console.error('Approve all error:', error);
            notify.error('오류 발생', '전체 승인 처리 중 오류가 발생했습니다.');
        }
    };

    const handleCancelRequest = async () => {
        const confirmed = await notify.confirm('전체 견적 요청 취소', '전체 견적 요청을 취소하시겠습니까?');
        if (!confirmed) return;
        try {
            const res = await api.post('/app/customer/cancel-request', { reqId });
            if (res.success) {
                notify.success('취소 완료', '전체 취소되었습니다.');
                navigate('/customer-dashboard');
            } else {
                notify.error('취소 실패', res.error || '취소 중 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error('Cancel error:', error);
            notify.error('오류 발생', '취소 중 오류가 발생했습니다.');
        }
    };

    const getBusStatusDisplay = (status) => {
        const config = {
            'AUCTION': { label: '견적대기중..', color: 'bg-slate-100 text-slate-400' },
            'BIDDING': { label: '승인대기중..', color: 'bg-orange-100 text-orange-700' },
            'CONFIRM': { label: '예약 확정..', color: 'bg-teal-100 text-teal-700' },
            'DONE': { label: '운행 종료..', color: 'bg-slate-100 text-slate-500' },
            'TRAVELER_CANCEL': { label: '여행자 버스 예약 전체 취소', color: 'bg-red-100 text-red-700' },
            'DRIVER_CANCEL': { label: '버스 기사 응찰 취소', color: 'bg-red-100 text-red-700' },
            'BUS_CHANGE': { label: '여행자 버스 변경 요청', color: 'bg-purple-100 text-purple-700' },
            'BUS_CANCEL': { label: '여행자 버스 취소(버스 대수 감소)', color: 'bg-gray-100 text-gray-600' }
        };
        return config[status] || { label: status || '상태 대기', color: 'bg-slate-100 text-slate-400' };
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="font-black text-primary animate-pulse tracking-widest uppercase text-xs">Loading Estimates</p>
                </div>
            </div>
        );
    }

    if (!tripSummary) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
                <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">error</span>
                <h2 className="text-2xl font-black text-teal-900 mb-2">요청 정보를 찾을 수 없습니다.</h2>
                <button onClick={() => navigate(-1)} className="mt-4 px-8 py-3 bg-primary text-white rounded-full font-black transition-all hover:bg-slate-900 active:scale-95">뒤로 가기</button>
            </div>
        );
    }

    const totalReqAmt = units.reduce((acc, unit) => acc + (Number(unit.unitReqAmt) || 0), 0);

    return (
        <div className="bg-background text-on-surface min-h-screen pb-32 font-body text-left">
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,104,95,0.04)] py-4">
                <div className="flex items-center justify-between px-6 max-w-7xl mx-auto w-full">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="text-teal-700 hover:bg-slate-100 transition-colors p-2 rounded-full scale-95 active:scale-90 duration-200">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <span className="text-2xl font-black text-teal-800 tracking-tighter italic">Velocity</span>
                    </div>
                    <div className="flex items-center gap-4">
                         <span className="text-sm font-bold text-orange-600">승인 처리</span>
                    </div>
                </div>
            </header>

            <main className="pt-28 px-6 max-w-6xl mx-auto space-y-10">
                <section className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                    <div className="md:col-span-8">
                        <p className="text-orange-600 font-bold tracking-[0.2em] text-xs mb-3 uppercase italic">Approval Pending</p>
                        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-on-surface leading-tight italic">
                            <span className="text-primary">{tripSummary.title}</span> 승인 대기
                        </h1>
                    </div>
                    <div className="md:col-span-4 text-right">
                        <span className={`inline-flex items-center gap-2 px-6 py-2 rounded-full text-xs font-bold shadow-lg ${getBusStatusDisplay(tripSummary.status).color}`}>
                            <span className={`w-2.5 h-2.5 rounded-full ${
                                tripSummary.status === 'CONFIRM' ? 'bg-teal-500' : (tripSummary.status.includes('CANCEL') ? 'bg-error' : 'bg-secondary')
                            }`}></span>
                            {getBusStatusDisplay(tripSummary.status).label}
                        </span>
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-7 space-y-8">
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_40px_60px_rgba(0,0,0,0.03)] border border-slate-50 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-2 h-full bg-primary/20"></div>
                            <h2 className="text-2xl font-black mb-10 flex items-center gap-3 italic text-teal-800">
                                <span className="material-symbols-outlined text-primary" style={{fontVariationSettings: "'FILL' 1"}}>route</span>
                                여정 경로
                            </h2>
                            <div className="space-y-0 relative">
                                <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-slate-100"></div>
                                
                                {tripSummary.fullRoute && tripSummary.fullRoute.map((step, idx) => (
                                    <div key={idx} className="relative pl-12 pb-10 last:pb-0 group">
                                        <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white z-10 shadow-md transition-all group-hover:scale-125 flex items-center justify-center ${
                                            step.type === 'START' ? 'bg-primary w-8 h-8 -left-1 -top-0' : 
                                            step.type === 'END' ? 'bg-secondary w-8 h-8 -left-1 -top-0' : 
                                            step.type === 'ROUND_TRIP' ? 'bg-teal-600 w-7 h-7 -left-0.5 top-0.5' : 'bg-slate-200'
                                        }`}>
                                            {(step.type === 'START' || step.type === 'END' || step.type === 'ROUND_TRIP') && (
                                                <span className="material-symbols-outlined text-white text-[14px]">
                                                    {step.type === 'START' ? 'location_on' : step.type === 'END' ? 'flag' : 'autorenew'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-left">
                                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 leading-none ${
                                                step.type === 'START' ? 'text-primary' : 
                                                step.type === 'END' ? 'text-secondary' : 
                                                step.type === 'ROUND_TRIP' ? 'text-teal-600' : 'text-slate-300'
                                            }`}>
                                                {step.title}
                                            </p>
                                            <h3 className={`font-black tracking-tight ${
                                                (step.type === 'START' || step.type === 'END' || step.type === 'ROUND_TRIP') ? 'text-xl text-slate-900' : 'text-lg text-slate-500'
                                            }`}>{step.addr}</h3>
                                            {step.time && (
                                                <p className="text-xs text-on-surface-variant font-bold mt-2 bg-slate-50 inline-block px-3 py-1 rounded-lg italic">
                                                    {step.time}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-between items-end px-2">
                                <h2 className="text-2xl font-black italic tracking-tighter">승인 처리 차량 목록</h2>
                                <span className="text-sm text-slate-400 font-bold">{units.length}대 요청됨</span>
                            </div>

                            {units.map((unit) => (
                                <div key={unit.unitSeq} className="bg-white rounded-[3rem] p-8 shadow-xl shadow-teal-900/5 border border-slate-50 space-y-8 animate-in fade-in slide-in-from-bottom duration-500">
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-50 pb-6">
                                        <div className="flex items-center gap-5">
                                            <div className="w-16 h-16 rounded-[1.5rem] bg-orange-50 flex items-center justify-center text-orange-600 shadow-inner">
                                                <span className="material-symbols-outlined text-4xl">directions_bus</span>
                                            </div>
                                            <div className="text-left">
                                                <h4 className="font-black text-xl tracking-tighter leading-tight italic">차량 #{unit.unitSeq}</h4>
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{unit.busType}</p>
                                                <p className="text-sm font-black text-orange-600 mt-2">요청금액: {Number(unit.unitReqAmt || 0).toLocaleString()}원</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
                                            <span className={`px-5 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase shadow-sm ${getBusStatusDisplay(unit.unitStat).color}`}>
                                                {getBusStatusDisplay(unit.unitStat).label}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {unit.estimates.length === 0 ? (
                                            <div className="py-12 bg-slate-50/50 rounded-[2rem] text-center border-2 border-dashed border-slate-100">
                                                <p className="text-xs font-black text-slate-300 uppercase tracking-widest italic">응찰 내역이 없습니다.</p>
                                            </div>
                                        ) : (
                                            unit.estimates.map((est) => (
                                                <div key={est.id} className={`p-8 rounded-[2.5rem] border transition-all duration-500 group ${est.isSelected ? 'bg-secondary/5 border-secondary shadow-lg shadow-secondary/5' : 'bg-white border-slate-100 hover:border-orange-200'}`}>
                                                    <div className="flex flex-col gap-8">
                                                        {/* 기사 및 차량 헤더 */}
                                                        <div className="flex flex-col sm:flex-row items-center gap-8 border-b border-slate-50 pb-6">
                                                            <div className="w-24 h-24 rounded-[2rem] overflow-hidden shadow-xl border-4 border-white group-hover:rotate-3 transition-transform shrink-0">
                                                                <img src={est.image} alt={est.driverName} className="w-full h-full object-cover" />
                                                            </div>
                                                            <div className="flex-grow text-left">
                                                                <div className="flex flex-wrap items-center gap-3 mb-3">
                                                                    <h5 className="font-black text-xl tracking-tighter italic">{est.driverName} 기사님</h5>
                                                                    <span className="flex items-center bg-secondary/10 px-3 py-1 rounded-full text-secondary text-[11px] font-black">
                                                                        <span className="material-symbols-outlined text-[12px] mr-1" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                                                                        {est.rating}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[14px] font-black text-slate-800 italic">{est.busInfo}</p>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">응찰 금액</p>
                                                                <p className="text-3xl font-black text-orange-600 tracking-tighter italic">₩{Number(est.price).toLocaleString()}</p>
                                                            </div>
                                                        </div>

                                                        {/* 차량 사진 리스트 (수직 스택) */}
                                                        <div className="space-y-4">
                                                            <div className="flex justify-between items-center px-2">
                                                                <h6 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic flex items-center gap-2">
                                                                    <span className="material-symbols-outlined text-[14px]">gallery_thumbnail</span>
                                                                    차량 사진 ({est.busImages.length})
                                                                </h6>
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-6">
                                                                {est.busImages.map((img, iIdx) => (
                                                                    <div key={iIdx} className="relative w-full aspect-[16/9] rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white group/photo">
                                                                        <img src={img} alt={`차량 사진 ${iIdx + 1}`} className="w-full h-full object-cover transition-transform duration-700 group-hover/photo:scale-110" />
                                                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-end p-8">
                                                                            <span className="text-white text-xs font-black uppercase tracking-[0.3em] bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/30">Vehicle Photo {iIdx + 1}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* 차량 상세 스펙 (편의시설, 안전, 보험 등) */}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="bg-slate-50/80 p-6 rounded-[2rem] space-y-4">
                                                                <h6 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic flex items-center gap-2">
                                                                    <span className="material-symbols-outlined text-[14px]">ac_unit</span>
                                                                    편의시설 및 서비스
                                                                </h6>
                                                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                                                    {[
                                                                        { key: '테이블', icon: 'table_restaurant' },
                                                                        { key: '와이파이', icon: 'wifi' },
                                                                        { key: 'USB충전', icon: 'usb' },
                                                                        { key: '냉장고', icon: 'kitchen' },
                                                                        { key: '개인모니터', icon: 'monitor' },
                                                                        { key: '생수제공', icon: 'water_drop' },
                                                                        { key: '간식제공', icon: 'icecream' }
                                                                    ].map((item, idx) => {
                                                                        const isActive = est.tags && est.tags.includes(item.key);
                                                                        if (!isActive) return null;
                                                                        return (
                                                                            <div key={idx} className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white shadow-sm border border-teal-100/30 group/item hover:scale-105 transition-transform">
                                                                                <span className="material-symbols-outlined text-teal-600 text-xl group-hover/item:rotate-12 transition-transform">{item.icon}</span>
                                                                                <span className="text-[10px] font-black text-slate-600 mt-2 tracking-tighter">{item.key}</span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    {(!est.tags || est.tags.length === 0) && (
                                                                        <div className="col-span-full text-center py-4 text-slate-300 font-bold text-xs italic">등록된 편의시설이 없습니다.</div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="bg-slate-50/80 p-6 rounded-[2rem] space-y-4 text-left">
                                                                <h6 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic flex items-center gap-2">
                                                                    <span className="material-symbols-outlined text-[14px]">verified_user</span>
                                                                    안전 및 인증 정보
                                                                </h6>
                                                                <div className="grid grid-cols-2 gap-y-3">
                                                                    <div>
                                                                        <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">ABES (ADAS)</p>
                                                                        <span className={`text-[11px] font-black px-2 py-0.5 rounded ${est.hasAdas === 'Y' ? 'text-teal-600 bg-teal-50' : 'text-slate-400 bg-slate-100'}`}>
                                                                            {est.hasAdas === 'Y' ? '장착 완료' : '미장착'}
                                                                        </span>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">보험 만료일</p>
                                                                        <p className="text-[11px] font-black text-slate-800">{est.insuranceExpDt}</p>
                                                                    </div>
                                                                    <div className="col-span-2">
                                                                        <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">정기검사 유효일자</p>
                                                                        <p className="text-[11px] font-black text-slate-800">{est.lastInspectDt}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* 액션 버튼 */}
                                                        <div className="pt-4 space-y-4">
                                                            <button 
                                                                onClick={() => !est.isSelected && handleApproveBid(est.id)}
                                                                disabled={est.isSelected}
                                                                className={`w-full py-5 rounded-[2rem] font-black text-sm tracking-widest uppercase transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${
                                                                    est.isSelected ? 'bg-secondary text-white shadow-xl shadow-secondary/30' : 'bg-orange-600 text-white shadow-xl shadow-orange-900/20 hover:scale-[1.02]'
                                                                }`}
                                                            >
                                                                <span className="material-symbols-outlined">
                                                                    {est.isSelected ? 'check_circle' : 'approval'}
                                                                </span>
                                                                {est.isSelected ? '승인 완료된 견적' : '승인 처리하기'}
                                                            </button>

                                                            {/* 취소 버튼을 승인 버튼 밑으로 이동 */}
                                                            {unit.unitStat !== 'TRAVELER_CANCEL' && unit.unitStat !== 'CONFIRM' && (
                                                                <button 
                                                                    onClick={() => handleCancelBus(unit.unitSeq)}
                                                                    className="w-full py-3 text-[10px] font-black text-error border border-error/10 rounded-2xl hover:bg-error/5 transition-all active:scale-95 uppercase tracking-[0.2em]"
                                                                >
                                                                    이 차량 견적 요청 취소
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-5 space-y-8">
                        <div className="bg-slate-900 rounded-[3rem] p-8 text-white sticky top-28 shadow-2xl shadow-slate-900/20 border border-slate-800">
                            <h2 className="text-2xl font-black mb-8 italic tracking-tighter">최종 승인 요약</h2>
                            
                            <div className="space-y-6 mb-10">
                                {units.map((unit) => (
                                    <div key={unit.unitSeq} className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10 group hover:bg-white/10 transition-all">
                                        <div className="text-left">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">차량 #{unit.unitSeq}</p>
                                            <p className="text-sm font-bold text-slate-200">{unit.busType}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-secondary italic">₩{Number(unit.unitReqAmt || 0).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-8 border-t border-white/10">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">총 합계 금액</p>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-4xl font-black tracking-tighter text-secondary italic">₩{totalReqAmt.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="space-y-4 pt-10">
                                {tripSummary.status === 'BIDDING' && (
                                    <div className="space-y-3">
                                        <button 
                                            onClick={handleApproveAll}
                                            className="w-full py-5 bg-secondary text-white rounded-2xl font-black text-sm tracking-widest uppercase shadow-xl shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group"
                                        >
                                            <span className="material-symbols-outlined text-xl group-hover:rotate-12 transition-transform">task_alt</span>
                                            전체 승인하기
                                        </button>
                                        <p className="text-[10px] text-slate-500 font-bold text-center uppercase tracking-tighter italic">
                                            * 승인 시 기사님들에게 예약 확정 알림이 전송됩니다.
                                        </p>
                                    </div>
                                )}
                                {tripSummary.status !== 'TRAVELER_CANCEL' && tripSummary.status !== 'CONFIRM' && (
                                    <button 
                                        onClick={handleCancelRequest}
                                        className="w-full bg-white/5 text-error border border-error/20 py-5 rounded-[2rem] font-black text-lg hover:bg-error/10 active:scale-95 transition-all flex items-center justify-center gap-3 italic"
                                    >
                                        <span className="material-symbols-outlined">cancel</span>
                                        전체 견적 취소
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Bottom Nav */}
            <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex justify-around items-center px-4 py-2 bg-white/80 backdrop-blur-3xl text-slate-400 w-[90%] max-w-md mx-auto rounded-full shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] border border-white/50">
                <button onClick={() => navigate('/customer-dashboard')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-primary transition-all">
                    <span className="material-symbols-outlined">home</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Home</span>
                </button>
                <button onClick={() => navigate('/estimate-request-list')} className="flex flex-col items-center justify-center px-5 py-2 text-primary relative">
                    <div className="absolute inset-0 bg-primary/10 rounded-2xl blur-lg"></div>
                    <span className="material-symbols-outlined relative z-10" style={{fontVariationSettings: "'FILL' 1"}}>confirmation_number</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1 relative z-10 underline decoration-2 underline-offset-4 italic">Trips</span>
                </button>
                <button onClick={() => navigate('/chat-list')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-primary transition-all">
                    <span className="material-symbols-outlined">chat_bubble</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Talk</span>
                </button>
                <button onClick={() => navigate('/user-profile')} className="flex flex-col items-center justify-center bg-slate-900 text-white rounded-full w-12 h-12 shadow-lg active:scale-90 transition-all ml-2">
                    <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>person</span>
                </button>
            </nav>
        </div>
    );
};

export default ApprovalListCustomer;
