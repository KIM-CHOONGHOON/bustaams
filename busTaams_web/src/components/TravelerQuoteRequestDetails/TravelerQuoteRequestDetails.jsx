import React, { useState, useEffect, useCallback } from 'react';

/**
 * 여행자 견적 요청 상세 (TravelerQuoteRequestDetails)
 * - 설계서(MD) 기준: BID_SEQ 제거, REQ_BUS_SEQ(슬롯) 기반 입찰 적용
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');

const RES_STAT_LABEL = { REQ: '요청', CONFIRM: '확정', DONE: '완료', TRAVELER_CANCEL: '여행자 취소', DRIVER_CANCEL: '버스기사 취소', CANCELLATION_OF_BID: '입찰 취소', CANCELLATION_OF_AUCTION: '역경매 취소' };
const RES_STAT_COLOR = { REQ: 'text-blue-600 bg-blue-50', CONFIRM: 'text-green-600 bg-green-50', DONE: 'text-slate-600 bg-slate-100', TRAVELER_CANCEL: 'text-red-600 bg-red-50', DRIVER_CANCEL: 'text-orange-600 bg-orange-50', CANCELLATION_OF_BID: 'text-rose-600 bg-rose-50', CANCELLATION_OF_AUCTION: 'text-purple-600 bg-purple-50' };

const TravelerQuoteRequestDetails = ({ close, reqId, currentUser }) => {
    const [loading, setLoading]         = useState(true);
    const [loadError, setLoadError]     = useState(null);
    const [data, setData]               = useState(null);

    // 예약 상태 (TB_BUS_RESERVATION)
    const [resId, setResId]             = useState(null);
    const [resStat, setResStat]         = useState('REQ');

    // 입찰 가격 및 슬롯 선택
    const [bidPrice, setBidPrice]         = useState('');
    const [prevBidPrice, setPrevBidPrice] = useState(0); 
    const [selectedBusSeq, setSelectedBusSeq] = useState(null); 

    // 액션 상태
    const [updating, setUpdating]           = useState(false);
    const [updateError, setUpdateError]     = useState(null);
    const [updateSuccess, setUpdateSuccess] = useState(false);
    const [cancelling, setCancelling]       = useState(false);
    const [cancelPopup, setCancelPopup]     = useState(null);
    const [cancelSuccess, setCancelSuccess] = useState(false);

    const fetchData = useCallback(async () => {
        if (!reqId) return;
        setLoading(true);
        setLoadError(null);
        try {
            const custId = currentUser?.custId || '';
            const url = `${API_BASE}/api/traveler-quote-request-details?reqId=${encodeURIComponent(reqId)}${custId ? `&custId=${encodeURIComponent(custId)}` : ''}`;
            const res  = await fetch(url);
            if (!res.ok) throw new Error('데이터를 불러오지 못했습니다.');
            const json = await res.json();
            setData(json);

            setPrevBidPrice(Number(json.prevBidPrice) || 0);

            if (json.resStat === 'CANCELLATION_OF_BID') {
                setPrevBidPrice(Number(json.driverBiddingPrice) || 0);
                setBidPrice('');
                setResId(null);
                setResStat('REQ');
            } else {
                setResId(json.resId || null);
                setResStat(json.resStat || 'REQ');
                if (json.driverBiddingPrice > 0) {
                    setBidPrice(Number(json.driverBiddingPrice).toLocaleString('ko-KR'));
                }
            }

            // 첫 번째 슬롯 자동 선택
            if (json.buses?.length > 0 && !selectedBusSeq) {
                setSelectedBusSeq(json.buses[0].reqBusSeq);
            }
        } catch (e) {
            setLoadError(e.message);
        } finally {
            setLoading(false);
        }
    }, [reqId, currentUser, selectedBusSeq]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleBidUpdate = async () => {
        if (resStat !== 'REQ' && resStat !== 'BIDDING') {
            setUpdateError('현재 상태에서는 입찰할 수 없습니다.');
            return;
        }
        const bidPriceNum = Number(String(bidPrice).replace(/,/g, ''));
        if (!bidPriceNum || bidPriceNum <= 0) {
            setUpdateError('유효한 입찰가를 입력해 주세요.');
            return;
        }
        if (!selectedBusSeq) {
            setUpdateError('입찰할 버스 슬롯을 선택해 주세요.');
            return;
        }

        setUpdating(true);
        setUpdateError(null);
        try {
            const body = { 
                reqId, 
                reqBusSeq: selectedBusSeq, 
                custId: currentUser?.custId, 
                bidPrice: bidPriceNum 
            };
            const res = await fetch(`${API_BASE}/api/traveler-quote-request-details/bid`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || '입찰 중 오류가 발생했습니다.');
            
            setUpdateSuccess(true);
            setTimeout(() => setUpdateSuccess(false), 3000);
            fetchData();
        } catch (e) {
            setUpdateError(e.message);
        } finally {
            setUpdating(false);
        }
    };

    const handleBidCancel = () => {
        if (resStat !== 'REQ' && resStat !== 'BIDDING') {
            alert('취소할 수 없는 상태입니다.');
            return;
        }
        setCancelPopup({ type: 'confirm', message: '입찰을 취소하시겠습니까?' });
    };

    const executeBidCancel = async () => {
        setCancelPopup(null);
        setCancelling(true);
        try {
            const body = { reqId, reqBusSeq: selectedBusSeq, custId: currentUser?.custId };
            const res = await fetch(`${API_BASE}/api/traveler-quote-request-details/bid-cancel`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error('취소 처리 중 오류가 발생했습니다.');
            setCancelSuccess(true);
            setTimeout(() => setCancelSuccess(false), 3000);
            fetchData();
        } catch (e) {
            alert(e.message);
        } finally {
            setCancelling(false);
        }
    };

    const buildRoute = () => {
        if (!data) return '-';
        const parts = [data.startAddr];
        if (data.waypoints?.length > 0) {
            [...data.waypoints]
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .forEach(v => parts.push(v.waypointAddr));
        }
        parts.push(data.endAddr);
        return parts.join(' → ');
    };

    return (
        <>
            {cancelPopup && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
                        <p className="text-lg font-bold mb-6">{cancelPopup.message}</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={executeBidCancel} className="px-6 py-2 bg-red-500 text-white rounded-full font-bold">확인</button>
                            <button onClick={() => setCancelPopup(null)} className="px-6 py-2 bg-slate-100 rounded-full font-bold">닫기</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
                <div className="relative w-full max-w-6xl max-h-[95vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                    <button onClick={close} className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full">
                        <span className="material-symbols-outlined">close</span>
                    </button>

                    <div className="flex-1 overflow-y-auto p-8 lg:p-12">
                        {loading ? (
                            <div className="py-20 text-center font-bold">로딩 중...</div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                <div className="lg:col-span-8 space-y-8">
                                    <header className="mb-8">
                                        <h1 className="text-3xl font-black mb-2">{data?.startAddr} → {data?.endAddr}</h1>
                                        <p className="text-slate-500">{data?.tripTitle}</p>
                                    </header>

                                    <section className="bg-slate-50 p-6 rounded-2xl space-y-4">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-primary">route</span>
                                            <span className="font-bold">{buildRoute()}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-primary">calendar_month</span>
                                            <span className="font-bold">{new Date(data?.startDt).toLocaleDateString()} - {new Date(data?.endDt).toLocaleDateString()}</span>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">차량 슬롯 선택</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {data?.buses?.map(bus => (
                                                <button
                                                    key={bus.reqBusSeq}
                                                    onClick={() => setSelectedBusSeq(bus.reqBusSeq)}
                                                    className={`p-4 rounded-xl border-2 text-left transition-all ${selectedBusSeq === bus.reqBusSeq ? 'border-primary bg-primary/5' : 'border-slate-100 bg-white'}`}
                                                >
                                                    <p className="font-bold">{bus.busType}</p>
                                                    <div className="flex justify-between items-end mt-2">
                                                        <span className="text-xs text-slate-400">슬롯: {bus.reqBusSeq}</span>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${bus.busStat === 'AUCTION' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                                                            {bus.busStat === 'AUCTION' ? '입찰대기' : '응찰진행'}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="bg-white border border-slate-100 p-8 rounded-3xl shadow-sm">
                                        <h2 className="text-xl font-black mb-6">입찰가 입력</h2>
                                        <div className="relative mb-8">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₩</span>
                                            <input
                                                type="text"
                                                value={bidPrice}
                                                onChange={(e) => {
                                                    const raw = e.target.value.replace(/[^0-9]/g, '');
                                                    setBidPrice(raw === '' ? '' : Number(raw).toLocaleString());
                                                }}
                                                className="w-full pl-10 pr-4 py-4 bg-slate-50 rounded-2xl text-2xl font-black focus:ring-2 focus:ring-primary outline-none"
                                                placeholder="0"
                                            />
                                        </div>
                                        
                                        {updateError && <p className="text-red-500 text-sm font-bold mb-4">{updateError}</p>}
                                        {updateSuccess && <p className="text-green-500 text-sm font-bold mb-4">성공적으로 반영되었습니다.</p>}

                                        <div className="flex gap-4">
                                            <button onClick={handleBidUpdate} disabled={updating} className="flex-1 py-4 bg-primary text-white rounded-full font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                                                {updating ? '처리 중...' : '입찰 등록/수정'}
                                            </button>
                                            <button onClick={handleBidCancel} className="px-8 py-4 text-red-500 font-bold border border-red-100 rounded-full hover:bg-red-50">
                                                입찰 취소
                                            </button>
                                        </div>
                                    </section>
                                </div>

                                <div className="lg:col-span-4 space-y-6">
                                    <div className="bg-slate-900 text-white p-8 rounded-3xl">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-4">가격 요약</h3>
                                        <div className="space-y-4">
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">여행자 제시가</span>
                                                <span className="font-bold">₩{Number(data?.estTotalServicePrice).toLocaleString()}</span>
                                            </div>
                                            <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                                                <span className="text-sm">현재 입찰가</span>
                                                <span className="text-2xl font-black text-primary">₩{bidPrice || '0'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default TravelerQuoteRequestDetails;
