import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    checkIdDuplicate, 
    checkEmailDuplicate, 
    sendAuthCode, 
    verifyAuthCode, 
    registerUser 
} from '../api';
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

    const [isIdChecked, setIsIdChecked] = useState(false);
    const [isEmailChecked, setIsEmailChecked] = useState(false);
    const [isCodeSent, setIsCodeSent] = useState(false);
    const [isPhoneVerified, setIsPhoneVerified] = useState(false);

    // 약관 4가지
    const [terms, setTerms] = useState({
        service: false,
        privacy: false,
        traveler: false,
        location: false
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

    const handleSendCode = async () => {
        if (!phoneNo) return notify.warn('번호를 입력하세요.');
        try {
            const res = await sendAuthCode(phoneNo);
            if (res.success) {
                notify.success('인증번호 발송', res.debugCode ? `테스트 번호: ${res.debugCode}` : '번호가 발송되었습니다.');
                setIsCodeSent(true);
            } else {
                notify.error('발송 실패', res.error || '인증번호 발송에 실패했습니다.');
            }
        } catch (err) {
            notify.error('오류', '인증번호 발송 중 문제가 발생했습니다.');
        }
    };

    const handleVerifyCode = async () => {
        if (!authCode) return notify.warn('인증번호를 입력하세요.');
        try {
            const res = await verifyAuthCode(phoneNo, authCode);
            if (res.success) {
                notify.success('인증 성공');
                setIsPhoneVerified(true);
            } else {
                notify.error('인증 실패');
            }
        } catch (err) {}
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
                termsData
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
                                <input 
                                    value={password} 
                                    onChange={e=>setPassword(e.target.value)} 
                                    type="password" 
                                    placeholder="비밀번호(8자 이상, 숫자, 특수문자 포함)" 
                                    className="w-full bg-slate-100 rounded-xl py-4 px-5 outline-none font-medium focus:bg-slate-200 transition-all" 
                                />
                                {password && (
                                    <p className={`text-[10px] ml-1 font-bold ${validatePassword(password) ? 'text-green-600' : 'text-red-500'}`}>
                                        {validatePassword(password) ? '✔ 사용 가능한 비밀번호입니다.' : '✘ 8자 이상, 영문, 숫자, 특수문자를 포함해야 합니다.'}
                                    </p>
                                )}
                            </div>
                            
                            <div className="space-y-1">
                                <input 
                                    value={passwordConfirm} 
                                    onChange={e=>setPasswordConfirm(e.target.value)} 
                                    type="password" 
                                    placeholder="비밀번호를 다시 한번 입력하세요" 
                                    className="w-full bg-slate-100 rounded-xl py-4 px-5 outline-none font-medium focus:bg-slate-200 transition-all" 
                                />
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
                                    <input value={phoneNo} onChange={e=>setPhoneNo(e.target.value.replace(/[^0-9]/g, ''))} type="tel" placeholder="휴대폰 번호" className="w-full bg-slate-100 rounded-xl py-4 pl-12 pr-4 outline-none font-medium" />
                                </div>
                                <button type="button" onClick={handleSendCode} className="px-6 bg-white border border-primary text-primary rounded-xl font-bold text-sm">인증요청</button>
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-grow relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">verified_user</span>
                                    <input value={authCode} onChange={e=>setAuthCode(e.target.value)} type="text" placeholder="6자리 인증번호" className="w-full bg-slate-100 rounded-xl py-4 pl-12 pr-4 outline-none font-medium" />
                                </div>
                                <button type="button" onClick={handleVerifyCode} className="px-6 bg-white border border-primary text-primary rounded-xl font-bold text-sm">인증확인</button>
                            </div>
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
                                    { id: 'service', label: '서비스 이용약관 동의', required: true },
                                    { id: 'privacy', label: '개인정보 수집 및 이용 동의', required: true },
                                    { id: 'traveler', label: '여행자 서비스 이용 규정 동의', required: true }
                                ].map(item => (
                                    <div key={item.id} className="flex items-center justify-between">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${terms[item.id] ? 'bg-primary border-primary' : 'border-outline/30 bg-white'}`}>
                                                <input type="checkbox" className="hidden" checked={terms[item.id]} onChange={e => setTerms({...terms, [item.id]: e.target.checked})} />
                                                {terms[item.id] && <span className="material-symbols-outlined text-white text-xs">check</span>}
                                            </div>
                                            <span className="text-sm font-bold text-on-surface-variant flex gap-1">
                                                <span className="text-primary">[필수]</span> {item.label}
                                            </span>
                                        </label>
                                        <button type="button" className="text-[10px] text-outline underline font-bold uppercase tracking-tighter">상세보기</button>
                                    </div>
                                ))}

                                {/* 4번째 항목: 마케팅 동의 (선택) */}
                                <div className="pt-2 border-t border-slate-200">
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${marketing.agree ? 'bg-primary border-primary' : 'border-outline/30 bg-white'}`}>
                                                <input type="checkbox" className="hidden" checked={marketing.agree} onChange={handleMarketingAll} />
                                                {marketing.agree && <span className="material-symbols-outlined text-white text-xs">check</span>}
                                            </div>
                                            <span className="text-sm font-bold text-on-surface-variant flex gap-1">
                                                <span className="text-outline">[선택]</span> 마케팅 정보 수신 및 푸시 알림 동의
                                            </span>
                                        </label>
                                        <button type="button" className="text-[10px] text-outline underline font-bold uppercase tracking-tighter">상세보기</button>
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
