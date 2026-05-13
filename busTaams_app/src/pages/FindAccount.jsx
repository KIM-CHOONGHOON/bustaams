import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { findId, sendAuthCode, verifyAuthCode } from '../api';
import { notify } from '../utils/toast';
import api from '../api'; // 비밀번호 재설정을 위한 api 객체

const FindAccount = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('id'); // 'id' or 'pw'
    const [showResult, setShowResult] = useState(false);

    // Form inputs
    const [phoneNo, setPhoneNo] = useState('');
    const [userId, setUserId] = useState('');
    const [foundId, setFoundId] = useState('');
    const [authCode, setAuthCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');

    // State for flows
    const [isCodeSent, setIsCodeSent] = useState(false);
    const [isPhoneVerified, setIsPhoneVerified] = useState(false);
    const [idToken, setIdToken] = useState(null);
    const [showPasswordFields, setShowPasswordFields] = useState(false);

    const validatePassword = (pw) => {
        const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
        return regex.test(pw);
    };

    const handleFindId = async () => {
        if (!phoneNo) return notify.warn('휴대폰 번호를 입력하세요.');
        try {
            const res = await findId(phoneNo);
            if (res.success) {
                setFoundId(res.userId);
                setShowResult(true);
            } else {
                notify.error('실패', res.error || '정보를 찾을 수 없습니다.');
            }
        } catch (err) {
            notify.error('오류', '아이디 찾기 중 오류가 발생했습니다.');
        }
    };



    const handleSendCode = async () => {
        if (!phoneNo) return notify.warn('휴대폰 번호를 입력하세요.');
        if (activeTab === 'pw' && !userId) return notify.warn('아이디를 먼저 입력하세요.');

        try {
            const res = await sendAuthCode(phoneNo, 'find-account');
            if (res.success) {
                setIsCodeSent(true);
                notify.success('인증번호 발송', '인증번호가 발송되었습니다.');
            } else {
                notify.error('발송 실패', res.error || '인증번호 발송 중 오류가 발생했습니다.');
            }
        } catch (err) {
            console.error('Send Code Error:', err);
            notify.error('발송 실패', '인증번호 발송 중 오류가 발생했습니다.');
        }
    };

    const handleVerifyCode = async () => {
        if (!authCode) return notify.warn('인증번호를 입력하세요.');

        try {
            const res = await verifyAuthCode(phoneNo, authCode, 'find-account');
            if (res.success) {
                setIdToken(res.verifyToken);
                setIsPhoneVerified(true);
                
                if (activeTab === 'id') {
                    // 아이디 찾기 탭인 경우 바로 아이디 조회 실행
                    const findRes = await findId(phoneNo, res.verifyToken);
                    if (findRes.success) {
                        setFoundId(findRes.userId);
                        setShowResult(true);
                        notify.success('인증 성공', '아이디를 성공적으로 찾았습니다.');
                    } else {
                        notify.error('실패', findRes.error || '정보를 찾을 수 없습니다.');
                    }
                } else {
                    setShowPasswordFields(true);
                    notify.success('인증 성공', '본인 확인이 완료되었습니다. 새 비밀번호를 설정하세요.');
                }
            } else {
                notify.error('인증 실패', res.error || '인증번호가 올바르지 않습니다.');
            }
        } catch (err) {
            console.error('Verify Code Error:', err);
            notify.error('인증 실패', '인증번호 확인 중 오류가 발생했습니다.');
        }
    };

    const handleResetPassword = async () => {
        if (!validatePassword(newPassword)) return notify.error('규칙 위반', '8자 이상, 숫자, 특수문자를 포함하세요.');
        if (newPassword !== passwordConfirm) return notify.error('불일치', '비밀번호 확인이 다릅니다.');

        try {
            const res = await api.post('/app/auth/reset-password', {
                userId,
                phoneNo,
                newPassword,
                firebaseToken: idToken
            });

            if (res.success) {
                notify.success('변경 완료', '비밀번호가 성공적으로 재설정되었습니다.');
                setTimeout(() => navigate('/login'), 1500);
            } else {
                notify.error('변경 실패', res.error);
            }
        } catch (err) {
            notify.error('오류', err.message || '비밀번호 재설정 중 문제가 발생했습니다.');
        }
    };

    return (
        <div className="bg-background text-on-surface font-body min-h-screen flex flex-col items-center">
            {/* Top Navigation Bar */}
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-sm border-b border-slate-50 flex items-center justify-between px-6 py-4">
                <button onClick={() => navigate(-1)} className="text-teal-600 active:scale-95 duration-200 p-2 hover:bg-slate-50 rounded-full transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-2xl font-black text-teal-700 italic tracking-tighter">busTaams</h1>
                <div className="w-10"></div>
            </header>

            <main className="flex-grow pt-24 pb-12 px-6 max-w-md mx-auto w-full text-left">
                {/* Header Section */}
                <section className="mb-12">
                    <h2 className="text-4xl font-extrabold text-on-surface leading-tight tracking-tighter mb-2 text-[32px] md:text-[40px]">
                        계정 정보를<br/>잊으셨나요?
                    </h2>
                    <p className="text-on-surface-variant font-medium text-sm">안전한 서비스 이용을 위해 본인 확인이 필요합니다.</p>
                </section>

                {/* Tabs */}
                <div className="mb-10 flex gap-8 border-none overflow-x-auto no-scrollbar relative">
                    <button 
                        onClick={() => {setActiveTab('id'); setShowResult(false); setIsCodeSent(false); setIsPhoneVerified(false); setPhoneNo(''); setAuthCode('');}}
                        className={`relative pb-2 text-xl font-bold transition-all duration-300 ${activeTab === 'id' ? 'text-teal-700' : 'text-slate-300 hover:text-teal-600/60'}`}
                    >
                        아이디 찾기
                        {activeTab === 'id' && <span className="absolute bottom-0 left-0 w-8 h-1 bg-teal-600 rounded-full"></span>}
                    </button>
                    <button 
                        onClick={() => {setActiveTab('pw'); setShowResult(false); setIsCodeSent(false); setIsPhoneVerified(false); setPhoneNo(''); setAuthCode('');}}
                        className={`relative pb-2 text-xl font-bold transition-all duration-300 ${activeTab === 'pw' ? 'text-teal-700' : 'text-slate-300 hover:text-teal-600/60'}`}
                    >
                        비밀번호 찾기
                        {activeTab === 'pw' && <span className="absolute bottom-0 left-0 w-8 h-1 bg-teal-600 rounded-full"></span>}
                    </button>
                </div>

                {!showResult ? (
                    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {activeTab === 'id' ? (
                            <div className="space-y-8">
                                <div className="space-y-6">
                                    <div className="relative group">
                                        <label className="block text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-2 ml-1">휴대폰 번호</label>
                                        <div className="flex gap-2">
                                            <input 
                                                value={phoneNo}
                                                onChange={(e) => setPhoneNo(e.target.value.replace(/[^0-9]/g, ''))}
                                                disabled={isPhoneVerified}
                                                className="flex-grow px-6 py-4 bg-slate-50 border-none rounded-xl font-medium outline-none disabled:opacity-50" 
                                                placeholder="01012345678" 
                                                type="tel"
                                            />
                                            <button 
                                                type="button" 
                                                onClick={handleSendCode} 
                                                disabled={isPhoneVerified}
                                                className="px-4 py-2 bg-teal-600 text-white rounded-xl font-bold text-xs disabled:opacity-50"
                                            >
                                                {isCodeSent ? '재발송' : '인증요청'}
                                            </button>
                                        </div>
                                    </div>

                                    {isCodeSent && !isPhoneVerified && (
                                        <div className="relative">
                                            <label className="block text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-2 ml-1">인증번호</label>
                                            <div className="flex gap-2">
                                                <input 
                                                    value={authCode}
                                                    onChange={(e) => setAuthCode(e.target.value)}
                                                    className="flex-grow px-6 py-4 bg-slate-50 border-none rounded-xl font-medium outline-none" 
                                                    placeholder="6자리 숫자" 
                                                    type="text"
                                                />
                                                <button 
                                                    type="button" 
                                                    onClick={handleVerifyCode} 
                                                    className="px-6 py-2 bg-primary text-white rounded-xl font-bold text-xs"
                                                >
                                                    확인
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                <div className="space-y-6">
                                    <div className="relative">
                                        <label className="block text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-2 ml-1">아이디</label>
                                        <input 
                                            value={userId}
                                            onChange={(e) => setUserId(e.target.value)}
                                            disabled={isPhoneVerified}
                                            className="w-full px-6 py-4 bg-slate-50 border-none rounded-xl font-medium outline-none disabled:opacity-50" 
                                            placeholder="아이디를 입력하세요" 
                                            type="text"
                                        />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-2 ml-1">휴대폰 번호</label>
                                        <div className="flex gap-2">
                                            <input 
                                                value={phoneNo}
                                                onChange={(e) => setPhoneNo(e.target.value.replace(/[^0-9]/g, ''))}
                                                disabled={isPhoneVerified}
                                                className="flex-grow px-6 py-4 bg-slate-50 border-none rounded-xl font-medium outline-none disabled:opacity-50" 
                                                placeholder="01012345678" 
                                                type="tel"
                                            />
                                            <button 
                                                type="button" 
                                                onClick={handleSendCode} 
                                                disabled={isPhoneVerified}
                                                className="px-4 py-2 bg-teal-600 text-white rounded-xl font-bold text-xs disabled:opacity-50"
                                            >
                                                {isCodeSent ? '재발송' : '인증요청'}
                                            </button>
                                        </div>

                                    </div>

                                    {isCodeSent && !isPhoneVerified && (
                                        <div className="relative">
                                            <label className="block text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-2 ml-1">인증번호</label>
                                            <div className="flex gap-2">
                                                <input 
                                                    value={authCode}
                                                    onChange={(e) => setAuthCode(e.target.value)}
                                                    className="flex-grow px-6 py-4 bg-slate-50 border-none rounded-xl font-medium outline-none" 
                                                    placeholder="6자리 숫자" 
                                                    type="text"
                                                />
                                                <button 
                                                    type="button" 
                                                    onClick={handleVerifyCode} 
                                                    className="px-6 py-2 bg-primary text-white rounded-xl font-bold text-xs"
                                                >
                                                    확인
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {showPasswordFields && (
                                        <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                                            <div className="relative">
                                                <label className="block text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-2 ml-1">새 비밀번호</label>
                                                <input 
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-xl font-medium outline-none" 
                                                    placeholder="8자 이상, 영문, 숫자, 특수문자 포함" 
                                                    type="password"
                                                />
                                                {newPassword && (
                                                    <p className={`text-[10px] mt-1 ml-1 font-bold ${validatePassword(newPassword) ? 'text-green-600' : 'text-red-500'}`}>
                                                        {validatePassword(newPassword) ? '✔ 조건 충족' : '✘ 8자 이상, 영문, 숫자, 특수문자 포함'}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <label className="block text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-2 ml-1">새 비밀번호 확인</label>
                                                <input 
                                                    value={passwordConfirm}
                                                    onChange={(e) => setPasswordConfirm(e.target.value)}
                                                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-xl font-medium outline-none" 
                                                    placeholder="비밀번호 재입력" 
                                                    type="password"
                                                />
                                                {passwordConfirm && (
                                                    <p className={`text-[10px] mt-1 ml-1 font-bold ${newPassword === passwordConfirm ? 'text-green-600' : 'text-red-500'}`}>
                                                        {newPassword === passwordConfirm ? '✔ 비밀번호 일치' : '✘ 비밀번호 불일치'}
                                                    </p>
                                                )}
                                            </div>
                                            <button 
                                                onClick={handleResetPassword}
                                                className="w-full py-5 rounded-full bg-gradient-to-r from-primary to-teal-800 text-white font-bold text-lg shadow-2xl shadow-primary/20 active:scale-95 transition-all outline-none"
                                            >
                                                비밀번호 재설정 완료
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Result Preview Card */
                    <section className="mt-8 animate-in zoom-in-95 duration-500">
                        <div className="bg-white rounded-2xl p-8 shadow-2xl shadow-teal-900/5 border-l-4 border-secondary relative overflow-hidden border border-slate-50/50">
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="material-symbols-outlined text-secondary text-[20px]" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>
                                    <span className="text-[11px] font-bold text-secondary uppercase tracking-widest">본인 확인 완료</span>
                                </div>
                                <p className="text-on-surface-variant mb-1 font-medium text-sm">고객님의 아이디는 아래와 같습니다.</p>
                                <div className="text-3xl font-extrabold text-on-surface tracking-tight mb-8">
                                    {foundId}
                                </div>
                                <div className="flex flex-col md:flex-row gap-3">
                                    <button 
                                        onClick={() => navigate('/login')}
                                        className="flex-1 py-4 bg-slate-100 rounded-full font-bold text-on-surface active:scale-95 transition-all text-sm"
                                    >
                                        로그인하기
                                    </button>
                                    <button 
                                        onClick={() => {setActiveTab('pw'); setShowResult(false);}}
                                        className="flex-1 py-4 bg-gradient-to-br from-secondary to-orange-600 text-white rounded-full font-bold active:scale-95 transition-all text-sm"
                                    >
                                        비밀번호 찾기
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                )}
            </main>

            <footer className="mt-auto pb-12 px-6 text-center">
                <p className="text-[12px] text-on-surface-variant font-medium">
                    도움이 필요하신가요? <button className="text-teal-600 font-bold underline decoration-2 underline-offset-4 ml-1">고객센터 문의</button>
                </p>
            </footer>
        </div>
    );
};

export default FindAccount;
