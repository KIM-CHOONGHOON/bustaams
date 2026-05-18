import React, { useState, useEffect, useCallback } from 'react';
import { BusDriverCreditCardRegistration } from '../BusDriverCreditCardRegistration/BusDriverCreditCardRegistration';

const API_RAW = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';
const API_BASE = String(API_RAW).trim().replace(/\/$/, '') || 'http://127.0.0.1:8080';

/** `BillingSubscription.html`·`GET /api/billing-subscription`·DOM `id` 공통 문자열 */
export const BILLING_SUBSCRIPTION_SCREEN_ID = 'BillingSubscription';

const DEFAULT_INTRO =
  '등록 결제수단과 기사 월 회비·결제 내역을 확인합니다.';

const PAY_STAT_LABEL = {
  PENDING: '대기',
  SUCCESS: '결제완료',
  FAILED: '실패',
  REFUNDED: '환불',
  CANCELLED: '취소',
};

function formatYyyymm(yyyymm) {
  const s = String(yyyymm || '').trim();
  if (s.length !== 6) return s || '—';
  const y = s.slice(0, 4);
  const m = s.slice(4, 6);
  return `${y}.${m}`;
}

function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function formatDateDot(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}.${m}.${day}`;
  } catch {
    return '—';
  }
}

function TealCreditCardVisual({ card }) {
  const nickname = card?.nickname?.trim() || 'BUS 기사 카드';
  const last4 = card?.lastFour || '····';
  const em = String(card?.expMonth || '').padStart(2, '0');
  const ey = card?.expYear || '—';

  return (
    <div
      className="relative overflow-hidden rounded-2xl px-4 py-5 text-white shadow-lg"
      style={{
        background: 'linear-gradient(145deg, #0f766e 0%, #042f2e 55%, #134e4a 100%)',
        minHeight: '168px',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="material-symbols-outlined text-[28px] text-white/90" aria-hidden>
          contactless
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/85 text-right max-w-[10rem] leading-tight">
          {nickname}
        </span>
      </div>
      <p className="mt-6 text-sm sm:text-base tracking-[0.2em] font-medium text-white/95 tabular-nums">
        ···· ···· ···· {last4}
      </p>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-[10px] text-white/60 mb-0.5">만료일</p>
          <p className="text-sm font-semibold tabular-nums">
            {em}/{ey}
          </p>
        </div>
        <span className="text-xs font-black italic tracking-tight text-white/90">VISA</span>
      </div>
    </div>
  );
}

/**
 * 카드 및 월회비 (기사)
 * 멤버십 제목·요금: API `membershipHeading`, `monthlyFeeKrw` (서버가 TB_USER·TB_DRIVER_DETAIL·TB_COMMON_CODE 기준 조립)
 */
export function BillingSubscription({ open, onClose, driverId }) {
  const sessionDriverId = (driverId != null && String(driverId).trim()) || '';
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [payload, setPayload] = useState(null);
  const [primaryPickOpen, setPrimaryPickOpen] = useState(false);
  const [primarySaving, setPrimarySaving] = useState(false);
  const [showBusDriverCreditCardRegistration, setShowBusDriverCreditCardRegistration] = useState(false);

  const fetchBilling = useCallback(async () => {
    if (!sessionDriverId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const r = await fetch(
        `${API_BASE}/api/billing-subscription?driverId=${encodeURIComponent(sessionDriverId)}`
      );
      const text = await r.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error('응답 형식이 올바르지 않습니다.');
      }
      if (!r.ok) {
        throw new Error(typeof json?.error === 'string' ? json.error : `서버 오류 (${r.status})`);
      }
      const bs = json.BillingSubscription;
      if (!bs || typeof bs !== 'object') {
        throw new Error('BillingSubscription 필드가 없습니다.');
      }
      setPayload(bs);
    } catch (e) {
      setLoadError(e.message || '불러오지 못했습니다.');
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [sessionDriverId]);

  useEffect(() => {
    if (open && sessionDriverId) fetchBilling();
  }, [open, sessionDriverId, fetchBilling]);

  useEffect(() => {
    if (!open) setShowBusDriverCreditCardRegistration(false);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (showBusDriverCreditCardRegistration) setShowBusDriverCreditCardRegistration(false);
        else if (primaryPickOpen) setPrimaryPickOpen(false);
        else onClose?.();
      }
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, primaryPickOpen, showBusDriverCreditCardRegistration]);

  const applyPrimaryCard = async (cardSeq) => {
    if (!sessionDriverId || primarySaving) return;
    setPrimarySaving(true);
    try {
      const r = await fetch(`${API_BASE}/api/billing-subscription/primary-card`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: sessionDriverId, cardSeq }),
      });
      const text = await r.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error('응답 형식이 올바르지 않습니다.');
      }
      if (!r.ok) {
        throw new Error(typeof json?.error === 'string' ? json.error : `서버 오류 (${r.status})`);
      }
      const bs = json.BillingSubscription;
      if (bs && typeof bs === 'object') setPayload(bs);
      setPrimaryPickOpen(false);
    } catch (e) {
      window.alert(e.message || '메인 카드를 바꾸지 못했습니다.');
    } finally {
      setPrimarySaving(false);
    }
  };

  if (!open) return null;

  const intro =
    typeof payload?.introText === 'string' && payload.introText.trim()
      ? payload.introText.trim()
      : DEFAULT_INTRO;

  const feeLabelKo =
    typeof payload?.feePolicyLabelKo === 'string' && payload.feePolicyLabelKo.trim()
      ? payload.feePolicyLabelKo.trim()
      : null;

  const monthlyFeeKrw = payload?.monthlyFeeKrw;
  const feeKnown =
    Boolean(feeLabelKo) && monthlyFeeKrw != null && Number.isFinite(Number(monthlyFeeKrw));
  const feeAmount = feeKnown ? Math.round(Number(monthlyFeeKrw)) : null;
  const membershipHeading =
    typeof payload?.membershipHeading === 'string' && payload.membershipHeading.trim()
      ? payload.membershipHeading.trim()
      : `${payload?.driverUserNmTrunc10 || '기사'} : 기사님 (등급없음)`;

  const paymentCards = Array.isArray(payload?.paymentCards) ? payload.paymentCards : [];
  const paymentHistory = Array.isArray(payload?.paymentHistory) ? payload.paymentHistory : [];
  const primaryCard = paymentCards.find((c) => c.isPrimary) || paymentCards[0] || null;
  const secondaryCards = paymentCards.filter((c) => primaryCard && c.cardSeq !== primaryCard.cardSeq);

  const nonPrimaryChoices = paymentCards.filter((c) => !c.isPrimary);
  const showPrimaryChange = paymentCards.length > 1;

  /** 등급명(CD_NM_KO)이 있을 때만 '등급 있음'으로 간주 (코드만 있고 명칭 없으면 제목은 등급없음과 동일 취급) */
  const hasGradeFromDb = Boolean(feeLabelKo);

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 bg-gray-900/50 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default border-0 p-0 bg-transparent"
        aria-label="배경 닫기"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-6xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 sm:right-3 sm:top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md hover:bg-slate-50"
          aria-label="닫기"
        >
          <span className="material-symbols-outlined text-[22px]">close</span>
        </button>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="BillingSubscription-title"
          id={BILLING_SUBSCRIPTION_SCREEN_ID}
          data-screen-id={BILLING_SUBSCRIPTION_SCREEN_ID}
          className="max-h-[min(94vh,calc(100vh-2rem))] overflow-y-auto rounded-2xl border border-slate-200 bg-white px-4 pb-4 pt-12 shadow-2xl sm:px-6 sm:pb-5 sm:pt-14"
          style={{ fontFamily: 'system-ui, sans-serif' }}
          onClick={(e) => e.stopPropagation()}
        >
          <h1 id="BillingSubscription-title" className="text-lg sm:text-xl font-bold text-slate-900 mb-0.5">
            카드 및 월회비
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mb-4 sm:mb-6">{intro}</p>

          {!sessionDriverId && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              로그인(기사) 정보가 없어 결제 정보를 불러올 수 없습니다.
            </p>
          )}

          {sessionDriverId && loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
              <span className="material-symbols-outlined text-4xl animate-spin">progress_activity</span>
              <p className="text-sm font-medium">불러오는 중…</p>
            </div>
          )}

          {sessionDriverId && !loading && loadError && (
            <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-center mb-4">
              <p className="text-sm text-red-600 font-medium mb-3">{loadError}</p>
              <button
                type="button"
                onClick={fetchBilling}
                className="px-4 py-2 rounded-full bg-teal-700 text-white text-sm font-bold"
              >
                다시 시도
              </button>
            </div>
          )}

          {sessionDriverId && !loading && !loadError && payload && (
            <>
              {/* 상단: 멤버십 | 결제 수단 */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
                {/* 좌: 멤버십 플랜 */}
                <section className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm relative">
                  <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
                    {feeKnown || hasGradeFromDb ? (
                      <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200/80">
                        사용중
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        미설정
                      </span>
                    )}
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 pr-20 leading-snug">
                    {membershipHeading}
                  </h2>
                  <div className="mt-3 space-y-2 text-[10px] sm:text-[10px] md:text-[11px] font-semibold text-red-600 leading-snug">
                    <p>
                      월회비는 매월 말일까지 적용되며, 중간에 해지하거나 등급을 변경해도 해당 월까지는 기존
                      등급과 혜택이 유지됩니다.
                    </p>
                    <p>
                      회원 등급 변경 및 정액권 전환은 예약 방식으로 진행되어 익월 1일 자동 결제 시점에 최종
                      반영됩니다.
                    </p>
                  </div>
                  {feeKnown ? (
                    <p className="mt-4 text-2xl sm:text-3xl font-extrabold tabular-nums text-slate-900">
                      ₩{feeAmount.toLocaleString('ko-KR')}
                      <span className="text-sm sm:text-base font-semibold text-slate-500">/월</span>
                    </p>
                  ) : (
                    <p className="mt-4 text-base sm:text-lg font-semibold text-slate-600">
                      월회비 대상 회원 아님
                    </p>
                  )}
                </section>

                {/* 우: 결제 수단 */}
                <section className="lg:col-span-5 rounded-2xl border border-slate-200 bg-slate-50/90 p-4 sm:p-5 shadow-sm flex flex-col gap-4">
                  <h2 className="text-sm font-bold text-slate-800">결제 수단</h2>

                  {primaryCard ? (
                    <TealCreditCardVisual card={primaryCard} />
                  ) : (
                    <div
                      className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-100/80 flex flex-col items-center justify-center py-10 px-4 text-center text-slate-500 text-sm"
                      style={{ minHeight: '168px' }}
                    >
                      등록된 카드가 없습니다.
                    </div>
                  )}

                  {secondaryCards.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        다른 등록 카드
                      </p>
                      <ul className="flex flex-col gap-2 max-h-32 overflow-y-auto pr-1">
                        {secondaryCards.map((c) => (
                          <li
                            key={c.cardSeq}
                            className="flex items-center justify-between gap-2 rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs"
                          >
                            <span className="font-medium text-slate-700 truncate">
                              <span className="text-slate-400 mr-1.5">등록</span>
                              {c.nickname || '카드'} ··· {c.lastFour || '····'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 mt-auto">
                    <button
                      type="button"
                      disabled={!showPrimaryChange || primarySaving}
                      onClick={() => setPrimaryPickOpen(true)}
                      className="w-full py-2.5 rounded-xl text-sm font-bold bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      메인 카드 변경
                    </button>
                    <button
                      type="button"
                      disabled={!sessionDriverId}
                      onClick={() => setShowBusDriverCreditCardRegistration(true)}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold border-2 border-dashed border-slate-300 text-slate-700 bg-white flex items-center justify-center gap-1.5 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      새 카드 등록
                    </button>
                  </div>
                </section>
              </div>

              {/* 하단: 최근 결제 내역 (전폭) */}
              <section className="mt-5 sm:mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <h2 className="text-sm font-bold text-slate-800">최근 결제 내역</h2>
                  <button
                    type="button"
                    disabled
                    className="text-xs font-semibold text-teal-700 hover:text-teal-800 disabled:opacity-40 cursor-not-allowed"
                    title="추가 예정"
                  >
                    전체 내역 보기
                  </button>
                </div>
                {paymentHistory.length === 0 ? (
                  <p className="text-sm text-slate-500 py-8 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    아직 결제 이력이 없습니다.
                  </p>
                ) : (
                  <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-100 -mx-1 sm:mx-0 overscroll-y-contain">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[11px] sm:text-xs min-w-[640px]">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                          <th className="px-2 sm:px-3 py-2.5 font-semibold whitespace-nowrap">
                            결제 날짜
                          </th>
                          <th className="px-2 sm:px-3 py-2.5 font-semibold whitespace-nowrap">
                            결제 항목
                          </th>
                          <th className="px-2 sm:px-3 py-2.5 font-semibold whitespace-nowrap">
                            승인 번호
                          </th>
                          <th className="px-2 sm:px-3 py-2.5 font-semibold whitespace-nowrap text-right">
                            금액
                          </th>
                          <th className="px-2 sm:px-3 py-2.5 font-semibold whitespace-nowrap text-center">
                            상태 / 영수증
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentHistory.map((row) => {
                          const payDate = row.payCompletedDt || row.payReqDt;
                          const itemLabel = `월 회비 (${formatYyyymm(row.billingYyyymm)})`;
                          const auth = row.pgTxnId?.trim() || '—';
                          return (
                            <tr key={row.payHistSeq} className="border-b border-slate-50 last:border-0">
                              <td className="px-2 sm:px-3 py-2.5 tabular-nums text-slate-700 whitespace-nowrap">
                                {formatDateDot(payDate)}
                              </td>
                              <td className="px-2 sm:px-3 py-2.5 text-slate-800">
                                <span className="inline-flex items-center gap-1.5">
                                  <span
                                    className="material-symbols-outlined text-emerald-600 text-base shrink-0"
                                    aria-hidden
                                  >
                                    credit_card
                                  </span>
                                  <span className="font-medium">{itemLabel}</span>
                                </span>
                              </td>
                              <td className="px-2 sm:px-3 py-2.5 text-slate-600 font-mono text-[10px] sm:text-xs max-w-[7rem] truncate" title={auth}>
                                {auth}
                              </td>
                              <td className="px-2 sm:px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">
                                ₩{Number(row.payAmt || 0).toLocaleString('ko-KR')}
                              </td>
                              <td className="px-2 sm:px-3 py-2.5">
                                <div className="flex items-center justify-center gap-2 flex-wrap">
                                  <span
                                    className={
                                      row.payStat === 'SUCCESS'
                                        ? 'text-teal-700 font-semibold whitespace-nowrap'
                                        : row.payStat === 'FAILED'
                                          ? 'text-red-600 font-medium'
                                          : 'text-slate-600'
                                    }
                                  >
                                    {PAY_STAT_LABEL[row.payStat] || row.payStat}
                                  </span>
                                  <button
                                    type="button"
                                    disabled
                                    className="text-slate-300 cursor-not-allowed p-0.5 rounded border border-transparent"
                                    title="영수증 다운로드 준비 중"
                                    aria-label="영수증"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">
                                      download
                                    </span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    </div>
                  </div>
                )}
              </section>

              {payload.infoMessage ? (
                <p className="text-xs text-slate-500 leading-relaxed mt-4 px-0.5">{payload.infoMessage}</p>
              ) : null}
            </>
          )}

          {primaryPickOpen && sessionDriverId && (
            <div
              className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/40"
              role="presentation"
              onClick={() => !primarySaving && setPrimaryPickOpen(false)}
            >
              <div
                className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 border border-slate-200"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-labelledby="primary-card-picker-title"
              >
                <h3 id="primary-card-picker-title" className="font-bold text-slate-900 mb-3">
                  메인으로 사용할 카드 선택
                </h3>
                <ul className="space-y-2 max-h-64 overflow-y-auto mb-4">
                  {nonPrimaryChoices.map((c) => (
                    <li key={`pick-${c.cardSeq}`}>
                      <button
                        type="button"
                        disabled={primarySaving}
                        onClick={() => applyPrimaryCard(c.cardSeq)}
                        className="w-full text-left rounded-xl border border-slate-200 px-3 py-2.5 hover:bg-slate-50 text-sm disabled:opacity-50"
                      >
                        <span className="font-medium text-slate-800">{c.nickname || '카드'}</span>
                        <span className="text-slate-500 ml-2 tabular-nums">···· {c.lastFour || '····'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={primarySaving}
                  onClick={() => setPrimaryPickOpen(false)}
                  className="w-full py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          <BusDriverCreditCardRegistration
            open={showBusDriverCreditCardRegistration}
            onClose={() => setShowBusDriverCreditCardRegistration(false)}
            driverId={sessionDriverId}
            onRegistered={(json) => {
              const bs = json?.BillingSubscription;
              if (bs && typeof bs === 'object') setPayload(bs);
            }}
          />

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 border border-slate-200"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BillingSubscription;
