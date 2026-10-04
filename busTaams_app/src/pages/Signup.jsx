import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
    checkIdDuplicate,
    checkEmailDuplicate,
    registerUser,
    sendAuthCode,
    verifyAuthCode
} from '../api';

import { notify } from '../utils/toast';

const SignaturePad = ({ onSave, onClear }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, []);

    const getCoordinates = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            offsetX: clientX - rect.left,
            offsetY: clientY - rect.top
        };
    };

    const startDrawing = (e) => {
        const { offsetX, offsetY } = getCoordinates(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = getCoordinates(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
        if (e.cancelable) e.preventDefault();
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
            <div className="relative border-2 border-dashed border-outline/30 rounded-xl bg-surface-container-low h-40 overflow-hidden">
                <canvas
                    ref={canvasRef}
                    width={500}
                    height={160}
                    className="w-full h-full cursor-crosshair touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
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
    const [step, setStep] = useState(1);

    const isDriver = userType === 'driver';

    const [userId, setUserId] = useState('');
    const [email, setEmail] = useState('');
    const [userName, setUserName] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [phoneNo, setPhoneNo] = useState('');
    const [authCode, setAuthCode] = useState('');
    const [signature, setSignature] = useState('');
    const [recomCode, setRecomCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

    const [isIdChecked, setIsIdChecked] = useState(false);
    const [isEmailChecked, setIsEmailChecked] = useState(false);
    const [isCodeSent, setIsCodeSent] = useState(false);
    const [isPhoneVerified, setIsPhoneVerified] = useState(false);
    const [idToken, setIdToken] = useState(null);

    const [terms, setTerms] = useState({
        service: false,
        privacy: false,
        traveler: true,
        location: false
    });

    const [viewedTerms, setViewedTerms] = useState({
        service: false,
        privacy: false,
        traveler: true,
        marketing: false
    });

    const [marketing, setMarketing] = useState({
        sms: false,
        push: false,
        email: false,
        tel: false,
        agree: false
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
        const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,}$/;
        return regex.test(pw);
    };

    const getTermsList = () => {
        return [
            {
                id: 'service',
                title: '서비스 이용약관 동의',
                content: `버스탐스 서비스 이용 통합 이용약관\n\n제1조 (목적)\n본 약관은 (주)청솔테크(이하 “회사”)가 운영하는 플랫폼 “버스탐스(BUSTAAMS)”(이하 “플랫폼”)를 통해 제공되는 버스 중개 서비스와 관련하여, 서비스를 이용하는 여행자(이하 “이용자”)와 플랫폼에 입점한 버스기사(이하 “파트너”) 및 “회사” 간의 권리, 의무, 책임사항, 서비스 이용 규칙 및 절차를 규정함을 목적으로 합니다.\n\n제2조 (용어의 정의)\n1. 플랫폼: “회사”가 버스 중개 서비스를 제공하기 위해 운영하는 웹사이트 및 모바일 애플리케이션을 말합니다.\n2. 이용자(여행자): 플랫폼에서 버스 대여 및 운행 서비스를 이용하기 위해 여행 일정을 제시하고, 파트너(버스기사)의 여행 일정 수락 건에 대해 검토 및 최종 승인을 수행하는 회원을 말합니다.\n3. 파트너(버스기사): 플랫폼의 엄격한 자격 검증을 거쳐 정회원으로 입점하여, 이용자의 청약을 확인하고 운행 서비스를 제공하는 회원을 말합니다.\n4. 즉시 매칭 시스템: 이용자의 정보 이용료 결제 즉시 계약이 확정된 것으로 간주하고 푸시 메시지를 통해 상호 연락처가 실시간 공개되는 특허 기반의 프로세스를 말합니다.`
            },
            {
                id: 'privacy',
                title: '개인정보 수집 및 이용 동의',
                content: `개인정보 수집 및 이용 동의서\n\n(주)청솔테크는 버스탐스 서비스 제공을 위해 필수 개인정보(성명, 아이디, 비밀번호, 이메일, 휴대폰 번호, 전자서명 등)를 수집하며 목적 달성 후 안전하게 파기합니다.`
            },
            {
                id: 'traveler',
                title: isDriver ? '기사 파트너 입점 계약 약관 동의' : '여행자 약관 동의',
                content: isDriver ? `기사 파트너 입점 계약 약관\n\n제1조 (목적)\n본 약관은 버스탐스 플랫폼에 버스기사 파트너로 입점하여 운행 서비스를 제공함에 있어 회사와 파트너 간의 권리 및 의무를 규정합니다.\n\n제2조 (기사 자격)\n파트너는 대형운전면허 및 버스운전자격증을 소지하고 관련 법령에 따른 자격을 갖추어야 합니다.` : `여행자 이용 약관\n\n제1조 (목적)\n본 약관은 이용자가 버스탐스 플랫폼을 통해 버스 대여 및 운행 서비스를 요청하고 이용함에 있어 필요한 사항을 규정합니다.`
            },
            {
                id: 'location',
                title: '위치기반 서비스 이용약관 동의',
                content: `위치기반 서비스 이용약관\n\n위치정보를 활용한 버스 실시간 매칭 및 이동 경로 안내 서비스를 제공합니다.`
            }
        ];
    };

    const handleShowTerms = () => {
        const termsList = getTermsList();
        const termsHtml = termsList.map(item => `
            <div style="text-align: left; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                <h4 style="font-weight: bold; color: #0d9488; margin-bottom: 8px; font-size: 14px;">[필수] ${item.title}</h4>
                <div style="max-height: 150px; overflow-y: auto; background: #f8fafc; padding: 10px; border-radius: 8px; font-size: 11px; color: #475569; white-space: pre-line; border: 1px solid #e2e8f0;">
                    ${item.content}
                </div>
            </div>
        `).join('') + `
            <div style="text-align: left; margin-bottom: 10px;">
                <h4 style="font-weight: bold; color: #64748b; margin-bottom: 8px; font-size: 14px;">[선택] 마케팅 정보 수신 및 알림 동의</h4>
                <div style="max-height: 120px; overflow-y: auto; background: #f8fafc; padding: 10px; border-radius: 8px; font-size: 11px; color: #475569; white-space: pre-line; border: 1px solid #e2e8f0;">
                    버스타암스가 제공하는 버스 대여 이벤트, 혜택, 회원 등급별 프로모션, 신규 기능 알림 등 마케팅 목적의 맞춤형 정보를 수신하는 것에 동의합니다.
                </div>
            </div>
        `;

        Swal.fire({
            title: '<strong>서비스 이용약관 및 정책</strong>',
            html: `<div style="max-height: 50vh; overflow-y: auto; padding-right: 5px;">${termsHtml}</div>`,
            icon: 'info',
            showCancelButton: false,
            confirmButtonColor: '#0d9488',
            confirmButtonText: '약관 전체 내용 확인 완료',
            customClass: {
                popup: 'rounded-2xl',
                confirmButton: 'rounded-xl text-sm font-bold py-3 px-6'
            }
        }).then(() => {
            setViewedTerms({
                service: true,
                privacy: true,
                traveler: true,
                marketing: true
            });
        });
    };

    const handleCheckId = async () => {
        if (!userId.trim()) {
            notify.warn('아이디 입력', '아이디를 입력해 주세요.');
            return;
        }
        try {
            const res = await checkIdDuplicate(userId);
            if (res.isDuplicate) {
                notify.error('중복된 아이디', '이미 사용 중인 아이디입니다.');
                setIsIdChecked(false);
            } else {
                notify.success('사용 가능', '사용 가능한 아이디입니다.');
                setIsIdChecked(true);
            }
        } catch (err) {
            notify.error('오류 발생', '아이디 중복 확인에 실패했습니다.');
        }
    };

    const handleCheckEmail = async () => {
        if (!email.trim()) {
            notify.warn('이메일 입력', '이메일을 입력해 주세요.');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            notify.warn('이메일 형식 오류', '올바른 이메일 형식이 아닙니다.');
            return;
        }
        try {
            const res = await checkEmailDuplicate(email);
            if (res.isDuplicate) {
                notify.error('중복된 이메일', '이미 사용 중인 이메일입니다.');
                setIsEmailChecked(false);
            } else {
                notify.success('사용 가능', '사용 가능한 이메일입니다.');
                setIsEmailChecked(true);
            }
        } catch (err) {
            notify.error('오류 발생', '이메일 중복 확인에 실패했습니다.');
        }
    };

    const handleSendCode = async () => {
        if (!phoneNo.trim()) {
            notify.warn('휴대폰 번호 입력', '휴대폰 번호를 입력해 주세요.');
            return;
        }
        try {
            await sendAuthCode(phoneNo);
            setIsCodeSent(true);
            notify.success('인증번호 발송', '입력하신 휴대폰 번호로 인증번호가 발송되었습니다.');
        } catch (err) {
            notify.error('발송 실패', '인증번호 발송에 실패했습니다.');
        }
    };

    const handleVerifyCode = async () => {
        if (!authCode.trim()) {
            notify.warn('인증번호 입력', '인증번호를 입력해 주세요.');
            return;
        }
        try {
            const res = await verifyAuthCode(phoneNo, authCode);
            if (res.success || res.verified) {
                setIsPhoneVerified(true);
                if (res.idToken || res.verifyToken) {
                    setIdToken(res.idToken || res.verifyToken);
                }
                notify.success('인증 완료', '본인 인증이 완료되었습니다.');
            } else {
                notify.error('인증 실패', '인증번호가 일치하지 않습니다.');
            }
        } catch (err) {
            notify.error('인증 오류', '인증번호 확인 중 오류가 발생했습니다.');
        }
    };

    const handleAllTerms = (e) => {
        const checked = e.target.checked;
        if (checked && (!viewedTerms.service || !viewedTerms.privacy || !viewedTerms.traveler)) {
            notify.warn('약관 상세보기 필요', '약관 상세보기를 먼저 확인해 주세요.');
            return;
        }
        setTerms({
            service: checked,
            privacy: checked,
            traveler: checked,
            location: checked
        });
        setMarketing(prev => ({
            ...prev,
            agree: checked,
            sms: checked,
            push: checked,
            email: checked,
            tel: checked
        }));
    };

    const isAllTermsChecked = terms.service && terms.privacy && terms.traveler && terms.location;

    // 기사 가입 1단계 -> 2단계 이동 전 유효성 검사 (주민등록번호 미사용)
    const handleNextStep = () => {
        if (!email.trim()) {
            notify.warn('이메일 입력', '이메일을 입력해 주세요.');
            return;
        }
        if (!isEmailChecked) {
            notify.warn('이메일 중복 확인', '이메일 중복 확인을 진행해 주세요.');
            return;
        }
        if (!userName.trim()) {
            notify.warn('기사명 입력', '기사명을 입력해 주세요.');
            return;
        }
        if (!userId.trim()) {
            notify.warn('아이디 입력', '아이디를 입력해 주세요.');
            return;
        }
        if (!isIdChecked) {
            notify.warn('아이디 중복 확인', '아이디 중복 확인을 진행해 주세요.');
            return;
        }
        if (!password) {
            notify.warn('비밀번호 입력', '비밀번호를 입력해 주세요.');
            return;
        }
        if (!validatePassword(password)) {
            notify.warn('비밀번호 양식 오류', '비밀번호는 8자 이상, 영문, 숫자, 특수문자를 포함해야 합니다.');
            return;
        }
        if (password !== passwordConfirm) {
            notify.warn('비밀번호 불일치', '비밀번호와 비밀번호 확인이 일치하지 않습니다.');
            return;
        }
        setStep(2);
    };

    // 최종 가입 제출 처리
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!userType) {
            notify.warn('회원 유형 선택', '회원 유형을 선택해 주세요.');
            return;
        }

        if (!email.trim()) {
            notify.warn('이메일 입력', '이메일을 입력해 주세요.');
            return;
        }
        if (!isEmailChecked) {
            notify.warn('이메일 중복 확인', '이메일 중복 확인을 진행해 주세요.');
            return;
        }

        if (!userName.trim()) {
            notify.warn('성함 입력', isDriver ? '기사명을 입력해 주세요.' : '성함을 입력해 주세요.');
            return;
        }

        if (!userId.trim()) {
            notify.warn('아이디 입력', '아이디를 입력해 주세요.');
            return;
        }
        if (!isIdChecked) {
            notify.warn('아이디 중복 확인', '아이디 중복 확인을 진행해 주세요.');
            return;
        }

        if (!password) {
            notify.warn('비밀번호 입력', '비밀번호를 입력해 주세요.');
            return;
        }
        if (!validatePassword(password)) {
            notify.warn('비밀번호 양식 오류', '비밀번호는 8자 이상, 영문, 숫자, 특수문자를 포함해야 합니다.');
            return;
        }
        if (password !== passwordConfirm) {
            notify.warn('비밀번호 불일치', '비밀번호와 비밀번호 확인이 일치하지 않습니다.');
            return;
        }

        if (!phoneNo.trim()) {
            notify.warn('휴대폰 번호 입력', '휴대폰 번호를 입력해 주세요.');
            return;
        }
        if (!isPhoneVerified) {
            notify.warn('본인 인증 필요', '휴대폰 본인 인증을 진행해 주세요.');
            return;
        }

        if (!terms.service || !terms.privacy || !terms.traveler || !terms.location) {
            notify.warn('필수 약관 동의', '필수 약관에 모두 동의해 주세요.');
            return;
        }

        if (!signature) {
            notify.warn('전자 서명 필요', '전자 서명을 작성해 주세요.');
            return;
        }

        setIsSubmitting(true);

        const mktChannel = [];
        if (marketing.sms) mktChannel.push('SMS');
        if (marketing.push) mktChannel.push('PUSH');
        if (marketing.email) mktChannel.push('EMAIL');
        if (marketing.tel) mktChannel.push('TEL');

        const payload = {
            userId,
            password,
            userName,
            phoneNo,
            userType: isDriver ? 'DRIVER' : 'CUSTOMER',
            email,
            signatureBase64: signature,
            firebaseToken: null,
            residentNo: null, // 주민등록번호 수집 안 함
            recomCode: recomCode.trim() || null,
            termsData: {
                service: terms.service,
                privacy: terms.privacy,
                traveler: terms.traveler,
                location: terms.location
            },
            mktChannelYN: marketing.agree ? 'Y' : 'N',
            mktChannel: mktChannel.join(',')
        };

        try {
            const res = await registerUser(payload);
            if (res.success || res.status === 200 || res.data) {
                Swal.fire({
                    icon: 'success',
                    title: '회원가입 완료',
                    text: isDriver
                        ? '기사 회원가입이 성공적으로 완료되었습니다! 승인 후 서비스를 이용하실 수 있습니다.'
                        : '회원가입이 성공적으로 완료되었습니다!',
                    confirmButtonColor: '#0d9488',
                    confirmButtonText: '로그인하러 가기'
                }).then(() => {
                    navigate('/login');
                });
            } else {
                notify.error('회원가입 실패', res.message || '회원가입 중 오류가 발생했습니다.');
            }
        } catch (err) {
            notify.error('회원가입 오류', err.response?.data?.message || '서버와의 통신에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
            <div className="max-w-md w-full mx-auto space-y-6">
                {/* 상단 타이틀 영역 */}
                <div className="space-y-3">
                    <p className="text-xs font-bold text-amber-800">최고의 기회</p>
                    <h1 className="text-3xl font-headline font-black text-teal-900 leading-tight">새로운<br/>여행의 시작.</h1>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">엄선된 프리미엄 버스 경매를 만나보세요. 정교하게 큐레이션된 플릿 자산을 제공합니다.</p>
                </div>

                {/* 회원 가입 유형 선택 (라디오 버튼) */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3">
                    <label className="text-xs font-bold text-on-surface block">가입 유형 선택 <span className="text-red-500">*필수</span></label>
                    <div className="flex items-center gap-6 pl-1">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="radio"
                                name="userType"
                                value="customer"
                                checked={userType === 'customer'}
                                onChange={() => {
                                    setUserType('customer');
                                    setStep(1);
                                    setIsEmailChecked(false);
                                    setIsIdChecked(false);
                                    setTerms(prev => ({ ...prev, traveler: true }));
                                    setViewedTerms(prev => ({ ...prev, traveler: true }));
                                }}
                                className="w-5 h-5 text-primary border-outline/30 focus:ring-primary cursor-pointer"
                            />
                            <span className={`font-bold text-sm transition-colors ${userType === 'customer' ? 'text-primary' : 'text-slate-600 group-hover:text-on-surface'}`}>고객으로 가입</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="radio"
                                name="userType"
                                value="driver"
                                checked={userType === 'driver'}
                                onChange={() => {
                                    setUserType('driver');
                                    setStep(1);
                                    setIsEmailChecked(false);
                                    setIsIdChecked(false);
                                    setTerms(prev => ({ ...prev, traveler: false }));
                                    setViewedTerms(prev => ({ ...prev, traveler: false }));
                                }}
                                className="w-5 h-5 text-primary border-outline/30 focus:ring-primary cursor-pointer"
                            />
                            <span className={`font-bold text-sm transition-colors ${userType === 'driver' ? 'text-primary' : 'text-slate-600 group-hover:text-on-surface'}`}>기사로 가입</span>
                        </label>
                    </div>
                </div>

                {/* 입력 폼 영역 */}
                <div className="bg-white rounded-2xl p-5 sm:p-8 shadow-2xl shadow-primary/5 space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* 기사 가입 1단계 (이메일, 기사명, 아이디, 비밀번호) */}
                        {isDriver && step === 1 && (
                            <>
                                <div className="bg-teal-50 border border-teal-200 p-4 rounded-xl mb-4">
                                    <p className="text-xs font-bold text-teal-800">기사 가입 (1/2단계: 기본 계정 정보)</p>
                                </div>

                                {/* 이메일 */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-on-surface ml-1">이메일</label>
                                    <div className="flex gap-2">
                                        <input
                                            value={email}
                                            onChange={e => { setEmail(e.target.value); setIsEmailChecked(false); }}
                                            type="email"
                                            placeholder="example@email.com"
                                            className="flex-grow min-w-0 bg-slate-100 rounded-xl py-3 px-3 outline-none focus:bg-slate-200 transition-all font-medium text-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleCheckEmail}
                                            className={`px-3 shrink-0 whitespace-nowrap rounded-xl font-bold text-xs transition-all ${
                                                isEmailChecked ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-white border border-primary text-primary hover:bg-primary/5'
                                            }`}
                                        >
                                            {isEmailChecked ? '확인됨' : '중복 확인'}
                                        </button>
                                    </div>
                                </div>

                                {/* 기사명 */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-on-surface ml-1">기사명 (실명)</label>
                                    <input
                                        value={userName}
                                        onChange={e => setUserName(e.target.value)}
                                        type="text"
                                        placeholder="실명을 입력하세요"
                                        className="w-full bg-slate-100 rounded-xl py-3 px-3 outline-none focus:bg-slate-200 transition-all font-medium text-sm"
                                    />
                                </div>

                                {/* 아이디 */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-on-surface ml-1">아이디</label>
                                    <div className="flex gap-2">
                                        <input
                                            value={userId}
                                            onChange={e => { setUserId(e.target.value); setIsIdChecked(false); }}
                                            type="text"
                                            placeholder="아이디 입력"
                                            className="flex-grow min-w-0 bg-slate-100 rounded-xl py-3 px-3 outline-none font-medium text-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleCheckId}
                                            className={`px-3 shrink-0 whitespace-nowrap rounded-xl font-bold text-xs transition-all ${
                                                isIdChecked ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-white border border-primary text-primary hover:bg-primary/5'
                                            }`}
                                        >
                                            {isIdChecked ? '확인됨' : '중복 확인'}
                                        </button>
                                    </div>
                                </div>

                                {/* 비밀번호 */}
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-on-surface ml-1">비밀번호</label>
                                    <div className="space-y-1">
                                        <div className="relative">
                                            <input
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                type={showPassword ? "text" : "password"}
                                                placeholder="비밀번호 (8자 이상, 영문/숫자/특수문자 포함)"
                                                className="w-full bg-slate-100 rounded-xl py-3 px-3 pr-10 outline-none font-medium focus:bg-slate-200 transition-all text-sm"
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
                                                onChange={e => setPasswordConfirm(e.target.value)}
                                                type={showPasswordConfirm ? "text" : "password"}
                                                placeholder="비밀번호 재입력"
                                                className="w-full bg-slate-100 rounded-xl py-3 px-3 pr-10 outline-none font-medium focus:bg-slate-200 transition-all text-sm"
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

                                <div className="pt-4">
                                    <button
                                        type="button"
                                        onClick={handleNextStep}
                                        className="w-full bg-primary text-white font-headline font-bold py-4 rounded-xl shadow-xl shadow-primary/20 hover:shadow-primary/40 active:scale-[0.98] transition-all text-lg flex items-center justify-center gap-2"
                                    >
                                        <span>다음 단계로 이동 (2/2)</span>
                                        <span className="material-symbols-outlined text-base">arrow_forward</span>
                                    </button>
                                </div>
                            </>
                        )}
                        {/* 고객 가입 폼 OR 기사 가입 2단계 폼 */}
                        {(!isDriver || step === 2) && (
                            <>
                                {isDriver && (
                                    <div className="bg-teal-50 border border-teal-200 p-4 rounded-xl mb-4">
                                        <p className="text-xs font-bold text-teal-800">기사 가입 (2/2단계: 본인인증 및 전자서명)</p>
                                    </div>
                                )}

                                {/* 고객 가입일 때만 1단계 항목 노출 */}
                                {!isDriver && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-on-surface ml-1">이메일</label>
                                            <div className="flex gap-2">
                                                <input
                                                    value={email}
                                                    onChange={e => { setEmail(e.target.value); setIsEmailChecked(false); }}
                                                    type="email"
                                                    placeholder="example@email.com"
                                                    className="flex-grow min-w-0 bg-slate-100 rounded-xl py-3 px-3 outline-none focus:bg-slate-200 transition-all font-medium text-sm"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleCheckEmail}
                                                    className={`px-3 shrink-0 whitespace-nowrap rounded-xl font-bold text-xs transition-all ${
                                                        isEmailChecked ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-white border border-primary text-primary hover:bg-primary/5'
                                                    }`}
                                                >
                                                    {isEmailChecked ? '확인됨' : '중복 확인'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-on-surface ml-1">성함 (실명)</label>
                                            <input
                                                value={userName}
                                                onChange={e => setUserName(e.target.value)}
                                                type="text"
                                                placeholder="실명을 입력하세요"
                                                className="w-full bg-slate-100 rounded-xl py-3 px-3 outline-none focus:bg-slate-200 transition-all font-medium text-sm"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-on-surface ml-1">아이디</label>
                                            <div className="flex gap-2">
                                                <input
                                                    value={userId}
                                                    onChange={e => { setUserId(e.target.value); setIsIdChecked(false); }}
                                                    type="text"
                                                    placeholder="아이디 입력"
                                                    className="flex-grow min-w-0 bg-slate-100 rounded-xl py-3 px-3 outline-none font-medium text-sm"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleCheckId}
                                                    className={`px-3 shrink-0 whitespace-nowrap rounded-xl font-bold text-xs transition-all ${
                                                        isIdChecked ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-white border border-primary text-primary hover:bg-primary/5'
                                                    }`}
                                                >
                                                    {isIdChecked ? '확인됨' : '중복 확인'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-on-surface ml-1">비밀번호</label>
                                            <div className="space-y-1">
                                                <div className="relative">
                                                    <input
                                                        value={password}
                                                        onChange={e => setPassword(e.target.value)}
                                                        type={showPassword ? "text" : "password"}
                                                        placeholder="비밀번호 (8자 이상, 영문/숫자/특수문자 포함)"
                                                        className="w-full bg-slate-100 rounded-xl py-3 px-3 pr-10 outline-none font-medium focus:bg-slate-200 transition-all text-sm"
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
                                                        onChange={e => setPasswordConfirm(e.target.value)}
                                                        type={showPasswordConfirm ? "text" : "password"}
                                                        placeholder="비밀번호 재입력"
                                                        className="w-full bg-slate-100 rounded-xl py-3 px-3 pr-10 outline-none font-medium focus:bg-slate-200 transition-all text-sm"
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
                                    </>
                                )}

                                {/* 공통 본인인증 & 추천인 & 약관 & 서명 */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-on-surface ml-1">휴대폰 번호 인증</label>
                                    <div className="flex gap-2">
                                        <input
                                            value={phoneNo}
                                            onChange={e => {
                                                setPhoneNo(e.target.value.replace(/[^0-9]/g, ''));
                                                setIsPhoneVerified(false);
                                            }}
                                            type="tel"
                                            placeholder="'-' 없이 숫자만 입력"
                                            className="flex-grow min-w-0 bg-slate-100 rounded-xl py-3 px-3 outline-none font-medium text-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleSendCode}
                                            className="px-3 shrink-0 whitespace-nowrap bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary/90 transition-all"
                                        >
                                            {isCodeSent ? '재발송' : '인증번호 발송'}
                                        </button>
                                    </div>

                                    {isCodeSent && (
                                        <div className="flex gap-2 pt-1">
                                            <input
                                                value={authCode}
                                                onChange={e => setAuthCode(e.target.value)}
                                                type="text"
                                                placeholder="인증번호 6자리"
                                                className="flex-grow min-w-0 bg-slate-100 rounded-xl py-3 px-3 outline-none font-medium text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleVerifyCode}
                                                className={`px-3 shrink-0 whitespace-nowrap rounded-xl font-bold text-xs transition-all ${
                                                    isPhoneVerified ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-secondary text-on-secondary hover:bg-secondary/90'
                                                }`}
                                            >
                                                {isPhoneVerified ? '인증완료' : '인증 확인'}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-on-surface ml-1">추천인 아이디 <span className="text-outline font-normal">(선택)</span></label>
                                    <input
                                        value={recomCode}
                                        onChange={e => setRecomCode(e.target.value)}
                                        type="text"
                                        placeholder="추천인 아이디를 입력하세요"
                                        className="w-full bg-slate-100 rounded-xl py-3 px-3 outline-none font-medium text-sm"
                                    />
                                </div>

                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                        <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-on-surface">
                                            <input
                                                type="checkbox"
                                                checked={isAllTermsChecked && marketing.agree}
                                                onChange={handleAllTerms}
                                                className="w-5 h-5 accent-primary rounded cursor-pointer"
                                            />
                                            <span>전체 약관 동의</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleShowTerms}
                                            className="text-xs font-bold text-primary underline"
                                        >
                                            약관 상세보기
                                        </button>
                                    </div>

                                    <div className="space-y-2 pl-1">
                                        {getTermsList().map(item => (
                                            <div key={item.id} className="flex items-center justify-between text-xs">
                                                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={terms[item.id]}
                                                        onChange={e => {
                                                            if (e.target.checked && !viewedTerms[item.id]) {
                                                                notify.warn('상세보기 필요', `${item.title} 상세보기를 먼저 확인해 주세요.`);
                                                                return;
                                                            }
                                                            setTerms(prev => ({ ...prev, [item.id]: e.target.checked }));
                                                        }}
                                                        className="w-4 h-4 accent-primary rounded cursor-pointer"
                                                    />
                                                    <span><strong className="text-primary">[필수]</strong> {item.title}</span>
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={handleShowTerms}
                                                    className={`text-[11px] font-bold ${viewedTerms[item.id] ? 'text-green-600' : 'text-blue-600 underline'}`}
                                                >
                                                    {viewedTerms[item.id] ? '확인완료' : '보기'}
                                                </button>
                                            </div>
                                        ))}

                                        <div className="pt-2 border-t border-slate-100">
                                            <div className="flex items-center justify-between text-xs">
                                                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={marketing.agree}
                                                        onChange={e => {
                                                            if (e.target.checked && !viewedTerms.marketing) {
                                                                notify.warn('상세보기 필요', '마케팅 동의 상세보기를 먼저 확인해 주세요.');
                                                                return;
                                                            }
                                                            handleMarketingAll(e);
                                                        }}
                                                        className="w-4 h-4 accent-primary rounded cursor-pointer"
                                                    />
                                                    <span><strong className="text-slate-400">[선택]</strong> 마케팅 정보 수신 및 알림 동의</span>
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={handleShowTerms}
                                                    className={`text-[11px] font-bold ${viewedTerms.marketing ? 'text-green-600' : 'text-blue-600 underline'}`}
                                                >
                                                    {viewedTerms.marketing ? '확인완료' : '보기'}
                                                </button>
                                            </div>

                                            {marketing.agree && (
                                                <div className="grid grid-cols-2 gap-2 mt-2 ml-6 text-xs bg-slate-50 p-2 rounded-lg">
                                                    {[
                                                        { id: 'sms', label: 'SMS' },
                                                        { id: 'push', label: '앱 푸시' },
                                                        { id: 'email', label: '이메일' },
                                                        { id: 'tel', label: '유선전화' }
                                                    ].map(m => (
                                                        <label key={m.id} className="flex items-center gap-1.5 cursor-pointer text-slate-600">
                                                            <input
                                                                type="checkbox"
                                                                checked={marketing[m.id]}
                                                                onChange={e => setMarketing({ ...marketing, [m.id]: e.target.checked })}
                                                                className="w-3.5 h-3.5 accent-primary"
                                                            />
                                                            <span>{m.label}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <SignaturePad onSave={setSignature} onClear={() => setSignature('')} />
                                </div>

                                <div className="pt-4 flex gap-3">
                                    {isDriver && (
                                        <button
                                            type="button"
                                            onClick={() => setStep(1)}
                                            className="w-1/3 bg-slate-200 text-slate-700 font-headline font-bold py-4 rounded-xl shadow-md hover:bg-slate-300 transition-all text-base flex items-center justify-center gap-1"
                                        >
                                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                                            <span>이전 단계</span>
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className={`${isDriver ? 'w-2/3' : 'w-full'} text-white font-headline font-bold py-4 rounded-xl shadow-xl transition-all text-xl flex items-center justify-center gap-2 ${
                                            isSubmitting ? 'bg-slate-400 cursor-not-allowed shadow-none' : 'bg-primary shadow-primary/20 hover:shadow-primary/40 active:scale-[0.98]'
                                        }`}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                <span>가입 처리 중...</span>
                                            </>
                                        ) : (
                                            <span>{isDriver ? '기사로 가입' : '고객으로 가입'}</span>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </form>

                    <div className="text-center pt-2">
                        <span className="text-sm font-medium text-slate-400">이미 계정이 있으신가요? </span>
                        <button onClick={() => navigate('/login')} className="text-sm font-bold text-primary hover:underline ml-1">로그인하기</button>
                    </div>
                </div>
            </div>

            <footer className="mt-12 text-center space-y-1">
                <p className="text-[10px] font-black text-outline uppercase tracking-[0.4em]">EDITORIAL TRANSIT EXPERIENCE ©</p>
                <p className="text-[10px] font-black text-outline uppercase tracking-[0.4em]">BUSTAAMS 2024</p>
            </footer>
        </div>
    );
};

export default Signup;
