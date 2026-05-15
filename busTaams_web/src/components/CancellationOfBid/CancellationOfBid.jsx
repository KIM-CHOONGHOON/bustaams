import React, { useState, useEffect, useRef } from 'react';
import CommonView from '../CommonView/CommonView';

/**
 * 버스기사 청약 취소 모달 (화면·API ID: CancellationOfBid)
 * POST /api/CancellationOfBid (multipart)
 */

const RAW_API = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';
const API_BASE = String(RAW_API).trim().replace(/\/$/, '') || 'http://127.0.0.1:8080';

const SCREEN_ID = 'CancellationOfBid';

/** TB_USER_CANCEL_MANAGE.CANCEL_BUS_DRIVER_CNT — 서버 `MAX_DRIVER_BID_CANCEL_ACCUM` 과 동일 */
const MAX_DRIVER_BID_CANCEL_ACCUM = 10;

/** TB_FILE_MASTER: ORG_FILE_NM + FILE_EXT — 파일명에 확장자가 이미 있으면 중복 추가 안 함 */
function proofAttachmentDisplayLabel(f) {
    const name = String(f?.orgFileNm ?? '').trim();
    let ext = String(f?.fileExt ?? '').trim();
    if (ext && !ext.startsWith('.')) ext = `.${ext}`;
    const base = name || String(f?.fileId || '').trim();
    if (!base) return ext || '';
    if (ext && base.toLowerCase().endsWith(ext.toLowerCase())) return base;
    return ext ? `${base}${ext}` : base;
}

const CANCELLATION_REASON_OPTIONS = [
    { value: 'CHANGE_OF_MIND', label: '단순변심' },
    { value: 'VEHICLE_DAMAGE', label: '차량 파손 (운행 불가)' },
    { value: 'HOSPITALIZATION', label: '질병 또는 사고에 의한 입원' },
    { value: 'OUTPATIENT_SAME_DAY', label: '사고에 의한 당일 통원치료' },
    { value: 'LEGAL_CUSTODY', label: '법정 구속 (경찰서 및 검찰청 구인 포함)' },
    { value: 'DEATH_KIN_SPOUSE', label: '직계존비속·배우자 사망' },
    { value: 'DEATH_SELF', label: '본인 사망' },
    { value: 'OTHER', label: '이외' },
];

const CancellationOfBid = ({
    open,
    onClose,
    driverId,
    reqId,
    resId,
    reqBusSeq = 1,
    travelerId,
    busId,
    onSuccess,
}) => {
    const sid = String(driverId || '').trim();
    const rid = String(reqId || '').trim();
    const resIdTrim = resId != null ? String(resId).trim() : '';
    /** TB_BUS_RESERVATION.REQ_BUS_SEQ 는 0부터 허용. null/빈 문자열은 Number() 시 0으로 왜곡되므로 별도 처리. */
    const seqNum = (() => {
        const v = reqBusSeq;
        if (v == null || v === '') return NaN;
        if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
        const p = parseInt(String(v).trim(), 10);
        return Number.isFinite(p) ? p : NaN;
    })();
    const travelerTrim = travelerId != null ? String(travelerId).trim() : '';
    const busIdTrim = busId != null ? String(busId).trim() : '';

    const [reasonCode, setReasonCode] = useState('');
    const [detailReason, setDetailReason] = useState('');
    const [files, setFiles] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [summary, setSummary] = useState(null);
    const [summaryError, setSummaryError] = useState(null);
    /** 모달 요약 로드 시 TB_USER_CANCEL_MANAGE.CANCEL_BUS_DRIVER_CNT (POST 시 동일 값 전달) */
    const [snapshotCancelCount, setSnapshotCancelCount] = useState(null);
    const cancelBusDriverCntSnapshotRef = useRef(null);
    /** 서버 `errorCode` 안내 — 단일 「닫기」 버튼 모달 */
    const [noticeModal, setNoticeModal] = useState(null);
    /** 최신 TB_USER_CANCEL_HIST → REASON_DOC_FILE_NM → TB_FILE_MASTER (이전 제출 증빙) */
    const [lastProofAttachments, setLastProofAttachments] = useState([]);
    const [selectedProofFileId, setSelectedProofFileId] = useState(null);
    const [commonViewProof, setCommonViewProof] = useState(null);

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        setReasonCode('');
        setDetailReason('');
        setFiles([]);
        setSubmitError(null);
        setSummary(null);
        setSummaryError(null);
        setSnapshotCancelCount(null);
        cancelBusDriverCntSnapshotRef.current = null;
        setNoticeModal(null);
        setLastProofAttachments([]);
        setSelectedProofFileId(null);
        setCommonViewProof(null);
    }, [open]);

    useEffect(() => {
        if (lastProofAttachments.length === 0) {
            setSelectedProofFileId(null);
            return;
        }
        setSelectedProofFileId((prev) =>
            prev && lastProofAttachments.some((x) => x.fileId === prev)
                ? prev
                : lastProofAttachments[0].fileId
        );
    }, [lastProofAttachments]);

    useEffect(() => {
        if (!open || !sid) return undefined;
        let cancelled = false;
        (async () => {
            try {
                const u = new URL(`${API_BASE}/api/${SCREEN_ID}/summary`);
                u.searchParams.set('driverId', sid);
                const r = await fetch(u.toString());
                const j = await r.json().catch(() => ({}));
                if (!r.ok) throw new Error(j.error || `요약 오류 (${r.status})`);
                if (!cancelled) {
                    const c = j.CancellationOfBid || null;
                    setSummary(c);
                    if (c) {
                        const cnt = Number(c.cumulativeCancelCount ?? 0) || 0;
                        setSnapshotCancelCount(cnt);
                        cancelBusDriverCntSnapshotRef.current = cnt;
                        setLastProofAttachments(Array.isArray(c.lastProofAttachments) ? c.lastProofAttachments : []);
                    } else {
                        setSnapshotCancelCount(null);
                        cancelBusDriverCntSnapshotRef.current = null;
                        setLastProofAttachments([]);
                    }
                    setSummaryError(null);
                }
            } catch (e) {
                if (!cancelled) {
                    setSummary(null);
                    setSnapshotCancelCount(null);
                    cancelBusDriverCntSnapshotRef.current = null;
                    setLastProofAttachments([]);
                    setSummaryError(e.message);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [open, sid]);

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => {
            if (e.key !== 'Escape') return;
            if (commonViewProof) {
                setCommonViewProof(null);
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
    }, [open, onClose, commonViewProof]);

    if (!open) return null;

    const isCancelLimitReached = snapshotCancelCount >= MAX_DRIVER_BID_CANCEL_ACCUM;
    const snapshotReady = snapshotCancelCount !== null && summaryError == null;

    const onFilesChosen = (list) => {
        const arr = Array.from(list || []).filter(Boolean);
        const next = [];
        for (const f of arr) {
            if (next.length >= 5) break;
            if (f.size > 10 * 1024 * 1024) {
                setSubmitError('파일당 최대 10MB까지 업로드할 수 있습니다.');
                continue;
            }
            next.push(f);
        }
        setFiles(next);
        if (next.length === arr.length || arr.length <= 5) setSubmitError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!rid || !sid) {
            setSubmitError('요청 번호(reqId) 또는 기사 정보가 없습니다.');
            return;
        }
        if (!resIdTrim) {
            setSubmitError('예약 번호(resId)가 필요합니다. 목록을 새로 고친 뒤 다시 시도해 주세요.');
            return;
        }
        if (!Number.isFinite(seqNum) || seqNum < 0) {
            setSubmitError('요청 버스 순번(reqBusSeq)이 올바르지 않습니다.');
            return;
        }
        if (!snapshotReady) {
            setSubmitError('청약 취소 누적 건수를 불러오는 중이거나 오류입니다. 잠시 후 다시 시도해 주세요.');
            return;
        }
        if (isCancelLimitReached) {
            setSubmitError('청약 취소 가능 건수를 초과했습니다. 버스탐스 운영부에 문의해 주세요.');
            return;
        }
        if (!reasonCode) {
            setSubmitError('취소 사유를 선택해 주세요.');
            return;
        }
        setSubmitting(true);
        setSubmitError(null);
        try {
            const fd = new FormData();
            fd.set('reqId', rid);
            fd.set('driverId', sid);
            fd.set('resId', resIdTrim);
            fd.set('reqBusSeq', String(seqNum));
            if (travelerTrim) fd.set('travelerId', travelerTrim);
            if (busIdTrim) fd.set('busId', busIdTrim);
            fd.set('cancellationReasonCode', reasonCode);
            fd.set('detailReason', detailReason);
            fd.set('cancelBusDriverCntSnapshot', String(cancelBusDriverCntSnapshotRef.current ?? snapshotCancelCount));
            for (const f of files) {
                fd.append('attachments', f);
            }
            const res = await fetch(`${API_BASE}/api/${SCREEN_ID}`, {
                method: 'POST',
                body: fd,
            });
            const j = await res.json().catch(() => ({}));
            if (!res.ok) {
                const code = j.errorCode != null ? String(j.errorCode) : '';
                const msg = j.error || `처리 오류 (${res.status})`;
                if (
                    code === 'NOT_BIDDING_OR_CONFIRM' ||
                    code === 'MAX_DRIVER_BID_CANCELS' ||
                    code === 'CANCEL_SNAPSHOT_STALE' ||
                    code === 'BAD_CANCEL_SNAPSHOT' ||
                    code === 'AUCTION_REQ_BUS_MISMATCH' ||
                    code === 'AUCTION_REQ_MISMATCH' ||
                    code === 'USER_NOT_FOUND'
                ) {
                    setNoticeModal(msg);
                    return;
                }
                throw new Error(msg);
            }
            const payload = j.CancellationOfBid;
            if (!payload?.success) throw new Error(j.error || '응답 형식 오류');
            onSuccess?.(payload);
            onClose?.();
        } catch (err) {
            setSubmitError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-black/45 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="CancellationOfBid-title"
        >
            {noticeModal != null && (
                <div
                    className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/50"
                    role="alertdialog"
                    aria-labelledby="CancellationOfBid-notice-title"
                    aria-describedby="CancellationOfBid-notice-desc"
                >
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 p-6">
                        <h3 id="CancellationOfBid-notice-title" className="text-lg font-black text-slate-900">
                            안내
                        </h3>
                        <p
                            id="CancellationOfBid-notice-desc"
                            className="mt-3 text-sm text-slate-700 leading-relaxed whitespace-pre-line"
                        >
                            {noticeModal}
                        </p>
                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                className="rounded-xl px-6 py-3 text-sm font-black bg-amber-900 text-white hover:bg-amber-950"
                                onClick={() => setNoticeModal(null)}
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div className="relative w-full max-w-lg max-h-[min(92vh,880px)] overflow-y-auto rounded-2xl bg-white shadow-xl border border-slate-100">
                <button
                    type="button"
                    onClick={() => onClose?.()}
                    className="absolute top-4 right-4 p-2 rounded-full text-slate-500 hover:bg-slate-100"
                  aria-label="닫기"
                >
                    <span className="material-symbols-outlined text-xl">close</span>
                </button>

                <div className="p-6 sm:p-8 pt-10">
                    <h2 id="CancellationOfBid-title" className="text-2xl font-black text-slate-900 pr-10">
                        버스 청약 취소
                    </h2>

                    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/90 px-4 py-3 text-xs sm:text-sm text-slate-800">
                        {summaryError && <p className="text-amber-800 font-semibold">요약: {summaryError}</p>}
                        {!summaryError && summary && snapshotCancelCount !== null && (
                            <>
                                <p className="text-xs sm:text-sm text-red-600 font-semibold">
                                    <span className="font-bold">청약 취소 누적 건수</span>: {snapshotCancelCount}건{' '}
                                </p>
                                {summary.tradeRestrictYn === 'Y' && (
                                    <p className="mt-1 text-amber-900 font-semibold">현재 거래 제한 상태입니다.</p>
                                )}
                            </>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-800 mb-1.5">
                                취소 사유 선택 <span className="text-red-600">*</span>
                            </label>
                            <select
                                value={reasonCode}
                                onChange={(e) => setReasonCode(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-amber-900/20 focus:border-amber-900/40 outline-none"
                                required
                            >
                                <option value="">사유를 선택해주세요</option>
                                {CANCELLATION_REASON_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-800 mb-1.5">상세 사유 입력</label>
                            <textarea
                                value={detailReason}
                                onChange={(e) => setDetailReason(e.target.value)}
                                rows={3}
                                placeholder="상세한 취소 사유를 작성해 주세요 (선택 사항)"
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-900/20 focus:border-amber-900/40 outline-none resize-y min-h-[72px]"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-800 mb-1.5">증빙 서류 첨부</label>
                            {lastProofAttachments.length > 0 && (
                                <div className="relative mb-3 rounded-xl border border-slate-200 bg-white px-3 py-3 min-h-[3.25rem]">
                                    <div className="max-h-40 overflow-y-auto overflow-x-hidden pr-24 pb-9 -mr-1 [scrollbar-gutter:stable]">
                                        <ul className="space-y-2 text-sm text-slate-800">
                                            {lastProofAttachments.map((f) => {
                                                const label = proofAttachmentDisplayLabel(f);
                                                return (
                                                    <li key={f.fileId} className="flex items-center gap-2 min-w-0">
                                                        <input
                                                            type="radio"
                                                            name="cancellation-proof-attachment"
                                                            id={`cancellation-proof-${f.fileId}`}
                                                            className="shrink-0 accent-amber-900"
                                                            checked={selectedProofFileId === f.fileId}
                                                            onChange={() => setSelectedProofFileId(f.fileId)}
                                                        />
                                                        <label
                                                            htmlFor={`cancellation-proof-${f.fileId}`}
                                                            className="font-semibold truncate cursor-pointer min-w-0 flex-1"
                                                            title={label}
                                                        >
                                                            {label}
                                                        </label>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={!selectedProofFileId}
                                        className="absolute bottom-2.5 right-2.5 rounded-lg border border-amber-900/30 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-950 hover:bg-amber-100 disabled:opacity-45 disabled:cursor-not-allowed"
                                        onClick={() =>
                                            selectedProofFileId &&
                                            setCommonViewProof({ fileId: selectedProofFileId })
                                        }
                                    >
                                        파일보기
                                    </button>
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onFilesChosen(e.dataTransfer?.files);
                                }}
                                className="w-full rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/80 py-3 px-3 flex flex-col items-center justify-center text-center hover:border-amber-900/30 transition-colors min-h-0"
                            >
                                <span className="material-symbols-outlined text-2xl text-slate-400 leading-none">
                                    cloud_upload
                                </span>
                                <p className="mt-1 text-xs sm:text-sm font-bold text-slate-700 leading-snug">
                                    파일을 드래그하거나 클릭하여 업로드
                                </p>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    지원 형식: PDF, JPG, PNG (최대 10MB)
                                </p>
                                {files.length > 0 && (
                                    <p className="mt-1 text-xs font-semibold text-amber-900">
                                        선택됨 {files.length}개
                                    </p>
                                )}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,image/jpeg,image/png,application/pdf"
                                multiple
                                className="hidden"
                                onChange={(e) => onFilesChosen(e.target.files)}
                            />
                        </div>

                        <div className="rounded-xl bg-orange-50 border border-orange-100 p-3 flex gap-2.5">
                            <span className="material-symbols-outlined text-amber-800 shrink-0">info</span>
                            <p className="text-xs sm:text-sm text-amber-950 leading-relaxed">
                                주의: 빈번한 취소 발생 시 운영 정책에 따라 거래제한 패널티가 부과됩니다. 신중하게 결정해
                                주시기 바랍니다.
                            </p>
                        </div>

                        {submitError && (
                            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-semibold text-red-800">
                                {submitError}
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => onClose?.()}
                                className="flex-1 rounded-xl py-3.5 text-sm font-black bg-slate-100 text-slate-700 hover:bg-slate-200"
                            >
                                청약 유지
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || !snapshotReady || isCancelLimitReached}
                                className="flex-1 rounded-xl py-3.5 text-sm font-black bg-amber-900 text-white hover:bg-amber-950 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? '처리 중...' : '청약 취소 신청'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            {commonViewProof?.fileId && sid ? (
                <CommonView
                    close={() => setCommonViewProof(null)}
                    fileId={commonViewProof.fileId}
                    custId={sid}
                    docTitle="청약·취소 증빙"
                    metaPath="/api/common-view/driver-cancel-proof/meta"
                    streamPath="/api/driver/driver-cancel-proof/file"
                    downloadPath="/api/common-view/driver-cancel-proof/download"
                />
            ) : null}
        </div>
    );
};

export default CancellationOfBid;
export { SCREEN_ID };
