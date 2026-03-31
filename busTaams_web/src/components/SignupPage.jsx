import React, { useState, useEffect, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import busLogo from '../assets/images/bustaams_bus_logo.png';

const SignupPage = ({ onBack }) => {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';
  const sigCanvas = useRef(null);
  
  // State from original SignUpModal
  const [userRole, setUserRole] = useState('traveler'); // 'traveler', 'salesperson', or 'driver'
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [firebaseIdToken, setFirebaseIdToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [signature, setSignature] = useState('');
  const [hasSignature, setHasSignature] = useState(false);
  const [timer, setTimer] = useState(0); // 초 단위
  
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [idError, setIdError] = useState('');
  const [idSuccess, setIdSuccess] = useState('');
  const [isIdVerified, setIsIdVerified] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordConfirmError, setPasswordConfirmError] = useState('');
  const [termsError, setTermsError] = useState(false);
  const [isIdChecking, setIsIdChecking] = useState(false);

  const [agreements, setAgreements] = useState({
    all: false, term1: false, term2: false, marketing: false
  });

  // reCAPTCHA 초기화
  useEffect(() => {
    if (!window.recaptchaVerifier && window.auth) {
      window.recaptchaVerifier = new window.firebaseAuth.RecaptchaVerifier(window.auth, 'recaptcha-signup-wrapper', {
        'size': 'invisible'
      });
    }
  }, []);

  // 타이머 로직
  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAllAgree = (e) => {
    const checked = e.target.checked;
    setAgreements({ all: checked, term1: checked, term2: checked, marketing: checked });
  };

  const validateEmail = (email) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const handleAgreeChange = (key) => (e) => {
    const checked = e.target.checked;
    setAgreements(prev => {
      const next = { ...prev, [key]: checked };
      next.all = next.term1 && next.term2 && next.marketing;
      return next;
    });
  };

  const handleIdCheck = async () => {
    console.log('handleIdCheck called for ID:', userId);
    if (!userId.trim()) {
        window.alert("아이디를 입력해주세요.");
        return;
    }
    setIsIdChecking(true);
    try {
      console.log('Fetching:', `${API_BASE}/api/auth/check-id?userId=${encodeURIComponent(userId)}`);
      const res = await fetch(`${API_BASE}/api/auth/check-id?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      console.log('ID Check Response:', res.status, data);
      
      if (res.status === 409) {
        setIdError(data.message);
        setIdSuccess('');
        setIsIdVerified(false);
        window.alert(data.message);
      } else if (res.ok) {
        setIdError('');
        setIdSuccess(data.message || '사용 가능한 아이디입니다.');
        setIsIdVerified(true);
        window.alert(data.message || '사용 가능한 아이디입니다.');
      } else {
        window.alert(data.error || '중복 확인 중 오류가 발생했습니다.');
      }
    } catch (e) {
      console.error('ID 중복 검사 실패', e);
      window.alert('서버와 통신할 수 없습니다.');
    } finally {
      setIsIdChecking(false);
    }
  };

  const handleSendSms = async () => {
    if (!phoneNumber) return alert("휴대폰 번호를 입력해주세요.");
    
    // 번호 형식 체크 (예: 01012345678 -> +821012345678)
    const purePhone = phoneNumber.replace(/[^0-9]/g, '');
    const formattedPhone = "+82" + purePhone.replace(/^0/, '');

    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new window.firebaseAuth.RecaptchaVerifier(window.auth, 'recaptcha-signup-wrapper', {
          'size': 'invisible'
        });
      }
      
      // [테스트] 인증번호 발송 생략 및 즉시 인증 완료 처리
      // const confirmation = await window.firebaseAuth.signInWithPhoneNumber(window.auth, formattedPhone, window.recaptchaVerifier);
      // setConfirmationResult(confirmation);
      setIsPhoneVerified(true);
      setTimer(180);
      alert("[테스트 모드] 인증번호 발송을 생략하고 즉시 인증 처리되었습니다.");
    } catch (e) {
      console.error("SMS Error:", e);
      alert(`인증번호 전송 실패: ${e.message}`);
      // reCAPTCHA 초기화 실패 시 재시도 가능하도록 초기화
      if (window.recaptchaVerifier) {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
      }
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || !confirmationResult) return;
    try {
      const result = await confirmationResult.confirm(verificationCode);
      setFirebaseIdToken(await result.user.getIdToken());
      setIsPhoneVerified(true);
      alert('본인 인증 완료!');
    } catch (e) {
      alert('인증번호가 올바르지 않습니다.');
    }
  };

  const clearSignature = () => {
    if (sigCanvas.current) sigCanvas.current.clear();
    setSignature('');
    setHasSignature(false);
  };

  const handleEndDrawing = () => {
    if (sigCanvas.current) {
      setSignature(sigCanvas.current.getCanvas().toDataURL('image/png'));
      setHasSignature(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasSignature) {
        if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
            setSignature(sigCanvas.current.getCanvas().toDataURL('image/png'));
            setHasSignature(true);
        }
    }

    if (!userId || !userName || !email || !password) {
      return alert('모든 필수 입력 항목을 채워주세요.');
    }

    if (!isIdVerified) {
      setIdError('아이디 중복 확인이 필요합니다.');
      return alert('아이디 중복 확인을 해주세요.');
    }

    if (!agreements.term1 || !agreements.term2) {
      setTermsError(true);
      return alert('필수 약관에 동의해야 가입이 가능합니다.');
    } else {
      setTermsError(false);
    }

    if (!validateEmail(email)) {
      setEmailError('올바른 이메일 형식이 아닙니다.');
      return alert('올바른 이메일 형식을 입력해주세요.');
    }

    if (password.length < 8) {
      setPasswordError('비밀번호는 8자리 이상이어야 합니다.');
      return alert('비밀번호는 8자리 이상으로 설정해주세요.');
    }

    if (password !== passwordConfirm) {
      setPasswordConfirmError('비밀번호가 일치하지 않습니다.');
      return alert('비밀번호가 일치하지 않습니다.');
    }

    if (!isPhoneVerified) {
      return alert('휴대폰 본인 인증을 완료해주세요.');
    }

    setIsLoading(true);
    try {
      const agreedTerms = [];
      if (agreements.term1) agreedTerms.push(1);
      if (agreements.term2) agreedTerms.push(2);
      if (agreements.marketing) agreedTerms.push(4);

      // [보안/버그수정] State 업데이트 지연 방지를 위해 Canvas에서 직접 서명 추출
      let finalSignature = signature;
      if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
          finalSignature = sigCanvas.current.getCanvas().toDataURL('image/png');
      }

      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, password, userName, email, phoneNo: phoneNumber,
          userType: userRole === 'driver' ? 'DRIVER' : (userRole === 'salesperson' ? 'PARTNER' : 'TRAVELER'),
          signatureBase64: finalSignature,
          mktAgreeYn: agreements.marketing ? 'Y' : 'N',
          agreedTerms
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('회원가입이 완료되었습니다!');
      onBack();
    } catch (err) {
      alert(`[가입 실패] ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-background font-body text-on-surface antialiased overflow-x-hidden">
      <div id="recaptcha-signup-wrapper"></div>
      
      {/* Left Side: Editorial Visual */}
      <section className="hidden md:flex md:w-5/12 lg:w-1/2 relative overflow-hidden bg-primary">
        <div className="absolute inset-0 z-0">
          <img 
            alt="Luxury Bus Interior" 
            className="w-full h-full object-cover opacity-60 mix-blend-overlay scale-105" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBlzDaR7G7PY9kXkxKDxzzCzAuRsJZW8zWR0CNHjG3pFRFFKjADrRxsD9QKJscfZ5Rt3UguF6S0XiTXE7oNZYGqr04hT6KEuN9-svJo0wkuIUsF_T-FJkraabGj3VS5Pw9e-8KHTMd1PHjvgtqXrSnimZSfqW4OtVp_yFXts7FHRFFsSCgzCdn_uBtCYK_jhwlUAORhLllBui9w7qvdGyrhZd9DfNkVi0kwZee5YzEvl2R3Ku80grkH4mHP2UR2DBqScCv4QCK8zFI"
          />
        </div>
        <div className="relative z-10 w-full h-full p-16 flex flex-col justify-between">
          <div className="cursor-pointer" onClick={onBack}>
            <h1 className="font-headline font-extrabold text-5xl lg:text-7xl text-white tracking-tighter leading-tight">
              busTaams <br/> Editorial
            </h1>
          </div>
          <div className="max-w-md">
            <p className="text-primary-fixed font-headline font-bold text-3xl mb-4 leading-snug">
              고품격 버스 경매의 <br/>새로운 기준을 경험하세요.
            </p>
            <p className="text-white/80 text-lg">
              최고의 가치를 지닌 차량들이 당신을 기다립니다. <br/>전문적인 옥션 플랫폼에서 시작하세요.
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-secondary opacity-20 blur-3xl rounded-full -mr-16 -mb-16"></div>
      </section>

      {/* Right Side: Signup Form Container */}
      <section className="w-full md:w-7/12 lg:w-1/2 flex items-center justify-center p-6 md:p-12 lg:p-20 bg-surface">
        <div className="w-full max-w-xl">
          {/* Branding for Mobile */}
          <div className="md:hidden mb-12 cursor-pointer" onClick={onBack}>
            <h1 className="font-headline font-extrabold text-3xl text-primary tracking-tighter">busTaams</h1>
          </div>
          
          <div className="mb-10">
            <h2 className="font-headline font-extrabold text-4xl text-on-surface mb-2">회원가입</h2>
            <p className="text-on-surface-variant">busTaams의 회원이 되어 전세버스 역경매 서비스를 경험해보세요.</p>
          </div>

          <div className="flex p-1 bg-surface-container-high rounded-full mb-10 w-fit overflow-x-auto">
            <button 
              onClick={() => setUserRole('traveler')}
              className={`px-6 py-2.5 rounded-full transition-all text-sm font-bold whitespace-nowrap ${userRole === 'traveler' ? 'bg-surface-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              일반고객(여행자)
            </button>
            <button 
              onClick={() => setUserRole('salesperson')}
              className={`px-6 py-2.5 rounded-full transition-all text-sm font-bold whitespace-nowrap ${userRole === 'salesperson' ? 'bg-surface-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              일반고객(영업사원)
            </button>
            <button 
              onClick={() => setUserRole('driver')}
              className={`px-6 py-2.5 rounded-full transition-all text-sm font-bold whitespace-nowrap ${userRole === 'driver' ? 'bg-surface-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              버스기사
            </button>
          </div>

          <form className="space-y-8" onSubmit={handleSubmit}>
            {/* Email & Basic Info */}
            <div className="space-y-5">
              <div className="relative">
                <label className="block text-xs font-bold text-primary mb-2 uppercase tracking-widest px-1">아이디</label>
                <div className="flex gap-3">
                  <input 
                    className={`flex-1 bg-surface-container-high border-none rounded-lg px-4 py-3.5 focus:ring-2 focus:ring-primary/20 transition-all ${idError ? 'ring-2 ring-error' : (idSuccess ? 'ring-2 ring-primary/20' : '')}`}
                    placeholder="아이디를 입력하세요" 
                    type="text"
                    value={userId}
                    onChange={(e) => {
                      setUserId(e.target.value);
                      if (idError) setIdError('');
                      if (idSuccess) setIdSuccess('');
                      setIsIdVerified(false);
                    }}
                  />
                  <button 
                    type="button"
                    onClick={handleIdCheck}
                    disabled={isIdChecking}
                    className={`px-6 py-3.5 bg-surface-lowest border border-outline-variant/30 text-primary font-bold rounded-lg hover:bg-surface-variant transition-all text-sm whitespace-nowrap ${isIdChecking ? 'opacity-50 cursor-wait' : ''}`}
                  >
                    {isIdChecking ? '확인 중...' : '중복 확인'}
                  </button>
                </div>
                {idError && <p className="text-error text-xs mt-1 px-1 font-bold">{idError}</p>}
                {idSuccess && <p className="text-primary text-xs mt-1 px-1 font-bold">{idSuccess}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-primary mb-2 uppercase tracking-widest px-1">이름</label>
                  <input 
                    className="w-full bg-surface-container-high border-none rounded-lg px-4 py-3.5 focus:ring-2 focus:ring-primary/20 transition-all" 
                    placeholder="실명 입력" 
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-primary mb-2 uppercase tracking-widest px-1">이메일</label>
                  <input 
                    className={`w-full bg-surface-container-high border-none rounded-lg px-4 py-3.5 focus:ring-2 focus:ring-primary/20 transition-all ${emailError ? 'ring-2 ring-error' : ''}`} 
                    placeholder="example@email.com" 
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError('');
                    }}
                  />
                  {emailError && <p className="text-error text-[10px] mt-1 font-bold">{emailError}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-primary mb-2 uppercase tracking-widest px-1">비밀번호</label>
                  <input 
                    className={`w-full bg-surface-container-high border-none rounded-lg px-4 py-3.5 focus:ring-2 focus:ring-primary/20 transition-all ${passwordError || (password.length > 0 && password.length < 8) ? 'ring-2 ring-error' : ''}`} 
                    placeholder="8자 이상 조합" 
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError('');
                    }}
                  />
                  {(passwordError || (password.length > 0 && password.length < 8)) && (
                    <p className="text-error text-[10px] mt-1 font-bold">비밀번호는 8자리 이상이어야 합니다.</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-primary mb-2 uppercase tracking-widest px-1">비밀번호 확인</label>
                  <input 
                    className={`w-full bg-surface-container-high border-none rounded-lg px-4 py-3.5 focus:ring-2 focus:ring-primary/20 transition-all ${passwordConfirmError || (password !== passwordConfirm && passwordConfirm !== '') ? 'ring-2 ring-error' : ''}`}
                    placeholder="비밀번호 재입력" 
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => {
                      setPasswordConfirm(e.target.value);
                      if (passwordConfirmError) setPasswordConfirmError('');
                    }}
                  />
                  {(passwordConfirmError || (password !== passwordConfirm && passwordConfirm !== '')) && (
                    <p className="text-error text-[10px] mt-1 font-bold">비밀번호가 일치하지 않습니다.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Phone Verification */}
            <div className="space-y-4 pt-4">
              <label className="block text-xs font-bold text-primary mb-2 uppercase tracking-widest px-1">휴대폰 번호 인증</label>
              <div className="flex gap-3">
                <input 
                  className="flex-1 bg-surface-container-high border-none rounded-lg px-4 py-3.5 focus:ring-2 focus:ring-primary/20 transition-all" 
                  placeholder="010-0000-0000" 
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={isPhoneVerified}
                />
                <button 
                  type="button"
                  onClick={handleSendSms}
                  disabled={isPhoneVerified}
                  className="px-6 py-3.5 bg-secondary text-white font-bold rounded-lg shadow-lg shadow-secondary/20 hover:scale-[1.02] transition-all text-sm whitespace-nowrap disabled:opacity-50"
                >
                  {isPhoneVerified ? '인증 완료' : '인증번호 전송'}
                </button>
              </div>
              
              {!isPhoneVerified && confirmationResult && (
                <div className="flex gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="relative flex-1">
                    <input 
                      className="w-full bg-surface-container-high border-none rounded-lg px-4 py-3.5 focus:ring-2 focus:ring-primary/20 transition-all" 
                      placeholder="인증번호 6자리" 
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-error font-bold text-xs font-mono">
                      {timer > 0 ? formatTime(timer) : "00:00"}
                    </span>
                  </div>
                  <button 
                    type="button"
                    onClick={handleVerifyCode}
                    className="px-6 py-3.5 bg-surface-lowest border border-outline-variant/30 text-on-surface-variant font-bold rounded-lg hover:bg-surface-variant transition-all text-sm whitespace-nowrap"
                  >
                    확인
                  </button>
                </div>
              )}
            </div>

            {/* E-Signature Pad */}
            <div className="pt-4">
              <div className="flex justify-between items-center mb-3 px-1">
                <label className="block text-xs font-bold text-primary uppercase tracking-widest">전자 서명</label>
                {hasSignature && (
                  <button type="button" onClick={clearSignature} className="text-xs text-on-surface-variant hover:text-primary font-bold">초기화</button>
                )}
              </div>
              <div className="w-full h-40 bg-surface-container-high rounded-xl relative border-2 border-dashed border-outline-variant/30 overflow-hidden group hover:border-primary/30 transition-all">
                {!hasSignature && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-on-surface-variant/40 text-sm">이곳에 서명해 주세요</span>
                  </div>
                )}
                <SignatureCanvas 
                  ref={sigCanvas} 
                  onEnd={handleEndDrawing}
                  canvasProps={{ className: 'w-full h-full cursor-crosshair' }} 
                />
              </div>
            </div>

            {/* Terms Agreement */}
            <div className={`space-y-3 pt-4 border-t border-outline-variant/10 ${termsError ? 'ring-2 ring-error rounded-xl p-4' : ''}`}>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary" 
                  type="checkbox"
                  checked={agreements.all}
                  onChange={handleAllAgree}
                />
                <span className="text-sm font-bold text-on-surface">모든 약관에 동의합니다</span>
              </label>
              <div className="pl-8 space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input 
                      className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" 
                      type="checkbox"
                      checked={agreements.term1}
                      onChange={handleAgreeChange('term1')}
                    />
                    <span className="text-xs text-on-surface-variant">이용약관 동의 (필수)</span>
                  </div>
                  <span className="material-symbols-outlined text-sm text-outline-variant">chevron_right</span>
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input 
                      className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" 
                      type="checkbox"
                      checked={agreements.term2}
                      onChange={handleAgreeChange('term2')}
                    />
                    <span className="text-xs text-on-surface-variant">개인정보 수집 및 이용 동의 (필수)</span>
                  </div>
                  <span className="material-symbols-outlined text-sm text-outline-variant">chevron_right</span>
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input 
                      className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" 
                      type="checkbox"
                      checked={agreements.marketing}
                      onChange={handleAgreeChange('marketing')}
                    />
                    <span className="text-xs text-on-surface-variant">마케팅 정보 활용 동의 (선택)</span>
                  </div>
                  <span className="material-symbols-outlined text-sm text-outline-variant">chevron_right</span>
                </label>
              </div>
              {termsError && <p className="text-error text-[10px] mt-1 font-bold pl-8">필수 약관 동의가 필요합니다.</p>}
            </div>

            {/* Submit Button */}
            <button 
              className={`w-full py-4 bg-primary text-white font-headline font-bold text-lg rounded-full shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? '가입 중...' : '가입 완료하기'}
            </button>
          </form>

          {/* Social Login Divider */}
          <div className="relative my-12 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant/20"></div>
            </div>
            <span className="relative bg-surface px-4 text-xs font-bold text-outline-variant uppercase tracking-widest">간편 회원가입</span>
          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-3 py-3.5 bg-kakao text-[#3c1e1e] rounded-lg font-bold text-sm hover:brightness-95 transition-all">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3C6.477 3 2 6.48 2 10.791c0 2.763 1.833 5.188 4.606 6.554l-.847 3.123c-.102.378.114.757.48.84.116.027.234.01.338-.04l3.65-2.428c.57.085 1.16.128 1.773.128 5.523 0 10-3.48 10-7.791C22 6.48 17.523 3 12 3z"></path></svg>
              카카오로 시작
            </button>
            <button className="flex items-center justify-center gap-3 py-3.5 bg-naver text-white rounded-lg font-bold text-sm hover:brightness-95 transition-all">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z"></path></svg>
              네이버로 시작
            </button>
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-on-surface-variant font-medium">
              이미 계정이 있으신가요? 
              <button 
                onClick={onBack}
                className="text-primary font-extrabold ml-2 underline underline-offset-4 decoration-primary/30 hover:decoration-primary transition-all"
              >
                로그인하기
              </button>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default SignupPage;
