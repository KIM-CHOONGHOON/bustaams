import React, { useState, useEffect, useMemo, useCallback } from 'react';
import CommonLiveChat from '../CommonLiveChat/CommonLiveChat';
import BillingSubscription from '../BillingSubscription/BillingSubscription';
import BusOperationCompletionList from '../BusOperationCompletionList/BusOperationCompletionList';
import DriversListOfBids from '../DriversListOfBids/DriversListOfBids';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';

const SECTION_TITLE_CLASS = 'text-xl font-bold text-on-surface ml-2';

function pad2(n) {
  return String(n).padStart(2, '0');
}

function fmtYmdHm(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** 여행 상세 경유 목록 — 명세 2.3.5.4 라벨 */
const VIA_DETAIL_LABEL = {
  START_NODE: '(출발지)',
  START_WAY: '(출발 경유지)',
  ROUND_TRIP: '(목적지)',
  END_WAY: '(도착 경유지)',
  END_NODE: '(도착지)',
};

/** 도착일(YYYYMMDD)별 이벤트 묶음 */
function eventsByEndYmd(items) {
  const map = new Map();
  for (const it of items || []) {
    const k = it.endYmd;
    if (!k) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(it);
  }
  return map;
}

function MonthMarker({ dataStat }) {
  const s = String(dataStat || '').toUpperCase();
  if (s === 'BIDDING') {
    return (
      <span
        className="inline-block w-0 h-0 border-l-[5px] border-r-[5px] border-b-[8px] border-l-transparent border-r-transparent border-b-[#b45309]"
        title="청약"
        aria-hidden
      />
    );
  }
  if (s === 'CONFIRM') {
    return (
      <span className="inline-block w-2 h-2 rounded-[1px] bg-[#1e40af]" title="확정" aria-hidden />
    );
  }
  if (s === 'DONE') {
    return <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#991b1b]" title="종료" aria-hidden />;
  }
  return null;
}

/** 여행 상세 헤더 — 명세 2.3.5.1~3: 이모지 + 상태문구 + 공백 + (TRIP_TITLE) */
function TripStatusHeader({ dataStat, tripTitle }) {
  const titleRaw = tripTitle != null ? String(tripTitle).trim() : '';
  const titleParen = titleRaw ? `(${titleRaw})` : '()';
  const s = String(dataStat || '').toUpperCase();
  const baseCls = 'flex flex-wrap items-baseline gap-x-1 gap-y-0.5 text-sm font-bold leading-snug break-words';
  if (s === 'BIDDING') {
    return (
      <div className={`${baseCls} text-[#92400e]`}>
        <span aria-hidden="true">🙏🏻</span>
        <span>청약등록</span>
        <span className="font-semibold">{titleParen}</span>
      </div>
    );
  }
  if (s === 'CONFIRM') {
    return (
      <div className={`${baseCls} text-[#1e3a8a]`}>
        <span aria-hidden="true">👌🏻</span>
        <span>청약확정</span>
        <span className="font-semibold">{titleParen}</span>
      </div>
    );
  }
  if (s === 'DONE') {
    return (
      <div className={`${baseCls} text-[#991b1b]`}>
        <span aria-hidden="true">🚌</span>
        <span>여행종료</span>
        <span className="font-semibold">{titleParen}</span>
      </div>
    );
  }
  return <div className="text-xs text-slate-500">상태 정보 없음</div>;
}

function buildMonthGridCells(viewYear, viewMonth) {
  const first = new Date(viewYear, viewMonth - 1, 1);
  const last = new Date(viewYear, viewMonth, 0);
  const pad = first.getDay();
  const daysInMonth = last.getDate();
  const cells = [];
  for (let i = 0; i < pad; i += 1) {
    cells.push({ kind: 'pad', key: `pad-${i}` });
  }
  for (let d = 1; d <= daysInMonth; d += 1) {
    const ymd = `${viewYear}${pad2(viewMonth)}${pad2(d)}`;
    const dow = new Date(viewYear, viewMonth - 1, d).getDay();
    cells.push({ kind: 'day', day: d, ymd, dow, key: ymd });
  }
  return cells;
}

/** 좌우 동일 폭(50%)·동일 세로 — 컴팩트(기존 대비 약 1/2 높이 느낌) */
const TOP_PAIR_HEIGHT_CLASS = 'lg:h-72';

/**
 * 상단: 여행 일정(캘린더) | 여행 상세 — 50:50, 동일 세로
 */
function DashboardTopSection({
  calendarItems,
  viewYear,
  viewMonth,
  onPrevMonth,
  onNextMonth,
  onSelectTrip,
  sameDayTrips = [],
  tripDetail,
  detailLoading,
}) {
  const byYmd = useMemo(() => eventsByEndYmd(calendarItems), [calendarItems]);
  const gridCells = useMemo(
    () => buildMonthGridCells(viewYear, viewMonth),
    [viewYear, viewMonth]
  );
  const sortedViaPoints = useMemo(() => {
    const list = tripDetail?.viaPoints;
    if (!Array.isArray(list)) return [];
    return [...list].sort((a, b) => Number(a.viaSeq) - Number(b.viaSeq));
  }, [tripDetail?.viaPoints]);
  const weekLetters = [
    { k: 's0', l: 'S' },
    { k: 'm', l: 'M' },
    { k: 't0', l: 'T' },
    { k: 'w', l: 'W' },
    { k: 't1', l: 'T' },
    { k: 'f', l: 'F' },
    { k: 's1', l: 'S' },
  ];

  return (
    <section className="-mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 lg:items-stretch">
      <div className={`min-w-0 flex flex-col gap-2 ${TOP_PAIR_HEIGHT_CLASS}`}>
        <div className="shrink-0 flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-base font-bold text-on-surface">여행 일정</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrevMonth}
              className="p-1.5 rounded-md bg-white border border-neutral-300 hover:bg-neutral-50"
              aria-label="이전 달"
            >
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>
            <span className="text-xs font-bold tabular-nums min-w-[6.5rem] text-center text-on-surface">
              {viewYear}년 {viewMonth}월
            </span>
            <button
              type="button"
              onClick={onNextMonth}
              className="p-1.5 rounded-md bg-white border border-neutral-300 hover:bg-neutral-50"
              aria-label="다음 달"
            >
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 flex flex-col rounded overflow-hidden border border-neutral-300 bg-white shadow-sm">
          <div className="grid grid-cols-7 bg-black text-white shrink-0">
            {weekLetters.map((w) => (
              <div
                key={w.k}
                className="py-2 text-center text-xs sm:text-sm font-bold tracking-wide font-sans"
              >
                {w.l}
              </div>
            ))}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-7 content-start bg-white">
            {gridCells.map((c) => {
              if (c.kind === 'pad') {
                return <div key={c.key} className="min-h-[1.75rem] sm:min-h-8 bg-white" />;
              }
              const evs = byYmd.get(c.ymd) || [];
              const hasTrip = evs.length > 0;
              const isWeekend = c.dow === 0 || c.dow === 6;
              const numCls = isWeekend ? 'text-[#b45309]' : 'text-black';
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => {
                    if (!hasTrip) {
                      onSelectTrip(null);
                      return;
                    }
                    onSelectTrip({ list: evs, pick: evs[0] });
                  }}
                  className="min-h-[1.75rem] sm:min-h-8 flex flex-col items-center justify-start pt-0.5 pb-0.5 hover:bg-neutral-50/80 transition-colors bg-white"
                >
                  <span className={`text-xs sm:text-sm font-bold tabular-nums leading-none ${numCls}`}>
                    {c.day}
                  </span>
                  {hasTrip && (
                    <div className="flex flex-wrap gap-px justify-center items-center max-w-full mt-0.5 scale-90 origin-top">
                      {evs.map((e, i) => (
                        <MonthMarker key={`${e.reqId}-${e.resId}-${e.reqBusSeq}-${i}`} dataStat={e.dataStat} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`min-w-0 flex flex-col gap-2 ${TOP_PAIR_HEIGHT_CLASS}`}>
        <h3 className="shrink-0 text-base font-bold text-on-surface">여행 상세</h3>
        <div className="flex-1 min-h-0 flex flex-col bg-white rounded-xl shadow-[0_20px_32px_-12px_rgba(0,104,95,0.06)] border-t border-r border-b border-slate-100 border-l-[4px] border-l-amber-900 overflow-hidden">
          {detailLoading && (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm gap-2">
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              불러오는 중…
            </div>
          )}
          {!detailLoading && !tripDetail && (
            <div className="flex-1 flex items-center justify-center text-center text-xs text-slate-400 px-4">
              캘린더에서 일정이 있는 날짜를 선택하세요.
            </div>
          )}
          {!detailLoading && tripDetail && (
            <>
              <div className="shrink-0 p-3 border-b border-slate-100 space-y-2">
                <TripStatusHeader dataStat={tripDetail.dataStat} tripTitle={tripDetail.tripTitle} />
                {sameDayTrips.length > 1 && (
                  <div className="flex flex-wrap gap-1">
                    {sameDayTrips.map((e, i) => {
                      const active =
                        String(tripDetail.reqId) === String(e.reqId) &&
                        String(tripDetail.resId) === String(e.resId) &&
                        Number(tripDetail.reqBusSeq) === Number(e.reqBusSeq);
                      return (
                        <button
                          key={`${e.reqId}-${e.resId}-${e.reqBusSeq}-${i}`}
                          type="button"
                          onClick={() =>
                            onSelectTrip({ list: sameDayTrips, pick: e })
                          }
                          className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                            active
                              ? 'bg-primary text-white border-primary'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {e.tripTitle?.trim()?.slice(0, 12) || `${i + 1}건`}
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="text-xs font-semibold text-on-surface leading-snug break-words pt-0.5">
                  {fmtYmdHm(tripDetail.startDt)}
                  {' -> '}
                  {fmtYmdHm(tripDetail.endDt)}
                </p>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-2">
                {sortedViaPoints.map((v) => {
                  const label = VIA_DETAIL_LABEL[v.viaType] || '(경유)';
                  const addr = (v.viaAddr || '').trim() || '—';
                  return (
                    <p
                      key={`${v.viaSeq}-${v.viaType}`}
                      className="text-xs text-slate-800 leading-snug break-words"
                    >
                      {label} {addr}
                    </p>
                  );
                })}
                {sortedViaPoints.length === 0 && (
                  <p className="text-xs text-slate-400">경유지 정보가 없습니다.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * 등록/변경 메뉴 — md 이상 5열 그리드(1·2행 자동 줄바꿈)
 */
function QuickMenu({
  onProfileSetup,
  onBillingSubscription,
  onBusInfoSetup,
  onQuotationList,
  onDriversListOfBids,
  onLiveChat,
  onTripCompletionList,
  onCancellationList,
  onSettlement,
  tradeRestrictYn,
}) {
  const menuBtn =
    'flex flex-col items-center justify-center gap-2 md:gap-3 p-4 md:p-5 bg-surface-container-lowest rounded-2xl hover:bg-teal-50/50 transition-all group shadow-sm';
  const iconBox =
    'w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-colors bg-slate-100 group-hover:bg-primary group-hover:text-white shrink-0';
  const labelSm = 'text-[11px] md:text-xs font-bold text-slate-600 text-center leading-tight px-0.5';

  return (
    <section className="space-y-6">
      {/* [추가] 거래 제한 안내 배너 */}
      {tradeRestrictYn === 'Y' && (
        <div className="mb-8 bg-red-50 border-2 border-red-200 p-6 rounded-2xl flex items-center gap-6 animate-pulse">
          <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center shrink-0 shadow-lg">
            <span className="material-symbols-outlined text-2xl">block</span>
          </div>
          <div>
            <h4 className="text-red-900 font-bold text-lg">거래 제한 안내</h4>
            <p className="text-red-700/80 text-sm font-medium">취소 규정 위반으로 인해 현재 서비스 이용이 제한되었습니다. 고객센터에 문의해 주세요.</p>
          </div>
        </div>
      )}

      <h3 className={SECTION_TITLE_CLASS}>등록/변경 메뉴</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
        {[
          { label: '기사 정보 관리', icon: 'person', action: onProfileSetup, id: 'profile' },
          { label: '버스 정보 관리', icon: 'directions_bus', action: onBusInfoSetup, id: 'bus' },
          { label: '카드 및 월회비', icon: 'credit_card', action: onBillingSubscription, id: 'billing' },
          { label: '여행 요청 목록 조회', icon: 'request_quote', action: onQuotationList, id: 'quote', restrict: true },
          { label: '기사님 청약/여행 목록', icon: 'format_list_bulleted', action: onDriversListOfBids, id: 'bid' },
          { label: '여행자와 대화', icon: 'forum', action: onLiveChat, id: 'chat' },
          { label: '여행 완료 목록', icon: 'task_alt', action: onTripCompletionList, id: 'done' },
          { label: '청약 취소 목록 조회', icon: 'cancel', action: onCancellationList, id: 'cancel' },
          { label: '정산 관리', icon: 'account_balance_wallet', action: onSettlement, id: 'settle' },
        ].map((item) => {
          const isDisabled = item.restrict && tradeRestrictYn === 'Y';
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (isDisabled) {
                  alert('안내: 현재 서비스 이용이 제한되어 입찰 참여가 불가능합니다.');
                  return;
                }
                item.action?.();
              }}
              className={`${menuBtn} ${isDisabled ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
            >
              <div className={`${iconBox} ${isDisabled ? 'bg-gray-200' : ''}`}>
                <span className={`material-symbols-outlined text-[22px] md:text-[24px] ${isDisabled ? 'text-gray-400' : ''}`}>{item.icon}</span>
              </div>
              <span className={`${labelSm} ${isDisabled ? 'text-gray-400' : ''}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

const DriverDashboard = ({
  currentUser,
  onProfileSetup,
  onBusInfoSetup,
  onQuotationList,
  onDriversListOfBids,
}) => {
  const driverCustId = currentUser?.custId || currentUser?.userId || '';
  const tradeRestrictYn = currentUser?.tradeRestrictYn || 'N';
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [calendarItems, setCalendarItems] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [sameDayTrips, setSameDayTrips] = useState([]);
  const [tripDetail, setTripDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCommonLiveChat, setShowCommonLiveChat] = useState(false);
  const [showBillingSubscription, setShowBillingSubscription] = useState(false);
  const [showTripCompletionList, setShowTripCompletionList] = useState(false);
  const [showDriversCancellationList, setShowDriversCancellationList] = useState(false);

  const fetchCalendar = useCallback(async () => {
    if (!driverCustId) {
      setCalendarItems([]);
      return;
    }
    const enc = encodeURIComponent(driverCustId);
    try {
      const r = await fetch(
        `${API_BASE}/api/driver/schedule/calendar?custId=${enc}&year=${viewYear}&month=${viewMonth}`
      );
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setCalendarItems([]);
        return;
      }
      setCalendarItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      console.error(e);
      setCalendarItems([]);
    }
  }, [driverCustId, viewYear, viewMonth]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const fetchTripDetail = useCallback(
    async ({ reqId, resId, reqBusSeq }) => {
      if (!driverCustId || !reqId || !resId || reqBusSeq == null) {
        setTripDetail(null);
        return;
      }
      setDetailLoading(true);
      const enc = encodeURIComponent(driverCustId);
      try {
        const r = await fetch(
          `${API_BASE}/api/driver/trip-detail?custId=${enc}&reqId=${encodeURIComponent(
            reqId
          )}&resId=${encodeURIComponent(String(resId))}&reqBusSeq=${encodeURIComponent(String(reqBusSeq))}`
        );
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          setTripDetail(null);
          return;
        }
        setTripDetail(data);
      } catch (e) {
        console.error(e);
        setTripDetail(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [driverCustId]
  );

  useEffect(() => {
    if (!selectedTrip?.reqId) {
      setTripDetail(null);
      return;
    }
    fetchTripDetail({
      reqId: selectedTrip.reqId,
      resId: selectedTrip.resId,
      reqBusSeq: selectedTrip.reqBusSeq,
    });
  }, [selectedTrip, fetchTripDetail]);

  const handleSelectFromCalendar = (payload) => {
    if (!payload) {
      setSelectedTrip(null);
      setSameDayTrips([]);
      return;
    }
    if (payload.list && payload.pick) {
      setSameDayTrips(payload.list);
      const p = payload.pick;
      setSelectedTrip({
        reqId: p.reqId,
        resId: p.resId,
        reqBusSeq: p.reqBusSeq,
      });
      return;
    }
  };

  const onPrevMonth = () => {
    setSelectedTrip(null);
    setSameDayTrips([]);
    if (viewMonth <= 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const onNextMonth = () => {
    setSelectedTrip(null);
    setSameDayTrips([]);
    if (viewMonth >= 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen">
      <main className="min-h-screen relative overflow-x-hidden">
        <div className="px-12 pb-12 pt-8 max-w-7xl mx-auto space-y-12">
          <DashboardTopSection
            calendarItems={calendarItems}
            viewYear={viewYear}
            viewMonth={viewMonth}
            onPrevMonth={onPrevMonth}
            onNextMonth={onNextMonth}
            onSelectTrip={handleSelectFromCalendar}
            sameDayTrips={sameDayTrips}
            tripDetail={tripDetail}
            detailLoading={detailLoading}
          />

          <QuickMenu
            onProfileSetup={onProfileSetup}
            onBillingSubscription={() => setShowBillingSubscription(true)}
            onBusInfoSetup={onBusInfoSetup}
            onQuotationList={onQuotationList}
            onDriversListOfBids={onDriversListOfBids}
            onLiveChat={() => setShowCommonLiveChat(true)}
            onTripCompletionList={() => setShowTripCompletionList(true)}
            onCancellationList={() => setShowDriversCancellationList(true)}
            onSettlement={() => setShowBillingSubscription(true)}
            tradeRestrictYn={tradeRestrictYn}
          />
        </div>
      </main>

      <div className="fixed bottom-8 right-8 z-50">
        <button className="w-16 h-16 bg-gradient-to-br from-secondary to-secondary-container text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform">
          <span className="material-symbols-outlined text-3xl">add</span>
        </button>
      </div>

      <BillingSubscription
        open={showBillingSubscription}
        onClose={() => setShowBillingSubscription(false)}
        driverId={currentUser?.custId || currentUser?.userId}
      />

      <BusOperationCompletionList
        open={showTripCompletionList}
        onClose={() => setShowTripCompletionList(false)}
        driverId={driverCustId}
        driverUuid={driverCustId}
      />

      <DriversListOfBids
        open={showDriversCancellationList}
        onClose={() => setShowDriversCancellationList(false)}
        driverId={driverCustId}
        variant="cancelled"
      />

      <CommonLiveChat
        open={showCommonLiveChat}
        onClose={() => setShowCommonLiveChat(false)}
        driverId={currentUser?.custId || currentUser?.userId}
      />
    </div>
  );
};

export default DriverDashboard;
