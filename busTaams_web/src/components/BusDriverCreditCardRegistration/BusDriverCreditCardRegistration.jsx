import React, { useCallback, useState, useRef, useEffect } from 'react';
import busLogo from '../../assets/images/BUSTAAM_FULL_LOGO.png';

const API_RAW = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';
const API_BASE = String(API_RAW).trim().replace(/\/$/, '') || 'http://127.0.0.1:8080';

/** 화면·DOM·JSON 공통 문자열 — 서버 `BUS_DRIVER_CREDIT_CARD_REGISTRATION_ID` 와 동일 */
export const BUS_DRIVER_CREDIT_CARD_REGISTRATION_SCREEN_ID = 'BusDriverCreditCardRegistration';

const PRIMARY = '#004D40';
const SURFACE = '#F2F2F2';

function digits(s) {
  return String(s || '').replace(/\D/g, '');
}

function clipGroup(v, max) {
  return digits(v).slice(0, max);
}

/** 카드 표기용: 영문 대문자·스페이스만 (한글·숫자 등 제거) */
function sanitizeCardholderName(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z ]/g, '')
    .replace(/\s+/g, ' ')
    .trimStart();
}

/**
 * Luhn(루운) 알고리즘 — PAN 형식 검증 (서버 `busDriverCreditCardRegistration.luhnValid` 와 동일)
 * 카드 번호 마지막 자리는 앞 숫자들의 체크섬(Check Digit)입니다. PG 통신 없이 오타 여부를 빠르게 걸러냅니다.
 */
function luhnValid(pan) {
  const d = digits(pan);
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = d.length - 1; i >= 0; i -= 1) {
    let n = parseInt(d[i], 10);
    if (Number.isNaN(n)) return false;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/** MM 두 자리일 때만 01~12 검사 (미완성 한 자리는 오류 표시 안 함) */
function expMonthValidRange01to12(mmStr) {
  if (mmStr.length !== 2) return true;
  const m = parseInt(mmStr, 10);
  return Number.isFinite(m) && m >= 1 && m <= 12;
}

/** 서버 expiryNotPast 와 동일: YY 는 서기 연도 끝 두 자리 기준 */
function expNotPast(mm, yy) {
  const m = parseInt(mm, 10);
  const y = parseInt(yy, 10);
  if (!Number.isFinite(m) || m < 1 || m > 12) return false;
  if (!Number.isFinite(y) || yy.length !== 2) return false;
  const now = new Date();
  const curY = now.getFullYear() % 100;
  const curM = now.getMonth() + 1;
  if (y > curY) return true;
  if (y < curY) return false;
  return m >= curM;
}

/**
 * 버스기사 신용카드 등록 모달 (`BusDriverCreditCardRegistration`)
 * POST `/api/bus-driver-credit-card-registration`
 */
const DUPLICATE_CARD_MESSAGE =
  '이미 등록된 카드 번호 입니다. 다른 카드 번호를 입력하세요!';

export function BusDriverCreditCardRegistration({ open, onClose, driverId, onRegistered }) {
  const sessionDriverId = (driverId != null && String(driverId).trim()) || '';
  const [cardNickname, setCardNickname] = useState('');
  const [g1, setG1] = useState('');
  const [g2, setG2] = useState('');
  const [g3, setG3] = useState('');
  const [g4, setG4] = useState('');
  const [holder, setHolder] = useState('');
  const [exp, setExp] = useState('');
  const [cvv, setCvv] = useState('');
  const [setDefault, setSetDefault] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [dupOpen, setDupOpen] = useState(false);
  /** 카드번호 필드 포커스 아웃 후 Luhn 검사 표시(13~15자리 등) */
  const [cardNumberBlurred, setCardNumberBlurred] = useState(false);

  const rNick = useRef(null);
  const r1 = useRef(null);
  const r2 = useRef(null);
  const r3 = useRef(null);
  const r4 = useRef(null);

  const reset = useCallback(() => {
    setCardNickname('');
    setG1('');
    setG2('');
    setG3('');
    setG4('');
    setHolder('');
    setExp('');
    setCvv('');
    setSetDefault(true);
    setErr(null);
    setDupOpen(false);
    setCardNumberBlurred(false);
  }, []);

  useEffect(() => {
    if (open) {
      reset();
      setTimeout(() => rNick.current?.focus(), 80);
    }
  }, [open, reset]);

  const cardNumberJoined = `${digits(g1)}${digits(g2)}${digits(g3)}${digits(g4)}`;

  /** 16자리 입력 완료 시 즉시, 그 외 13~15자리는 필드 포커스 아웃 후 경고 */
  const showCardLuhnError =
    cardNumberJoined.length >= 13 &&
    cardNumberJoined.length <= 16 &&
    !luhnValid(cardNumberJoined) &&
    (cardNumberJoined.length === 16 || cardNumberBlurred);

  const cardDigitInputClass =
    'w-full rounded-lg px-2 sm:px-3 py-2.5 text-center text-sm font-semibold tabular-nums focus:outline-none';
  const cardDigitNormal =
    'border border-slate-200 focus:ring-2 focus:ring-[#004D40]/30';
  const cardDigitLuhnError = 'border-2 border-red-500 ring-2 ring-red-200 focus:ring-red-300';

  const onChangeGroup = (raw, setter, nextRef) => {
    setCardNumberBlurred(false);
    const c = clipGroup(raw, 4);
    setter(c);
    if (c.length === 4 && nextRef?.current) nextRef.current.focus();
  };

  const onExpInput = (raw) => {
    const d = digits(raw).slice(0, 4);
    if (d.length <= 2) setExp(d);
    else setExp(`${d.slice(0, 2)}/${d.slice(2)}`);
  };

  const parseExp = () => {
    const d = digits(exp);
    if (d.length !== 4) return { mm: '', yy: '' };
    return { mm: d.slice(0, 2), yy: d.slice(2, 4) };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr(null);
    if (!sessionDriverId) {
      setErr('로그인(기사) 정보가 없습니다.');
      return;
    }
    if (!cardNickname.trim()) {
      setErr('카드 별칭(CARD_NICKNAME)을 입력해 주세요.');
      return;
    }
    if (cardNumberJoined.length < 13) {
      setErr('카드 번호를 모두 입력해 주세요.');
      return;
    }
    if (!luhnValid(cardNumberJoined)) {
      setErr('카드 번호 형식이 올바르지 않습니다. 숫자를 확인해 주세요.');
      return;
    }
    const { mm, yy } = parseExp();
    if (mm.length !== 2 || yy.length !== 2) {
      setErr('유효기간(MM/YY)을 입력해 주세요.');
      return;
    }
    if (!expMonthValidRange01to12(mm)) {
      setErr('유효기간 월(MM)은 01~12 사이여야 합니다.');
      return;
    }
    if (!expNotPast(mm, yy)) {
      setErr('유효기간이 현재 년·월보다 이전입니다. MM/YY를 확인해 주세요.');
      return;
    }
    const cv = digits(cvv);
    if (cv && cv.length !== 3 && cv.length !== 4) {
      setErr('CVV를 확인해 주세요.');
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`${API_BASE}/api/bus-driver-credit-card-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: sessionDriverId,
          CARD_NICKNAME: cardNickname.trim(),
          cardNumber: cardNumberJoined,
          expMonth: mm,
          expYear: yy,
          setAsDefault: setDefault,
          ...(cv ? { cvv: cv } : {}),
        }),
      });
      const text = await r.text();
      let json;
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        const hint = text && text.length < 200 ? text.trim() : `HTTP ${r.status}`;
        throw new Error(
          `서버 응답을 해석할 수 없습니다. (${hint}). API 경로·서버 재시작 여부를 확인하세요.`
        );
      }
      if (!r.ok) {
        const msg = typeof json?.error === 'string' ? json.error : `서버 오류 (${r.status})`;
        if (r.status === 409 || msg === DUPLICATE_CARD_MESSAGE) {
          setDupOpen(true);
          return;
        }
        throw new Error(msg);
      }
      const reg = json?.BusDriverCreditCardRegistration;
      if (!reg || reg.success !== true) {
        throw new Error('BusDriverCreditCardRegistration 응답이 올바르지 않습니다.');
      }
      onRegistered?.(json);
      onClose?.();
    } catch (e2) {
      setErr(e2.message || '카드를 등록하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const previewDigits = (cardNumberJoined || '••••••••••••')
    .replace(/(.{4})/g, '$1 ')
    .trim()
    .slice(0, 24);
  const prevHolder = holder.trim() || 'YOUR NAME';
  const prevNick = cardNickname.trim();

  const expDigits = digits(exp);
  const expMm = expDigits.slice(0, 2);
  const expYy = expDigits.slice(2, 4);
  const showExpMonthError = expDigits.length >= 2 && !expMonthValidRange01to12(expMm);
  const showExpPastError =
    expDigits.length === 4 &&
    expMonthValidRange01to12(expMm) &&
    !expNotPast(expMm, expYy);
  const showExpError = showExpMonthError || showExpPastError;

  return (
    <div
      className="fixed inset-0 z-[170] flex items-center justify-center p-3 sm:p-4 bg-slate-900/55 backdrop-blur-sm"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default border-0 p-0 bg-transparent"
        aria-label="배경 닫기"
        onClick={() => !saving && onClose?.()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="BusDriverCreditCardRegistration-title"
        id={BUS_DRIVER_CREDIT_CARD_REGISTRATION_SCREEN_ID}
        data-screen-id={BUS_DRIVER_CREDIT_CARD_REGISTRATION_SCREEN_ID}
        className="relative z-10 w-full max-w-5xl max-h-[min(96vh,920px)] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200/80"
        style={{ fontFamily: 'system-ui, sans-serif' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => !saving && onClose?.()}
          className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
          aria-label="닫기"
        >
          <span className="material-symbols-outlined text-[22px]">close</span>
        </button>

        <div className="p-5 sm:p-7 pt-14">
          <h1
            id="BusDriverCreditCardRegistration-title"
            className="text-lg sm:text-xl font-bold mb-6"
            style={{ color: PRIMARY }}
          >
            카드 정보 및 자동 결제 설정
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            {/* 좌측: 카드 미리보기 + 보안 안내 (~1/3) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div
                className="rounded-2xl px-4 py-5 text-white shadow-lg relative overflow-hidden min-h-[200px] flex flex-col justify-between"
                style={{
                  background: `linear-gradient(145deg, ${PRIMARY} 0%, #002e26 52%, #00352c 100%)`,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="h-9 w-11 rounded-md bg-gradient-to-br from-amber-200 via-amber-300 to-amber-400 shadow-inner border border-amber-500/30"
                    aria-hidden
                  />
                  <div className="flex flex-col items-end gap-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-white/80 truncate max-w-[10rem]">
                      {prevNick || '카드 별칭'}
                    </p>
                    <img
                      src={busLogo}
                      alt="busTaams"
                      className="h-8 w-auto max-w-[9rem] object-contain object-right brightness-0 invert opacity-95"
                    />
                  </div>
                </div>
                <p className="text-sm tracking-[0.12em] font-medium text-white/95 tabular-nums mt-4">
                  {previewDigits}
                </p>
                <div className="flex justify-between items-end mt-3 gap-3 text-[10px] sm:text-xs text-white/75">
                  <div>
                    <p className="uppercase text-[9px] tracking-wider mb-0.5">Card Holder</p>
                    <p className="text-white font-semibold text-sm tracking-wide line-clamp-1">{prevHolder}</p>
                  </div>
                  <div className="text-right">
                    <p className="uppercase text-[9px] tracking-wider mb-0.5">Expires</p>
                    <p className="text-white font-semibold tabular-nums text-sm">
                      {exp.trim() ? exp.replace(/\D/g, '').slice(0, 2) + ' / ' + exp.replace(/\D/g, '').slice(2, 4) : 'MM / YY'}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="rounded-xl p-4 border border-slate-200/80 space-y-2"
                style={{ backgroundColor: SURFACE }}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[22px]" style={{ color: PRIMARY }}>
                    verified_user
                  </span>
                  <span className="font-bold text-slate-800 text-sm">보안 안내</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  입력하신 모든 결제 정보는 전송 구간에서 보호되며, 카드 번호는 서버에{' '}
                  <strong>AES-256-GCM</strong>으로 암호화되어 저장됩니다. <strong>CVV</strong>는 저장하지
                  않습니다. 운영 시 PG 토큰화 연동을 권장합니다.
                </p>
                <div className="flex gap-3 pt-1 text-slate-500">
                  <span className="material-symbols-outlined text-[20px]" aria-hidden>
                    lock
                  </span>
                  <span className="material-symbols-outlined text-[20px]" aria-hidden>
                    dns
                  </span>
                </div>
              </div>
            </div>

            {/* 우측: 폼 (~2/3) */}
            <div className="lg:col-span-8">
              <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-5">
                <div>
                  <label htmlFor="CARD_NICKNAME" className="block text-xs font-bold text-slate-700 mb-2">
                    카드 별칭
                  </label>
                  <input
                    ref={rNick}
                    id="CARD_NICKNAME"
                    name="CARD_NICKNAME"
                    type="text"
                    autoComplete="off"
                    placeholder="예: 월회비용 카드"
                    maxLength={50}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#004D40]/30"
                    style={{ backgroundColor: SURFACE }}
                    value={cardNickname}
                    onChange={(e) => setCardNickname(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">카드 번호</label>
                  <div
                    className="grid grid-cols-4 gap-2 sm:gap-3"
                    role="group"
                    aria-invalid={showCardLuhnError}
                    aria-describedby={showCardLuhnError ? 'card-pan-luhn-hint' : undefined}
                  >
                    <input
                      ref={r1}
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      maxLength={4}
                      placeholder="0000"
                      className={`${cardDigitInputClass} ${showCardLuhnError ? cardDigitLuhnError : cardDigitNormal}`}
                      style={{ backgroundColor: SURFACE }}
                      value={g1}
                      onBlur={() => setCardNumberBlurred(true)}
                      onChange={(e) => onChangeGroup(e.target.value, setG1, r2)}
                    />
                    <input
                      ref={r2}
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="0000"
                      className={`${cardDigitInputClass} ${showCardLuhnError ? cardDigitLuhnError : cardDigitNormal}`}
                      style={{ backgroundColor: SURFACE }}
                      value={g2}
                      onBlur={() => setCardNumberBlurred(true)}
                      onChange={(e) => onChangeGroup(e.target.value, setG2, r3)}
                    />
                    <input
                      ref={r3}
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="0000"
                      className={`${cardDigitInputClass} ${showCardLuhnError ? cardDigitLuhnError : cardDigitNormal}`}
                      style={{ backgroundColor: SURFACE }}
                      value={g3}
                      onBlur={() => setCardNumberBlurred(true)}
                      onChange={(e) => onChangeGroup(e.target.value, setG3, r4)}
                    />
                    <input
                      ref={r4}
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="0000"
                      className={`${cardDigitInputClass} ${showCardLuhnError ? cardDigitLuhnError : cardDigitNormal}`}
                      style={{ backgroundColor: SURFACE }}
                      value={g4}
                      onBlur={() => setCardNumberBlurred(true)}
                      onChange={(e) => {
                        setCardNumberBlurred(false);
                        setG4(clipGroup(e.target.value, 4));
                      }}
                    />
                  </div>
                  {showCardLuhnError ? (
                    <p id="card-pan-luhn-hint" className="mt-1.5 text-xs font-semibold text-red-600">
                      카드 번호를 확인해 주세요. (체크섬 오류 — 잘못 입력되었을 수 있습니다.)
                    </p>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor="CARDHOLDER_NAME_LATIN"
                    className="block text-xs font-bold text-slate-700 mb-2"
                  >
                    카드 소유자 성명
                  </label>
                  <input
                    id="CARDHOLDER_NAME_LATIN"
                    type="text"
                    lang="en-US"
                    dir="ltr"
                    inputMode="latin"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    autoComplete="cc-name"
                    enterKeyHint="next"
                    placeholder="GILDONG HONG"
                    maxLength={50}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-[#004D40]/30"
                    style={{ backgroundColor: SURFACE }}
                    value={holder}
                    onChange={(e) => setHolder(sanitizeCardholderName(e.target.value))}
                    onFocus={(e) => {
                      const el = e.target;
                      requestAnimationFrame(() => {
                        try {
                          el.setSelectionRange(el.value.length, el.value.length);
                        } catch {
                          /* ignore */
                        }
                      });
                    }}
                  />
                  <p className="mt-1 text-[10px] text-slate-500 leading-snug">
                    영문 대문자만 반영됩니다. 모바일에서는 영문(라틴) 키보드가 뜨도록 브라우저에 요청하며, 기기 설정에 따라 한·영 전환이 필요할 수 있습니다.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="CARD_EXP_MMYY"
                      className="block text-xs font-bold text-slate-700 mb-2"
                    >
                      유효 기간 (MM/YY)
                    </label>
                    <input
                      id="CARD_EXP_MMYY"
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      placeholder="01 / 28"
                      aria-invalid={showExpError}
                      aria-describedby={
                        showExpMonthError || showExpPastError ? 'card-exp-hint' : undefined
                      }
                      className={`w-full rounded-lg px-3 py-2.5 text-sm tabular-nums focus:outline-none ${
                        showExpError
                          ? 'border-2 border-red-500 ring-2 ring-red-200 focus:ring-red-300'
                          : 'border border-slate-200 focus:ring-2 focus:ring-[#004D40]/30'
                      }`}
                      style={{ backgroundColor: SURFACE }}
                      value={exp}
                      onChange={(e) => onExpInput(e.target.value)}
                    />
                    {showExpMonthError ? (
                      <p id="card-exp-hint" className="mt-1.5 text-xs font-semibold text-red-600">
                        월(MM)은 01~12만 입력할 수 있습니다.
                      </p>
                    ) : showExpPastError ? (
                      <p id="card-exp-hint" className="mt-1.5 text-xs font-semibold text-red-600">
                        유효기간이 현재 년·월보다 이전입니다.
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-xs font-bold text-slate-700 mb-2">
                      CVV (3자리)
                      <span
                        className="material-symbols-outlined text-[16px] text-slate-400 cursor-help"
                        title="카드 뒷면 서명란 옆 숫자"
                      >
                        help
                      </span>
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      placeholder="•••"
                      maxLength={4}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#004D40]/30"
                      style={{ backgroundColor: SURFACE }}
                      value={cvv}
                      onChange={(e) => setCvv(digits(e.target.value).slice(0, 4))}
                    />
                  </div>
                </div>

                <div
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
                  style={{ backgroundColor: SURFACE }}
                >
                  <div>
                    <p className="text-sm font-bold text-slate-800">기본 결제 수단으로 설정</p>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                      정산 대금 차감 및 자동 구독료 결제 시 사용됩니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={setDefault}
                    onClick={() => setSetDefault((v) => !v)}
                    className="relative h-8 w-14 shrink-0 rounded-full transition-colors"
                    style={{ backgroundColor: setDefault ? PRIMARY : '#c5c5c5' }}
                  >
                    <span
                      className="absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform"
                      style={{ transform: setDefault ? 'translateX(1.5rem)' : 'translateX(0)' }}
                    />
                  </button>
                </div>

                {err ? (
                  <p className="text-sm text-red-600 font-medium bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {err}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3.5 rounded-xl text-white text-sm sm:text-base font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-95 transition-opacity"
                  style={{ backgroundColor: PRIMARY }}
                >
                  {saving ? '등록 중…' : '신용 카드 등록'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {dupOpen ? (
        <div
          className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-slate-900/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="BusDriverCreditCardRegistration-dup-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-200">
            <h2
              id="BusDriverCreditCardRegistration-dup-title"
              className="text-base font-bold text-slate-900 mb-3"
            >
              안내
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed mb-5">{DUPLICATE_CARD_MESSAGE}</p>
            <button
              type="button"
              onClick={() => setDupOpen(false)}
              className="w-full py-2.5 rounded-xl text-white text-sm font-bold"
              style={{ backgroundColor: PRIMARY }}
            >
              닫기
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default BusDriverCreditCardRegistration;
