import React, { useState, useEffect, useCallback } from 'react';

/**
 * 여행자 견적 요청 상세 (TravelerQuoteRequestDetails)
 * - ListOfTravelerQuotations 모달에서 항목 클릭 시 reqUuid(string)를 받아 호출
 * - GET /api/traveler-quote-request-details?reqUuid=
 * - 데이터 출처: TB_AUCTION_REQ (마스터) + TB_AUCTION_REQ_BUS (차량) + TB_AUCTION_REQ_VIA (경유지)
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');

const RES_STAT_LABEL = { REQ: '요청', CONFIRM: '확정', DONE: '완료', TRAVELER_CANCEL: '여행자 취소', DRIVER_CANCEL: '버스기사 취소', CANCELLATION_OF_BID: '입찰 취소', CANCELLATION_OF_AUCTION: '역경매 취소' };
const RES_STAT_COLOR = { REQ: 'text-blue-600 bg-blue-50', CONFIRM: 'text-green-600 bg-green-50', DONE: 'text-slate-600 bg-slate-100', TRAVELER_CANCEL: 'text-red-600 bg-red-50', DRIVER_CANCEL: 'text-orange-600 bg-orange-50', CANCELLATION_OF_BID: 'text-rose-600 bg-rose-50', CANCELLATION_OF_AUCTION: 'text-purple-600 bg-purple-50' };

const TravelerQuoteRequestDetails = ({ close, reqUuid, currentUser }) => {
    const [loading, setLoading]         = useState(true);
    const [loadError, setLoadError]     = useState(null);
    const [data, setData]               = useState(null);

    // 예약 상태 (TB_BUS_RESERVATION)
    const [resUuid, setResUuid]         = useState(null);
    const [resStat, setResStat]         = useState('REQ');

    // 입찰 가격 입력 상태
    const [bidPrice, setBidPrice]         = useState('');
    const [prevBidPrice, setPrevBidPrice] = useState(0); // 이전 취소 입찰가
    const [bidSeq, setBidSeq]             = useState(0); // 입찰 회차

    // 입찰가 수정 상태
    const [updating, setUpdating]           = useState(false);
    const [updateError, setUpdateError]     = useState(null);
    const [updateSuccess, setUpdateSuccess] = useState(false);

    // 입찰 취소 상태
    const [cancelling, setCancelling]       = useState(false);
    const [cancelPopup, setCancelPopup]     = useState(null); // { type: 'error'|'confirm', message }
    const [cancelSuccess, setCancelSuccess] = useState(false);

    const fetchData = useCallback(async () => {
        if (!reqUuid) return;
        setLoading(true);
        setLoadError(null);
        try {
            const driverUuid = currentUser?.userUuid || currentUser?.USER_UUID_STR || '';
            const url = `${API_BASE}/api/traveler-quote-request-details?reqUuid=${encodeURIComponent(reqUuid)}${driverUuid ? `&driverUuid=${encodeURIComponent(driverUuid)}` : ''}`;
            const res  = await fetch(url);
            const text = await res.text();
            const trimmed = text.trimStart();
            if (trimmed.startsWith('<') || trimmed.startsWith('<!')) {
                throw new Error('API가 JSON 대신 HTML을 반환했습니다. 백엔드 서버 상태를 확인하세요.');
            }
            if (!res.ok) throw new Error(JSON.parse(text)?.error || `${res.status}`);
            const json = JSON.parse(text);
            setData(json);

            // 이전 취소 입찰가 저장
            setPrevBidPrice(Number(json.prevBidPrice) || 0);

            if (json.resStat === 'CANCELLATION_OF_BID') {
                // 입찰 취소 상태 → 이전 입찰가를 prevBidPrice로, 새 입찰 등록 모드
                setPrevBidPrice(Number(json.driverBiddingPrice) || 0);
                setBidPrice('');
                setResUuid(null);        // 기존 UUID 무시 → PUT /bid 시 신규 INSERT
                setResStat('REQ');
                setBidSeq(Number(json.bidSeq) || 0); // 취소된 회차 (다음 등록 시 +1)
            } else {
                setResUuid(json.resUuid || null);
                setResStat(json.resStat || 'REQ');
                setBidSeq(Number(json.bidSeq) || 0);
                if (json.driverBiddingPrice > 0) {
                    setBidPrice(Number(json.driverBiddingPrice).toLocaleString('ko-KR'));
                }
            }
        } catch (e) {
            setLoadError(e.message);
        } finally {
            setLoading(false);
        }
    }, [reqUuid, currentUser]);

    const handleBidUpdate = useCallback(async () => {
        if (resStat !== 'REQ') {
            setUpdateError(`예약 상태(${RES_STAT_LABEL[resStat] || resStat})가 '요청(REQ)' 상태가 아니므로 입찰가를 수정할 수 없습니다.`);
            return;
        }
        const bidPriceNum = Number(String(bidPrice).replace(/,/g, ''));
        if (!bidPriceNum || bidPriceNum <= 0) {
            setUpdateError('유효한 입찰가를 입력해 주세요.');
            return;
        }
        const driverUuid = currentUser?.userUuid || currentUser?.USER_UUID_STR || '';
        if (!resUuid && !driverUuid) {
            setUpdateError('기사 정보를 확인할 수 없습니다. 다시 로그인해 주세요.');
            return;
        }
        setUpdating(true);
        setUpdateError(null);
        setUpdateSuccess(false);
        try {
            // resUuid가 없으면(최초/재등록) reqUuid + driverUuid 포함
            const body = resUuid
                ? { resUuid, reqUuid, driverUuid, bidPrice: bidPriceNum }
                : { reqUuid, driverUuid, bidPrice: bidPriceNum };
            const res = await fetch(`${API_BASE}/api/traveler-quote-request-details/bid`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const rawText = await res.text();
            const trimmed = rawText.trimStart();
            if (trimmed.startsWith('<') || trimmed.startsWith('<!')) {
                throw new Error('백엔드 서버가 응답하지 않습니다. 서버를 재시작한 후 다시 시도해 주세요.');
            }
            const json = JSON.parse(rawText);
            if (!res.ok) throw new Error(json.error || `서버 오류 (${res.status})`);
            // 신규 등록 시 반환된 resUuid / bidSeq 저장
            if (json.isNew && json.resUuid) setResUuid(json.resUuid);
            if (json.bidSeq) setBidSeq(json.bidSeq);
            setUpdateSuccess(true);
            setTimeout(() => setUpdateSuccess(false), 3000);
        } catch (e) {
            setUpdateError(e.message);
        } finally {
            setUpdating(false);
        }
    }, [resStat, bidPrice, resUuid, reqUuid, currentUser]);

    // RES_STAT별 입찰 취소 불가 메시지
    const BID_CANCEL_ERROR_MSG = {
        CONFIRM:                 "본 경매는 확정되어 '입찰 취소'할 수 없습니다.",
        DONE:                    "본 경매는 여행 완료되어 '입찰 취소'할 수 없습니다.",
        TRAVELER_CANCEL:         "본 경매는 여행자가 여행 확정 취소하여 '입찰 취소'할 수 없습니다.",
        DRIVER_CANCEL:           "본 경매는 버스 기사가 여행 확정 취소하여 '입찰 취소'할 수 없습니다.",
        CANCELLATION_OF_BID:     "본 경매는 버스 기사가 입찰 취소하여 '입찰 취소'할 수 없습니다.",
        CANCELLATION_OF_AUCTION: "본 경매는 여행자가 경매 취소하여 '입찰 취소'할 수 없습니다.",
    };

    const handleBidCancel = useCallback(async () => {
        // REQ가 아닌 경우 즉시 오류 팝업
        if (resStat !== 'REQ') {
            setCancelPopup({
                type: 'error',
                message: BID_CANCEL_ERROR_MSG[resStat] || `현재 상태(${RES_STAT_LABEL[resStat] || resStat})에서는 입찰 취소할 수 없습니다.`,
            });
            return;
        }
        // REQ인 경우 확인 팝업
        setCancelPopup({ type: 'confirm', message: '입찰을 취소하시겠습니까?\n취소 후에는 되돌릴 수 없습니다.' });
    }, [resStat]);

    const executeBidCancel = useCallback(async () => {
        setCancelPopup(null);
        const driverUuid = currentUser?.userUuid || currentUser?.USER_UUID_STR || '';
        setCancelling(true);
        setCancelSuccess(false);
        try {
            const body = resUuid
                ? { resUuid }
                : { reqUuid, driverUuid };
            const res = await fetch(`${API_BASE}/api/traveler-quote-request-details/bid-cancel`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const rawText = await res.text();
            if (rawText.trimStart().startsWith('<')) {
                throw new Error('백엔드 서버가 응답하지 않습니다. 서버를 재시작한 후 다시 시도해 주세요.');
            }
            const json = JSON.parse(rawText);
            if (!res.ok) {
                setCancelPopup({ type: 'error', message: json.error || `서버 오류 (${res.status})` });
                return;
            }
            setResStat('CANCELLATION_OF_BID');
            setCancelSuccess(true);
            setTimeout(() => setCancelSuccess(false), 3000);
        } catch (e) {
            setCancelPopup({ type: 'error', message: e.message });
        } finally {
            setCancelling(false);
        }
    }, [resUuid, reqUuid, currentUser]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const formatDt = (dtStr) => {
        if (!dtStr) return '-';
        return new Date(dtStr).toLocaleDateString('ko-KR', {
            year: 'numeric', month: '2-digit', day: '2-digit',
        });
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

    const adjustBidPrice = (delta) => {
        const current = parseInt((bidPrice || '0').replace(/,/g, ''), 10) || 0;
        const next = Math.max(0, current + delta);
        setBidPrice(next.toLocaleString('ko-KR'));
    };

    return (
        <>
            {/* ── 입찰 취소 팝업 모달 ── */}
            {cancelPopup && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-8 flex flex-col gap-6 animate-in zoom-in-95 duration-150">
                        <div className="flex items-start gap-4">
                            <span className={`material-symbols-outlined text-3xl flex-shrink-0 ${cancelPopup.type === 'error' ? 'text-error' : 'text-amber-500'}`}>
                                {cancelPopup.type === 'error' ? 'error' : 'help'}
                            </span>
                            <p className="text-base font-semibold text-on-surface leading-relaxed whitespace-pre-line">
                                {cancelPopup.message}
                            </p>
                        </div>
                        <div className="flex gap-3 justify-end">
                            {cancelPopup.type === 'confirm' && (
                                <button
                                    type="button"
                                    onClick={executeBidCancel}
                                    className="px-6 py-2.5 bg-error text-white rounded-full font-bold hover:opacity-90 transition-opacity"
                                >
                                    취소 확인
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setCancelPopup(null)}
                                className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-full font-bold hover:bg-slate-200 transition-colors"
                            >
                                {cancelPopup.type === 'error' ? '확인' : '닫기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div
                className="fixed inset-0 z-[200] flex min-h-0 items-center justify-center overflow-y-auto bg-gray-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                style={{ fontFamily: "'Manrope', sans-serif" }}
            >
                {/* 백드롭 — onClick 없음: 외부 클릭으로 닫히지 않음 */}
                <div className="absolute inset-0" aria-hidden />

                <div
                    className="relative my-auto flex min-h-0 w-full max-w-6xl max-h-[95vh] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* X 닫기 버튼 */}
                    <button
                        type="button"
                        onClick={close}
                        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors duration-200 text-gray-500"
                        aria-label="닫기"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>

                    {/* 스크롤 콘텐츠 영역 */}
                    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-24 gap-3 text-on-surface-variant">
                                <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
                                <p className="font-bold">데이터를 불러오는 중...</p>
                            </div>
                        ) : loadError ? (
                            <div className="flex flex-col items-center justify-center py-24 gap-4">
                                <span className="material-symbols-outlined text-4xl text-error">error</span>
                                <p className="font-bold text-error">{loadError}</p>
                                <button
                                    type="button"
                                    onClick={fetchData}
                                    className="px-6 py-2 bg-primary text-white rounded-full font-bold hover:bg-primary-container transition-colors"
                                >
                                    다시 시도
                                </button>
                            </div>
                        ) : (
                            <main className="p-8 lg:p-12 w-full">

                                {/* ── 헤더 ── */}
                                <header className="mb-12 flex justify-between items-end pr-14">
                                    <div className="max-w-2xl">
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold flex items-center gap-1">
                                                <span className="w-2 h-2 bg-secondary rounded-full animate-pulse"></span>
                                                실시간 입찰
                                            </span>
                                            <span className="text-slate-400 text-xs font-mono truncate max-w-[200px]" title={data?.reqUuid}>
                                                REQ: {data?.reqUuid ? data.reqUuid.slice(0, 8) + '…' : 'N/A'}
                                            </span>
                                        </div>
                                        {data?.tripTitle && (
                                            <p className="text-sm font-semibold text-primary mb-1">{data.tripTitle}</p>
                                        )}
                                        <h1
                                            className="text-4xl font-extrabold text-on-surface tracking-tighter mb-4"
                                            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                        >
                                            {data?.startAddr} → {data?.endAddr}
                                        </h1>
                                        <p className="text-slate-500 text-lg">
                                            입찰 상세 및 수정
                                        </p>
                                    </div>
                                </header>

                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                                    {/* ── 왼쪽 컬럼 (col-span-8) ── */}
                                    <div className="lg:col-span-8 space-y-8">

                                        {/* 여행 요약 벤토 그리드 */}
                                        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                            {/* 요청 요약 카드 */}
                                            <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-[0_40px_60px_-15px_rgba(0,104,95,0.04)] relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-secondary"></div>
                                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">요청 요약</h3>
                                                <div className="space-y-6">
                                                    <div className="flex items-start gap-4">
                                                        <div className="bg-surface-container-high p-3 rounded-xl">
                                                            <span className="material-symbols-outlined text-primary">route</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-slate-500 font-bold uppercase">노선</p>
                                                            <p className="text-base font-bold text-on-surface leading-snug">{buildRoute()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start gap-4">
                                                        <div className="bg-surface-container-high p-3 rounded-xl">
                                                            <span className="material-symbols-outlined text-primary">calendar_month</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-slate-500 font-bold uppercase">날짜</p>
                                                            <p className="text-lg font-bold text-on-surface">
                                                                {formatDt(data?.startDt)} - {formatDt(data?.endDt)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start gap-4">
                                                        <div className="bg-surface-container-high p-3 rounded-xl">
                                                            <span className="material-symbols-outlined text-primary">group</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-slate-500 font-bold uppercase">탑승 인원</p>
                                                            <p className="text-lg font-bold text-on-surface">{data?.passengerCnt ?? '-'}명</p>
                                                        </div>
                                                    </div>
                                                    {data?.comment && (
                                                        <div className="flex items-start gap-4">
                                                            <div className="bg-surface-container-high p-3 rounded-xl">
                                                                <span className="material-symbols-outlined text-primary">comment</span>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-slate-500 font-bold uppercase">세부 요구사항</p>
                                                                <p className="text-sm font-semibold text-on-surface">{data.comment}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* 차량 및 경유지 카드 */}
                                            <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-[0_40px_60px_-15px_rgba(0,104,95,0.04)] relative overflow-hidden">
                                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">차량 및 경유지</h3>
                                                <div className="space-y-6">
                                                    {/* 차량 정보 (TB_BID_REQUEST 단일 레코드) */}
                                                    <div className="flex items-start gap-4">
                                                        <div className="bg-surface-container-high p-3 rounded-xl">
                                                            <span className="material-symbols-outlined text-primary">airport_shuttle</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-slate-500 font-bold uppercase">차량 유형</p>
                                                            <p className="text-lg font-bold text-on-surface">
                                                                {data?.busType || '-'}
                                                                {data?.busCnt > 1 ? ` × ${data.busCnt}대` : ''}
                                                            </p>
                                                            {data?.calcBusCnt && data.calcBusCnt !== data.busCnt && (
                                                                <p className="text-xs text-slate-400 mt-0.5">계산된 필요 대수: {data.calcBusCnt}대</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* 경유지 (TB_BID_WAYPOINT) */}
                                                    {data?.waypoints?.length > 0 && (
                                                        <div className="flex items-start gap-4">
                                                            <div className="bg-surface-container-high p-3 rounded-xl">
                                                                <span className="material-symbols-outlined text-primary">alt_route</span>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-slate-500 font-bold uppercase">경유지</p>
                                                                {[...data.waypoints]
                                                                    .sort((a, b) => a.sortOrder - b.sortOrder)
                                                                    .map((v, i) => (
                                                                        <p key={i} className="text-sm font-semibold text-on-surface">
                                                                            {v.sortOrder}. {v.waypointAddr}
                                                                            {v.durationFromPrev > 0 ? ` (${v.durationFromPrev}분)` : ''}
                                                                            {v.distFromPrev > 0 ? ` — ${v.distFromPrev}km` : ''}
                                                                        </p>
                                                                    ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 운행 정보 */}
                                                    {(data?.totalDistanceKm > 0 || data?.totalDurationMin > 0) && (
                                                        <div className="flex items-start gap-4">
                                                            <div className="bg-surface-container-high p-3 rounded-xl">
                                                                <span className="material-symbols-outlined text-secondary">distance</span>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-slate-500 font-bold uppercase">운행 정보</p>
                                                                <p className="text-sm font-semibold text-on-surface">
                                                                    총 {data.totalDistanceKm}km
                                                                    {data.totalDurationMin > 0 ? ` / 약 ${Math.floor(data.totalDurationMin / 60)}시간 ${data.totalDurationMin % 60}분` : ''}
                                                                </p>
                                                                {data.restAreaCnt > 0 && (
                                                                    <p className="text-xs text-slate-400">휴게소 {data.restAreaCnt}곳</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </section>

                                        {/* 입찰 수정하기 */}
                                        <section className="bg-surface-container-lowest p-10 rounded-2xl shadow-[0_40px_60px_-15px_rgba(0,104,95,0.04)]">
                                            <div className="flex items-center justify-between mb-8">
                                                <h2
                                                    className="text-2xl font-extrabold tracking-tight"
                                                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                                >
                                                    입찰 수정하기
                                                </h2>
                                                {/* 예약 상태 배지 */}
                                                <span className={`px-4 py-2 rounded-full text-sm font-bold ${RES_STAT_COLOR[resStat] || 'text-slate-500 bg-slate-100'}`}>
                                                    {RES_STAT_LABEL[resStat] || resStat}
                                                </span>
                                            </div>

                                            {/* REQ가 아닐 때 수정 불가 안내 */}
                                            {resStat !== 'REQ' && (
                                                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                                                    <span className="material-symbols-outlined text-amber-500">lock</span>
                                                    <p className="text-sm font-semibold text-amber-700">
                                                        현재 예약 상태({RES_STAT_LABEL[resStat] || resStat})에서는 입찰가를 수정할 수 없습니다.
                                                        요청(REQ) 상태일 때만 수정 가능합니다.
                                                    </p>
                                                </div>
                                            )}

                                            <div className="space-y-10">

                                                {/* 최종 입찰 가격 */}
                                                <div className="relative">
                                                    <label className="block text-sm font-bold text-slate-500 mb-3 ml-2">최종 입찰 가격 (총합)</label>
                                                    <div className="relative group">
                                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-on-surface-variant group-focus-within:text-primary transition-colors">₩</span>
                                                        <input
                                                            className={`w-full border-none rounded-2xl py-6 pl-14 pr-10 text-3xl font-black text-on-surface focus:ring-4 focus:ring-primary-container/10 transition-all placeholder:text-slate-300 ${resStat !== 'REQ' ? 'bg-slate-100 cursor-not-allowed text-slate-400' : 'bg-surface-container-high'}`}
                                                            type="text"
                                                            value={bidPrice}
                                                            onChange={(e) => {
                                                                if (resStat !== 'REQ') return;
                                                                const raw = e.target.value.replace(/[^0-9]/g, '');
                                                                setBidPrice(raw === '' ? '' : Number(raw).toLocaleString('ko-KR'));
                                                            }}
                                                            placeholder="0"
                                                            readOnly={resStat !== 'REQ'}
                                                        />
                                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 bg-surface-container-highest px-3 py-1 rounded-lg text-xs font-bold text-slate-500">VAT 포함</div>
                                                    </div>
                                                    {resStat === 'REQ' && (
                                                        <div className="mt-4 flex gap-2">
                                                            <button type="button" onClick={() => adjustBidPrice(-50000)} className="px-4 py-2 bg-surface-container text-xs font-bold rounded-full hover:bg-slate-200 transition-colors">-₩50,000</button>
                                                            <button type="button" onClick={() => adjustBidPrice(-10000)} className="px-4 py-2 bg-surface-container text-xs font-bold rounded-full hover:bg-slate-200 transition-colors">-₩10,000</button>
                                                            <button type="button" onClick={() => adjustBidPrice(10000)}  className="px-4 py-2 bg-surface-container text-xs font-bold rounded-full hover:bg-slate-200 transition-colors">+₩10,000</button>
                                                            <button type="button" onClick={() => adjustBidPrice(50000)}  className="px-4 py-2 bg-surface-container text-xs font-bold rounded-full hover:bg-slate-200 transition-colors">+₩50,000</button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 수정 결과 메시지 */}
                                                {updateError && (
                                                    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                                                        <span className="material-symbols-outlined text-error">error</span>
                                                        <p className="text-sm font-semibold text-error">{updateError}</p>
                                                    </div>
                                                )}
                                                {updateSuccess && (
                                                    <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                                                        <span className="material-symbols-outlined text-green-600">check_circle</span>
                                                        <p className="text-sm font-semibold text-green-700">입찰가가 성공적으로 수정되었습니다.</p>
                                                    </div>
                                                )}

                                                {/* 입찰 취소 성공 메시지 */}
                                                {cancelSuccess && (
                                                    <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                                                        <span className="material-symbols-outlined text-rose-500">cancel</span>
                                                        <p className="text-sm font-semibold text-rose-700">입찰이 취소되었습니다.</p>
                                                    </div>
                                                )}

                                                {/* 액션 버튼 */}
                                                <div className="pt-10 flex gap-4">
                                                    <button
                                                        type="button"
                                                        onClick={handleBidUpdate}
                                                        disabled={updating || resStat !== 'REQ'}
                                                        className={`flex-1 py-5 rounded-full text-lg font-black shadow-xl transition-all ${resStat !== 'REQ' ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-primary to-primary-container text-white shadow-primary/20 hover:scale-[1.02] active:scale-95'}`}
                                                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                                    >
                                                        {updating ? '저장 중...' : '입찰 정보 수정 완료'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleBidCancel}
                                                        disabled={cancelling}
                                                        className="px-10 py-5 bg-error/5 text-error border border-error/20 rounded-full font-bold hover:bg-error/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {cancelling ? '처리 중...' : '입찰 취소'}
                                                    </button>
                                                </div>
                                            </div>
                                        </section>
                                    </div>

                                    {/* ── 오른쪽 컬럼 (col-span-4) ── */}
                                    <div className="lg:col-span-4 space-y-8">

                                        {/* 가격 가이드 */}
                                        <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-[0_40px_60px_-15px_rgba(0,104,95,0.04)] border border-outline-variant/10">
                                            <div className="flex items-center justify-between mb-6">
                                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">가격 가이드</h3>
                                                {bidSeq > 0 && (
                                                    <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                                                        {bidSeq}회차 입찰
                                                    </span>
                                                )}
                                            </div>
                                            <div className="space-y-6">
                                                <div>
                                                    <div className="flex justify-between items-end mb-2">
                                                        <span className="text-sm font-bold text-slate-500">여행자 제시 금액</span>
                                                        <span className="text-lg font-bold text-on-surface">
                                                            {data?.estTotalServicePrice > 0 ? `₩${Number(data.estTotalServicePrice).toLocaleString()}` : '—'}
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                                                        <div className="h-full bg-primary" style={{ width: '75%' }}></div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex justify-between items-end mb-2">
                                                        <span className="text-sm font-bold text-primary">나의 현재 입찰가</span>
                                                        <span className="text-2xl font-black text-primary">
                                                            {bidPrice ? `₩${bidPrice}` : '—'}
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                                                        <div className="h-full bg-primary" style={{ width: '45%' }}></div>
                                                    </div>
                                                </div>
                                                {prevBidPrice > 0 && (
                                                    <div className="pt-4 border-t border-slate-100">
                                                        <div className="flex justify-between items-end">
                                                            <span className="text-xs font-semibold text-slate-400">이전 입찰가</span>
                                                            <span className="text-base font-bold text-slate-400 line-through">
                                                                ₩{Number(prevBidPrice).toLocaleString('ko-KR')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-8 p-4 bg-surface-container-high rounded-xl">
                                                <p className="text-sm text-slate-600 leading-relaxed">
                                                    {data?.estTotalServicePrice > 0
                                                        ? `이 코스의 여행자 제시 금액은 ₩${Number(data.estTotalServicePrice).toLocaleString()} 입니다. 이를 참고하여 입찰가를 설정하세요.`
                                                        : '아직 가격 가이드 정보가 없습니다.'}
                                                </p>
                                            </div>
                                        </section>

                                    </div>
                                </div>
                            </main>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default TravelerQuoteRequestDetails;
