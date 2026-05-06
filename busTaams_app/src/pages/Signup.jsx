import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
    checkIdDuplicate, 
    checkEmailDuplicate, 
    registerUser 
} from '../api';
import { auth } from '../firebase-config';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

import { notify } from '../utils/toast';

const SignaturePad = ({ onSave, onClear }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#004e47';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
    }, []);

    const startDrawing = (e) => {
        const { offsetX, offsetY } = e.nativeEvent;
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = e.nativeEvent;
        const ctx = canvasRef.current.getContext('2d');
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        onSave(canvasRef.current.toDataURL());
    };

    const clear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onClear();
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-on-surface">전자 서명</span>
                <button type="button" onClick={clear} className="text-xs font-bold text-red-500 hover:underline">초기화</button>
            </div>
            <div className="relative border-2 border-dashed border-outline/30 rounded-2xl bg-surface-container-low h-40 overflow-hidden">
                <canvas 
                    ref={canvasRef}
                    width={500}
                    height={160}
                    className="w-full h-full cursor-crosshair touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                    <span className="text-sm font-medium">여기에 서명해 주세요</span>
                </div>
            </div>
            <p className="text-[10px] text-outline text-center mt-2">위 서명은 본인 확인 및 약관 동의의 효력을 가집니다. ({new Date().toLocaleDateString()} 기준)</p>
        </div>
    );
};

const Signup = () => {
    const navigate = useNavigate();
    const [userType, setUserType] = useState('customer');
    
    const [userId, setUserId] = useState('');
    const [email, setEmail] = useState('');
    const [userName, setUserName] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [phoneNo, setPhoneNo] = useState('');
    const [authCode, setAuthCode] = useState('');
    const [signature, setSignature] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

    const [isIdChecked, setIsIdChecked] = useState(false);
    const [isEmailChecked, setIsEmailChecked] = useState(false);
    const [isCodeSent, setIsCodeSent] = useState(false);
    const [isPhoneVerified, setIsPhoneVerified] = useState(false);
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [idToken, setIdToken] = useState(null); // Firebase ID Token 저장

    // 약관 4가지
    const [terms, setTerms] = useState({
        service: false,
        privacy: false,
        traveler: false,
        location: false
    });

    // 약관 상세보기 확인 여부
    const [viewedTerms, setViewedTerms] = useState({
        service: false,
        privacy: false,
        traveler: false,
        marketing: false
    });

    // 마케팅 채널 4가지
    const [marketing, setMarketing] = useState({
        sms: false,
        push: false,
        email: false,
        tel: false,
        agree: false // 마케팅 전체 동의 버튼 역할
    });

    const handleMarketingAll = (e) => {
        const checked = e.target.checked;
        setMarketing({
            agree: checked,
            sms: checked,
            push: checked,
            email: checked,
            tel: checked
        });
    };

    const validatePassword = (pw) => {
        const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
        return regex.test(pw);
    };

    const handleShowTerms = (title, content, id) => {
        Swal.fire({
            title: `<div class="text-left"><p class="text-[10px] text-teal-600 font-bold uppercase tracking-widest mb-1">BusTaams 정책</p><h2 class="text-xl font-black text-teal-900">${title}</h2></div>`,
            html: `
                <div class="text-left mt-6 font-body">
                    <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100 max-h-[400px] overflow-y-auto">
                        <p class="text-[13px] text-on-surface-variant leading-relaxed whitespace-pre-wrap font-medium">${content}</p>
                    </div>
                </div>
            `,
            showConfirmButton: true,
            confirmButtonText: '확인',
            confirmButtonColor: '#004e47',
            customClass: {
                popup: 'rounded-[2.5rem] p-8 border-none shadow-2xl',
                confirmButton: 'w-full py-4 rounded-2xl font-bold bg-teal-700 text-white mt-4'
            },
            buttonsStyling: false
        }).then((result) => {
            if (result.isConfirmed && id) {
                setViewedTerms(prev => ({ ...prev, [id]: true }));
            }
        });
    };

    const handleCheckEmail = async () => {
        if (!email) return notify.warn('이메일을 입력하세요.');
        try {
            const res = await checkEmailDuplicate(email);
            if (res.isAvailable) {
                notify.success('사용 가능', '사용 가능한 이메일입니다.');
                setIsEmailChecked(true);
            } else {
                notify.error('중복', '이미 사용 중인 이메일입니다.');
            }
        } catch (err) {}
    };

    const handleCheckId = async () => {
        if (!userId) return notify.warn('아이디를 입력하세요.');
        try {
            const res = await checkIdDuplicate(userId);
            if (res.isAvailable) {
                notify.success('사용 가능', '사용 가능한 아이디입니다.');
                setIsIdChecked(true);
            } else {
                notify.error('중복', '이미 가입된 아이디입니다.');
            }
        } catch (err) {}
    };

    useEffect(() => {
        return () => {
            if (window.recaptchaVerifier) {
                try {
                    window.recaptchaVerifier.clear();
                } catch (e) {}
                window.recaptchaVerifier = null;
            }
        };
    }, []);

    // reCAPTCHA 초기화
    const setupRecaptcha = () => {
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': (response) => {
                    // reCAPTCHA solved
                },
                'expired-callback': () => {
                    notify.warn('인증 만료', 'reCAPTCHA 인증이 만료되었습니다. 다시 시도해주세요.');
                    if (window.recaptchaVerifier) {
                        try {
                            window.recaptchaVerifier.clear();
                        } catch (e) {}
                        window.recaptchaVerifier = null;
                    }
                }
            });
        }
    };

    const handleSendCode = async () => {
        if (!phoneNo) return notify.warn('번호를 입력하세요.');
        
        // 국가번호(+82) 추가 및 숫자만 추출
        let cleanPhone = phoneNo.replace(/[^0-9]/g, '');
        let formattedPhone = cleanPhone;
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '+82' + formattedPhone.substring(1);
        } else if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+82' + formattedPhone;
        }

        try {
            setupRecaptcha();
            const appVerifier = window.recaptchaVerifier;
            const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
            setConfirmationResult(confirmation);
            setIsCodeSent(true);
            notify.success('인증번호 발송', 'Firebase를 통해 인증번호가 발송되었습니다.');
        } catch (err) {
            console.error('Firebase Auth Detailed Error:', err);
            
            let errorMsg = '인증번호 발송 중 오류가 발생했습니다.';
            if (err.code === 'auth/invalid-app-credential') {
                errorMsg = '앱 인증 설정이 올바르지 않습니다. (Firebase 콘솔 확인 필요)';
            } else if (err.code === 'auth/invalid-phone-number') {
                errorMsg = '유효하지 않은 전화번호 형식입니다.';
            } else if (err.code === 'auth/quota-exceeded') {
                errorMsg = 'SMS 발송 한도를 초과했습니다.';
            }

            notify.error('발송 실패', errorMsg);
            
            if (window.recaptchaVerifier) {
                window.recaptchaVerifier.clear();
                window.recaptchaVerifier = null;
            }
        }
    };

    const handleVerifyCode = async () => {
        if (!authCode) return notify.warn('인증번호를 입력하세요.');
        if (!confirmationResult) return notify.error('인증 오류', '발송된 인증 정보가 없습니다.');

        try {
            const result = await confirmationResult.confirm(authCode);
            const user = result.user;
            const token = await user.getIdToken();
            setIdToken(token);
            setIsPhoneVerified(true);
            notify.success('인증 성공', '휴대폰 인증이 완료되었습니다.');
        } catch (err) {
            console.error('Verify Code Error:', err);
            notify.error('인증 실패', '인증번호가 올바르지 않거나 만료되었습니다.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isIdChecked) return notify.warn('아이디 중복 확인이 필요합니다.');
        if (!userName) return notify.warn('성함을 입력해주세요.');
        if (!validatePassword(password)) return notify.error('비밀번호 규칙 위반', '8자 이상, 숫자, 특수문자를 포함하세요.');
        if (password !== passwordConfirm) return notify.error('불일치', '비밀번호 확인이 다릅니다.');
        if (!isPhoneVerified) return notify.warn('인증 필요', '휴대폰 인증이 필요합니다.');
        if (!terms.service || !terms.privacy || !terms.traveler) return notify.warn('약관 동의', '모든 필수 약관에 동의하세요.');
        if (!signature) return notify.warn('서명 필요', '전자 서명을 완료해주세요.');

        try {
            const termsData = [
                { type: 'service', agreed: terms.service },
                { type: 'privacy', agreed: terms.privacy },
                { type: 'traveler_service', agreed: terms.traveler },
                { type: 'marketing', agreed: marketing.agree, 
                  channels: { sms: marketing.sms ? 'Y' : 'N', push: marketing.push ? 'Y' : 'N', email: marketing.email ? 'Y' : 'N', tel: marketing.tel ? 'Y' : 'N' } 
                }
            ];

            const res = await registerUser({
                userId, email, userName, password, phoneNo, 
                userType: userType === 'customer' ? 'TRAVELER' : 'DRIVER',
                signatureBase64: signature,
                termsData,
                firebaseToken: idToken // Firebase 인증 토큰 추가
            });

            if (res.success) {
                notify.success('가입 완료');
                navigate('/login');
            } else {
                notify.error('가입 실패', res.error);
            }
        } catch (err) {}
    };

    return (
        <div className="bg-slate-50 font-body text-on-background min-h-screen flex flex-col items-center py-12 px-6">
            <header className="w-full max-w-md flex justify-between items-center mb-8">
                <div className="text-primary font-black tracking-tighter font-headline text-3xl">busTaams</div>
                <button className="text-outline font-bold text-xs">고객지원</button>
            </header>

            <div className="w-full max-w-md space-y-10">
                {/* 탭 전환 */}
                <div className="flex bg-slate-200/50 p-1 rounded-full">
                    <button onClick={() => setUserType('customer')} className={`flex-1 py-3 rounded-full font-bold transition-all ${userType === 'customer' ? 'bg-primary text-white shadow-lg' : 'text-outline hover:text-on-surface'}`}>고객</button>
                    <button onClick={() => setUserType('driver')} className={`flex-1 py-3 rounded-full font-bold transition-all ${userType === 'driver' ? 'bg-primary text-white shadow-lg' : 'text-outline hover:text-on-surface'}`}>기사</button>
                </div>

                <section className="space-y-4">
                    <p className="text-secondary font-black text-xs uppercase tracking-widest">최고의 기회</p>
                    <h1 className="font-headline font-black text-5xl leading-tight">새로운 <br/><span className="text-primary">여정의 시작.</span></h1>
                    <p className="text-on-surface-variant font-medium leading-relaxed">엄선된 프리미엄 버스 경매를 만나보세요. 정교하게 큐레이션된 플릿 자산을 제공합니다.</p>
                </section>

                <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-primary/5 space-y-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* 이메일 */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-on-surface ml-1">이메일</label>
                            <div className="flex gap-2">
                                <input value={email} onChange={e=>{setEmail(e.target.value); setIsEmailChecked(false);}} type="email" placeholder="example@email.com" className="flex-grow bg-slate-100 rounded-xl py-4 px-5 outline-none focus:bg-slate-200 transition-all font-medium" />
                                <button type="button" onClick={handleCheckEmail} className={`px-6 rounded-xl font-bold text-sm transition-all ${isEmailChecked ? 'bg-green-100 text-green-700' : 'bg-white border border-primary text-primary hover:bg-primary/5'}`}>
                                    {isEmailChecked ? '확인됨' : '중복 확인'}
                                </button>
                            </div>
                        </div>

                        {/* 성함 */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-on-surface ml-1">고객명</label>
                            <input value={userName} onChange={e=>setUserName(e.target.value)} type="text" placeholder="실명을 입력하세요" className="w-full bg-slate-100 rounded-xl py-4 px-5 outline-none focus:bg-slate-200 transition-all font-medium" />
                        </div>

                        {/* 아이디 */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-on-surface ml-1">아이디</label>
                            <div className="flex gap-2">
                                <input value={userId} onChange={e=>setUserId(e.target.value)} type="text" placeholder="고유한 아이디를 입력하세요" className="flex-grow bg-slate-100 rounded-xl py-4 px-5 outline-none font-medium" />
                                <button type="button" onClick={handleCheckId} className="px-6 bg-white border border-primary text-primary rounded-xl font-bold text-sm hover:bg-primary/5 transition-all">중복 확인</button>
                            </div>
                        </div>

                        {/* 비밀번호 */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-on-surface ml-1">비밀번호</label>
                            <div className="space-y-1">
                                <div className="relative">
                                    <input 
                                        value={password} 
                                        onChange={e=>setPassword(e.target.value)} 
                                        type={showPassword ? "text" : "password"} 
                                        placeholder="비밀번호(8자 이상, 숫자, 특수문자 포함)" 
                                        className="w-full bg-slate-100 rounded-xl py-4 px-5 pr-12 outline-none font-medium focus:bg-slate-200 transition-all" 
                                    />
                                    <span 
                                        className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline cursor-pointer hover:text-primary"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? 'visibility_off' : 'visibility'}
                                    </span>
                                </div>
                                {password && (
                                    <p className={`text-[10px] ml-1 font-bold ${validatePassword(password) ? 'text-green-600' : 'text-red-500'}`}>
                                        {validatePassword(password) ? '✔ 사용 가능한 비밀번호입니다.' : '✘ 8자 이상, 영문, 숫자, 특수문자를 포함해야 합니다.'}
                                    </p>
                                )}
                            </div>
                            
                            <div className="space-y-1">
                                <div className="relative">
                                    <input 
                                        value={passwordConfirm} 
                                        onChange={e=>setPasswordConfirm(e.target.value)} 
                                        type={showPasswordConfirm ? "text" : "password"} 
                                        placeholder="비밀번호를 다시 한번 입력하세요" 
                                        className="w-full bg-slate-100 rounded-xl py-4 px-5 pr-12 outline-none font-medium focus:bg-slate-200 transition-all" 
                                    />
                                    <span 
                                        className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline cursor-pointer hover:text-primary"
                                        onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                                    >
                                        {showPasswordConfirm ? 'visibility_off' : 'visibility'}
                                    </span>
                                </div>
                                {passwordConfirm && (
                                    <p className={`text-[10px] ml-1 font-bold ${password === passwordConfirm ? 'text-green-600' : 'text-red-500'}`}>
                                        {password === passwordConfirm ? '✔ 비밀번호가 일치합니다.' : '✘ 비밀번호가 일치하지 않습니다.'}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* 휴대폰 번호 */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-on-surface ml-1">휴대폰번호</label>
                            <div className="flex gap-2">
                                <div className="flex-grow relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">smartphone</span>
                                    <input 
                                        value={phoneNo} 
                                        onChange={e=>setPhoneNo(e.target.value.replace(/[^0-9]/g, ''))} 
                                        type="tel" 
                                        placeholder="휴대폰 번호" 
                                        disabled={isPhoneVerified}
                                        className="w-full bg-slate-100 rounded-xl py-4 pl-12 pr-4 outline-none font-medium disabled:opacity-50" 
                                    />
                                </div>
                                <button 
                                    type="button" 
                                    onClick={handleSendCode} 
                                    disabled={isPhoneVerified}
                                    className="px-6 bg-white border border-primary text-primary rounded-xl font-bold text-sm disabled:opacity-50"
                                >
                                    {isCodeSent ? '재발송' : '인증요청'}
                                </button>
                            </div>
                            <div id="recaptcha-container"></div> {/* Firebase reCAPTCHA 컨테이너 */}

                            {isCodeSent && !isPhoneVerified && (
                                <div className="flex gap-2">
                                    <div className="flex-grow relative">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">verified_user</span>
                                        <input 
                                            value={authCode} 
                                            onChange={e=>setAuthCode(e.target.value)} 
                                            type="text" 
                                            placeholder="6자리 인증번호" 
                                            className="w-full bg-slate-100 rounded-xl py-4 pl-12 pr-4 outline-none font-medium" 
                                        />
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={handleVerifyCode} 
                                        className="px-6 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dark transition-all"
                                    >
                                        인증확인
                                    </button>
                                </div>
                            )}
                            {isPhoneVerified && (
                                <p className="text-xs text-green-600 font-bold ml-1">✔ 휴대폰 인증이 완료되었습니다.</p>
                            )}
                        </div>

                        {/* 약관 동의 */}
                        <div className="space-y-4 pt-4">
                            <label className="text-xs font-bold text-on-surface ml-1">약관 및 정책동의</label>
                            <div className="bg-slate-50 p-6 rounded-3xl space-y-4">
                                {/* 전체 동의 버튼 */}
                                <div className="pb-4 border-b border-slate-200">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${terms.service && terms.privacy && terms.traveler && marketing.agree ? 'bg-primary border-primary' : 'border-outline/30 bg-white'}`}>
                                            <input 
                                                type="checkbox" 
                                                className="hidden" 
                                                checked={terms.service && terms.privacy && terms.traveler && marketing.agree} 
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    if (checked && (!viewedTerms.service || !viewedTerms.privacy || !viewedTerms.traveler || !viewedTerms.marketing)) {
                                                        notify.warn('확인 필요', '모든 약관의 상세보기를 먼저 확인해주세요.');
                                                        return;
                                                    }
                                                    setTerms({ service: checked, privacy: checked, traveler: checked });
                                                    setMarketing({ agree: checked, sms: checked, push: checked, email: checked, tel: checked });
                                                }} 
                                            />
                                            {(terms.service && terms.privacy && terms.traveler && marketing.agree) && <span className="material-symbols-outlined text-white text-xs">check</span>}
                                        </div>
                                        <span className="text-base font-black text-on-surface">모두 동의합니다.</span>
                                    </label>
                                </div>

                                {[
                                    { 
                                        id: 'service', 
                                        label: '서비스 이용약관 동의', 
                                        required: true,
                                        content: `버스타암스(BusTaams) 통합 이용약관\n\n제1조 (목적)\n본 약관은 (주)청솔테크(이하 “회사”)가 운영하는 플랫폼 “버스타암스(BUSTAAMS)”(이하 “플랫폼”)를 통해 제공되는 전세버스 중개 서비스 및 관련 부가 서비스의 이용과 관련하여, 회사와 회원(여행자, 버스기사 파트너, 영업 파트너) 간의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.\n\n제2조 (용어의 정의)\n1. 여행자(이용자): 플랫폼에 가입하여 전세버스 견적을 요청하고 계약금을 결제하여 서비스를 이용하는 자를 말합니다.\n2. 버스기사 파트너(기사): 플랫폼의 자격 검증을 거쳐 여행자의 청약을 수락하고 운송 서비스를 제공하는 자를 말합니다.\n3. 영업 파트너(프리랜서): 플랫폼에 버스기사를 유치하고, 해당 기사의 활동 실적에 따라 배당 수수료를 지급받는 자를 말합니다.\n4. 계약 확정: 여행자의 계약금 결제와 버스기사 파트너의 승인이 동시에 완료되어 상호 연락처가 공개된 시점을 의미합니다.\n5. 1원 인증: 계좌의 실존 여부 및 소유주 일치를 확인하기 위해 결제 대행사(PG) API를 통해 수행하는 금융 검증 절차를 말합니다.\n\n제3조 (서비스의 내용 및 매칭 로직)\n회사는 플랫폼을 통해 다음의 지능형 중개 서비스를 제공합니다.\n1. 역경매 기반 매칭: 여행자가 희망 요금을 제시하고, 파트너가 이를 수락하거나 제안하는 양방향 매칭 시스템을 운영합니다.\n2. 실시간 연락처 공개: 여행자의 계약금(이용 금액의 6.6%) 입금 및 파트너의 승인이 완료되는 즉시 상호 연락처를 공개하여 직접 소통을 지원합니다.\n3. 자격 검증 자동화: API 연동을 통해 버스운전자격, 면허 유효성, 사업자 휴·폐업 상태를 실시간 모니터링합니다.\n\n제4조 (이용요금 및 결제)\n1. 여행자: 청약 확정 시 이용 금액의 6.6%(부가세 포함)를 플랫폼에 계약금으로 결제해야 합니다.\n2. 버스기사 파트너: 선택한 수수료 플랜(건별/일반/중급/고급)에 따라 정보 이용료를 납부하며, 여행자의 계약금에서 관리비를 차감한 금액을 정산받습니다.\n3. 영업 파트너: 유치한 기사의 매출 기여도에 따라 10%~20%의 구간별 배당 수수료를 지급받습니다.\n\n제5조 (자동 서비스 완료 및 정산)\n1. 자동 완료 (Batch): 운행 종료일 경과 후 1일 차 새벽(00:00:01)에 별도의 취소 요청이 없으면 시스템이 자동으로 '서비스 완료' 처리를 수행합니다.\n2. 정산 주기: 확정된 정산 금액은 매월 말일 기준으로 정산하여 익월 5일(파트너) 또는 10일(영업 파트너)에 지정된 계좌로 지급됩니다.\n3. 인증 필수: 모든 정산은 제2조 5항에 따른 '1원 인증'이 완료된 계좌로만 가능합니다.\n\n제6조 (계약 파기 및 이용자 보호)\n1. 이용자 귀책: 계약 확정 후 이용자의 일방적 취소 시 계약금은 회사에 귀속됩니다.\n2. 파트너 귀책: 계약 확정 후 파트너의 일방적 취소 시 파트너는 위약금 500,000원을 납부해야 하며, 회사는 이용자에게 다음 중 하나의 보호 조치를 제공합니다.\n- 계약금 4배 환불: 이용자가 입금한 계약금의 4배 전액을 환불 처리합니다.\n- 대체 차량 제공: 동급 이상의 다른 차량을 수급하여 제공하며, 이 경우 환불 의무를 대신합니다.\n3. 면제 사유: 본인/가족 사망, 차량 파손, 법정 구속, 입원 등 약관에서 정한 불가항력적 사유를 증빙할 경우 위약 규정을 적용하지 않습니다.\n\n제7조 (전자 서명 및 동의)\n1. 모든 회원은 가입 및 서비스 이용 시 플랫폼에서 제공하는 전자 서명(싸인) 패드를 통해 직접 서명하고 동의 버튼을 클릭해야 합니다.\n2. 해당 전자 서명 데이터는 법적 효력을 가지며, 계약 이행의 증빙 자료로 활용됩니다.\n\n제8조 (패널티 및 품질 관리)\n1. 회사는 정당한 사유 없이 계약을 파기하거나 직거래를 유도하는 회원을 모니터링하며, 위반 횟수에 따라 이용 제한(1주일~영구 탈퇴) 조치를 취합니다.\n2. 단, 위약금을 전액 납부하거나 대체 차량을 제공하여 이용자 보호 의무를 다한 파트너에게는 패널티 적용을 면제할 수 있습니다.\n\n제9조 (개인정보 보호 및 관할 법원)\n1. 회사는 별도로 고지된 개인정보 처리방침에 따라 회원의 정보를 보호합니다.\n2. 서비스 이용과 관련하여 발생한 분쟁의 관할 법원은 회사의 소재지 관할 법원으로 합니다.\n\n부칙\n본 방침은 2026년 1월 31일부터 시행됩니다.`
                                    },
                                    { 
                                        id: 'privacy', 
                                        label: '개인정보 수집 및 이용 동의', 
                                        required: true,
                                        content: `개인정보 처리방침 (BusTaams)\n\n(주)청솔테크(이하 '회사')는 개인정보보호법 및 관련 법령을 준수하며, 이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하게 처리하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.\n\n제1조 (개인정보의 처리 목적)\n회사는 전세버스 중개 플랫폼 '버스타암스' 운영을 위해 다음의 목적을 위하여 개인정보를 처리합니다.\n1. 서비스 중개 및 계약 이행: 전세버스 역경매 견적 제공, 여행자와 버스기사(파트너) 간 매칭, 계약금 결제 및 정산 처리.\n2. 파트너 자격 검증: 버스운전자격증, 면허증, 적성정밀검사 결과 등 API 연동을 통한 실시간 자격 확인.\n3. 영업 파트너 관리: 추천인 번호를 기반으로 한 영업 실적 관리 및 배당 수수료 정산.\n4. 회원 관리 및 부정 이용 방지: 본인 확인, 전자 서명 관리, 부당한 취소 및 노쇼(No-show) 회원의 패널티 관리.\n\n제2조 (수집하는 개인정보 항목 및 방법)\n회사는 서비스 제공 및 정산의 정확성을 위해 필요한 최소한의 정보를 수집합니다.\n1. 여행자(이용자) 회원\n• 필수: 성명, 휴대전화번호, 이메일, 본인인증 정보(CI/DI), 전자 서명 데이터.\n• 선택: 여행 일정(출발/도착지), 탑승 인원, 선호 차량 사양 등.\n2. 버스기사 파트너 회원\n• 필수: 성명, 연락처, 버스운전자격증 번호, 운전면허 번호, 사업자 정보, 정산 계좌번호(1원 인증 데이터 포함), 전자 서명 데이터.\n• 증빙 서류: 운전적성정밀검사 적합 판정표, 자격증 사진, 차량 등록 정보.\n3. 영업 파트너(프리랜서)\n• 필수: 성명, 연락처, 주민등록번호(세무 신고용), 정산 계좌번호(1원 인증 데이터 포함), 전자 서명 데이터.\n4. 수집 방법: 앱/웹 가입, 서류 업로드, API 연동 검증(한국교통안전공단, 경찰청, 국세청 등), 서비스 이용 과정에서의 자동 생성.\n\n제3조 (개인정보의 제3자 제공)\n회사는 원활한 서비스 이행을 위해 이용자의 개인정보 제공 범위를 다음과 같이 제한합니다.\n1. 제공 시점: 여행자의 계약금 결제(6.6%)와 버스기사 파트너의 승인이 완료되어 계약이 체결된 즉시.\n2. 제공 대상: 매칭된 여행자와 버스기사 파트너.\n3. 제공 항목: 상호 성명(상호명), 연락처, 배차 정보.\n4. 제공 목적: 세부 운행 일정 협의 및 서비스 이행을 위한 상호 통신.\n\n제4조 (개인정보의 보유 및 이용 기간)\n1. 보유 기간: 회원 탈퇴 시까지 보유하나, 관계 법령에 따라 보존할 필요가 있는 경우 해당 기간까지 보존합니다.\n2. 거래 관련 보관: 계약 취소, 위약금 발생, 정산 기록 등은 5년간 보존합니다. (전자상거래법 기준)\n3. 영업 실적 보관: 영업 파트너의 배당 관리를 위해 마지막 실적 발생일로부터 최소 6개월 이상 보존합니다.\n\n제5조 (보안 및 기술적 대책)\n1. 1원 인증 검증: 결제 대행사(PG) API를 연동하여 정산 계좌의 실존 여부와 소유주 일치 여부를 실시간 검증합니다.\n2. 전자 서명 보호: 이용자와 파트너가 직접 입력한 전자 서명(싸인)은 암호화되어 저장되며 계약 증빙 외 용도로 사용하지 않습니다.\n3. 접근 제어: 계약이 확정되지 않은 상태에서의 개인 식별 정보 접근을 엄격히 통제합니다.\n\n제6조 (이용자의 권리·의무 및 행사방법)\n1. 이용자는 언제든지 자신의 개인정보를 조회하거나 수정할 수 있으며 수집·이용 동의를 철회할 수합니다.\n2. 다만, 계약 확정 이후 연락처가 공개된 경우에는 서비스 이행 및 관련 법령에 따라 일부 정보의 삭제가 제한될 수 있습니다.\n\n제7조 (개인정보 보호책임자)\n• 성명: 원동일\n• 직책: 대표이사\n• 연락처: 02-429-5459 / bustaams@gmail.com`
                                    },
                                    { 
                                        id: 'traveler', 
                                        label: userType === 'driver' ? '파트너 입점 계약' : '여행자 서비스 이용 규정 동의', 
                                        required: true,
                                        content: userType === 'driver' 
                                            ? `버스기사 파트너 입점 계약서 (BusTaams)\n\n(주)청솔테크(이하 “사업자”)와 본 계약에 동의하고 입점을 신청한 버스기사(이하 “파트너”)는 플랫폼 “버스타암스(BUSTAAMS)”(이하 “플랫폼”)를 통한 중개 서비스 이용에 관하여 다음과 같이 계약을 체결한다.\n\n제1조 (목적)\n본 계약은 “사업자”가 운영하는 “플랫폼”에 “파트너”가 입점하여 여행자(이용자)가 제시한 이용 청약을 확인하고, 특허 시스템 기반의 즉시 매칭 프로세스(계약금 선입금, 연락처 즉시 공개, 자동 정산 등)를 준수하며 서비스를 이용함에 따른 권리·의무 및 책임사항을 규정함을 목적으로 한다.\n\n제2조 (입점 자격 및 승인)\n1. [임시 회원 가입] “파트너”는 입점 신청 시 버스운전자격증 번호, 운전면허증 번호, 사업자 정보를 필수 입력하고 실시간 검증을 완료하여야 한다.\n2. [계좌 등록 및 1원 인증] “파트너”는 정산 계좌를 등록하고 “사업자”가 입금한 1원의 입금자명을 확인하여 인증 절차를 완료해야 한다. (PortOne 등 PG API 활용)\n3. [정회원 승인] 운전적성정밀검사 적합 판정표 및 자격증 사진을 업로드해야 하며, “사업자”의 최종 확인 후 정회원으로 승인된다.\n4. [계약의 성립] 본 계약은 “파트너”가 플랫폼상에서 제공하는 전자 서명(싸인)을 하고 동의 버튼을 클릭함으로써 성립한다.\n\n제3조 (실시간 매칭 및 연락처 공개)\n1. [계약 확정] “이용자”의 계약금 입금이 완료된 청약에 대하여 “파트너”가 승인 버튼을 클릭하는 즉시 계약이 최종 확정된다.\n2. [연락처 공개] 계약 확정 즉시 양측의 연락처가 공개되며, 유선 연락 및 채팅 상담이 가능하다.\n\n제4조 (수수료 체계 및 해지 환불)\n1. 건별형: 이용 수수료 없음 (이용자 계약금의 6%를 수수료로 대체)\n2. 정액형 (일반/중급/고급): 월 정액 선납 방식. 이용자 계약금 중 관리비 1% 차감 후 정산 지급.\n- 정산일: 월말 기준 정산하여 익월 5일 지급.\n- 중도 해지 시 남은 일수에 대해 규정에 따라 환불 처리.\n\n제5조 (자동 관리 및 계약 확정 로직)\n운행 종료일 경과 후 1일 차 새벽(00:00:01)에 별도의 취소 요청이 없으면 시스템이 자동으로 '서비스 완료' 처리한다.\n\n제6조 (계약 파기에 따른 위약금 및 이용자 보호)\n1. [취소 위약금] 계약 확정 후 파트너의 일방적 변심으로 파기 시 위약금 500,000원을 사업자에게 지급해야 한다.\n2. [이용자 보호] 파트너 귀책 시 사업자는 이용자에게 계약금 4배 환불 또는 대체 차량 제공을 책임지고 이행한다.\n3. [면제 사유] 본인 사망, 차량 파손, 법정 구속, 입원 등 불가항력적 사유 증빙 시 위약금을 면제한다.\n\n제7조 (품질 관리 및 패널티)\n- 1회 취소 시: 1주일간 신규 참여 제한\n- 2회 취소 시: 2주일간 신규 참여 제한\n- 3회 취소 시: 계약 즉시 해지 가능\n(단, 위약금 전액 납부 또는 대체 차량 제공 시 패널티 미적용)\n\n제8조 (개인정보 보호) 이용자의 정보를 서비스 목적으로만 사용하며 외부 유출 시 책임을 진다.\n제9조 (관할 법원) 사업자의 소재지 관할 법원으로 한다.`
                                            : `여행자(이용자) 가입 및 이용 계약서 (BusTaams)\n\n(주)청솔테크(이하 “사업자”)와 본 계약에 동의하고 가입을 신청한 여행자(이하 “이용자”)는 플랫폼 “버스타암스(BUSTAAMS)”(이하 “플랫폼”)를 통한 중개 서비스 이용에 관하여 다음과 같이 계약을 체결한다.\n\n제1조 (목적)\n본 계약은 “사업자”가 운영하는 “플랫폼”에 “이용자”가 가입하여 특허 시스템 기반의 중개 프로세스(계약금 입금, 연락처 즉시 공개, 자동 정산 등)를 준수하며 서비스를 이용함에 따른 권리·의무 및 책임사항을 규정함을 목적으로 한다.\n\n제2조 (가입 자격 및 승인)\n1. “이용자”는 가입 신청 시 본인 실명 인증 절차를 거쳐야 한다.\n2. [계약의 성립] 본 계약은 “이용자”가 플랫폼(웹/앱)상에서 제공하는 전자 서명(싸인)을 하고 동의 절차에 따라 버튼을 클릭함으로써 본 계약에 확정적으로 전자 서명한 것으로 간주하며, 신청 완료 시점부터 효력이 발생한다.\n\n제3조 (서비스 이용 및 계약 체결)\n1. [청약 등록] “이용자”는 플랫폼에서 요구하는 기본 조건(출발지, 도착지, 탑승 인원, 일시 등)을 완성한 후, 희망 이용요금을 직접 입력하여 청약을 등록한다.\n2. [계약금 결제] “이용자”는 청약 내용에 부합하는 파트너(버스기사)의 제안을 선택하거나 매칭되었을 때, 이용 금액의 6.6%(부가세 포함)를 계약금으로 결제(카드 또는 계좌이체)함으로써 계약을 완료한다.\n3. [연락처 즉시 공개] 계약금 결제 완료 후 파트너가 이를 승인하면 상호 연락처가 즉시 공개되며, 이때부터 자유로운 유선 연락 및 채팅 상담이 가능하다.\n\n제4조 (이용 요금 및 수수료)\n1. [가입 수수료] 플랫폼 가입 수수료는 11,000원(부가세 포함)이다. (단, “사업자”가 지정하는 일정 기간 가입 수수료를 면제할 수 있다.)\n2. [중개 수수료] “이용자”에게는 별도의 중개 수수료가 발생하지 않는다. (단, 제3조 2항의 계약금은 플랫폼 서비스 이용료 및 예약 보증금 성격을 포함한다.)\n\n제5조 (취소 및 이용자 보호 권리)\n1. [이용자 귀책 취소] 계약 체결 후 “이용자”가 특별한 사유 없이 일방적으로 취소할 경우, 기 납부한 계약금은 “사업자”에게 귀속되며 반환되지 않는다.\n2. [파트너 귀책 취소 및 보상] 계약 체결 후 파트너(버스기사)의 귀책으로 계약이 파기될 경우, “이용자”는 다음 중 하나의 보호 조치를 받을 권리가 있다.\n- 계약금 4배 환불: “사업자”는 이용자가 입금한 계약금의 4배 전액을 위약금으로 지급한다.\n- 대체 차량 제공: “사업자”가 원래의 계약 조건과 동일한 급 이상의 다른 차량을 수급하여 제공하는 경우, 위 위약금 지급을 대신할 수 있다.\n3. [위약 예외 사유] 다음 각 호의 사유로 인한 취소는 정확한 증빙이 제출되고 “사업자”가 인정한 경우에 한하여 위약 규정을 적용하지 않는다.\n1) 본인 사망 2) 차량 파손 (운행 불가) 3) 법정 구속 4) 직계존비속 및 배우자 사망 5) 질병 또는 사고에 의한 입원 6) 사고에 의한 당일 통원치료\n\n제6조 (패널티 및 품질 관리)\n시스템은 “이용자”의 취소 이력을 자동 모니터링하며, 제5조 3항의 특별한 사유 없이 결제 취소 또는 계약 파기가 반복될 경우 다음과 같이 이용을 제한한다.\n• 1회 발생 시: 3개월간 이용 제한\n• 2회 발생 시: 6개월간 이용 제한\n• 3회 발생 시: 9개월간 이용 제한\n• 4회 발생 시: 본 계약 해지 및 영구 가입 제한\n\n제7조 (관할 법원)\n본 계약과 관련한 분쟁의 관할 법원은 “사업자”의 소재지 관할 법원으로 한다.`
                                    }
                                ].map(item => (
                                    <div key={item.id} className="flex items-center justify-between">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${terms[item.id] ? 'bg-primary border-primary' : 'border-outline/30 bg-white'}`}>
                                                <input 
                                                    type="checkbox" 
                                                    className="hidden" 
                                                    checked={terms[item.id]} 
                                                    onChange={e => {
                                                        if (e.target.checked && !viewedTerms[item.id]) {
                                                            notify.warn('확인 필요', '상세보기를 먼저 확인해야 동의할 수 있습니다.');
                                                            return;
                                                        }
                                                        setTerms({...terms, [item.id]: e.target.checked});
                                                    }} 
                                                />
                                                {terms[item.id] && <span className="material-symbols-outlined text-white text-xs">check</span>}
                                            </div>
                                            <span className="text-sm font-bold text-on-surface-variant flex gap-1">
                                                <span className="text-primary">[필수]</span> {item.label}
                                            </span>
                                        </label>
                                         <button 
                                            type="button" 
                                            onClick={() => handleShowTerms(item.label, item.content, item.id)}
                                            className="text-[10px] text-outline underline font-bold uppercase tracking-tighter"
                                        >
                                            상세보기
                                        </button>
                                    </div>
                                ))}

                                {/* 4번째 항목: 마케팅 동의 (선택) */}
                                <div className="pt-2 border-t border-slate-200">
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${marketing.agree ? 'bg-primary border-primary' : 'border-outline/30 bg-white'}`}>
                                                <input 
                                                    type="checkbox" 
                                                    className="hidden" 
                                                    checked={marketing.agree} 
                                                    onChange={e => {
                                                        if (e.target.checked && !viewedTerms.marketing) {
                                                            notify.warn('확인 필요', '마케팅 동의 상세보기를 먼저 확인해주세요.');
                                                            return;
                                                        }
                                                        handleMarketingAll(e);
                                                    }} 
                                                />
                                                {marketing.agree && <span className="material-symbols-outlined text-white text-xs">check</span>}
                                            </div>
                                            <span className="text-sm font-bold text-on-surface-variant flex gap-1">
                                                <span className="text-outline">[선택]</span> 마케팅 정보 수신 및 푸시 알림 동의
                                            </span>
                                        </label>
                                         <button 
                                            type="button" 
                                                                                         onClick={() => handleShowTerms('마케팅 정보 수신 및 활용 동의 (선택)', `마케팅 정보 수신 및 활용 동의서 (선택)\n\n본 동의서는 (주)청솔테크(이하 “회사”)가 운영하는 플랫폼 “버스타암스(BUSTAAMS)”에서 제공하는 서비스의 홍보, 이벤트, 맞춤형 정보 제공을 위해 이용자의 개인정보를 수집 및 활용하는 것에 대한 동의를 구하는 내용입니다.\n\n1. 수집 및 이용 목적\n회사는 수집한 개인정보를 다음의 목적을 위해 활용합니다.\n- 공통: 신규 서비스 홍보 및 맞춤형 서비스 제공, 이벤트 및 광고성 정보 안내, 경품 배송, 서비스 개선을 위한 통계 분석 및 설문조사.\n- 버스기사(파트너) 전용: 신규 청약 발생 알림, 지역별 배차 수요 정보 제공, 수수료 할인 프로모션 안내.\n- 여행자(이용자) 전용: 맞춤형 여행/버스 견적 정보, 시즌별 할인 쿠폰 및 프로모션 알림.\n- 영업 파트너 전용: 신규 입점 프로모션 안내, 목표 달성 추가 배당 수수료 이벤트 정보 제공.\n\n2. 수집 항목\n성명, 휴대폰 번호, 이메일 주소, 서비스 이용 기록, 기기 식별 정보(푸시 알림용).\n\n3. 보유 및 이용 기간\n회원 탈퇴 시 또는 동의 철회 시까지\n\n4. 전송 방법\n서비스 내 푸시 알림(Push), SMS(LMS), 카카오 알림톡, 이메일, 유선 전화 등.\n\n5. 동의 거부 권리 및 불이익\n본 마케팅 정보 수신 동의는 선택 사항입니다. 동의를 거부하시더라도 플랫폼의 기본 중개 서비스 이용에는 제한이 없으나, 회사가 제공하는 할인 쿠폰, 수수료 프로모션, 실시간 배차 꿀팁 및 이벤트 참여 등 혜택 제공 대상에서 제외될 수 있습니다.\n\n부칙: 본 방침은 2026년 5월 1일부터 시행됩니다.`)}

                                            className="text-[10px] text-outline underline font-bold uppercase tracking-tighter"
                                        >
                                            상세보기
                                        </button>
                                    </div>
                                    
                                    {/* 마케팅 채널 4종 (동의 시에만 부드럽게 노출) */}
                                    <div className={`grid grid-cols-2 gap-2 mt-4 ml-9 transition-all duration-300 overflow-hidden ${marketing.agree ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                                        {[
                                            { id: 'sms', label: 'SMS' },
                                            { id: 'push', label: '앱 푸시' },
                                            { id: 'email', label: '이메일' },
                                            { id: 'tel', label: '유선전화' }
                                        ].map(m => (
                                            <label key={m.id} className="flex items-center gap-2 cursor-pointer group">
                                                <input type="checkbox" checked={marketing[m.id]} onChange={e => setMarketing({...marketing, [m.id]: e.target.checked})} className="accent-primary w-4 h-4" />
                                                <span className="text-xs text-on-surface-variant group-hover:text-primary">{m.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 전자 서명 */}
                        <SignaturePad onSave={setSignature} onClear={() => setSignature('')} />

                        {/* 제출 버튼 */}
                        <div className="pt-8">
                            <button type="submit" className="w-full bg-[#004e47] text-white font-headline font-bold py-5 rounded-[2rem] shadow-xl shadow-primary/20 hover:shadow-primary/40 active:scale-[0.98] transition-all text-xl">계정 생성</button>
                        </div>
                    </form>

                    <div className="relative flex items-center justify-center">
                        <div className="absolute w-full h-[1px] bg-slate-100"></div>
                        <span className="relative z-10 bg-white px-4 text-[10px] text-outline font-bold uppercase tracking-widest">또는 소셜 계정으로 시작하기</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button className="flex flex-col items-center justify-center gap-2 bg-[#FEE500] py-4 rounded-3xl hover:brightness-95 transition-all">
                            <span className="material-symbols-outlined text-black text-2xl fill-1">chat</span>
                            <span className="text-[10px] font-black text-black">카카오</span>
                        </button>
                        <button className="flex flex-col items-center justify-center gap-2 bg-[#03C75A] py-4 rounded-3xl hover:brightness-95 transition-all">
                            <span className="text-white font-black text-2xl">N</span>
                            <span className="text-[10px] font-black text-white">네이버</span>
                        </button>
                    </div>

                    <div className="text-center pt-4">
                        <span className="text-sm font-medium text-slate-400">이미 계정이 있으신가요? </span>
                        <button onClick={() => navigate('/login')} className="text-sm font-bold text-primary hover:underline">로그인하기</button>
                    </div>
                </div>
            </div>

            <footer className="mt-20 text-center space-y-1">
                <p className="text-[10px] font-black text-outline uppercase tracking-[0.4em]">EDITORIAL TRANSIT EXPERIENCE ©</p>
                <p className="text-[10px] font-black text-outline uppercase tracking-[0.4em]">BUSTAAMS 2024</p>
            </footer>
        </div>
    );
};

export default Signup;
