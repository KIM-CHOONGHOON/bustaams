import React, { useState, useEffect, useCallback } from 'react';

/**
 * 여행자 견적 요청 상세 (TravelerQuoteRequestDetails)
 * - ListOfTravelerQuotations 모달에서 항목 클릭 시 requestId(bigint)를 받아 호출
 * - GET /api/traveler-quote-request-details?requestId=
 * - 데이터 출처: TB_BID_REQUEST (마스터) + TB_BID_WAYPOINT (경유지)
 * - UI 기준: Downloads/bustaams_web/입찰상세및수정_기사/BidDetailEdit.html
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');

const TravelerQuoteRequestDetails = ({ close, requestId, currentUser }) => {
    const [loading, setLoading]     = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [data, setData]           = useState(null);

    // 입찰 가격 입력 상태
    const [bidPrice, setBidPrice]               = useState('');
    const [accommodation, setAccommodation]     = useState('');
    const [toll, setToll]                       = useState('');
    const [fuel, setFuel]                       = useState('');

    const fetchData = useCallback(async () => {
        if (!requestId) return;
        setLoading(true);
        setLoadError(null);
        try {
            const res  = await fetch(`${API_BASE}/api/traveler-quote-request-details?requestId=${encodeURIComponent(requestId)}`);
            const text = await res.text();
            const trimmed = text.trimStart();
            if (trimmed.startsWith('<') || trimmed.startsWith('<!')) {
                throw new Error('API가 JSON 대신 HTML을 반환했습니다. 백엔드 서버 상태를 확인하세요.');
            }
            if (!res.ok) throw new Error(JSON.parse(text)?.error || `${res.status}`);
            const json = JSON.parse(text);
            setData(json);
            // 비용 필드 초기값 설정
            if (json.lodgingPrice)  setAccommodation(Number(json.lodgingPrice).toLocaleString('ko-KR'));
            if (json.totalTollFee)  setToll(Number(json.totalTollFee).toLocaleString('ko-KR'));
            if (json.estFuelCost)   setFuel(Number(json.estFuelCost).toLocaleString('ko-KR'));
        } catch (e) {
            setLoadError(e.message);
        } finally {
            setLoading(false);
        }
    }, [requestId]);

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
                                            <span className="text-slate-400 text-sm">
                                                요청 ID: #{data?.requestId || 'N/A'}
                                            </span>
                                            {data?.roundTripYn === 'Y' && (
                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">왕복</span>
                                            )}
                                        </div>
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
                                    <div className="flex gap-4">
                                        <button type="button" className="px-6 py-3 border border-outline-variant rounded-full text-slate-600 hover:bg-surface-container-low transition-colors font-semibold">신고하기</button>
                                        <button type="button" className="px-6 py-3 border border-outline-variant rounded-full text-slate-600 hover:bg-surface-container-low transition-colors font-semibold">공유</button>
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
                                                <div className="flex items-center gap-2 text-primary bg-primary/5 px-4 py-2 rounded-full">
                                                    <span className="material-symbols-outlined text-sm">trending_down</span>
                                                    <span className="text-sm font-bold">평균가 대비 5% 저렴</span>
                                                </div>
                                            </div>
                                            <div className="space-y-10">

                                                {/* 최종 입찰 가격 */}
                                                <div className="relative">
                                                    <label className="block text-sm font-bold text-slate-500 mb-3 ml-2">최종 입찰 가격 (총합)</label>
                                                    <div className="relative group">
                                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-on-surface-variant group-focus-within:text-primary transition-colors">₩</span>
                                                        <input
                                                            className="w-full bg-surface-container-high border-none rounded-2xl py-6 pl-14 pr-10 text-3xl font-black text-on-surface focus:ring-4 focus:ring-primary-container/10 transition-all placeholder:text-slate-300"
                                                            type="text"
                                                            value={bidPrice}
                                                            onChange={(e) => setBidPrice(e.target.value)}
                                                            placeholder="0"
                                                        />
                                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 bg-surface-container-highest px-3 py-1 rounded-lg text-xs font-bold text-slate-500">VAT 포함</div>
                                                    </div>
                                                    <div className="mt-4 flex gap-2">
                                                        <button type="button" onClick={() => adjustBidPrice(-50000)} className="px-4 py-2 bg-surface-container text-xs font-bold rounded-full hover:bg-slate-200 transition-colors">-₩50,000</button>
                                                        <button type="button" onClick={() => adjustBidPrice(-10000)} className="px-4 py-2 bg-surface-container text-xs font-bold rounded-full hover:bg-slate-200 transition-colors">-₩10,000</button>
                                                        <button type="button" onClick={() => adjustBidPrice(10000)}  className="px-4 py-2 bg-surface-container text-xs font-bold rounded-full hover:bg-slate-200 transition-colors">+₩10,000</button>
                                                        <button type="button" onClick={() => adjustBidPrice(50000)}  className="px-4 py-2 bg-surface-container text-xs font-bold rounded-full hover:bg-slate-200 transition-colors">+₩50,000</button>
                                                    </div>
                                                </div>

                                                {/* 상세 비용 산출 */}
                                                <div className="pt-10 border-t border-slate-100">
                                                    <h3 className="text-lg font-bold mb-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>상세 비용 산출</h3>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                        <div className="bg-surface-container-low p-5 rounded-xl">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <span className="material-symbols-outlined text-primary text-xl">hotel</span>
                                                                <span className="text-xs font-bold text-slate-400">숙박비 (LODGING_PRICE)</span>
                                                            </div>
                                                            <input className="w-full bg-transparent border-none p-0 text-xl font-bold text-on-surface focus:ring-0" type="text" value={accommodation} onChange={e => setAccommodation(e.target.value)} placeholder="0" />
                                                        </div>
                                                        <div className="bg-surface-container-low p-5 rounded-xl">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <span className="material-symbols-outlined text-primary text-xl">toll</span>
                                                                <span className="text-xs font-bold text-slate-400">통행료 (TOTAL_TOLL_FEE)</span>
                                                            </div>
                                                            <input className="w-full bg-transparent border-none p-0 text-xl font-bold text-on-surface focus:ring-0" type="text" value={toll} onChange={e => setToll(e.target.value)} placeholder="0" />
                                                        </div>
                                                        <div className="bg-surface-container-low p-5 rounded-xl">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <span className="material-symbols-outlined text-primary text-xl">local_gas_station</span>
                                                                <span className="text-xs font-bold text-slate-400">유류비 (EST_FUEL_COST)</span>
                                                            </div>
                                                            <input className="w-full bg-transparent border-none p-0 text-xl font-bold text-on-surface focus:ring-0" type="text" value={fuel} onChange={e => setFuel(e.target.value)} placeholder="0" />
                                                        </div>
                                                    </div>
                                                    <div className="mt-6 p-4 bg-tertiary-fixed/30 rounded-xl flex items-center gap-3">
                                                        <span className="material-symbols-outlined text-tertiary">info</span>
                                                        <p className="text-xs text-tertiary-container font-semibold">각 항목별 비용은 입찰 승인 후 영수증 증빙을 통해 정산될 수 있습니다.</p>
                                                    </div>
                                                </div>

                                                {/* 액션 버튼 */}
                                                <div className="pt-10 flex gap-4">
                                                    <button
                                                        type="button"
                                                        className="flex-1 bg-gradient-to-r from-primary to-primary-container text-white py-5 rounded-full text-lg font-black shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95"
                                                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                                    >
                                                        입찰 정보 수정 완료
                                                    </button>
                                                    <button type="button" className="px-10 py-5 bg-error/5 text-error border border-error/20 rounded-full font-bold hover:bg-error/10 transition-colors">입찰 취소</button>
                                                </div>
                                            </div>
                                        </section>
                                    </div>

                                    {/* ── 오른쪽 컬럼 (col-span-4) ── */}
                                    <div className="lg:col-span-4 space-y-8">

                                        {/* 가격 가이드 */}
                                        <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-[0_40px_60px_-15px_rgba(0,104,95,0.04)] border border-outline-variant/10">
                                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">가격 가이드</h3>
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
                                            </div>
                                            <div className="mt-8 p-4 bg-surface-container-high rounded-xl">
                                                <p className="text-sm text-slate-600 leading-relaxed">
                                                    {data?.estTotalServicePrice > 0
                                                        ? `이 코스의 여행자 제시 금액은 ₩${Number(data.estTotalServicePrice).toLocaleString()} 입니다. 이를 참고하여 입찰가를 설정하세요.`
                                                        : '아직 가격 가이드 정보가 없습니다.'}
                                                </p>
                                            </div>
                                        </section>

                                        {/* 경로 지도 미리보기 */}
                                        <section className="bg-surface-container-lowest rounded-2xl shadow-[0_40px_60px_-15px_rgba(0,104,95,0.04)] overflow-hidden relative group">
                                            <div className="h-80 w-full relative">
                                                <img
                                                    className="w-full h-full object-cover grayscale opacity-50 transition-opacity group-hover:opacity-80"
                                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuC7nSHvY1lSyDBF8v_-PZi16pM7QI8qsqQP_LZvvjJOSTL81davfLlQt2yWMVW0zpSBOvpBWS7Cw0vtX8ANUBGm8n5NA8YZdU1VZkNC6lLpxMcofZ6qXIdL3-WPbWKHzV7OsuyrkmRTPXjIO7c2jx5Fw4ClG-rzPYbu5CE_lUFoNylnXP2BFpyzo9NrCHlAk6qPvEjpc39jhh39uYbD6IJ7kmb01EQJ_EbF_Ud9bZ9ggyl93f-ZN4BoJy9fP2ESFpyqZ1UrNYX13GQ"
                                                    alt="경로 미리보기"
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="p-6 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl text-center border border-white/50">
                                                        <span className="material-symbols-outlined text-4xl text-primary mb-2">location_on</span>
                                                        <h4 className="font-bold text-on-surface" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>경로 미리보기</h4>
                                                        <p className="text-xs text-slate-500 mt-1">{data?.startAddr || ''} 경로</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-6">
                                                <h3 className="font-bold text-on-surface mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>총 주행 예상 거리</h3>
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-slate-400">distance</span>
                                                        <span className="text-lg font-black">
                                                            {data?.totalDistanceKm > 0 ? `${data.totalDistanceKm}km` : '—'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-slate-400">schedule</span>
                                                        <span className="text-lg font-black">
                                                            {data?.totalDurationMin > 0
                                                                ? `${Math.floor(data.totalDurationMin / 60)}시간 ${data.totalDurationMin % 60}분`
                                                                : '—'}
                                                        </span>
                                                    </div>
                                                </div>
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
