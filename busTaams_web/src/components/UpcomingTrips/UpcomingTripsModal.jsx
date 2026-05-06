import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';

const HERO_BUS_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAFNbD2MhViKTB-huVKuX48jKzT1qP7BqSalR2IWalnBw4H0fbVtAY_yegJlN4INjY6yz79hoGjDXycigGvBZs-Z53ktwl9Rnmr5n7pEhG5SMYTKgay8WKXy4h_hLUga197DAbU0eWCKBRfeCIX-KI7AHw0xG3OGK_djbBCYIq_NNgds6JQ-5Ez4IfHGFqOZ9ZqrZtRhiaxEX2wCef2dRPdHwmDnwL_g6XqvVQJhwA9ZlgKD-NLe3AtbpWPwa2Ju2VWdx_VMAQPVVY';
const AVATAR_SAMPLE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCW20rG76NPeE9_KgGAlWRN1aWdGBXtPHikEQ4JEfdAhpZa7LBOTgtizx7lAlBctZGzbop1ld_VjBJ8ND3z7hkgLhGNiB-7gours4tVocvDyxupAf5EeVrFtwOYth8_W2zYgCzKVCmpk9gltAgFZ7wFEMIIvVmSg9NcvEM3SLaeh23GdwQllxEk0iQOEiVFmop7NPVi2UpQ_ZR4JNzSTU7deWhfwepAAORSVpVcXs2AK5mKwytFWwmvNjXIUsBEAwRIA8GYObLdUHI';

function formatDateKorean(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const w = weekdays[d.getDay()];
  return `${y}/${mo}/${day} (${w})`;
}

function formatTimeKorean(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/** 보조 카드: `14:00 출발` 형식 (원본 HTML과 동일) */
function formatDepartureHm(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m} 출발`;
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

function formatCapacityPassenger(item) {
  const n = Number(item?.passengerCnt);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return `${n}인승 (만차)`;
}

/**
 * UpcomingTrips — `downloads/bustaams_web/운행예정목록_기사/UpcomingTrips.html` 레이아웃을 React 모달로 이식 (모양·글꼴·항목 유지).
 * 데이터: GET /api/upcoming-trips
 */
const UpcomingTripsModal = ({ open, onClose, driverId, onTravelerQuoteDetail }) => {
  const sessionDriverId = (driverId != null && String(driverId).trim()) || '';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const fetchUpcomingTrips = useCallback(async () => {
    if (!sessionDriverId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const r = await fetch(
        `${API_BASE}/api/upcoming-trips?driverId=${encodeURIComponent(sessionDriverId)}`
      );
      if (!r.ok) {
        let msg = `서버 오류 (${r.status})`;
        try {
          const j = await r.json();
          if (j.error) msg = j.error;
        } catch (_) {
          /* ignore */
        }
        setLoadError(msg);
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
  }, [sessionDriverId]);

  useEffect(() => {
    if (open && sessionDriverId) fetchUpcomingTrips();
  }, [open, sessionDriverId, fetchUpcomingTrips]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const total = items.length;
  const hero = items[0];
  const rest = items.slice(1);
  const weeklySum = items.reduce((s, it) => s + (Number(it.contractAmount) || 0), 0);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-6 overflow-y-auto font-body text-on-surface"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upcoming-trips-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default border-0 p-0"
        aria-label="닫기"
        onClick={onClose}
      />
      <div className="upcoming-trips-modal relative z-10 w-full max-w-7xl my-4 sm:my-8 bg-white rounded-2xl shadow-2xl overflow-hidden tonal-stacking max-h-[min(95vh,calc(100vh-2rem))] overflow-y-auto">
        <style>{`
          .upcoming-trips-modal .tonal-stacking { box-shadow: 0 20px 40px -15px rgba(0, 104, 95, 0.08); }
          .upcoming-trips-modal .kinetic-gradient { background: linear-gradient(135deg, #004e47 0%, #00685f 100%); }
          .upcoming-trips-modal .accent-gradient { background: linear-gradient(135deg, #9d4300 0%, #ff8d4b 100%); }
          .upcoming-trips-modal .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        `}</style>

        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full text-on-surface hover:bg-slate-100 transition-colors"
          aria-label="닫기"
        >
          <span className="material-symbols-outlined text-2xl" aria-hidden>
            close
          </span>
        </button>

        <div className="p-8 pt-14 lg:p-12 lg:pt-16 max-w-7xl w-full mx-auto">
          <section className="mb-12">
            <div className="max-w-xl">
              <span className="text-secondary font-bold tracking-widest uppercase text-xs">운행 요약</span>
              <h3 id="upcoming-trips-title" className="text-5xl font-headline font-extrabold text-on-surface mt-2 leading-tight">
                운행 예정 목록
              </h3>
              <p className="text-on-surface-variant mt-4 text-lg">
                {loading
                  ? '일정을 불러오는 중입니다…'
                  : loadError
                    ? loadError
                    : `이번 주 ${total}건의 운행이 확정되었습니다. 안전 운행을 위해 세부 사항을 확인해주세요.`}
              </p>
            </div>
          </section>

          <div className="flex gap-8 mb-10 border-b-0">
            <button type="button" className="text-xl font-headline font-bold text-primary border-b-4 border-primary pb-2">
              전체 일정
            </button>
            <button
              type="button"
              className="text-xl font-headline font-medium text-outline hover:text-on-surface-variant pb-2 transition-colors"
            >
              완료된 운행
            </button>
          </div>

          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-8">
              {!loading && !hero && (
                <p className="text-center text-on-surface-variant py-16 mb-8 rounded-[2rem] bg-surface-container-low border border-outline-variant/30">
                  등록된 운행 예정 일정이 없습니다.
                </p>
              )}

              {hero && (
                <div className="relative group bg-surface-container-lowest rounded-[2rem] overflow-hidden tonal-stacking mb-8">
                  <div className="flex flex-col md:flex-row h-full">
                    <div className="md:w-2/5 relative h-64 md:h-auto overflow-hidden">
                      <img
                        alt="프리미엄 버스"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        src={HERO_BUS_IMG}
                      />
                      <div className="absolute top-6 left-6 accent-gradient text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        운행 예정
                      </div>
                    </div>
                    <div className="md:w-3/5 p-8 flex flex-col justify-between">
                      <div className="border-l-4 border-secondary pl-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-on-surface-variant font-medium mb-1">{formatDateKorean(hero.startDt)}</p>
                            <h4 className="text-3xl font-headline font-extrabold text-on-surface mb-4">
                              {scheduleRouteTitle(hero)}
                            </h4>
                          </div>
                          <div className="text-right">
                            <span className="text-sm text-outline block">계약 금액</span>
                            <span className="text-2xl font-headline font-extrabold text-primary">
                              ₩{Number(hero.contractAmount || 0).toLocaleString('ko-KR')}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6 mt-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary">
                              <span className="material-symbols-outlined">groups</span>
                            </div>
                            <div>
                              <p className="text-xs text-outline">인원</p>
                              <p className="text-sm font-bold">{formatCapacityPassenger(hero)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary">
                              <span className="material-symbols-outlined">schedule</span>
                            </div>
                            <div>
                              <p className="text-xs text-outline">출발 시간</p>
                              <p className="text-sm font-bold">{formatTimeKorean(hero.startDt)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-4 mt-8">
                        <button
                          type="button"
                          onClick={() => hero.reqId && onTravelerQuoteDetail?.(hero.reqId)}
                          className="flex-1 kinetic-gradient text-white py-4 rounded-full font-bold shadow-md hover:shadow-xl transition-all"
                        >
                          운행 상세 확인
                        </button>
                        <button
                          type="button"
                          className="px-6 py-4 rounded-full bg-surface-container-high text-on-surface-variant font-bold hover:bg-surface-container-highest transition-colors"
                        >
                          기사 배정
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {rest.map((it, idx) => {
                  const isSecondStyle = idx % 2 === 0;
                  return (
                    <div
                      key={it.reqId || idx}
                      className="bg-surface-container-lowest p-6 rounded-[1.5rem] tonal-stacking hover:translate-y-[-4px] transition-transform duration-300"
                    >
                      {isSecondStyle ? (
                        <>
                          <div className="flex justify-between items-start mb-4">
                            <span className="bg-surface-container-high text-on-surface-variant text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                              운행 확정
                            </span>
                            <span className="text-primary font-bold">
                              ₩{Number(it.contractAmount || 0).toLocaleString('ko-KR')}
                            </span>
                          </div>
                          <h5 className="text-xl font-headline font-bold text-on-surface">{scheduleRouteTitle(it)}</h5>
                          <p className="text-sm text-on-surface-variant mt-1">
                            {formatDateKorean(it.startDt)} | {formatDepartureHm(it.startDt)}
                          </p>
                          <div className="mt-6 pt-4 border-t border-dashed border-outline-variant flex justify-between items-center">
                            <div className="flex -space-x-2">
                              <img
                                className="w-8 h-8 rounded-full border-2 border-white object-cover"
                                alt=""
                                src={AVATAR_SAMPLE}
                              />
                              <div className="w-8 h-8 rounded-full border-2 border-white bg-surface-container-highest flex items-center justify-center text-[10px] font-bold">
                                +2
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => it.reqId && onTravelerQuoteDetail?.(it.reqId)}
                              className="text-primary font-bold text-sm flex items-center gap-1 group"
                            >
                              상세보기
                              <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
                                arrow_forward
                              </span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between items-start mb-4">
                            <span className="bg-surface-container-high text-on-surface-variant text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                              대기 중
                            </span>
                            <span className="text-primary font-bold">
                              ₩{Number(it.contractAmount || 0).toLocaleString('ko-KR')}
                            </span>
                          </div>
                          <h5 className="text-xl font-headline font-bold text-on-surface">{scheduleRouteTitle(it)}</h5>
                          <p className="text-sm text-on-surface-variant mt-1">
                            {formatDateKorean(it.startDt)} | {formatDepartureHm(it.startDt)}
                          </p>
                          <div className="mt-6 pt-4 border-t border-dashed border-outline-variant flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-secondary text-sm">warning</span>
                              <span className="text-xs text-secondary font-medium">잔금 결제 대기 중</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => it.reqId && onTravelerQuoteDetail?.(it.reqId)}
                              className="text-primary font-bold text-sm flex items-center gap-1 group"
                            >
                              상세보기
                              <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
                                arrow_forward
                              </span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4 space-y-8">
              <div className="bg-primary text-white p-8 rounded-[2rem] shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                  <h6 className="text-primary-fixed font-bold tracking-widest uppercase text-xs mb-4">주간 요약</h6>
                  <p className="text-3xl font-headline font-extrabold mb-8">
                    예상 주간 수익
                    <br />
                    ₩{weeklySum.toLocaleString('ko-KR')}
                  </p>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-primary-fixed/80">총 운행 거리</span>
                      <span className="font-bold">1,240 km</span>
                    </div>
                    <div className="w-full bg-primary-container h-2 rounded-full overflow-hidden">
                      <div className="bg-[#85d5c9] h-full w-[75%]" />
                    </div>
                    <div className="flex justify-between text-xs text-primary-fixed/60">
                      <span>목표 달성률</span>
                      <span>75%</span>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-primary-container rounded-full opacity-20" />
              </div>

              <div className="px-6 py-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-outline font-medium">
                <a className="hover:text-primary" href="#">
                  개인정보 처리방침
                </a>
                <a className="hover:text-primary" href="#">
                  이용 약관
                </a>
                <a className="hover:text-primary" href="#">
                  쿠키 설정
                </a>
                <span>© 2024 busTaams</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpcomingTripsModal;
