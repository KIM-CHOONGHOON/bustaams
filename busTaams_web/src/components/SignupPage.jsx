import React, { useState, useEffect, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';

const SignupPage = ({ onBack }) => {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
  const sigCanvas = useRef(null);

  const [userRole, setUserRole] = useState('traveler'); // 'traveler' | 'salesperson' | 'driver'
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [recomCode, setRecomCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isSmsLoading, setIsSmsLoading] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Error states
  const [idError, setIdError] = useState('');
  const [idSuccess, setIdSuccess] = useState('');
  const [isIdVerified, setIsIdVerified] = useState(false);
  const [isIdChecking, setIsIdChecking] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordConfirmError, setPasswordConfirmError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [smsError, setSmsError] = useState('');
  const [smsSuccess, setSmsSuccess] = useState('');
  const [formError, setFormError] = useState('');

  const [agreements, setAgreements] = useState({
    all: false, 
    term1: false,     // 통합 이용약관
    term2: false,     // 개인정보 수집·이용 동의
    marketing: false, // 마케팅 수신 동의
    contract: false   // 가입 계약서 (여행자/기사/영업)
  });

  // Timer
  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const validateEmail = (v) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const validatePassword = (v) =>
    /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/.test(v);

  const handleAllAgree = (e) => {
    const c = e.target.checked;
    setAgreements({ all: c, term1: c, term2: c, marketing: c, contract: c });
  };

  const handleAgreeChange = (key) => (e) => {
    const c = e.target.checked;
    setAgreements(prev => {
      const next = { ...prev, [key]: c };
      // 필수 약관들 + 선택 약관이 모두 체크되었을 때만 '전체 동의' true
      next.all = next.term1 && next.term2 && next.marketing && next.contract;
      return next;
    });
  };

  // 필수 약관 동의 여부 확인 (서명 패드 활성화용)
  const isRequiredAgreed = agreements.term1 && agreements.term2 && agreements.contract;

  const handleIdCheck = async () => {
    if (!userId.trim()) { setIdError('아이디를 입력해주세요.'); return; }
    setIsIdChecking(true); setIdError(''); setIdSuccess('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/check-id?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (res.ok && data.isAvailable) {
        setIdSuccess('사용 가능한 아이디입니다.');
        setIsIdVerified(true);
      } else {
        setIdError(data.message || '이미 사용 중인 아이디입니다.');
        setIsIdVerified(false);
      }
    } catch {
      setIdError('중복 확인 중 오류가 발생했습니다.');
      setIsIdVerified(false);
    } finally {
      setIsIdChecking(false);
    }
  };

  const handleSendSms = async () => {
    if (!phoneNumber.trim()) { setPhoneError('휴대폰 번호를 입력해주세요.'); return; }
    const cleaned = phoneNumber.replace(/-/g, '');
    if (!/^01[016789]\d{7,8}$/.test(cleaned)) {
      setPhoneError('올바른 휴대폰 번호를 입력해주세요.');
      return;
    }
    setPhoneError(''); setSmsError(''); setSmsSuccess('');
    setIsSmsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/send-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: cleaned })
      });
      const data = await res.json();
      if (res.ok) {
        setTimer(180);
        setSmsSuccess(data.message || '인증번호가 전송되었습니다.');
      } else {
        setPhoneError(data.error || 'SMS 전송에 실패했습니다.');
      }
    } catch {
      setPhoneError('SMS 전송 중 오류가 발생했습니다.');
    } finally {
      setIsSmsLoading(false);
    }
  };

  const handleVerifySms = async () => {
    if (!verificationCode.trim()) { setSmsError('인증번호를 입력해주세요.'); return; }
    setSmsError('');
    try {
      const cleaned = phoneNumber.replace(/-/g, '');
      const res = await fetch(`${API_BASE}/api/auth/verify-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: cleaned, code: verificationCode })
      });
      const data = await res.json();
      if (res.ok && data.verified) {
        setIsPhoneVerified(true);
        setTimer(0);
        setSmsSuccess('휴대폰 인증이 완료되었습니다.');
      } else {
        setSmsError(data.error || '인증번호가 일치하지 않습니다.');
      }
    } catch {
      setSmsError('인증 확인 중 오류가 발생했습니다.');
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('사진 크기는 2MB 이하여야 합니다.');
        return;
      }
      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureClear = () => {
    if (sigCanvas.current) { sigCanvas.current.clear(); setHasSignature(false); }
  };

  const handleSignatureEnd = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) setHasSignature(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    let valid = true;

    if (!isIdVerified) { setIdError('아이디 중복 확인을 해주세요.'); valid = false; }
    if (!email) { setEmailError('이메일을 입력해주세요.'); valid = false; }
    else if (!validateEmail(email)) { setEmailError('올바른 이메일 형식을 입력해주세요.'); valid = false; }
    else setEmailError('');
    if (!password) { setPasswordError('비밀번호를 입력해주세요.'); valid = false; }
    else if (!validatePassword(password)) { setPasswordError('8자 이상, 영문/숫자/특수문자를 포함해주세요.'); valid = false; }
    else setPasswordError('');
    if (password !== passwordConfirm) { setPasswordConfirmError('비밀번호가 일치하지 않습니다.'); valid = false; }
    else setPasswordConfirmError('');
    if (!isPhoneVerified) { setPhoneError('휴대폰 인증을 완료해주세요.'); valid = false; }
    if (userRole === 'driver' && !photoPreview) { setFormError('기사님 프로필 사진을 등록해 주세요.'); valid = false; }
    if (!hasSignature) { setFormError('전자 서명을 해주세요.'); valid = false; }
    if (!agreements.term1 || !agreements.term2) { setFormError('필수 약관에 동의해주세요.'); valid = false; }
    if (!valid) return;

    setIsLoading(true);
    try {
      const signatureBase64 = sigCanvas.current?.toDataURL('image/png').split(',')[1] || '';
      const agreedTerms = [];
      if (agreements.term1) agreedTerms.push(1);
      if (agreements.term2) agreedTerms.push(2);
      if (agreements.marketing) agreedTerms.push(3);
      if (agreements.contract) agreedTerms.push(4); // 가입 계약서

      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          userName,
          email,
          password,
          phoneNo: phoneNumber.replace(/-/g, ''),
          smsAuthYn: 'Y',
          userType: userRole === 'driver' ? 'DRIVER' : userRole === 'salesperson' ? 'SALESPERSON' : 'TRAVELER',
          agreedTerms,
          signatureBase64,
          photoBase64: photoPreview,
          photoName: profilePhoto?.name || 'profile.png',
          recomCode
        })
      });
      const data = await res.json();
      if (res.ok || res.status === 201) {
        alert('회원가입이 완료되었습니다! 로그인해주세요.');
        if (onBack) onBack();
      } else {
        setFormError(data.error || '회원가입에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      setFormError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif" }} className="min-h-screen flex flex-col md:flex-row bg-[#f7f9fb]">
      {/* ── Left Panel ── */}
      <section className="hidden md:flex md:w-5/12 lg:w-1/2 relative overflow-hidden" style={{ background: '#004e47' }}>
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=60"
            alt="Luxury Bus"
            className="w-full h-full object-cover opacity-40"
            style={{ mixBlendMode: 'overlay', transform: 'scale(1.05)' }}
          />
        </div>
        <div className="relative z-10 w-full h-full p-16 flex flex-col justify-between">
          <div>
            <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '3.5rem', color: '#fff', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
              BusTaams
            </h1>
          </div>
          <div style={{ maxWidth: '24rem' }}>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '1.75rem', color: '#a1f1e5', marginBottom: '1rem', lineHeight: 1.4 }}>
              고품격 버스 여행의<br />새로운 기준을 경험하세요.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.05rem' }}>
              검증된 드라이버 파트너와 함께<br />안전하고 프리미엄한 여행을 시작하세요.
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 right-0 w-32 h-32 opacity-20 blur-3xl rounded-full -mr-16 -mb-16" style={{ background: '#9d4300' }} />
      </section>

      {/* ── Right Panel: Form ── */}
      <section className="w-full md:w-7/12 lg:w-1/2 flex items-start justify-center p-6 md:p-12 lg:p-16 overflow-y-auto">
        <div className="w-full max-w-xl">
          {/* Mobile brand */}
          <div className="md:hidden mb-10">
            <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.75rem', color: '#004e47', letterSpacing: '-0.03em' }}>BusTaams</h1>
          </div>

          <div className="mb-8">
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '2.25rem', color: '#191c1e', letterSpacing: '-0.02em', marginBottom: '0.375rem' }}>회원가입</h2>
            <p style={{ color: '#3e4947' }}>busTaams 회원이 되어 독점적인 혜택을 누리세요.</p>
          </div>

          {/* Role Tabs */}
          <div style={{ display: 'flex', padding: '4px', background: '#e6e8ea', borderRadius: '9999px', marginBottom: '2rem', width: 'fit-content' }}>
            {[{ key: 'traveler', label: '일반고객(여행자)' }, { key: 'salesperson', label: '일반고객(영업사원)' }, { key: 'driver', label: '버스기사' }].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setUserRole(key)}
                style={{
                  padding: '0.5rem 1.75rem',
                  borderRadius: '9999px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: userRole === key ? 700 : 500,
                  fontSize: '0.875rem',
                  background: userRole === key ? '#fff' : 'transparent',
                  color: userRole === key ? '#004e47' : '#3e4947',
                  boxShadow: userRole === key ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* ── Section 1: Basic Info ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* 아이디 */}
              <div>
                <label style={labelStyle}>아이디</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <input
                    type="text"
                    value={userId}
                    onChange={e => { setUserId(e.target.value); setIsIdVerified(false); setIdSuccess(''); setIdError(''); }}
                    placeholder="아이디를 입력하세요"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button type="button" onClick={handleIdCheck} disabled={isIdChecking} style={outlineButtonStyle}>
                    {isIdChecking ? '확인 중...' : '중복 확인'}
                  </button>
                </div>
                {idError && <p style={errorTextStyle}>{idError}</p>}
                {idSuccess && <p style={successTextStyle}>{idSuccess}</p>}
              </div>

              {/* 이름 + 이메일 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>이름</label>
                  <input type="text" value={userName} onChange={e => setUserName(e.target.value)} placeholder="실명 입력" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>이메일</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@email.com" style={inputStyle} />
                  {emailError && <p style={errorTextStyle}>{emailError}</p>}
                </div>
              </div>

              {/* 비밀번호 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>비밀번호</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="8자 이상 조합" style={inputStyle} />
                  {passwordError && <p style={errorTextStyle}>{passwordError}</p>}
                </div>
                <div>
                  <label style={labelStyle}>비밀번호 확인</label>
                  <input type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} placeholder="비밀번호 재입력" style={inputStyle} />
                  {passwordConfirmError && <p style={errorTextStyle}>{passwordConfirmError}</p>}
                </div>
              </div>

              {/* 추천인 코드 + 프로필 사진 (버스기사 전용) */}
              {userRole === 'driver' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300 flex flex-col gap-6">
                  {/* 프로필 사진 업로드 */}
                  <div>
                    <label style={labelStyle}>프로필 사진 (필수)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: '#fff', padding: '1.25rem', borderRadius: '1rem', border: '1px solid rgba(0,78,71,0.1)' }}>
                      <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', background: '#eceef0', overflow: 'hidden', border: '3px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                        {photoPreview ? (
                          <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectCover: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bec9c6' }}>
                            <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#191c1e', marginBottom: '0.25rem' }}>전문적인 인상을 주는 사진을 권장합니다.</p>
                        <p style={{ fontSize: '0.75rem', color: '#6e7977', marginBottom: '0.75rem' }}>JPG, PNG (최대 2MB)</p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoChange}
                          id="photo-upload"
                          style={{ display: 'none' }}
                        />
                        <label htmlFor="photo-upload" style={{ ...outlineButtonStyle, padding: '0.6rem 1rem', display: 'inline-block', cursor: 'pointer' }}>
                          사진 선택하기
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* 추천인 아이디 */}
                  <div>
                    <label style={labelStyle}>추천인 아이디 (선택)</label>
                    <input
                      type="text"
                      value={recomCode}
                      onChange={e => setRecomCode(e.target.value)}
                      placeholder="추천인 아이디를 입력해주세요"
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── Section 2: Phone Verification ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', paddingTop: '0.5rem' }}>
              <label style={labelStyle}>휴대폰 번호 인증</label>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="010-0000-0000"
                  disabled={isPhoneVerified}
                  style={{ ...inputStyle, flex: 1, opacity: isPhoneVerified ? 0.6 : 1 }}
                />
                <button
                  type="button"
                  onClick={handleSendSms}
                  disabled={isSmsLoading || isPhoneVerified}
                  style={{
                    padding: '0.875rem 1.25rem',
                    background: isPhoneVerified ? '#ccc' : 'linear-gradient(135deg, #9d4300 0%, #ff8d4b 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.625rem',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: isPhoneVerified ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: isPhoneVerified ? 'none' : '0 4px 12px rgba(157,67,0,0.2)',
                    transition: 'all 0.2s'
                  }}
                >
                  {isSmsLoading ? '전송 중...' : '인증번호 전송'}
                </button>
              </div>

              {phoneError && <p style={errorTextStyle}>{phoneError}</p>}

              {(timer > 0 || isPhoneVerified) && (
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={e => setVerificationCode(e.target.value)}
                      placeholder="인증번호 6자리"
                      disabled={isPhoneVerified}
                      style={{ ...inputStyle, width: '100%', opacity: isPhoneVerified ? 0.6 : 1 }}
                    />
                    {timer > 0 && !isPhoneVerified && (
                      <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#ba1a1a', fontWeight: 700, fontSize: '0.8rem' }}>
                        {formatTime(timer)}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifySms}
                    disabled={isPhoneVerified}
                    style={{ ...outlineButtonStyle, opacity: isPhoneVerified ? 0.5 : 1, cursor: isPhoneVerified ? 'not-allowed' : 'pointer' }}
                  >
                    {isPhoneVerified ? '완료' : '확인'}
                  </button>
                </div>
              )}

              {smsError && <p style={errorTextStyle}>{smsError}</p>}
              {smsSuccess && <p style={successTextStyle}>{smsSuccess}</p>}
            </div>

            {/* ── Section 3: E-Signature ── */}
            <div style={{ paddingTop: '0.25rem', opacity: isRequiredAgreed ? 1 : 0.5 }}>
              <label style={labelStyle}>
                전자 서명 {!isRequiredAgreed && <span style={{ fontSize: '0.65rem', color: '#ba1a1a', fontWeight: 500 }}>(필수 약관에 먼저 동의해 주세요)</span>}
              </label>
              <div style={{ 
                position: 'relative', 
                width: '100%', 
                height: '10rem', 
                background: isRequiredAgreed ? '#eceef0' : '#f2f2f2', 
                borderRadius: '0.75rem', 
                border: isRequiredAgreed ? '2px dashed rgba(0,78,71,0.3)' : '2px dashed rgba(110,121,119,0.2)', 
                overflow: 'hidden', 
                marginTop: '0.5rem',
                pointerEvents: isRequiredAgreed ? 'auto' : 'none'
              }}>
                {!hasSignature && (
                  <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: 'rgba(25,28,30,0.3)', fontSize: '0.875rem', pointerEvents: 'none' }}>
                    {isRequiredAgreed ? '이곳에 서명해 주세요' : '약관 동의 후 서명이 가능합니다'}
                  </span>
                )}
                <SignatureCanvas
                  ref={sigCanvas}
                  onEnd={handleSignatureEnd}
                  canvasProps={{ width: 600, height: 160, style: { width: '100%', height: '100%' } }}
                  penColor="#004e47"
                />
                {isRequiredAgreed && (
                  <button
                    type="button"
                    onClick={handleSignatureClear}
                    style={{ position: 'absolute', top: '0.625rem', right: '0.625rem', padding: '0.375rem', background: 'transparent', border: 'none', color: '#3e4947', cursor: 'pointer', fontSize: '1rem' }}
                  >
                    ↺
                  </button>
                )}
              </div>
            </div>

            {/* ── Section 4: Terms ── */}
            <div style={{ paddingTop: '0.5rem', borderTop: '1px solid rgba(190,201,198,0.2)', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={agreements.all} onChange={handleAllAgree} style={{ width: '1.125rem', height: '1.125rem', accentColor: '#004e47' }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#191c1e' }}>모든 약관에 동의합니다</span>
              </label>
              <div style={{ paddingLeft: '1.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {[
                  { key: 'term1', label: '통합 이용약관 (필수)' },
                  { key: 'term2', label: '개인정보 수집 및 이용 동의 (필수)' },
                  { key: 'marketing', label: '마케팅 정보 수신 동의 (선택)' },
                  { 
                    key: 'contract', 
                    label: userRole === 'salesperson' ? '영업 회원 계약서 (필수)' : '여행자 가입 계약서 (필수)' 
                  }
                ].map(({ key, label }) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <input type="checkbox" checked={agreements[key]} onChange={handleAgreeChange(key)} style={{ width: '1rem', height: '1rem', accentColor: '#004e47' }} />
                      <span style={{ fontSize: '0.8rem', color: '#3e4947' }}>{label}</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#bec9c6' }}>›</span>
                  </label>
                ))}
              </div>
            </div>

            {formError && (
              <div style={{ padding: '0.875rem 1rem', background: '#ffdad6', borderRadius: '0.5rem', color: '#93000a', fontSize: '0.875rem', fontWeight: 600 }}>
                {formError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '1.125rem',
                background: isLoading ? '#ccc' : 'linear-gradient(135deg, #004e47 0%, #00685f 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '9999px',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: '1.05rem',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 8px 24px rgba(0,78,71,0.25)',
                transition: 'all 0.2s',
              }}
            >
              {isLoading ? '가입 처리 중...' : '가입 완료하기'}
            </button>
          </form>

          {/* Social Login */}
          <div style={{ position: 'relative', margin: '2.5rem 0', textAlign: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '100%', borderTop: '1px solid rgba(190,201,198,0.25)' }} />
            </div>
            <span style={{ position: 'relative', background: '#f7f9fb', padding: '0 1rem', fontSize: '0.7rem', fontWeight: 700, color: '#6e7977', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              간편 회원가입
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
            <button type="button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem', padding: '0.875rem', background: '#FEE500', color: '#3c1e1e', border: 'none', borderRadius: '0.625rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3C6.477 3 2 6.48 2 10.791c0 2.763 1.833 5.188 4.606 6.554l-.847 3.123c-.102.378.114.757.48.84.116.027.234.01.338-.04l3.65-2.428c.57.085 1.16.128 1.773.128 5.523 0 10-3.48 10-7.791C22 6.48 17.523 3 12 3z" /></svg>
              카카오로 시작
            </button>
            <button type="button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem', padding: '0.875rem', background: '#03C75A', color: '#fff', border: 'none', borderRadius: '0.625rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" /></svg>
              네이버로 시작
            </button>
          </div>

          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.875rem', color: '#3e4947' }}>
              이미 계정이 있으신가요?{' '}
              <button
                type="button"
                onClick={onBack}
                style={{ color: '#004e47', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(0,78,71,0.3)' }}
              >
                로그인하기
              </button>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

// ── Style constants ──
const labelStyle = {
  display: 'block',
  fontSize: '0.7rem',
  fontWeight: 700,
  color: '#004e47',
  marginBottom: '0.5rem',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  paddingLeft: '0.25rem'
};

const inputStyle = {
  background: '#eceef0',
  border: 'none',
  borderRadius: '0.625rem',
  padding: '0.875rem 1rem',
  fontSize: '0.9rem',
  color: '#191c1e',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  transition: 'box-shadow 0.2s',
};

const outlineButtonStyle = {
  padding: '0.875rem 1.25rem',
  background: '#fff',
  border: '1px solid rgba(190,201,198,0.4)',
  borderRadius: '0.625rem',
  color: '#004e47',
  fontWeight: 700,
  fontSize: '0.8rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'all 0.2s'
};

const errorTextStyle = {
  marginTop: '0.375rem',
  fontSize: '0.78rem',
  color: '#ba1a1a',
  paddingLeft: '0.25rem'
};

const successTextStyle = {
  marginTop: '0.375rem',
  fontSize: '0.78rem',
  color: '#006a4e',
  paddingLeft: '0.25rem'
};

export default SignupPage;
