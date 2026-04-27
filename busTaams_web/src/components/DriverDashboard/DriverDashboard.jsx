import React, { useState, useEffect, useCallback } from 'react';
import UpcomingTripsModal from '../UpcomingTrips/UpcomingTripsModal';
import LiveChatBusDriver from '../LiveChatBusDriver/LiveChatBusDriver';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';

// ─────────────── DashboardTopSection — 좌: 오늘의 일정 · 우: 총 운임 + 활성 입찰 (`총 운임 비교`·`활성 입찰` 명세) ───────────────
function DashboardTopSection({ stats, scheduleItems, onTravelerQuoteDetail }) {
  const now = new Date();
  const y = stats?.year ?? now.getFullYear();
  const mo = stats?.month ?? now.getMonth() + 1;
  const freightTitle = `${y}년 ${mo}월 총 운임 금액`;
  const currentMonthTotal = Number(stats?.currentMonthTotal ?? 0);
  const diffFromPrevious = Number(stats?.diffFromPrevious ?? 0);
  const gtePrev = stats?.compareTone ? stats.compareTone === 'gte_prev' : diffFromPrevious >= 0;
  const compareClass = gtePrev ? 'text-red-600' : 'text-blue-600';
  const diffLabel =
    diffFromPrevious >= 0
      ? `전월 대비 +₩${diffFromPrevious.toLocaleString('ko-KR')}`
      : `전월 대비 -₩${Math.abs(diffFromPrevious).toLocaleString('ko-KR')}`;
  const trendIcon = diffFromPrevious >= 0 ? 'trending_up' : 'trending_down';

  const bidCount = Number(stats?.bidCount ?? stats?.activeBids ?? 0);
  const bidAmountSum = Number(stats?.bidAmountSum ?? 0);
  const confirmCount = Number(stats?.confirmCount ?? 0);
  const confirmAmountSum = Number(stats?.confirmAmountSum ?? 0);

  return (
    <section className="grid grid-cols-12 gap-8 items-start">
      <div className="col-span-12 lg:col-span-4 min-w-0">
        <TodaySchedule items={scheduleItems} onTravelerQuoteDetail={onTravelerQuoteDetail} />
      </div>
      <div className="col-span-12 lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-[0_40px_60px_-15px_rgba(0,104,95,0.06)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
          <p className="text-sm font-bold text-slate-400 mb-2">{freightTitle}</p>
          <h3 className="text-3xl font-bold text-on-surface">
            ₩{currentMonthTotal.toLocaleString('ko-KR')}
          </h3>
          <div className={`mt-4 flex items-center gap-2 font-bold ${compareClass}`}>
            <span className="material-symbols-outlined">{trendIcon}</span>
            <span>{diffLabel}</span>
          </div>
        </div>
        <div className="bg-primary text-white rounded-2xl p-8 shadow-[0_40px_60px_-15px_rgba(0,104,95,0.06)] flex flex-col min-h-[280px]">
          <div className="flex justify-between items-start mb-6">
            <p className="text-white/60 text-sm font-bold tracking-widest">활성 입찰</p>
            <span className="material-symbols-outlined text-4xl opacity-20 shrink-0">gavel</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 flex-1 text-sm">
            <div className="space-y-1">
              <p className="text-white/70 font-medium">입찰 건수</p>
              <p className="text-2xl font-bold tabular-nums">{bidCount.toLocaleString('ko-KR')}건</p>
            </div>
            <div className="space-y-1">
              <p className="text-white/70 font-medium">입찰 금액</p>
              <p className="text-2xl font-bold tabular-nums">₩{bidAmountSum.toLocaleString('ko-KR')}</p>
            </div>
            <div className="space-y-1">
              <p className="text-white/70 font-medium">운행 예정</p>
              <p className="text-2xl font-bold tabular-nums">{confirmCount.toLocaleString('ko-KR')}건</p>
            </div>
            <div className="space-y-1">
              <p className="text-white/70 font-medium">운행 예정 금액</p>
              <p className="text-2xl font-bold tabular-nums">₩{confirmAmountSum.toLocaleString('ko-KR')}</p>
            </div>
          </div>
          <div className="h-1 w-full bg-white/20 rounded-full mt-6 shrink-0" aria-hidden />
        </div>
      </div>
    </section>
  );
}

// ─────────────── QuickMenu ───────────────
/** 바로가기: `기사정보등록_기사 화면.md` — 「기사 정보 관리」→ DriverProfileSetup (`driverView === 'profileSetup'`) */
function QuickMenu({ onProfileSetup, onBusInfoSetup, onQuotationList, onUpcomingTrips, onLiveChat }) {
  const menus = [
    { key: 'driverProfile', icon: 'person',                  label: '기사 정보 관리', accent: false },
    { key: 'busInfo',       icon: 'directions_bus',          label: '버스 정보 관리', accent: false },
    { key: 'quotation',     icon: 'request_quote',           label: '여행자 견적 목록 조회', accent: false },
    { key: 'upcomingTrips', icon: 'event_note',              label: '운행예정목록 조회', accent: true  },
    { key: null,            icon: 'task_alt',                label: '완료 리스트', accent: false },
    { key: null,            icon: 'cancel',                  label: '거절 리스트', accent: false },
    { key: 'liveChat',      icon: 'forum',                   label: '실시간 채팅', accent: false },
    { key: null,            icon: 'account_balance_wallet',  label: '정산 관리',  accent: false },
  ];

  const handleQuickAction = (key) => {
    if (key === 'driverProfile') {
      onProfileSetup?.();
      return;
    }
    if (key === 'busInfo') {
      onBusInfoSetup?.();
      return;
    }
    if (key === 'quotation') {
      onQuotationList?.();
      return;
    }
    if (key === 'upcomingTrips') {
      onUpcomingTrips?.();
      return;
    }
    if (key === 'liveChat') {
      onLiveChat?.();
      return;
    }
  };

  return (
    <section className="space-y-6">
      <h3 className="text-xl font-bold text-on-surface ml-2">바로가기 메뉴</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {menus.map((m, i) => (
          <button
            key={m.key || `menu-${i}`}
            type="button"
            aria-label={m.label}
            onClick={() => handleQuickAction(m.key)}
            className={`flex flex-col items-center justify-center gap-3 p-6 bg-surface-container-lowest rounded-2xl hover:bg-teal-50/50 transition-all group shadow-sm ${
              m.accent ? 'border-l-4 border-secondary' : ''
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
              m.accent
                ? 'bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-white'
                : 'bg-slate-100 group-hover:bg-primary group-hover:text-white'
            }`}>
              <span className="material-symbols-outlined">{m.icon}</span>
            </div>
            <span className="text-xs font-bold text-slate-600">{m.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

// ─────────────── TodaySchedule — `오늘의 일정 섹션.md` ───────────────
function formatScheduleTimeKorean(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function scheduleRouteTitle(item) {
  if (!item) return '';
  const t = item.tripTitle?.trim();
  if (t) return t;
  const a = item.startAddr || '';
  const b = item.endAddr || '';
  if (a && b) return `${a} ↔ ${b}`;
  return a || b || '';
}

/** GET /api/driver/schedule/today 의 items[0] 형태 */
function TodaySchedule({ items, onTravelerQuoteDetail }) {
  const list = Array.isArray(items) ? items : [];
  const item = list[0];
  const timeLabel = formatScheduleTimeKorean(item?.startDt);
  const routeTitle = scheduleRouteTitle(item);
  const departure = item?.startAddr || '';
  const busText = item?.busLabel?.trim() || '차량 정보 없음';
  const statusLabel = item?.statusLabel || '운행 예정';

  return (
    <div className="space-y-6 w-full min-w-0">
      <h3 className="text-xl font-bold text-on-surface">오늘의 일정</h3>
      <div className="bg-white rounded-2xl p-6 shadow-[0_40px_60px_-15px_rgba(0,104,95,0.06)] border-t border-r border-b border-slate-100 border-l-[6px] border-l-amber-900">
        {!item ? (
          <p className="text-center text-sm text-slate-400 py-8">오늘 확정된 일정이 없습니다</p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4 gap-2">
              <span className="px-3 py-1.5 bg-orange-100 text-orange-900 text-[11px] font-bold rounded-full">
                {statusLabel}
              </span>
              <span className="text-xs font-semibold text-slate-400 tabular-nums shrink-0">{timeLabel}</span>
            </div>
            <h4 className="text-lg font-bold mb-2 text-on-surface leading-snug">{routeTitle}</h4>
            <div className="space-y-3 mt-4">
              <div className="flex items-start gap-3 text-sm text-slate-600">
                <span className="material-symbols-outlined text-lg text-slate-500 shrink-0">location_on</span>
                <span className="break-words">{departure || '—'}</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-slate-600">
                <span className="material-symbols-outlined text-lg text-slate-500 shrink-0">airport_shuttle</span>
                <span className="break-words">{busText}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => item?.reqUuid && onTravelerQuoteDetail?.(item.reqUuid)}
              className="w-full mt-6 py-3 bg-slate-100 rounded-xl text-sm font-bold text-on-surface hover:bg-slate-200 transition-colors"
            >
              운행 시작하기
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────── AuctionList — 실시간 입찰 기회 (`실시간 입찰 기회 섹션.md`) ───────────────
function formatCardDateTime(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return String(dt);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}/${mo}/${day} ${h}:${min}`;
}

/** GET /api/auction-list 응답 항목 기준 */
function AuctionList({
  items,
  loading,
  loadError,
  emptyMessage = '등록된 입찰이 없습니다',
  onBidClick,
  onRetry,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex(0);
  }, [items]);

  const len = items?.length || 0;

  useEffect(() => {
    if (len <= 1) return undefined;
    const id = window.setInterval(() => {
      setCurrentIndex((i) => ((i + 1) % len));
    }, 5000);
    return () => window.clearInterval(id);
  }, [len]);

  const windowItems = !len ? [] : items.slice(currentIndex, currentIndex + 1);

  const buttonLabel = (myBidStat) => (myBidStat === 'REQ' ? '입찰 제시 변경' : '입찰 참여');

  return (
    <div className="space-y-6 w-full">
      <div className="flex justify-between items-end">
        <h3 className="text-xl font-bold text-on-surface">실시간 입찰 기회</h3>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
          <span className="material-symbols-outlined animate-spin">progress_activity</span>
          <span className="text-sm font-medium">불러오는 중…</span>
        </div>
      )}

      {!loading && loadError && (
        <div className="rounded-2xl bg-red-50 border border-red-100 p-6 text-center">
          <p className="text-sm text-red-600 font-medium mb-3">{loadError}</p>
          <button
            type="button"
            onClick={onRetry}
            className="px-5 py-2 rounded-full bg-primary text-white text-sm font-bold"
          >
            다시 시도
          </button>
        </div>
      )}

      {!loading && !loadError && windowItems.length === 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-slate-400 text-sm">
          {emptyMessage}
        </div>
      )}

      {!loading && !loadError && windowItems.length > 0 && (
        <div className="overflow-hidden">
          {windowItems.map((item) => {
            const title = item.tripTitle?.trim()
              ? item.tripTitle
              : `${item.startAddr || ''} ↔ ${item.endAddr || ''}`;
            const route = [item.startAddr, item.endAddr].filter(Boolean).join(' → ') || '—';
            const statLabel = (item.reqStat || 'BIDDING').toString().toUpperCase();
            const price = Number(item.reqAmt) || 0;
            const label = buttonLabel(item.myBidStat);
            const isChange = label === '입찰 제시 변경';
            const busType = item.busType?.trim() || '—';
            const busCnt = Number(item.busCnt) > 0 ? Number(item.busCnt) : 1;
            return (
              <div
                key={`${item.reqUuid}-${currentIndex}`}
                role="button"
                tabIndex={0}
                onClick={() => onBidClick?.(item.reqUuid)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onBidClick?.(item.reqUuid);
                  }
                }}
                className="bg-white rounded-2xl p-5 md:p-6 shadow-[0_40px_60px_-15px_rgba(0,104,95,0.06)] border border-slate-100 text-left cursor-pointer hover:border-primary/30 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40 animate-auction-slide-up"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 gap-y-2">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <h4 className="text-lg font-bold text-on-surface truncate">{title}</h4>
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-emerald-800">
                      {statLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600 shrink-0">
                    <span className="material-symbols-outlined text-base text-slate-500">schedule</span>
                    <span className="font-medium">등록</span>
                    <span className="font-semibold text-slate-700 tabular-nums">
                      {formatCardDateTime(item.regDt)}
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600 leading-snug break-words">{route}</p>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-start gap-2 text-slate-700">
                    <span className="material-symbols-outlined text-lg text-slate-500 shrink-0">calendar_clock</span>
                    <span>
                      <span className="text-slate-500">출발: </span>
                      <span className="font-medium tabular-nums">{formatCardDateTime(item.startDt)}</span>
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-700">
                    <span className="material-symbols-outlined text-lg text-slate-500 shrink-0">event_available</span>
                    <span>
                      <span className="text-slate-500">도착: </span>
                      <span className="font-medium tabular-nums">{formatCardDateTime(item.endDt)}</span>
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-700">
                    <span className="material-symbols-outlined text-lg text-slate-500 shrink-0">group</span>
                    <span>
                      <span className="text-slate-500">탑승: </span>
                      <span className="font-medium">{item.passengerCnt ?? '—'}명</span>
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-700 min-w-0">
                    <span className="material-symbols-outlined text-lg text-slate-500 shrink-0">directions_bus</span>
                    <span className="break-all">
                      <span className="font-medium">{busType}</span>
                      <span className="text-slate-500"> × </span>
                      <span className="font-medium">{busCnt}대</span>
                    </span>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2 min-w-0 text-primary font-bold">
                    <span className="material-symbols-outlined text-xl shrink-0">payments</span>
                    <span className="text-sm sm:text-base truncate">
                      예산 총액: ₩{price.toLocaleString('ko-KR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onBidClick?.(item.reqUuid);
                      }}
                      className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                        isChange
                          ? 'border-2 border-primary text-primary bg-white hover:bg-teal-50'
                          : 'bg-primary text-white hover:bg-primary-container'
                      }`}
                    >
                      {label}
                    </button>
                    <span className="material-symbols-outlined text-slate-300 text-2xl" aria-hidden>
                      chevron_right
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────── Main DriverDashboard ───────────────
const DriverDashboard = ({
  currentUser,
  onProfileSetup,
  onBusInfoSetup,
  onQuotationList,
  onTravelerQuoteDetail,
}) => {
  const [stats, setStats] = useState(null);
  const [todayScheduleItems, setTodayScheduleItems] = useState([]);
  const [auctionList, setAuctionList] = useState([]);
  const [auctionEmptyMessage, setAuctionEmptyMessage] = useState('등록된 입찰이 없습니다');
  const [auctionListError, setAuctionListError] = useState(null);
  const [auctionLoading, setAuctionLoading] = useState(true);
  const [showUpcomingTripsModal, setShowUpcomingTripsModal] = useState(false);
  const [showLiveChatBusDriver, setShowLiveChatBusDriver] = useState(false);

  useEffect(() => {
    const driverCustId = currentUser?.custId || currentUser?.userId;
    if (!driverCustId) {
      setAuctionLoading(false);
      setAuctionList([]);
      setAuctionEmptyMessage('등록된 입찰이 없습니다');
      setAuctionListError(null);
      setTodayScheduleItems([]);
      return;
    }

    const fetchAll = async () => {
      try {
        const headers = { 'Content-Type': 'application/json' };
        const enc = encodeURIComponent(driverCustId);

        const [statsRes, scheduleRes, auctionRes] = await Promise.allSettled([
          fetch(`${API_BASE}/api/driver/dashboard?custId=${enc}`, { headers }),
          fetch(`${API_BASE}/api/driver/schedule/today?custId=${enc}`, { headers }),
          fetch(`${API_BASE}/api/auction-list?driverId=${enc}`, { headers }),
        ]);

        if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
          const d = await statsRes.value.json();
          setStats(d);
        }
        if (scheduleRes.status === 'fulfilled' && scheduleRes.value.ok) {
          const d = await scheduleRes.value.json();
          setTodayScheduleItems(Array.isArray(d.items) ? d.items : []);
        } else {
          setTodayScheduleItems([]);
        }
        setAuctionListError(null);
        if (auctionRes.status === 'fulfilled' && auctionRes.value.ok) {
          const d = await auctionRes.value.json();
          setAuctionList(Array.isArray(d.items) ? d.items : []);
          setAuctionEmptyMessage(
            typeof d.emptyMessage === 'string' ? d.emptyMessage : '등록된 입찰이 없습니다'
          );
        } else if (auctionRes.status === 'fulfilled') {
          const t = await auctionRes.value.text();
          let msg = `서버 오류 (${auctionRes.value.status})`;
          try {
            const j = JSON.parse(t);
            if (j.error) msg = j.error;
          } catch (_) { /* ignore */ }
          setAuctionListError(msg);
          setAuctionList([]);
        } else {
          setAuctionListError('실시간 입찰 목록을 불러오지 못했습니다.');
          setAuctionList([]);
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setAuctionListError(err.message || '네트워크 오류');
      } finally {
        setAuctionLoading(false);
      }
    };

    fetchAll();
  }, [currentUser]);

  const refetchAuctionList = useCallback(async () => {
    const driverCustId = currentUser?.custId || currentUser?.userId;
    if (!driverCustId) return;
    setAuctionLoading(true);
    setAuctionListError(null);
    try {
      const r = await fetch(
        `${API_BASE}/api/auction-list?driverId=${encodeURIComponent(driverCustId)}`
      );
      if (r.ok) {
        const d = await r.json();
        setAuctionList(Array.isArray(d.items) ? d.items : []);
        setAuctionEmptyMessage(
          typeof d.emptyMessage === 'string' ? d.emptyMessage : '등록된 입찰이 없습니다'
        );
      } else {
        let msg = `서버 오류 (${r.status})`;
        try {
          const j = await r.json();
          if (j.error) msg = j.error;
        } catch (_) { /* ignore */ }
        setAuctionListError(msg);
        setAuctionList([]);
      }
    } catch (e) {
      setAuctionListError(e.message || '네트워크 오류');
      setAuctionList([]);
    } finally {
      setAuctionLoading(false);
    }
  }, [currentUser]);

  return (
    <div className="bg-background text-on-background min-h-screen">
      <main className="min-h-screen relative overflow-x-hidden">
        <div className="px-12 pb-12 pt-8 max-w-7xl mx-auto space-y-12">
          <DashboardTopSection
            stats={stats}
            scheduleItems={todayScheduleItems}
            onTravelerQuoteDetail={onTravelerQuoteDetail}
          />

          <QuickMenu
            onProfileSetup={onProfileSetup}
            onBusInfoSetup={onBusInfoSetup}
            onQuotationList={onQuotationList}
            onUpcomingTrips={() => setShowUpcomingTripsModal(true)}
            onLiveChat={() => setShowLiveChatBusDriver(true)}
          />

          <AuctionList
            items={auctionList}
            loading={auctionLoading}
            loadError={auctionListError}
            emptyMessage={auctionEmptyMessage}
            onBidClick={(reqUuid) => onTravelerQuoteDetail?.(reqUuid)}
            onRetry={refetchAuctionList}
          />
        </div>
      </main>

      {/* Floating FAB */}
      <div className="fixed bottom-8 right-8 z-50">
        <button className="w-16 h-16 bg-gradient-to-br from-secondary to-secondary-container text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform">
          <span className="material-symbols-outlined text-3xl">add</span>
        </button>
      </div>

      <UpcomingTripsModal
        open={showUpcomingTripsModal}
        onClose={() => setShowUpcomingTripsModal(false)}
        driverId={currentUser?.custId || currentUser?.userId}
        onTravelerQuoteDetail={(reqUuid) => {
          setShowUpcomingTripsModal(false);
          onTravelerQuoteDetail?.(reqUuid);
        }}
      />

      <LiveChatBusDriver
        open={showLiveChatBusDriver}
        onClose={() => setShowLiveChatBusDriver(false)}
        driverId={currentUser?.custId || currentUser?.userId}
        initialReqUuid={null}
      />
    </div>
  );
};

export default DriverDashboard;
