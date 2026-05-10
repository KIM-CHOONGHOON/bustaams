import React, { useState, useEffect, useCallback } from 'react';
import CancellationOfBid from '../CancellationOfBid/CancellationOfBid';

/**
 * 기사님 청약/여행 목록 모달 — API ID: DriversListOfBids
 * GET /api/DriversListOfBids
 */

const RAW_API = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';
const API_BASE = String(RAW_API).trim().replace(/\/$/, '') || 'http://127.0.0.1:8080';

export const SCREEN_ID = 'DriversListOfBids';

/** 견적·응찰·여행일: YYYY-MM-DD */
function formatDateYmd(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${day}`;
}

/** 운임: 천단위 콤마 (표시 통화 ₩) */
function formatFare(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return '—';
    return `₩${Math.round(x).toLocaleString('ko-KR')}`;
}

function statusBadgeClass(category) {
    if (category === 'bidding') return 'bg-[#fd8a43]/20 text-[#9c4400]';
    if (category === 'confirm') return 'bg-[#00403a] text-[#b7ede4]';
    if (category === 'cancelled') return 'bg-red-100 text-red-900';
    return 'bg-slate-200 text-slate-700';
}

/** 목록: 응찰 등록(BIDDING)·예약 확정(CONFIRM) 행만 취소 가능 */
function canCancelBidRow(row) {
    const s = String(row?.dataStat || '').toUpperCase();
    return s === 'BIDDING' || s === 'CONFIRM';
}

/** @param {{ open: boolean, onClose: () => void, driverId: string, variant?: 'active' | 'cancelled' }} props */
const DriversListOfBids = ({ open, onClose, driverId, variant = 'active' }) => {
    const sid = (driverId != null && String(driverId).trim()) || '';

    const [page, setPage] = useState(1);
    const [pageSize] = useState(6);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [payload, setPayload] = useState(null);
    /** CancellationOfBid: RES_ID, REQ_ID, REQ_BUS_SEQ, TRAVELER_ID, DRIVER_ID, BUS_ID */
    const [cancelBid, setCancelBid] = useState(null);

    const fetchList = useCallback(async () => {
        if (!sid || !open) return;
        setLoading(true);
        setError(null);
        try {
            const u = new URL(`${API_BASE}/api/${SCREEN_ID}`);
            u.searchParams.set('driverId', sid);
            u.searchParams.set('page', String(page));
            u.searchParams.set('pageSize', String(pageSize));
            if (variant === 'cancelled') u.searchParams.set('mode', 'cancelled');
            const r = await fetch(u.toString());
            const j = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(j.error || `오류 (${r.status})`);
            setPayload(j.DriversListOfBids || null);
        } catch (e) {
            setError(e.message);
            setPayload(null);
        } finally {
            setLoading(false);
        }
    }, [sid, open, page, pageSize, variant]);

    useEffect(() => {
        if (!open) return undefined;
        setPage(1);
    }, [open, variant]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape' && !cancelBid) onClose?.();
        };
        window.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [open, onClose, cancelBid]);

    const items = Array.isArray(payload?.items) ? payload.items : [];
    const total = Number(payload?.total) || 0;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));

    if (!open) return null;

    return (
        <>
            <div
                className="fixed inset-0 z-[115] flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-sm"
                role="dialog"
                aria-modal="true"
                aria-labelledby={variant === 'cancelled' ? 'DriversListOfBids-title-cancelled' : 'DriversListOfBids-title'}
            >
                <div className="relative w-full max-w-6xl max-h-[min(94vh,920px)] flex flex-col rounded-xl bg-[#f8fafb] text-[#191c1d] shadow-[0_8px_24px_rgba(25,28,29,0.12)] overflow-hidden border border-[#bfc8c6]/40">
                    <button
                        type="button"
                        onClick={() => onClose?.()}
                        className="absolute top-3 right-3 z-10 p-2 rounded-full hover:bg-black/5 transition-colors"
                        aria-label="닫기"
                    >
                        <span className="material-symbols-outlined text-[#002824]">close</span>
                    </button>

                    <div className="overflow-y-auto flex-1 px-6 sm:px-8 pt-10 pb-4">
                        <div className="mb-10">
                            <h1
                                id={variant === 'cancelled' ? 'DriversListOfBids-title-cancelled' : 'DriversListOfBids-title'}
                                className="text-[2rem] sm:text-[2.75rem] font-bold leading-tight text-[#002824]"
                            >
                                {variant === 'cancelled' ? '청약 취소 목록' : '기사님 청약/여행 목록'}
                            </h1>
                        </div>

                        <div className="bg-white rounded-xl shadow-[0_8px_24px_rgba(25,28,29,0.06)] overflow-hidden border border-[#bfc8c6]/20">
                            {error && (
                                <div className="m-4 p-3 rounded-lg bg-red-50 text-red-800 text-sm font-semibold">
                                    {error}
                                </div>
                            )}

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[960px]">
                                    <thead>
                                        <tr className="bg-[#e6e8e9]">
                                            <th className="px-6 py-4 text-xs font-bold text-[#404947] uppercase tracking-wider">
                                                상태
                                            </th>
                                            <th className="px-6 py-4 text-xs font-bold text-[#404947] uppercase tracking-wider">
                                                견적 요청일
                                            </th>
                                            <th className="px-6 py-4 text-xs font-bold text-[#404947] uppercase tracking-wider">
                                                응찰 등록일
                                            </th>
                                            <th className="px-6 py-4 text-xs font-bold text-[#404947] uppercase tracking-wider">
                                                여행제목
                                            </th>
                                            <th className="px-6 py-4 text-xs font-bold text-[#404947] uppercase tracking-wider">
                                                출발일
                                            </th>
                                            <th className="px-6 py-4 text-xs font-bold text-[#404947] uppercase tracking-wider">
                                                도착일
                                            </th>
                                            <th className="px-6 py-4 text-xs font-bold text-[#404947] uppercase tracking-wider">
                                                운임 가격
                                            </th>
                                            {variant !== 'cancelled' && (
                                                <th className="px-6 py-4 text-xs font-bold text-[#404947] uppercase tracking-wider w-24" />
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#bfc8c6]/20">
                                        {loading && (
                                            <tr>
                                                <td
                                                    colSpan={variant === 'cancelled' ? 7 : 8}
                                                    className="px-6 py-8 text-center text-slate-500 text-sm"
                                                >
                                                    불러오는 중…
                                                </td>
                                            </tr>
                                        )}
                                        {!loading &&
                                            items.map((row) => (
                                                <tr
                                                    key={`${row.resId}-${row.reqId}-${row.regDt}`}
                                                    className="hover:bg-[#eceeef] transition-colors"
                                                >
                                                    <td className="px-6 py-5">
                                                        <span
                                                            className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold ${statusBadgeClass(row.statusCategory)}`}
                                                        >
                                                            {row.statusLabelKo || row.dataStat}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5 text-sm text-[#404947]">
                                                        {formatDateYmd(row.quoteRequestDt)}
                                                    </td>
                                                    <td className="px-6 py-5 text-sm text-[#404947]">
                                                        {formatDateYmd(row.regDt)}
                                                    </td>
                                                    <td className="px-6 py-5 text-sm font-semibold text-[#002824] max-w-[14rem] sm:max-w-xs truncate">
                                                        {row.tripTitle?.trim() || '—'}
                                                    </td>
                                                    <td className="px-6 py-5 text-sm text-[#404947]">
                                                        {formatDateYmd(row.tripStartDt)}
                                                    </td>
                                                    <td className="px-6 py-5 text-sm text-[#404947]">
                                                        {formatDateYmd(row.tripEndDt)}
                                                    </td>
                                                    <td className="px-6 py-5 text-sm font-bold text-[#002824] tabular-nums">
                                                        {formatFare(row.driverBiddingPrice)}
                                                    </td>
                                                    {variant !== 'cancelled' && (
                                                        <td className="px-6 py-5 text-right">
                                                            <button
                                                                type="button"
                                                                disabled={!canCancelBidRow(row)}
                                                                onClick={() =>
                                                                    setCancelBid({
                                                                        resId: row.resId,
                                                                        reqId: row.reqId,
                                                                        reqBusSeq: row.reqBusSeq ?? 1,
                                                                        travelerId: row.travelerId || '',
                                                                        driverId: row.driverId || sid,
                                                                        busId: row.busId || '',
                                                                    })
                                                                }
                                                                className="px-3 py-1.5 border border-[#bfc8c6] text-[#404947] hover:bg-[#e1e3e4] rounded-lg text-[11px] font-bold transition-colors disabled:opacity-40 disabled:pointer-events-none"
                                                            >
                                                                청약취소
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        {!loading && items.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan={variant === 'cancelled' ? 7 : 8}
                                                    className="px-6 py-8 text-center text-slate-400 text-sm"
                                                >
                                                    {variant === 'cancelled'
                                                        ? '청약 취소 내역이 없습니다.'
                                                        : '응찰 내역이 없습니다.'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="px-8 py-6 bg-[#f2f4f5]/50 flex items-center justify-end">
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        disabled={page <= 1}
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        className="w-10 h-10 flex items-center justify-center rounded-full border border-[#bfc8c6]/40 hover:bg-white transition-colors disabled:opacity-40"
                                    >
                                        <span className="material-symbols-outlined text-[#002824]">chevron_left</span>
                                    </button>
                                    {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
                                        let num;
                                        if (pageCount <= 5) num = i + 1;
                                        else if (page <= 3) num = i + 1;
                                        else if (page >= pageCount - 2) num = pageCount - 4 + i;
                                        else num = page - 2 + i;
                                        const active = num === page;
                                        return (
                                            <button
                                                key={num}
                                                type="button"
                                                onClick={() => setPage(num)}
                                                className={`w-10 h-10 rounded-full text-xs font-bold ${
                                                    active ? 'bg-[#002824] text-white' : 'hover:bg-white'
                                                }`}
                                            >
                                                {num}
                                            </button>
                                        );
                                    })}
                                    <button
                                        type="button"
                                        disabled={page >= pageCount}
                                        onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                                        className="w-10 h-10 flex items-center justify-center rounded-full border border-[#bfc8c6]/40 hover:bg-white transition-colors disabled:opacity-40"
                                    >
                                        <span className="material-symbols-outlined text-[#002824]">chevron_right</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <CancellationOfBid
                open={Boolean(cancelBid)}
                onClose={() => setCancelBid(null)}
                driverId={cancelBid?.driverId || sid}
                reqId={cancelBid?.reqId || ''}
                resId={cancelBid?.resId || ''}
                reqBusSeq={cancelBid?.reqBusSeq ?? 1}
                travelerId={cancelBid?.travelerId || ''}
                busId={cancelBid?.busId || ''}
                onSuccess={() => {
                    setCancelBid(null);
                    fetchList();
                }}
            />
        </>
    );
};

export default DriversListOfBids;
