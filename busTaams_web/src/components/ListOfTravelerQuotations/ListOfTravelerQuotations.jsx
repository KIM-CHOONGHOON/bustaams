import React, { useState, useEffect, useCallback } from 'react';
import TravelerQuoteRequestDetails from '../TravelerQuoteRequestDetails/TravelerQuoteRequestDetails';

/**
 * 여행자 견적 목록 (ListOfTravelerQuotations)
 * - 운전기사 대시보드 → 바로가기 메뉴 → 「여행자 견적 목록」 클릭 시 호출
 * - GET /api/list-of-traveler-quotations?driverUuid= — BIDDING + 기사별 동일출발일 제외(CONFIRM)
 * - 항목 클릭 → TravelerQuoteRequestDetails 모달 호출 (reqId 전달)
 * - 배경 클릭으로 닫히지 않음 / X 버튼·닫기 버튼으로만 닫힘
 */
const ListOfTravelerQuotations = ({ close, currentUser }) => {
  const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selectedReqId, setSelectedReqId] = useState(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const driverUuid =
        currentUser?.uuid || currentUser?.userUuid || currentUser?.USER_UUID_STR;
      const q = driverUuid
        ? `?driverUuid=${encodeURIComponent(driverUuid)}`
        : '';
      const res = await fetch(`${API_BASE}/api/list-of-traveler-quotations${q}`);
      if (!res.ok) throw new Error(`서버 오류 (${res.status})`);
      const json = await res.json();
      setItems(json.items || []);
    } catch (err) {
      setLoadError(err.message || '목록을 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [API_BASE, currentUser]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const formatDt = (dtStr) => {
    if (!dtStr) return '-';
    const d = new Date(dtStr);
    if (isNaN(d)) return dtStr;
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[150] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        <div className="absolute inset-0" aria-hidden="true" />

        <div
          className="relative my-auto flex flex-col w-full max-w-4xl max-h-[90vh] rounded-3xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
            <div>
              <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-0.5">
                List of Traveler Quotations
              </p>
              <h2 className="text-xl font-bold text-gray-900">여행자 견적 목록</h2>
            </div>
            <button
              type="button"
              onClick={close}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
              aria-label="닫기"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>

          {/* 콘텐츠 */}
          <div className="flex-1 overflow-y-auto px-8 py-6">

            {/* 요약 바 */}
            {!loading && !loadError && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-teal-50 border border-teal-100 flex items-center gap-3">
                <span className="material-symbols-outlined text-teal-600 text-[20px]">sell</span>
                <span className="text-sm font-semibold text-teal-800">
                  {items.length > 0
                    ? `현재 입찰 가능한 역경매 견적 요청이 ${items.length}건 있습니다.`
                    : '현재 입찰 가능한 견적 요청이 없습니다.'}
                </span>
              </div>
            )}

            {/* 로딩 */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-400">
                <span className="material-symbols-outlined text-[48px] animate-spin">progress_activity</span>
                <p className="text-sm font-medium">견적 목록을 불러오는 중…</p>
              </div>
            )}

            {/* 오류 */}
            {!loading && loadError && (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-red-400">
                <span className="material-symbols-outlined text-[48px]">error_outline</span>
                <p className="text-sm font-medium">{loadError}</p>
                <button
                  onClick={fetchList}
                  className="mt-2 px-5 py-2 rounded-full bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition-colors"
                >
                  다시 시도
                </button>
              </div>
            )}

            {/* 빈 목록 */}
            {!loading && !loadError && items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-400">
                <span className="material-symbols-outlined text-[48px]">inbox</span>
                <p className="text-sm font-medium">현재 입찰 가능한 견적 요청이 없습니다.</p>
              </div>
            )}

            {/* 목록 카드 */}
            {!loading && !loadError && items.length > 0 && (
              <div className="space-y-4">
                {items.map((item) => (
                  <button
                    key={item.reqId}
                    type="button"
                    onClick={() => setSelectedReqId(item.reqId)}
                    className="w-full text-left rounded-2xl border border-gray-100 bg-white hover:border-teal-200 hover:shadow-md transition-all duration-200 p-5 group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* 왼쪽: 여정 정보 */}
                      <div className="flex-1 min-w-0">
                        {/* 여정 제목 + 상태 배지 */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base font-bold text-gray-900 group-hover:text-teal-700 transition-colors truncate">
                            {item.tripTitle || `${item.startAddr} → ${item.endAddr}`}
                          </span>
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                            BIDDING
                          </span>
                        </div>
                        {/* 노선 */}
                        {item.tripTitle && (
                          <p className="text-xs text-gray-500 mb-2 truncate">
                            {item.startAddr} → {item.endAddr}
                          </p>
                        )}

                        {/* 세부 정보 그리드 */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <span className="material-symbols-outlined text-[15px]">calendar_today</span>
                            <span>출발: <span className="font-medium text-gray-700">{formatDt(item.startDt)}</span></span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <span className="material-symbols-outlined text-[15px]">event_available</span>
                            <span>도착: <span className="font-medium text-gray-700">{formatDt(item.endDt)}</span></span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <span className="material-symbols-outlined text-[15px]">group</span>
                            <span>탑승: <span className="font-medium text-gray-700">{item.passengerCnt}명</span></span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <span className="material-symbols-outlined text-[15px]">directions_bus</span>
                            <span>{item.busType} <span className="font-medium text-gray-700">× {item.busCnt}대</span></span>
                          </div>
                          {item.waypointCount > 0 && (
                            <div className="flex items-center gap-1.5 text-gray-500">
                              <span className="material-symbols-outlined text-[15px]">route</span>
                              <span>경유지: <span className="font-medium text-gray-700">{item.waypointCount}곳</span></span>
                            </div>
                          )}
                          {item.estTotalServicePrice > 0 && (
                            <div className="flex items-center gap-1.5 text-teal-600">
                              <span className="material-symbols-outlined text-[15px]">payments</span>
                              <span className="font-bold">개산 총액: ₩{Number(item.estTotalServicePrice).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 오른쪽: 등록일 + 화살표 */}
                      <div className="shrink-0 flex flex-col items-end gap-2">
                        <div className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-gray-50 text-gray-500 border border-gray-200">
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">schedule</span>
                            등록
                          </div>
                          <div className="text-center mt-0.5">{formatDt(item.regDt)}</div>
                        </div>
                        <span className="material-symbols-outlined text-gray-300 group-hover:text-teal-500 transition-colors text-[20px]">
                          chevron_right
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 하단 푸터 */}
          <div className="flex justify-end px-8 py-4 border-t border-gray-100 bg-gray-50/50">
            <button
              type="button"
              onClick={close}
              className="px-6 py-2.5 rounded-full border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>

      {/* 상세 모달 */}
      {selectedReqId && (
        <TravelerQuoteRequestDetails
          reqId={selectedReqId}
          close={() => setSelectedReqId(null)}
          currentUser={currentUser}
        />
      )}
    </>
  );
};

export default ListOfTravelerQuotations;
