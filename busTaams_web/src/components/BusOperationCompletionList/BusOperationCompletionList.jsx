import React, { useState, useEffect, useCallback } from 'react';
import BusOperationCompletionDetails from '../BusOperationCompletionDetails/BusOperationCompletionDetails';
import { formatAuctionReqBusesLine } from '../../utils/vehicleLabels';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');

/** 로컬 날짜 → YYYY-MM-DD */
function toYYYYMMDD(d) {
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  const y = x.getFullYear();
  const mo = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

/** 당월 1일 ~ 오늘 */
function defaultFromTo() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: toYYYYMMDD(from), to: toYYYYMMDD(now) };
}

/** 조회 From~To 일수(UTC 일 단위). to >= from 가정 */
function daysBetweenYmd(fromStr, toStr) {
  const [fy, fm, fd] = fromStr.split('-').map(Number);
  const [ty, tm, td] = toStr.split('-').map(Number);
  const t0 = Date.UTC(fy, fm - 1, fd);
  const t1 = Date.UTC(ty, tm - 1, td);
  return Math.round((t1 - t0) / 86400000);
}

/** From 기준 To 상한 (포함 365일 구간: from + 365일) */
function maxToForFrom(fromStr) {
  const [y, m, d] = fromStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + 365);
  return toYYYYMMDD(dt);
}

const RANGE_ERROR_MSG = '조회 범위는 1년 이내만 가능합니다.';

function formatEndDtFull(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function tripLabel(item) {
  if (!item) return '—';
  const t = item.tripTitle?.trim();
  if (t) return t;
  const a = item.startAddr || '';
  const b = item.endAddr || '';
  if (a && b) return `${a} → ${b}`;
  return a || b || '—';
}

/**
 * 버스 운행 완료 목록 — `버스 운행 완료 목록 화면.md`
 * GET /api/bus-operation-completion-list?driverId|driverUuid=&from=&to=
 */
const BusOperationCompletionList = ({ open, onClose, driverId, driverUuid }) => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  /** 1년 초과 등 — 확인 시 닫는 안내 모달 */
  const [rangeAlert, setRangeAlert] = useState(null);
  /** 선택 행 → `BusOperationCompletionDetails` */
  const [selectedItem, setSelectedItem] = useState(null);

  const sessionDriver =
    driverId != null && String(driverId).trim() !== ''
      ? String(driverId).trim()
      : driverUuid != null
        ? String(driverUuid).trim()
        : '';

  const validateRangeOrAlert = useCallback((f, t) => {
    if (!f || !t) return false;
    const span = daysBetweenYmd(f, t);
    if (span < 0) {
      setRangeAlert('종료일(To)은 시작일(From) 이후여야 합니다.');
      return false;
    }
    if (span > 365) {
      setRangeAlert(RANGE_ERROR_MSG);
      return false;
    }
    return true;
  }, []);

  const fetchList = useCallback(async (f, t) => {
    if (!sessionDriver || !f || !t) return;
    if (!validateRangeOrAlert(f, t)) return;
    setLoading(true);
    setLoadError(null);
    const q = new URLSearchParams({ from: f, to: t });
    if (driverId != null && String(driverId).trim() !== '') {
      q.set('driverId', String(driverId).trim());
    }
    if (driverUuid != null && String(driverUuid).trim() !== '') {
      q.set('driverUuid', String(driverUuid).trim());
    }
    const url = `${API_BASE}/api/bus-operation-completion-list?${q.toString()}`;
    if (import.meta.env.DEV) console.warn('[BusOperationCompletionList]', url);
    try {
      const r = await fetch(url);
      if (!r.ok) {
        let msg = `서버 오류 (${r.status})`;
        try {
          const j = await r.json();
          if (j.error) msg = j.error;
        } catch (_) {
          /* ignore */
        }
        if (r.status === 400) {
          setRangeAlert(msg);
        } else {
          setLoadError(msg);
        }
        setItems([]);
        return;
      }
      const d = await r.json();
      setItems(Array.isArray(d.items) ? d.items : []);
    } catch (e) {
      setLoadError(e.message || '네트워크 오류');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [driverId, driverUuid, sessionDriver, validateRangeOrAlert]);

  /** 열릴 때: 당월 1일~오늘 입력 + 동일 구간으로 즉시 GET (명세 §2-2) */
  useEffect(() => {
    if (!open || !sessionDriver) return undefined;
    setSelectedItem(null);
    const { from: f, to: t } = defaultFromTo();
    setFrom(f);
    setTo(t);
    fetchList(f, t);
    return undefined;
  }, [open, sessionDriver, fetchList]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (selectedItem) {
        setSelectedItem(null);
        return;
      }
      if (rangeAlert) {
        setRangeAlert(null);
        return;
      }
      onClose?.();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, rangeAlert, selectedItem]);

  if (!open) return null;

  const total = items.length;
  const toMax = from ? maxToForFrom(from) : '';

  return (
    <>
      {selectedItem && (
        <BusOperationCompletionDetails
          key={`${selectedItem.resId || selectedItem.resUuid || ''}-${selectedItem.reqId || selectedItem.reqUuid || ''}`}
          open
          onClose={() => setSelectedItem(null)}
          driverId={driverId != null && String(driverId).trim() !== '' ? String(driverId).trim() : undefined}
          driverUuid={driverUuid}
          resId={selectedItem.resId ?? selectedItem.resUuid}
          reqId={selectedItem.reqId ?? selectedItem.reqUuid}
        />
      )}
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-6 overflow-y-auto font-body text-on-surface bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bus-op-completion-title"
    >
      {rangeAlert && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="bus-range-alert-title"
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col gap-6 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-3xl text-amber-500 flex-shrink-0">info</span>
              <p id="bus-range-alert-title" className="text-base font-semibold text-on-surface leading-relaxed">
                {rangeAlert}
              </p>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setRangeAlert(null)}
                className="px-6 py-2.5 rounded-full bg-primary text-white text-sm font-bold hover:opacity-90"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
      <button
        type="button"
        className="absolute inset-0 cursor-default border-0 p-0"
        aria-label="닫기"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-6xl my-4 sm:my-8 bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[min(95vh,calc(100vh-2rem))] flex flex-col">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full text-on-surface hover:bg-slate-100 transition-colors"
          aria-label="닫기"
        >
          <span className="material-symbols-outlined text-2xl">close</span>
        </button>

        <div className="p-8 pt-14 border-b border-slate-100">
          <span className="text-primary font-bold tracking-widest uppercase text-xs">운행 기록</span>
          <h2 id="bus-op-completion-title" className="text-2xl font-headline font-extrabold text-on-surface mt-1">
            버스 운행 완료 목록
          </h2>
          <p className="text-on-surface-variant text-sm mt-2">
            완료(DONE) 처리된 예약만 표시됩니다. 기간은 견적 <strong className="text-on-surface">도착 예정일(END_DT)</strong> 기준입니다.{' '}
            <span className="text-slate-500">조회 구간은 최대 365일(1년)입니다.</span>
          </p>

          <div className="mt-6 flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1 text-xs font-bold text-slate-500">
              From
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => {
                  const nf = e.target.value;
                  setFrom(nf);
                  if (!nf) return;
                  const cap = maxToForFrom(nf);
                  if (to) {
                    if (to < nf) setTo(nf);
                    else if (to > cap) setTo(cap);
                  }
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-on-surface"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold text-slate-500">
              To
              <input
                type="date"
                value={to}
                min={from || undefined}
                max={toMax || undefined}
                onChange={(e) => {
                  const nt = e.target.value;
                  if (!from) {
                    setTo(nt);
                    return;
                  }
                  if (nt && nt < from) {
                    setTo(from);
                    return;
                  }
                  const cap = maxToForFrom(from);
                  if (nt && nt > cap) {
                    setTo(cap);
                    setRangeAlert(RANGE_ERROR_MSG);
                    return;
                  }
                  setTo(nt);
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-on-surface"
              />
            </label>
            <button
              type="button"
              onClick={() => fetchList(from, to)}
              disabled={loading || !sessionDriver || !from || !to}
              className="px-6 py-2.5 rounded-full bg-primary text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '조회 중…' : '조회'}
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto p-8">
          {loadError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {loadError}
            </div>
          )}
          {loading && !loadError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
              <p className="font-bold">불러오는 중…</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 font-bold text-slate-600 whitespace-nowrap">No</th>
                    <th className="px-4 py-3 font-bold text-slate-600 whitespace-nowrap min-w-[140px]">여정명</th>
                    <th className="px-4 py-3 font-bold text-slate-600 min-w-[120px]">출발지</th>
                    <th className="px-4 py-3 font-bold text-slate-600 min-w-[120px]">도착지</th>
                    <th className="px-4 py-3 font-bold text-slate-600 min-w-[160px]">요청 차량</th>
                    <th className="px-4 py-3 font-bold text-slate-600 whitespace-nowrap">종료일</th>
                    <th className="px-4 py-3 font-bold text-slate-600 whitespace-nowrap min-w-[160px]">종료 일시</th>
                    <th className="px-4 py-3 font-bold text-slate-600 whitespace-nowrap text-right">입찰가</th>
                  </tr>
                </thead>
                <tbody>
                  {total === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400 font-semibold">
                        해당 기간에 운행 완료 건이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    items.map((it, idx) => (
                      <tr
                        key={it.resId || it.resUuid || `${it.reqId || it.reqUuid}-${idx}`}
                        className="border-b border-slate-50 hover:bg-primary-fixed/30 cursor-pointer transition-colors"
                        onClick={() => setSelectedItem(it)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedItem(it);
                          }
                        }}
                        tabIndex={0}
                        aria-label={`운행 완료 상세 보기: ${tripLabel(it)}`}
                      >
                        <td className="px-4 py-3 tabular-nums text-slate-500">{idx + 1}</td>
                        <td className="px-4 py-3 font-semibold text-on-surface">{tripLabel(it)}</td>
                        <td className="px-4 py-3 text-slate-700 break-words max-w-[200px]">{it.startAddr || '—'}</td>
                        <td className="px-4 py-3 text-slate-700 break-words max-w-[200px]">{it.endAddr || '—'}</td>
                        <td className="px-4 py-3 text-slate-700 break-words max-w-[220px] text-xs sm:text-sm">
                          {formatAuctionReqBusesLine(it.auctionReqBuses)}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-700">{it.endDtDate || '—'}</td>
                        <td className="px-4 py-3 tabular-nums text-slate-600">{formatEndDtFull(it.endDt)}</td>
                        <td className="px-4 py-3 text-right font-bold text-primary tabular-nums">
                          ₩{Number(it.driverBiddingPrice ?? 0).toLocaleString('ko-KR')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          {!loading && !loadError && (
            <p className="mt-4 text-xs text-slate-400 font-medium">총 {total}건</p>
          )}
        </div>

        <div className="px-8 py-4 border-t border-slate-100 bg-slate-50/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-full border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-white transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
    </>
  );
};

export default BusOperationCompletionList;
