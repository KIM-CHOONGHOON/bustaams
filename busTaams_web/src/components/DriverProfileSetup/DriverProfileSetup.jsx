import React, { useState, useRef, useEffect, useCallback } from 'react';
import { phoneAuth, RecaptchaVerifier, signInWithPhoneNumber, signOut } from '../../firebasePhoneVerify';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';

/** 국내 휴대전화 → E.164 (+82...) */
function toE164KR(phone) {
  const d = String(phone).replace(/\D/g, '');
  if (d.startsWith('82')) return `+${d}`;
  if (d.startsWith('0')) return `+82${d.slice(1)}`;
  if (d.length >= 9) return `+82${d}`;
  return `+82${d}`;
}

/** ScrollSpy / 앵커 스크롤용 단계 (좌측 네비) */
const STEPS = [
  { id: 1, label: '기본 인적사항' },
  { id: 2, label: '운전면허 정보' },
  { id: 3, label: '운송종사자 자격' },
];

const DriverProfileSetup = ({ currentUser, onBack }) => {
  const [formData, setFormData] = useState({
    name: currentUser?.userName || currentUser?.name || '',
    rrnFront: '',
    rrnBack: '',
    phoneNo: currentUser?.phoneNo || currentUser?.phoneNumber || currentUser?.hpNo || '',
    verificationCode: '',
    licenseType: '1종 대형',
    licenseNo: '',
    licenseSerialNo: '',
    licenseIssueDt: '2023-01-01',
    licenseExpiryDt: '2033-01-01',
    qualCertNo: '',
    bioText: ''
  });

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [qualCert, setQualCert] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneSmsSending, setPhoneSmsSending] = useState(false);
  const [phoneConfirmation, setPhoneConfirmation] = useState(null);
  const [phoneVerifiedIdToken, setPhoneVerifiedIdToken] = useState(null);
  const recaptchaVerifierRef = useRef(null);
  /** 서버에 저장된 기사 정보가 있으면 true — 면허/자격 블록 잠금에 사용 */
  const [profileExistsOnServer, setProfileExistsOnServer] = useState(false);
  /** true면 운전면허 정보 필드 읽기 전용(수정 버튼으로 해제) */
  const [licenseFieldsLocked, setLicenseFieldsLocked] = useState(false);
  /** true면 자격번호·자격증 업로드 읽기 전용 */
  const [qualFieldsLocked, setQualFieldsLocked] = useState(false);
  const [hasProfilePhotoOnServer, setHasProfilePhotoOnServer] = useState(false);
  const [hasQualCertFileOnServer, setHasQualCertFileOnServer] = useState(false);
  /** 저장 성공 안내 모달 */
  const [successModal, setSuccessModal] = useState({ open: false, message: '' });
  /** 1: 기본 인적사항(프로필사진~인적) 2: 면허 3: 운송자격+자기소개+제출 */
  const [activeStep, setActiveStep] = useState(1);

  const fileInputRef = useRef(null);
  const certInputRef = useRef(null);
  const scrollRef = useRef(null);
  const section1Ref = useRef(null);
  const section2Ref = useRef(null);
  const section3Ref = useRef(null);
  /** 각 단계 섹션 제목(h2) — 클릭 시 이 위치로 스크롤 */
  const title1Ref = useRef(null);
  const title2Ref = useRef(null);
  const title3Ref = useRef(null);

  const scrollToSection = useCallback((step) => {
    setActiveStep(step);
    const refs = [null, title1Ref, title2Ref, title3Ref];
    const el = refs[step]?.current;
    const container = scrollRef.current;
    if (!el || !container) return;
    const run = () => {
      const top =
        el.getBoundingClientRect().top -
        container.getBoundingClientRect().top +
        container.scrollTop;
      container.scrollTo({ top: Math.max(0, top - 12), behavior: 'smooth' });
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  }, []);

  /** 이 화면에서만 문서 전체 스크롤 차단 — 우측 폼만 스크롤, 좌측 1·2·3 버튼은 고정 */
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const prev = {
      htmlOverflow: html.style.overflow,
      htmlHeight: html.style.height,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverflow: body.style.overflow,
      bodyHeight: body.style.height,
      bodyOverscroll: body.style.overscrollBehavior,
      rootOverflow: root?.style.overflow ?? '',
      rootHeight: root?.style.height ?? '',
      rootMinH: root?.style.minHeight ?? '',
      rootDisplay: root?.style.display ?? '',
      rootFlex: root?.style.flexDirection ?? '',
    };
    html.style.overflow = 'hidden';
    html.style.height = '100%';
    html.style.overscrollBehavior = 'none';
    body.style.overflow = 'hidden';
    body.style.height = '100%';
    body.style.overscrollBehavior = 'none';
    if (root) {
      root.style.overflow = 'hidden';
      root.style.height = '100%';
      root.style.minHeight = '0';
      root.style.display = 'flex';
      root.style.flexDirection = 'column';
    }
    return () => {
      html.style.overflow = prev.htmlOverflow;
      html.style.height = prev.htmlHeight;
      html.style.overscrollBehavior = prev.htmlOverscroll;
      body.style.overflow = prev.bodyOverflow;
      body.style.height = prev.bodyHeight;
      body.style.overscrollBehavior = prev.bodyOverscroll;
      if (root) {
        root.style.overflow = prev.rootOverflow;
        root.style.height = prev.rootHeight;
        root.style.minHeight = prev.rootMinH;
        root.style.display = prev.rootDisplay;
        root.style.flexDirection = prev.rootFlex;
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      try {
        recaptchaVerifierRef.current?.clear?.();
      } catch (_) {
        /* ignore */
      }
      recaptchaVerifierRef.current = null;
    };
  }, []);

  /** 저장된 기사 정보 GET → 폼 채움 */
  useEffect(() => {
    const uid = currentUser?.userUuid || currentUser?.uuid;
    if (!uid) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/driver/profile-setup?userUuid=${encodeURIComponent(uid)}`
        );
        const data = await res.json();
        if (cancelled || !res.ok) return;
        if (data.userName || data.phoneNo) {
          setFormData((prev) => ({
            ...prev,
            name: data.userName || prev.name,
            phoneNo: data.phoneNo || prev.phoneNo,
          }));
        }
        if (!data.exists) {
          setProfileExistsOnServer(false);
          return;
        }
        setProfileExistsOnServer(true);
        setHasProfilePhotoOnServer(!!data.hasProfilePhoto);
        setHasQualCertFileOnServer(!!data.hasQualCertFile);
        setLicenseFieldsLocked(true);
        setQualFieldsLocked(true);
        setFormData((prev) => ({
          ...prev,
          name: data.userName || prev.name,
          phoneNo: data.phoneNo || prev.phoneNo,
          rrnFront: data.rrnFront || prev.rrnFront,
          rrnBack: data.rrnBack || prev.rrnBack,
          licenseType: data.licenseType || prev.licenseType,
          licenseNo: data.licenseNo ?? '',
          licenseSerialNo: data.licenseSerialNo ?? '',
          licenseIssueDt: data.licenseIssueDt || prev.licenseIssueDt,
          licenseExpiryDt: data.licenseExpiryDt || prev.licenseExpiryDt,
          qualCertNo: data.qualCertNo ?? '',
          bioText: data.bioText ?? prev.bioText,
        }));
      } catch (e) {
        console.error('기사 프로필 조회 실패:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const onScroll = () => {
      const refs = [null, section1Ref, section2Ref, section3Ref];
      const scrollTop = container.scrollTop;
      let next = 1;
      for (let s = 1; s <= 3; s++) {
        const el = refs[s]?.current;
        if (!el) continue;
        if (el.offsetTop <= scrollTop + 32) next = s;
      }
      setActiveStep((prev) => (prev === next ? prev : next));
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'rrnFront') {
      const v = value.replace(/\D/g, '').slice(0, 6);
      setFormData((prev) => ({ ...prev, rrnFront: v }));
      return;
    }
    if (name === 'rrnBack') {
      const v = value.replace(/\D/g, '').slice(0, 1);
      setFormData((prev) => ({ ...prev, rrnBack: v }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSendPhoneSms = async () => {
    if (!formData.phoneNo.trim()) {
      alert('휴대전화 번호를 입력해 주세요.');
      return;
    }
    setPhoneSmsSending(true);
    try {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (_) {
          /* ignore */
        }
        recaptchaVerifierRef.current = null;
      }
      recaptchaVerifierRef.current = new RecaptchaVerifier(phoneAuth, 'driver-phone-recaptcha', {
        size: 'invisible',
      });
      const e164 = toE164KR(formData.phoneNo);
      const confirmation = await signInWithPhoneNumber(phoneAuth, e164, recaptchaVerifierRef.current);
      setPhoneConfirmation(confirmation);
      setPhoneVerifiedIdToken(null);
      alert('인증번호가 발송되었습니다.');
    } catch (e) {
      console.error(e);
      alert(e?.message || 'SMS 발송에 실패했습니다.');
      try {
        recaptchaVerifierRef.current?.clear?.();
      } catch (_) {
        /* ignore */
      }
      recaptchaVerifierRef.current = null;
    } finally {
      setPhoneSmsSending(false);
    }
  };

  const handleConfirmPhoneCode = async () => {
    if (!phoneConfirmation || !formData.verificationCode.trim()) {
      alert('인증번호를 입력해 주세요.');
      return;
    }
    try {
      const result = await phoneConfirmation.confirm(formData.verificationCode.trim());
      const idToken = await result.user.getIdToken();
      setPhoneVerifiedIdToken(idToken);
      await signOut(phoneAuth);
      alert('휴대전화 인증이 완료되었습니다.');
    } catch (e) {
      console.error(e);
      alert('인증번호가 올바르지 않습니다.');
    }
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'profile') setProfilePhoto(reader.result);
      else setQualCert(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    const userUuid = currentUser?.userUuid || currentUser?.uuid;
    if (!userUuid) {
      alert('회원 식별 정보가 없습니다. 다시 로그인해 주세요.');
      return;
    }
    if (!/^\d{6}-\d{1}$/.test(`${formData.rrnFront}-${formData.rrnBack}`)) {
      alert('주민등록번호는 앞 6자리와 뒤 1자리만 입력해 주세요.');
      return;
    }
    setIsSubmitting(true);
    const wasExistingProfile = profileExistsOnServer;

    try {
      const payload = {
        userUuid,
        driverName: (formData.name || '').trim(),
        phoneIdToken: phoneVerifiedIdToken || undefined,
        rrn: `${formData.rrnFront}-${formData.rrnBack}`,
        licenseType: formData.licenseType,
        licenseNo: formData.licenseNo,
        licenseSerialNo: formData.licenseSerialNo || undefined,
        licenseIssueDt: formData.licenseIssueDt,
        licenseExpiryDt: formData.licenseExpiryDt,
        qualCertNo: formData.qualCertNo,
        bioText: formData.bioText,
        profilePhotoBase64: profilePhoto,
        qualCertBase64: qualCert
      };

      const res = await fetch(`${API_BASE}/api/driver/profile-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '프로필 저장 실패');

      if (!wasExistingProfile) {
        setProfileExistsOnServer(true);
        setLicenseFieldsLocked(true);
        setQualFieldsLocked(true);
      }
      setSuccessModal({
        open: true,
        message: wasExistingProfile
          ? '버스 기사 기본 정보가 수정 되었습니다.'
          : '버스 기사 기본 정보가 등록되었습니다.',
      });
    } catch (error) {
      console.error('Submit error:', error);
      alert(`오류: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitPrimaryLabel = profileExistsOnServer ? '수정' : '등록';

  return (
    <div className="bg-background font-body text-on-surface flex w-full flex-1 min-h-0 flex-col overflow-hidden">
      {successModal.open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onClick={() => setSuccessModal({ open: false, message: '' })}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="driver-profile-success-title"
            className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p
              id="driver-profile-success-title"
              className="text-center text-base font-bold text-on-surface leading-relaxed"
            >
              {successModal.message}
            </p>
            <button
              type="button"
              className="mt-8 w-full rounded-full bg-primary py-3.5 text-sm font-bold text-white shadow-md transition hover:opacity-95"
              onClick={() => setSuccessModal({ open: false, message: '' })}
            >
              확인
            </button>
          </div>
        </div>
      )}
      <div className="relative flex min-h-0 w-full min-w-0 flex-1 overflow-hidden">
        {/* 왼쪽 앱 메뉴: 전역 Header(h-24) 바로 아래 고정, 세로 스크롤 시에도 뷰에 유지 */}
        <aside
          className="fixed left-0 top-24 z-30 hidden h-[calc(100vh-6rem)] w-72 flex-col gap-4 overflow-y-auto border-r border-outline-variant/10 bg-slate-50/50 px-6 pb-6 pt-4 md:flex"
          aria-label="기사 앱 메뉴"
        >
          <div className="flex items-center gap-4 mb-6 p-2">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-container-high">
              <img 
                src={profilePhoto || "https://lh3.googleusercontent.com/aida-public/AB6AXuDyfbTDE22uiGCRoBcu6vYjS5bte5LQ3KVhR8FWfMLFJXmCHzeCxChnorafSXiXUvkCe1tZKgjTMlXo0iTcnLWwkJ-c8t9BuPz2eZr9z5ggj7FgP_FBqnPm6ae4zi6rIKJaYpGRuYTMa0pXO1AC9k_Kxv4MFrBVFhDvet6M1lVAZzGkaN2jCVSjE7DxdI3QQ1_6FILHflppumZBH2UU7regHdHtOlFFxUP6xDXiwNfFgD_OOR-e3ISRanILs6B1YLgCxiPH3aBXj3I"} 
                alt="프로필" 
                className="w-full h-full object-cover" 
              />
            </div>
            <div>
              <h3 className="font-headline font-bold text-primary leading-tight">{formData.name || '프리미엄 캡틴'}</h3>
              <p className="text-xs text-slate-500">인증 회원</p>
            </div>
          </div>
          <nav className="flex flex-col gap-2">
            <a className="flex items-center gap-3 p-3 text-slate-500 font-semibold" href="#"><span className="material-symbols-outlined">directions_bus</span>차량 관리</a>
            <a className="flex items-center gap-3 p-3 text-slate-500 font-semibold" href="#"><span className="material-symbols-outlined">gavel</span>실시간 입찰</a>
            <a className="flex items-center gap-3 p-3 text-slate-500 font-semibold" href="#"><span className="material-symbols-outlined">event_available</span>배차 내역</a>
            <a className="flex items-center gap-3 p-3 text-slate-500 font-semibold" href="#"><span className="material-symbols-outlined">payments</span>정산 관리</a>
            <a className="flex items-center gap-3 p-3 bg-white text-primary rounded-xl shadow-sm font-semibold" href="#"><span className="material-symbols-outlined">verified_user</span>인증 센터</a>
            <a className="flex items-center gap-3 p-3 text-slate-500 font-semibold" href="#"><span className="material-symbols-outlined">settings</span>설정</a>
          </nav>
        </aside>

        {/* Main: fixed 사이드바 폭만큼 여백(md:ml-72) */}
        <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden md:ml-72">
          {/* Firebase invisible reCAPTCHA용 컨테이너 (display:none 사용 금지) */}
          <div id="driver-phone-recaptcha" aria-hidden="true" />
          <header className="flex-shrink-0 z-20 px-4 md:px-8 lg:px-10 pt-4 pb-4 border-b border-outline-variant/10 bg-background">
            <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-primary tracking-tight mb-2">
              운전 기사 기본 정보
            </h2>
            <p className="text-on-surface-variant font-medium">
              busTaams의 프리미엄 캡틴이 되기 위한 필수 정보를 입력해주세요.
            </p>
            {profileExistsOnServer && (
              <p className="mt-2 text-sm font-medium text-primary">
                저장된 기사 정보를 불러왔습니다. 운전면허·운송종사자 자격은 「수정」을 눌러 변경할 수 있습니다.
              </p>
            )}
          </header>

          <div className="flex min-h-0 flex-1 flex-col items-stretch gap-6 overflow-hidden px-4 pb-4 pt-4 md:px-8 lg:flex-row lg:gap-8 lg:px-10">
            {/* 단계 버튼: 우측 scrollRef와 형제 — 뷰포트 고정 시 여기만 고정, 폼만 스크롤 */}
            <div className="hidden min-h-0 shrink-0 flex-col gap-8 self-stretch overflow-hidden border-r border-outline-variant/10 pr-6 lg:flex lg:w-72">
              <nav className="space-y-4" aria-label="등록 단계">
                {STEPS.map((step) => {
                  const active = activeStep === step.id;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      aria-current={active ? 'step' : undefined}
                      onClick={() => scrollToSection(step.id)}
                      className={`flex w-full items-center gap-4 rounded-xl p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                        active
                          ? 'bg-white text-primary shadow-md ring-1 ring-primary/10'
                          : 'bg-transparent text-slate-500 hover:bg-slate-100/70'
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          active
                            ? 'bg-primary text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {step.id}
                      </div>
                      <span
                        className={`font-bold ${
                          active ? 'text-primary' : 'font-semibold text-slate-500'
                        }`}
                      >
                        {step.label}
                      </span>
                    </button>
                  );
                })}
              </nav>
              <div className="mt-auto pt-6 border-t border-outline-variant/20">
                <div className="p-6 bg-secondary-container/10 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-secondary" />
                  <h4 className="font-headline font-bold text-secondary mb-2">주의사항</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    등록하신 정보는 관리자 승인 후 활성화됩니다. 허위 사실 기재 시 서비스 이용이 제한될 수 있습니다.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 flex-shrink-0 lg:hidden">
              {STEPS.map((step) => {
                const active = activeStep === step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    aria-current={active ? 'step' : undefined}
                    onClick={() => scrollToSection(step.id)}
                    className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                      active
                        ? 'border-primary bg-primary text-white'
                        : 'border-transparent bg-slate-100 text-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                        active ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {step.id}
                    </span>
                    <span className="whitespace-nowrap">{step.label}</span>
                  </button>
                );
              })}
            </div>

            <div
              ref={scrollRef}
              className="relative mx-auto w-full max-w-3xl min-h-0 min-w-0 flex-1 basis-0 touch-pan-y overflow-y-auto overscroll-y-contain pr-1 [scrollbar-gutter:stable] lg:pr-2"
            >
              <div ref={section1Ref} className="space-y-12">
              {/* Photo Upload */}
              <section className="bg-surface-container-lowest p-8 rounded-3xl shadow-[0_40px_60px_-15px_rgba(0,104,95,0.04)] relative">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-3xl bg-surface-container-high flex items-center justify-center overflow-hidden border-2 border-primary/10">
                      {profilePhoto ? (
                        <img src={profilePhoto} alt="미리보기" className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-4xl text-outline">add_a_photo</span>
                      )}
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={(e) => handleFileChange(e, 'profile')} 
                    />
                    <button 
                      onClick={() => fileInputRef.current.click()}
                      className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all"
                    >
                      <span className="material-symbols-outlined text-xl">edit</span>
                    </button>
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-xl font-headline font-bold text-primary mb-2">프로필 사진 업로드</h3>
                    <p className="text-sm text-on-surface-variant mb-4">고객에게 신뢰를 줄 수 있는 밝고 선명한 정면 사진을 권장합니다.</p>
                    {hasProfilePhotoOnServer && !profilePhoto && (
                      <p className="text-xs text-primary font-semibold mb-2">이미 서버에 등록된 프로필 사진이 있습니다. 새로 선택하면 교체됩니다.</p>
                    )}
                    <button 
                      onClick={() => fileInputRef.current.click()}
                      className="px-6 py-2 bg-surface-container-high text-primary font-bold rounded-full text-sm hover:bg-surface-container-highest transition-colors"
                    >
                      파일 선택
                    </button>
                  </div>
                </div>
              </section>

              {/* Personal Info */}
              <section className="space-y-6">
                <div className="flex items-baseline justify-between mb-4">
                  <h2
                    ref={title1Ref}
                    id="driver-step-title-1"
                    className="scroll-mt-4 text-2xl font-headline font-bold text-primary"
                  >
                    기본 인적사항
                  </h2>
                  <span className="text-xs text-secondary font-bold">* 필수 입력</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-on-surface-variant px-1">성명</label>
                    <input 
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full h-14 px-5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 transition-all font-bold" 
                      placeholder="홍길동" 
                      type="text" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-on-surface-variant px-1">주민등록번호</label>
                    <div className="flex items-center gap-2">
                      <input 
                        name="rrnFront"
                        value={formData.rrnFront}
                        onChange={handleChange}
                        maxLength={6}
                        className="w-full h-14 px-5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 text-center font-bold" 
                        placeholder="900101" 
                        type="text" 
                      />
                      <span>-</span>
                      <input 
                        name="rrnBack"
                        value={formData.rrnBack}
                        onChange={handleChange}
                        maxLength={1}
                        inputMode="numeric"
                        autoComplete="off"
                        className="w-14 shrink-0 h-14 px-2 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 text-center font-bold" 
                        placeholder="1" 
                        type="password" 
                        aria-label="주민등록번호 뒷자리 첫 번째 숫자"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-bold text-on-surface-variant px-1">휴대전화 번호</label>
                    <div className="flex flex-wrap gap-3 items-center">
                      <input 
                        name="phoneNo"
                        value={formData.phoneNo}
                        onChange={handleChange}
                        className="flex-1 min-w-[200px] h-14 px-5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 font-bold" 
                        placeholder="010-0000-0000" 
                        type="tel" 
                      />
                      <button
                        type="button"
                        onClick={handleSendPhoneSms}
                        disabled={phoneSmsSending}
                        className="px-8 h-14 shrink-0 bg-primary text-white font-bold rounded-xl active:scale-95 transition-all text-sm disabled:opacity-60"
                      >
                        {phoneSmsSending ? '발송 중…' : '인증번호 발송'}
                      </button>
                      {phoneVerifiedIdToken && (
                        <span className="text-xs font-bold text-primary">휴대전화 인증 완료</span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant px-1">
                      Firebase Authentication(Phone)으로 SMS를 발송합니다. 서버에 <code className="text-[11px]">FIREBASE_SERVICE_ACCOUNT_PATH</code>가 설정된 경우 제출 시 ID 토큰을 검증합니다.
                    </p>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-bold text-on-surface-variant px-1">인증번호 (6자리)</label>
                    <div className="flex flex-wrap gap-3">
                      <input 
                        name="verificationCode"
                        value={formData.verificationCode}
                        onChange={handleChange}
                        maxLength={6}
                        inputMode="numeric"
                        className="flex-1 min-w-[160px] h-14 px-5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 font-bold" 
                        placeholder="000000" 
                        type="text" 
                        autoComplete="one-time-code"
                      />
                      <button
                        type="button"
                        onClick={handleConfirmPhoneCode}
                        disabled={!phoneConfirmation}
                        className="px-8 h-14 shrink-0 bg-surface-container-high text-primary font-bold rounded-xl border border-primary/20 active:scale-95 transition-all text-sm disabled:opacity-50"
                      >
                        인증 확인
                      </button>
                    </div>
                  </div>
                </div>
              </section>
              </div>

              <div ref={section2Ref} className="pt-8">
              {/* License Info */}
              <section className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2
                    ref={title2Ref}
                    id="driver-step-title-2"
                    className="scroll-mt-4 text-2xl font-headline font-bold text-primary"
                  >
                    운전면허 정보
                  </h2>
                  {profileExistsOnServer && (
                    <button
                      type="button"
                      onClick={() => setLicenseFieldsLocked((v) => !v)}
                      className="shrink-0 rounded-full border border-primary/30 bg-white px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/5"
                    >
                      {licenseFieldsLocked ? '수정' : '수정 완료'}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-on-surface-variant px-1">면허 종류</label>
                    <select 
                      name="licenseType"
                      value={formData.licenseType}
                      onChange={handleChange}
                      disabled={profileExistsOnServer && licenseFieldsLocked}
                      className="w-full h-14 px-5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 appearance-none font-bold disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <option>1종 대형</option>
                      <option>1종 보통</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-on-surface-variant px-1">면허 번호</label>
                    <input 
                      name="licenseNo"
                      value={formData.licenseNo}
                      onChange={handleChange}
                      readOnly={profileExistsOnServer && licenseFieldsLocked}
                      className="w-full h-14 px-5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 font-bold read-only:cursor-default read-only:opacity-80" 
                      placeholder="00-00-000000-00" 
                      type="text" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-on-surface-variant px-1">발급 일자</label>
                    <input 
                      name="licenseIssueDt"
                      value={formData.licenseIssueDt}
                      onChange={handleChange}
                      readOnly={profileExistsOnServer && licenseFieldsLocked}
                      className="w-full h-14 px-5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 font-bold read-only:cursor-default read-only:opacity-80" 
                      type="date" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-on-surface-variant px-1">유효 기간</label>
                    <input 
                      name="licenseExpiryDt"
                      value={formData.licenseExpiryDt}
                      onChange={handleChange}
                      readOnly={profileExistsOnServer && licenseFieldsLocked}
                      className="w-full h-14 px-5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 font-bold read-only:cursor-default read-only:opacity-80" 
                      type="date" 
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-bold text-on-surface-variant px-1">암호일련번호 (면허증 우측 소형 사진 아래 영문·숫자)</label>
                    <input 
                      name="licenseSerialNo"
                      value={formData.licenseSerialNo}
                      onChange={handleChange}
                      readOnly={profileExistsOnServer && licenseFieldsLocked}
                      className="w-full h-14 px-5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 font-bold read-only:cursor-default read-only:opacity-80" 
                      placeholder="진위 확인(도로교통공단·경찰청 연계 API) 시 사용" 
                      type="text" 
                      autoComplete="off"
                    />
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      운전면허 진위 확인에는 면허번호·성명·생년월일·암호일련번호 대조가 필요합니다. 공공데이터포털 「운전면허정보 자동검증시스템」 또는 민간 연동(CODEF 등) API 도입 시 서버에서 호출합니다.
                    </p>
                  </div>
                </div>
              </section>
              </div>

              <div ref={section3Ref} className="pt-8">
              {/* Qualification */}
              <section className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2
                    ref={title3Ref}
                    id="driver-step-title-3"
                    className="scroll-mt-4 text-2xl font-headline font-bold text-primary"
                  >
                    운송종사자 자격 정보
                  </h2>
                  {profileExistsOnServer && (
                    <button
                      type="button"
                      onClick={() => setQualFieldsLocked((v) => !v)}
                      className="shrink-0 rounded-full border border-primary/30 bg-white px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/5"
                    >
                      {qualFieldsLocked ? '수정' : '수정 완료'}
                    </button>
                  )}
                </div>
                <div className="p-8 bg-surface-container-lowest rounded-3xl shadow-[0_40px_60px_-15px_rgba(0,104,95,0.04)]">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-on-surface-variant px-1">버스운전 자격번호</label>
                      <input 
                        name="qualCertNo"
                        value={formData.qualCertNo}
                        onChange={handleChange}
                        readOnly={profileExistsOnServer && qualFieldsLocked}
                        className="w-full h-14 px-5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 font-bold read-only:cursor-default read-only:opacity-80" 
                        placeholder="자격번호를 입력하세요" 
                        type="text" 
                      />
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        진위 확인은 한국교통안전공단(TS) 데이터를 활용합니다. 공공데이터포털 「한국교통안전공단_운수종사자 자격증 진위여부 확인 API」로 성명·생년월일·자격증 번호를 조회할 수 있습니다(버스·택시·화물 등 운수종사 자격 공통).
                      </p>
                    </div>
                    <div className="flex flex-col gap-4">
                      <p className="text-sm font-bold text-on-surface-variant">자격증 사본 업로드</p>
                      {hasQualCertFileOnServer && !qualCert && (
                        <p className="text-xs font-semibold text-primary">이미 서버에 등록된 자격증 파일이 있습니다. 새로 선택하면 교체됩니다.</p>
                      )}
                      <input 
                        type="file" 
                        ref={certInputRef} 
                        className="hidden" 
                        accept="image/*,application/pdf" 
                        onChange={(e) => handleFileChange(e, 'cert')} 
                      />
                      <div 
                        onClick={() => {
                          if (profileExistsOnServer && qualFieldsLocked) return;
                          certInputRef.current?.click();
                        }}
                        className={`w-full h-40 border-2 border-dashed border-outline-variant rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors group ${
                          profileExistsOnServer && qualFieldsLocked
                            ? 'cursor-not-allowed bg-slate-50/80 opacity-70'
                            : 'cursor-pointer hover:bg-slate-50'
                        }`}
                      >
                        {qualCert ? (
                          <div className="flex items-center gap-2 text-primary font-bold">
                            <span className="material-symbols-outlined">description</span>
                            <span>파일이 선택되었습니다</span>
                          </div>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-3xl text-outline group-hover:text-primary transition-colors">cloud_upload</span>
                            <span className="text-sm text-outline-variant font-medium">JPG, PNG, PDF (최대 5MB)</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Bio / Strengths */}
              <section className="space-y-6 pt-8 mt-2">
                <h2 className="text-2xl font-headline font-bold text-primary">자기소개 및 강점</h2>
                <textarea 
                  name="bioText"
                  value={formData.bioText}
                  onChange={handleChange}
                  className="w-full h-40 px-5 py-4 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 transition-all font-medium resize-none" 
                  placeholder="당신의 15년 이상의 경력과 안전 노하우를 기재해주세요. 예: '15년 경력의 베테랑 기사로서 고객의 안전을 최우선으로 생각합니다...'" 
                />
              </section>

              {/* Action Buttons */}
              <footer className="flex items-center justify-end gap-4 pt-12">
                <button 
                  onClick={onBack}
                  className="px-10 py-4 font-bold text-primary hover:bg-surface-container-high rounded-full transition-all"
                >
                  취소
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-12 py-4 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? '처리 중...' : submitPrimaryLabel}
                </button>
              </footer>
            </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DriverProfileSetup;
