import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');

const RES_STAT_LABEL = {
  AUCTION: '입찰대기',
  BIDDING: '응찰등록',
  REQ: '요청',
  CONFIRM: '예약확정',
  DONE: '운행종료',
  TRAVELER_CANCEL: '여행자 취소',
  DRIVER_CANCEL: '응찰취소',
  BUS_CHANGE: '버스변경',
  BUS_CANCEL: '버스취소',
};

function normalizeCustId(user) {
  if (!user || typeof user !== 'object') return '';
  const c =
    (user.custId != null && String(user.custId).trim()) ||
    (user.CUST_ID != null && String(user.CUST_ID).trim()) ||
    '';
  return c;
}

function canEditBid(custId, resStat) {
  if (!custId) return false;
  if (resStat == null || resStat === '') return true;
  const u = String(resStat).toUpperCase();
  return u === 'BIDDING' || u === 'AUCTION' || u === 'REQ';
}

function formatDtShort(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

/** TB_AUCTION_REQ_VIA.VIA_TYPE → "출발지 :" 등 접두(주소 앞 공백은 렌더에서) */
function viaTypeColonPrefix(viaType) {
  const t = String(viaType || '').toUpperCase();
  switch (t) {
    case 'START_NODE':
      return '출발지 :';
    case 'START_WAY':
      return '출발 경유지 :';
    case 'ROUND_TRIP':
      return '목적지 :';
    case 'END_WAY':
      return '도착 경유지 :';
    case 'END_NODE':
      return '도착지 :';
    default:
      return viaType ? `${viaType} :` : '지점 :';
  }
}

/**
 * 여행자 견적 상세 · 청약 정보 등록
 * @param {{ reqId: string, reqBusSeq?: number, close: () => void, currentUser: object, onBidInsertSuccess?: () => void }} props
 */
const TravelerQuoteRequestDetails = ({
  reqId,
  reqBusSeq: reqBusSeqProp,
  close,
  currentUser,
  onBidInsertSuccess,
}) => {
  const custId = normalizeCustId(currentUser);
  const reqBusSeq =
    reqBusSeqProp != null &&
    Number.isFinite(Number(reqBusSeqProp)) &&
    Number(reqBusSeqProp) >= 0
      ? Number(reqBusSeqProp)
      : 1;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(null);
  const [auctionGateModal, setAuctionGateModal] = useState(null);
  /** TB_MOM_MEMBER 처리 후 동일 건에 재청약 방지 */
  const [bidLockedAfterMom, setBidLockedAfterMom] = useState(false);

  useEffect(() => {
    setBidLockedAfterMom(false);
  }, [reqId, reqBusSeq]);

  const fetchData = useCallback(async () => {
    if (!reqId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const q = new URLSearchParams({ reqId: String(reqId).trim() });
      if (custId) q.set('custId', custId);
      q.set('reqBusSeq', String(reqBusSeq));
      const res = await fetch(`${API_BASE}/api/traveler-quote-request-details?${q.toString()}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof json?.error === 'string' ? json.error : `오류 (${res.status})`);
      }
      setData(json);
    } catch (e) {
      setLoadError(e.message || '불러오지 못했습니다.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [reqId, custId, reqBusSeq]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (auctionGateModal) {
        setAuctionGateModal(null);
        return;
      }
      close?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close, auctionGateModal]);

  const resStat = data?.resStat ?? null;
  const editOk = canEditBid(custId, resStat);
  const badgeLabel = resStat != null ? RES_STAT_LABEL[String(resStat).toUpperCase()] ?? resStat : '';

  const sortedVia = [...(data?.viaPoints || [])].sort(
    (a, b) => Number(a.viaSeq) - Number(b.viaSeq)
  );

  const submitBid = async () => {
    if (!custId || !editOk || updating) return;
    setUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(null);
    try {
      const res = await fetch(`${API_BASE}/api/traveler-quote-request-details/bid`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reqId: String(reqId).trim(),
          custId,
          reqBusSeq,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 409 && (json?.code === 'REQ_BUS_NOT_AUCTION' || String(json?.error || '').includes('견적 응찰'))) {
        setAuctionGateModal(String(json.error || ''));
        return;
      }
      if (!res.ok && Array.isArray(json.modalLines) && json.modalLines.length > 0) {
        setAuctionGateModal(json.modalLines.join('\n'));
        return;
      }
      if (!res.ok) {
        throw new Error(typeof json?.error === 'string' ? json.error : `오류 (${res.status})`);
      }
      if (json?.success) {
        const mom = json.momMember;
        if (mom?.disableFurtherBid === true) {
          setBidLockedAfterMom(true);
        }
        setUpdateSuccess(mom?.ackMessage || json.message || '처리되었습니다.');
        if (json.isNewReservation === true) {
          window.setTimeout(() => {
            onBidInsertSuccess?.();
            close?.();
          }, 5000);
        } else {
          window.setTimeout(() => {
            setUpdateSuccess(null);
            fetchData();
          }, 3000);
        }
      }
    } catch (e) {
      setUpdateError(e.message || '저장에 실패했습니다.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <>
      {auctionGateModal && (
        <div className="fixed inset-0 z-[310] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="auction-gate-title"
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col gap-6"
          >
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-red-500 text-4xl shrink-0">error</span>
              <div>
                <h3 id="auction-gate-title" className="text-lg font-bold text-gray-900">
                  안내
                </h3>
                <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{auctionGateModal}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAuctionGateModal(null)}
              className="w-full py-3 rounded-full bg-teal-600 text-white text-sm font-black hover:bg-teal-700"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      <div
        className="fixed inset-0 z-[200] overflow-y-auto p-4 flex items-start justify-center bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        style={{ fontFamily: "'Manrope', 'Plus Jakarta Sans', sans-serif" }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="traveler-quote-detail-title"
          className="relative my-4 w-full max-w-6xl min-h-[600px] max-h-[95vh] flex flex-col rounded-3xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="shrink-0 flex items-center justify-between px-8 py-5 border-b border-gray-100">
            <div>
              <p
                className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-0.5"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Traveler Quote Detail
              </p>
              <h2 id="traveler-quote-detail-title" className="text-xl font-bold text-gray-900 font-headline">
                여행자 견적 상세
              </h2>
            </div>
            <button
              type="button"
              onClick={close}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
              aria-label="닫기"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-8 py-6">
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <span className="material-symbols-outlined text-teal-600 text-5xl animate-spin">progress_activity</span>
                <p className="text-sm font-bold text-gray-600">데이터를 불러오는 중...</p>
              </div>
            )}

            {!loading && loadError && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <span className="material-symbols-outlined text-red-400 text-5xl">error</span>
                <p className="text-sm font-bold text-red-600">{loadError}</p>
                <button
                  type="button"
                  onClick={fetchData}
                  className="px-6 py-2 rounded-full bg-teal-600 text-white text-sm font-bold"
                >
                  다시 시도
                </button>
              </div>
            )}

            {!loading && !loadError && data && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">여행지 및 경유지</p>
                  <div className="rounded-2xl border border-gray-100 shadow-sm p-8 border-l-4 border-l-teal-500 flex flex-col min-h-[340px]">
                    <div className="flex items-center gap-2 mb-4 shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                        <span className="material-symbols-outlined">route</span>
                      </div>
                      <span className="text-xs font-bold text-slate-500 uppercase">노선</span>
                    </div>
                    {sortedVia.length === 0 ? (
                      <p className="text-base font-semibold text-slate-400">-</p>
                    ) : (
                      <div className="min-h-[14rem] max-h-72 overflow-y-auto overscroll-contain pr-2 space-y-2 shrink-0">
                        {sortedVia.map((p) => {
                          const vt = String(p.viaType || '').toUpperCase();
                          const prefix = viaTypeColonPrefix(p.viaType);
                          const addr = (p.viaAddr && String(p.viaAddr).trim()) || '—';
                          const addrClass =
                            vt === 'START_WAY'
                              ? 'text-blue-600'
                              : vt === 'END_WAY'
                                ? 'text-red-600'
                                : 'text-gray-900';
                          return (
                            <p
                              key={`${p.viaSeq}-${String(p.viaType)}`}
                              className="text-base font-bold"
                            >
                              <span className="text-gray-900">{prefix} </span>
                              <span className={addrClass}>{addr}</span>
                            </p>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-8">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">요청 일정</p>
                    <div className="rounded-2xl border border-gray-100 p-6 space-y-6 shadow-sm">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600 shrink-0">
                          <span className="material-symbols-outlined">calendar_month</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold">날짜</p>
                          <p className="text-lg font-bold text-gray-900 leading-snug">
                            <span className="block">{formatDtShort(data.startDt)} ~</span>
                            <span className="block">{formatDtShort(data.endDt)}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600 shrink-0">
                          <span className="material-symbols-outlined">airport_shuttle</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold">차량 유형</p>
                          <p className="text-lg font-bold text-gray-900">
                            {data.busTypeName != null && String(data.busTypeName).trim() !== ''
                              ? String(data.busTypeName).trim()
                              : '여행 🚌'}
                            {Number(data.busCnt) > 1 ? ` × ${data.busCnt}대` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600 shrink-0">
                          <span className="material-symbols-outlined">group</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold">인원</p>
                          <p className="text-lg font-bold text-gray-900">{data.passengerCnt ?? '-'}명</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {!custId && (
                      <div className="flex gap-2 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
                        <span className="material-symbols-outlined shrink-0">warning</span>
                        <span>기사 식별(CUST_ID)이 없어 입찰을 등록할 수 없습니다.</span>
                      </div>
                    )}
                    {custId && !editOk && (
                      <div className="flex gap-2 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
                        <span className="material-symbols-outlined shrink-0">lock</span>
                        <span>
                          현재 예약 상태에서는 입찰을 수정할 수 없습니다.
                          {badgeLabel ? ` (${badgeLabel})` : ''}
                        </span>
                      </div>
                    )}
                    {updateError && (
                      <div className="flex gap-2 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-800">
                        <span className="material-symbols-outlined shrink-0">error</span>
                        <span>{updateError}</span>
                      </div>
                    )}
                    {updateSuccess && (
                      <div className="flex gap-2 rounded-xl bg-teal-50 border border-teal-100 p-4 text-sm text-teal-900">
                        <span className="material-symbols-outlined shrink-0">check_circle</span>
                        <span>{updateSuccess}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={updating || !editOk || !custId || bidLockedAfterMom}
                      onClick={submitBid}
                      className="w-full py-4 rounded-full text-base font-black bg-teal-600 text-white shadow-lg hover:bg-teal-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                    >
                      {updating ? '저장 중...' : '청약 정보 등록'}
                    </button>
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
