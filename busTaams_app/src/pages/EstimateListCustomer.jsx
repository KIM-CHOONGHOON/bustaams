import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { notify } from '../utils/toast';
import BottomNavCustomer from '../components/BottomNavCustomer';

/**
 * 고객용 상세 견적 확인 페이지
 * 각 차량별로 입찰된 기사님의 견적을 확인하고 승인하거나 취소할 수 있습니다.
 */
const EstimateListCustomer = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const reqId = searchParams.get('reqId');

    const [tripSummary, setTripSummary] = useState(null);
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(true);

    // 견적 데이터 가져오기
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

    // 개별 차량 견적 취소
    const handleCancelBus = async (unitSeq) => {
        const confirmed = await notify.confirm('차량 견적 취소', `차량 #${unitSeq}의 견적 요청을 취소하시겠습니까?`);
        if (!confirmed) return;
        try {
            const res = await api.post(`/app/customer/cancel-bus`, { reqId, unitSeq });
            if (res.data.success) {
                notify.success('취소 완료', '해당 차량의 견적 요청이 취소되었습니다.');
                fetchEstimates();
            }
        } catch (error) {
            console.error('Cancel bus error:', error);
            notify.error('오류 발생', '취소 처리 중 오류가 발생했습니다.');
        }
    };

    // 입찰 승인 (개별)
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

    // 전체 승인
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

    // 전체 취소
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
            'TRAVELER_CANCEL': { label: '예약 전체 취소', color: 'bg-red-100 text-red-700' },
            'DRIVER_CANCEL': { label: '기사 응찰 취소', color: 'bg-red-100 text-red-700' },
            'BUS_CHANGE': { label: '버스 변경 요청', color: 'bg-purple-100 text-purple-700' },
            'BUS_CANCEL': { label: '버스 대수 감소', color: 'bg-gray-100 text-gray-600' }
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
                         <span className="text-sm font-bold text-slate-400">상세 견적 확인</span>
                    </div>
                </div>
            </header>

            <main className="pt-28 px-6 max-w-6xl mx-auto space-y-10">
                {/* 상단 섹션 */}
                <section className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                    <div className="md:col-span-8">
                        <p className="text-secondary font-bold tracking-[0.2em] text-xs mb-3 uppercase">Detailed Estimate</p>
                        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-on-surface leading-tight italic">
                            <span className="text-primary">{tripSummary.title}</span> 여정
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
                    {/* 왼쪽 컨텐츠 */}
                    <div className="lg:col-span-7 space-y-8">
                        {/* 여정 경로 카드 */}
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

                        {/* 차량별 견적 리스트 */}
                        <div className="space-y-6">
                            <div className="flex justify-between items-end px-2">
                                <h2 className="text-2xl font-black italic tracking-tighter">차량별 견적 현황</h2>
                                <span className="text-sm text-slate-400 font-bold">{units.length}대 요청됨</span>
                            </div>

                            {units.map((unit) => (
                                <div key={unit.unitSeq} className="bg-white rounded-[3rem] p-8 shadow-xl shadow-teal-900/5 border border-slate-50 space-y-8 animate-in fade-in slide-in-from-bottom duration-500">
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-50 pb-6">
                                        <div className="flex items-center gap-5">
                                            <div className="w-16 h-16 rounded-[1.5rem] bg-primary/5 flex items-center justify-center text-primary shadow-inner">
                                                <span className="material-symbols-outlined text-4xl">directions_bus</span>
                                            </div>
                                            <div className="text-left">
                                                <h4 className="font-black text-xl tracking-tighter leading-tight italic">차량 #{unit.unitSeq}</h4>
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{unit.busType}</p>
                                                <p className="text-sm font-black text-primary mt-2">요청금액: {Number(unit.unitReqAmt || 0).toLocaleString()}원</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
                                            <span className={`px-5 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase shadow-sm ${getBusStatusDisplay(unit.unitStat).color}`}>
                                                {getBusStatusDisplay(unit.unitStat).label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 입찰 내역 */}
                                    <div className="space-y-4">
                                        {unit.estimates.length === 0 ? (
                                            <div className="py-12 bg-slate-50/50 rounded-[2rem] text-center border-2 border-dashed border-slate-100">
                                                <p className="text-slate-400 font-bold italic">아직 도착한 견적이 없습니다.</p>
                                            </div>
                                        ) : (
                                            unit.estimates.map((est) => (
                                                <div key={est.id} className="bg-slate-50/30 rounded-[2.5rem] p-6 border border-slate-100/50 hover:bg-white hover:shadow-2xl transition-all duration-300 group">
                                                    <div className="flex flex-col gap-8">
                                                        <div className="flex-grow text-left space-y-6">
                                                            {/* 기사 정보 및 가격 */}
                                                            <div className="flex flex-wrap items-center gap-4 border-b border-slate-50 pb-6">
                                                                <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg border-2 border-white shrink-0">
                                                                    <img src={est.image || '/default-avatar.png'} alt={est.driverName} className="w-full h-full object-cover" />
                                                                </div>
                                                                <div className="flex-grow">
                                                                    <div className="flex items-center gap-3">
                                                                        <h5 className="font-black text-xl tracking-tighter italic">{est.driverName} 기사님</h5>
                                                                        <span className="flex items-center bg-secondary/10 px-3 py-1 rounded-full text-secondary text-[11px] font-black">
                                                                            <span className="material-symbols-outlined text-[12px] mr-1" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                                                                            {est.rating}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">경력 {est.experience}년 • {est.busInfo}</p>
                                                                </div>
                                                                <div className="text-right shrink-0">
                                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">응찰 금액</p>
                                                                    <p className="text-2xl font-black text-primary tracking-tighter italic">₩{Number(est.price).toLocaleString()}</p>
                                                                </div>
                                                            </div>

                                                            {/* 차량 이미지 갤러리 - 수직 리스트 */}
                                                            <div className="space-y-4">
                                                                <div className="flex justify-between items-center">
                                                                    <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                                        <span className="material-symbols-outlined text-[14px]">photo_library</span>
                                                                        차량 사진 ({est.busImages ? est.busImages.length : 0})
                                                                    </h6>
                                                                </div>
                                                                <div className="grid grid-cols-1 gap-4">
                                                                    {est.busImages && est.busImages.length > 0 ? (
                                                                        est.busImages.map((img, iIdx) => (
                                                                            <div key={iIdx} className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-lg border-4 border-white">
                                                                                <img src={img} alt={`차량 사진 ${iIdx + 1}`} className="w-full h-full object-cover" />
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <div className="w-full py-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 font-bold italic">
                                                                            차량 이미지가 없습니다.
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* 편의시설 및 안전 정보 Bento Grid */}
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <div className="bg-slate-50 p-5 rounded-3xl">
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-3">편의시설 및 서비스</p>
                                                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
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
                                                                                <div key={idx} className="flex flex-col items-center justify-center p-2 rounded-xl bg-white shadow-sm border border-slate-100">
                                                                                    <span className="material-symbols-outlined text-primary text-lg">{item.icon}</span>
                                                                                    <span className="text-[9px] font-black text-slate-600 mt-1">{item.key}</span>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                        {(!est.tags || est.tags.length === 0) && (
                                                                            <div className="col-span-full text-center py-2 text-slate-300 font-bold text-[10px] italic">정보 없음</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="bg-slate-50 p-4 rounded-2xl">
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2 text-left">안전 및 보험</p>
                                                                    <div className="space-y-1 text-left">
                                                                        <p className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                                                                            <span className={`w-1.5 h-1.5 rounded-full ${est.hasAdas === 'Y' ? 'bg-teal-500' : 'bg-slate-300'}`}></span>
                                                                            ADAS: {est.hasAdas === 'Y' ? '장착' : '미장착'}
                                                                        </p>
                                                                        <p className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                                                                            <span className="material-symbols-outlined text-[10px]">event</span>
                                                                            보험 만료일: {est.insuranceExpDt || '정보없음'}
                                                                        </p>
                                                                        <p className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                                                                            <span className="material-symbols-outlined text-[10px]">verified</span>
                                                                            정기 검사: {est.lastInspectDt || '정보없음'}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* 액션 버튼 */}
                                                        <div className="space-y-4 pt-4 border-t border-slate-50">
                                                            <div className="flex flex-col sm:flex-row gap-4">
                                                                <button 
                                                                    onClick={() => navigate(`/estimate-detail/${est.id}`)}
                                                                    className={`flex-grow py-4 rounded-2xl font-black text-xs tracking-widest uppercase transition-all active:scale-95 ${
                                                                        est.isSelected ? 'bg-secondary text-white shadow-lg' : 'bg-primary text-white shadow-lg shadow-primary/20'
                                                                    }`}
                                                                >
                                                                    {est.isSelected ? '확정된 견적' : '상세 견적 및 승인하기'}
                                                                </button>
                                                                <button 
                                                                    onClick={() => navigate(`/chat-detail/${est.id}`)}
                                                                    className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                                                                >
                                                                    <span className="material-symbols-outlined text-lg">chat_bubble</span>
                                                                    채팅문의
                                                                </button>
                                                            </div>
                                                            {/* 취소 버튼을 승인 버튼 밑으로 이동 */}
                                                            {unit.unitStat !== 'TRAVELER_CANCEL' && unit.unitStat !== 'CONFIRM' && (
                                                                <button 
                                                                    onClick={() => handleCancelBus(unit.unitSeq)}
                                                                    className="w-full py-3 text-[10px] font-black text-error border border-error/10 rounded-xl hover:bg-error/5 transition-all active:scale-95 uppercase tracking-widest"
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

                    {/* 오른쪽 사이드바 (요약 및 전체 액션) */}
                    <div className="lg:col-span-5 space-y-8">
                        <div className="bg-slate-900 rounded-[3rem] p-8 text-white sticky top-28 shadow-2xl shadow-slate-900/20 border border-slate-800">
                            <h2 className="text-2xl font-black mb-8 italic tracking-tighter">견적 상세 요약</h2>
                            
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
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">총 합계 요청 금액</p>
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
                                            * 승인 시 해당 기사님들에게 예약 확정 알림이 전송됩니다.
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

                            <div className="mt-10 p-5 bg-white/5 rounded-2xl border border-white/5">
                                <p className="text-[10px] leading-relaxed text-slate-400 italic">
                                    * 실제 운행 시 발생하는 유류비, 톨비, 기사님 봉사료 등은 견적 금액에 포함되어 있으나, 현장 상황에 따라 변동될 수 있습니다.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <BottomNavCustomer />
        </div>
    );
};

export default EstimateListCustomer;
