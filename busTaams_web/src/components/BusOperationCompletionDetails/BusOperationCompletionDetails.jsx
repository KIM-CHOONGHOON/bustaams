import React, { useState, useEffect, useCallback } from 'react';
import { getVehicleLabel } from '../../utils/vehicleLabels';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');

/** 세션 값이 UUID이면 소문자 정규화, 아니면 `TB_USER.USER_ID` 등 그대로(trim만) */
function normalizeDriverSessionParam(s) {
  const t = String(s ?? '').trim();
  if (!t) return '';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) return t.toLowerCase();
  return t;
}

function formatKrw(n) {
  const v = Number(n ?? 0);
  if (Number.isNaN(v)) return '—';
  return `${v.toLocaleString('en-US')} KRW`;
}

function formatKrwOrDash(n) {
  if (n == null || n === '') return '—';
  return formatKrw(n);
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const x = new Date(iso);
  if (Number.isNaN(x.getTime())) return '—';
  return x.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * 모달: 헤더「버스 운행 완료 상세 정보」·닫기.
 * 본문 1행 2열: 좌「여행자 등록 정보」+「요청 차량」, 우「왕복 운행 타임라인」. `TB_AUCTION_REQ_BUS` = auctionReqBuses.
 *
 * Props: `driverId`·`resId`·`reqId` (TB_BUS_RESERVATION / TB_AUCTION_REQ 키)
 */
const BusOperationCompletionDetails = ({
  open,
  onClose,
  driverId,
  resId,
  reqId,
}) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const effectiveDriver = driverId != null && String(driverId).trim() !== '' ? String(driverId).trim() : '';
  const effectiveRes = resId != null && String(resId).trim() !== '' ? resId : '';
  const effectiveReq = reqId != null && String(reqId).trim() !== '' ? reqId : '';

  const fetchDetail = useCallback(async () => {
    const du = normalizeDriverSessionParam(effectiveDriver);
    const ru =
      effectiveRes != null && effectiveRes !== '' ? String(effectiveRes).trim().toLowerCase() : '';
    const rq =
      effectiveReq != null && effectiveReq !== '' ? String(effectiveReq).trim().toLowerCase() : '';
    if (!du || (!ru && !rq)) return;
    setLoading(true);
    setLoadError(null);
    const q = new URLSearchParams();
    q.set('driverId', du);
    if (ru) q.set('resId', ru);
    if (rq) q.set('reqId', rq);
    const url = `${API_BASE}/api/bus-operation-completion-details?${q.toString()}`;
    if (import.meta.env.DEV) console.warn('[BusOperationCompletionDetails]', url);
    try {
      const r = await fetch(url);
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setDetail(null);
        setLoadError(d.error || `오류 (${r.status})`);
        return;
      }
      setDetail(d);
    } catch (e) {
      setDetail(null);
      setLoadError(e.message || '네트워크 오류');
    } finally {
      setLoading(false);
    }
  }, [effectiveDriver, effectiveRes, effectiveReq, resId, reqId]);

  useEffect(() => {
    if (!open || !effectiveDriver) return undefined;
    const hasRes = effectiveRes != null && String(effectiveRes).trim() !== '';
    const hasReq = effectiveReq != null && String(effectiveReq).trim() !== '';
    if (!hasRes && !hasReq) return undefined;
    fetchDetail();
    return undefined;
  }, [open, effectiveDriver, effectiveRes, effectiveReq, fetchDetail]);

  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const d = detail;
  const timelineSteps = Array.isArray(d?.timeline) ? d.timeline : [];
  const auctionReqBuses = Array.isArray(d?.auctionReqBuses) ? d.auctionReqBuses : [];

  const travelerNameLabel = d?.travelerName?.trim() ? d.travelerName.trim() : '—';
  const passengerLabel =
    d?.passengerCnt != null && d.passengerCnt !== '' ? `${d.passengerCnt} 명` : '—';
  const tripTitle = d?.tripTitle?.trim() || '—';
  const startDtLabel = formatDateTime(d?.startDt);
  const endDtLabel = formatDateTime(d?.endDt);

  return (
    <div
      id="BusOperationCompletionDetails"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 font-body text-on-surface"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bus-op-completion-details-modal-title"
    >
      <style>{`
        #BusOperationCompletionDetails .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
      `}</style>

      <div className="absolute inset-0" aria-hidden onClick={onClose} />

      <div className="relative z-10 flex w-full max-w-[90rem] max-h-[min(92vh,900px)] flex-col overflow-hidden rounded-2xl shadow-2xl border border-outline-variant/10 bg-surface">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-outline-variant/15 bg-surface px-4 py-3 sm:px-6">
          <h2
            id="bus-op-completion-details-modal-title"
            className="text-lg font-extrabold font-headline text-on-surface sm:text-xl"
          >
            버스 운행 완료 상세 정보
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high transition-colors"
            aria-label="닫기"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4 sm:px-8">
          {loadError && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {loadError}
            </div>
          )}

          {loading && !d && (
            <div className="mb-6 flex items-center justify-center gap-2 rounded-xl border border-outline-variant/20 bg-surface-container-low/50 py-4 text-sm font-medium text-outline">
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              불러오는 중…
            </div>
          )}

          <section
            className="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start"
            aria-label="여행자 정보·요청 차량 및 운행 타임라인"
          >
            <div className="lg:col-span-5 space-y-8">
              <div aria-labelledby="bus-op-traveler-reg-title">
              <h3
                id="bus-op-traveler-reg-title"
                className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-outline"
              >
                <span className="material-symbols-outlined text-lg text-secondary" aria-hidden>
                  person
                </span>
                여행자 등록 정보
              </h3>
              <div className="rounded-xl bg-surface-container-lowest p-6 shadow-[0_8px_24px_rgba(25,28,29,0.06)]">
                <dl className="grid gap-4 sm:gap-5">
                  <div className="grid gap-1 sm:grid-cols-[140px_1fr] sm:items-baseline sm:gap-4">
                    <dt className="text-xs font-bold text-outline">여행자 성명</dt>
                    <dd className="text-base font-semibold text-on-surface break-words">
                      {loading && !d ? '—' : travelerNameLabel}
                    </dd>
                  </div>
                  <div className="grid gap-1 sm:grid-cols-[140px_1fr] sm:items-baseline sm:gap-4">
                    <dt className="text-xs font-bold text-outline">탑승 인원</dt>
                    <dd className="text-base font-semibold text-on-surface tabular-nums">
                      {loading && !d ? '—' : passengerLabel}
                    </dd>
                  </div>
                  <div className="grid gap-1 sm:grid-cols-[140px_1fr] sm:items-baseline sm:gap-4">
                    <dt className="text-xs font-bold text-outline">여정 제목</dt>
                    <dd className="text-base font-semibold text-on-surface break-words">{loading && !d ? '—' : tripTitle}</dd>
                  </div>
                  <div className="grid gap-1 sm:grid-cols-[140px_1fr] sm:items-baseline sm:gap-4">
                    <dt className="text-xs font-bold text-outline">출발 일시</dt>
                    <dd className="tabular-nums text-base font-semibold text-on-surface">
                      {loading && !d ? '—' : startDtLabel}
                    </dd>
                  </div>
                  <div className="grid gap-1 sm:grid-cols-[140px_1fr] sm:items-baseline sm:gap-4">
                    <dt className="text-xs font-bold text-outline">도착 일시</dt>
                    <dd className="tabular-nums text-base font-semibold text-on-surface">
                      {loading && !d ? '—' : endDtLabel}
                    </dd>
                  </div>
                  <div className="grid gap-1 sm:grid-cols-[140px_1fr] sm:items-baseline sm:gap-4">
                    <dt className="text-xs font-bold text-outline">여행자 요청 금액</dt>
                    <dd className="text-base font-semibold text-primary tabular-nums">
                      {formatKrwOrDash(d?.travelerRequestKrw)}
                    </dd>
                  </div>
                  <div className="grid gap-1 sm:grid-cols-[140px_1fr] sm:items-baseline sm:gap-4">
                    <dt className="text-xs font-bold text-outline">버스기사 금액</dt>
                    <dd className="text-base font-semibold text-primary tabular-nums">
                      {formatKrwOrDash(d?.driverBidKrw)}
                    </dd>
                  </div>
                </dl>
              </div>
              </div>

              <div aria-labelledby="bus-op-req-bus-title">
                <h3
                  id="bus-op-req-bus-title"
                  className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-outline"
                >
                  <span className="material-symbols-outlined text-lg text-secondary" aria-hidden>
                    directions_bus
                  </span>
                  요청 차량
                </h3>
                <div className="rounded-xl bg-surface-container-lowest p-6 shadow-[0_8px_24px_rgba(25,28,29,0.06)]">
                  {loading && !d ? (
                    <p className="text-sm font-medium text-outline">불러오는 중…</p>
                  ) : auctionReqBuses.length === 0 ? (
                    <p className="text-sm font-medium text-outline">등록된 요청 차량이 없습니다.</p>
                  ) : (
                    <ul className="m-0 list-none space-y-4 p-0">
                      {auctionReqBuses.map((b, i) => (
                        <li
                          key={b.reqBusId || b.reqBusUuid || `bus-${i}`}
                          className="flex flex-col gap-1 border-b border-outline-variant/10 pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                        >
                          <span className="text-base font-semibold text-on-surface">
                            {getVehicleLabel(b.busTypeCd)}{' '}
                            <span className="tabular-nums text-on-surface-variant">
                              {Number(b.reqBusCnt) || 0}대
                            </span>
                          </span>
                          <span className="shrink-0 text-sm font-semibold text-primary tabular-nums sm:text-base">
                            {formatKrwOrDash(b.reqAmtKrw)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-7" aria-labelledby="bus-op-timeline-title">
              <h3
                id="bus-op-timeline-title"
                className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-outline"
              >
                <span className="material-symbols-outlined text-lg text-secondary" aria-hidden>
                  route
                </span>
                왕복 운행 타임라인
              </h3>
              <div className="rounded-xl bg-surface-container-low p-6 sm:p-8">
                {loading && !d ? (
                  <p className="text-sm font-medium text-outline">불러오는 중…</p>
                ) : timelineSteps.length === 0 ? (
                  <p className="text-sm font-medium text-outline">표시할 타임라인이 없습니다.</p>
                ) : (
                  <div className="relative pl-2 sm:pl-4">
                    <div className="absolute bottom-3 left-[19px] top-3 z-0 w-0 border-l-2 border-dashed border-outline-variant sm:left-[21px]" />
                    <ul className="relative z-[1] m-0 list-none space-y-8 p-0 sm:space-y-10">
                      {timelineSteps.map((step, idx) => {
                        const isStart = step.nodeKind === 'start';
                        const isEnd = step.nodeKind === 'end';
                        const dotClass = isStart
                          ? 'bg-primary ring-[6px] ring-surface-container-low'
                          : isEnd
                            ? 'bg-secondary ring-[6px] ring-surface-container-low'
                            : 'bg-outline-variant ring-[6px] ring-surface-container-low';
                        return (
                          <li key={`via-${step.viaOrd}-${idx}`} className="relative flex gap-4 sm:gap-6">
                            <div className="flex w-7 shrink-0 flex-col items-center sm:w-8">
                              <div
                                className={`z-10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${dotClass}`}
                              >
                                {isEnd ? (
                                  <span
                                    className="material-symbols-outlined text-[11px] text-white"
                                    style={{ fontVariationSettings: "'wght' 700" }}
                                  >
                                    check
                                  </span>
                                ) : (
                                  <span className="h-2 w-2 rounded-full bg-white" />
                                )}
                              </div>
                            </div>
                            <p
                              className={`min-w-0 flex-1 pt-0.5 text-base font-bold leading-snug sm:text-lg ${
                                isStart || isEnd ? 'text-secondary' : 'text-on-surface'
                              }`}
                            >
                              {step.lineText}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default BusOperationCompletionDetails;
