import React, { useState, useEffect } from 'react';

const AccountSettings = ({ user, onBack, onLogout }) => {
  const [userName, setUserName] = useState(user?.userName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phoneNo, setPhoneNo] = useState(user?.phoneNo || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // 휴대폰 인증 관련 상태
  const [isPhoneVerified, setIsPhoneVerified] = useState(true); // 초기에는 이미 인증된 상태로 간주
  const [isSmsSent, setIsSmsSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [timer, setTimer] = useState(0);
  const [originalPhoneNo, setOriginalPhoneNo] = useState('');

  // user 정보가 변경될 때마다 state 동기화
  useEffect(() => {
    if (user) {
      setUserName(user.userName || '');
      setEmail(user.email || '');
      const phone = user.phoneNo || '';
      setPhoneNo(phone);
      setOriginalPhoneNo(phone);
      setIsPhoneVerified(true);
    }
  }, [user]);

  // 타이머 관리
  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // 뒷배경 스크롤 방지
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // 휴대폰 번호 수정 시 인증 상태 초기화
  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setPhoneNo(val);
    if (val !== originalPhoneNo) {
      setIsPhoneVerified(false);
      setIsSmsSent(false);
      setVerificationCode('');
    } else {
      setIsPhoneVerified(true);
    }
  };

  const handleSendSms = async () => {
    if (!phoneNo || phoneNo.length < 10) {
      alert('올바른 휴대폰 번호를 입력해주세요.');
      return;
    }
    
    // 전송 시작 시 기존 인증 상태 해제 (입력창을 보여주기 위함)
    setIsPhoneVerified(false);
    setIsSmsSent(false);

    try {
      const res = await fetch('http://localhost:8080/api/auth/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phoneNo })
      });
      if (res.ok) {
        setIsSmsSent(true);
        setTimer(180); // 3분
        // alert 제거: 회원가입 화면처럼 인풋박스가 바로 보이게 함
      } else {
        alert('인증번호 발송에 실패했습니다.');
      }
    } catch (err) {
      alert('서버 오류가 발생했습니다.');
    }
  };

  const handleVerifySms = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/auth/verify-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phoneNo, code: verificationCode })
      });
      const data = await res.json();
      if (res.ok) {
        setIsPhoneVerified(true);
        setTimer(0);
        alert('인증이 완료되었습니다.');
      } else {
        alert(data.error || '인증번호가 일치하지 않습니다.');
      }
    } catch (err) {
      alert('인증 확인 중 오류가 발생했습니다.');
    }
  };

  const handleSave = async () => {
    if (!currentPassword) {
      alert('변경을 위해 현재 비밀번호를 입력해주세요.');
      return;
    }

    if (!isPhoneVerified) {
      alert('휴대폰 번호 변경을 위해 인증을 완료해주세요.');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      alert('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8080/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          custId: user.custId,
          email,
          phoneNo,
          currentPassword,
          newPassword
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(result.message || '정보가 성공적으로 수정되었습니다.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        if (onBack) onBack(); 
      } else {
        alert(result.error || '정보 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 cursor-pointer" onClick={onBack}></div>
      
      <div className="relative w-full max-w-[1000px] h-[90vh] bg-surface rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header Section */}
        <header className="shrink-0 px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-10">
          <div>
            <h1 className="font-headline text-3xl font-black text-teal-950 tracking-tighter">회원 정보 관리</h1>
            <p className="text-slate-500 text-sm font-medium mt-1">계정 보안과 개인정보를 최신 상태로 유지하세요.</p>
          </div>
          <button 
            onClick={onBack}
            className="w-12 h-12 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-full transition-all active:scale-90"
          >
            <span className="material-symbols-outlined font-bold">close</span>
          </button>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto px-10 py-12 custom-scrollbar space-y-12">
          <div className="grid grid-cols-12 gap-10">
            {/* Left: Basic Info */}
            <section className="col-span-12 lg:col-span-7 space-y-8">
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-primary"></div>
                <h3 className="font-headline text-xl font-bold mb-8 flex items-center gap-3 text-teal-900">
                  <span className="material-symbols-outlined">person</span>
                  기본 인적 사항
                </h3>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">이름</label>
                      <input 
                        className="bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-primary/20 transition-all font-bold text-slate-500" 
                        readOnly 
                        type="text" 
                        value={userName}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">이메일 주소</label>
                      <input 
                        className="bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-bold text-slate-800" 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  {/* 휴대폰 번호 인증 섹션 (회원가입 화면 스타일 적용) */}
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-500">휴대폰 번호 인증</label>
                      {isPhoneVerified && (
                        <span className="text-[12px] font-bold text-teal-600 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          인증 완료
                        </span>
                      )}
                    </div>

                    {/* 번호 입력 및 전송 버튼 */}
                    <div className="flex gap-2">
                      <input 
                        className={`flex-1 bg-slate-100/50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:ring-2 focus:ring-orange-500/20 transition-all font-bold text-slate-800 ${isPhoneVerified ? 'border-teal-500/30' : ''}`}
                        type="tel" 
                        value={phoneNo}
                        onChange={handlePhoneChange}
                        placeholder="휴대폰 번호 (- 없이 입력)"
                      />
                      <button 
                        onClick={handleSendSms}
                        disabled={timer > 0 && isSmsSent}
                        className={`px-6 rounded-2xl font-bold text-white transition-all shadow-lg whitespace-nowrap ${timer > 0 && isSmsSent ? 'bg-slate-300 cursor-not-allowed shadow-none' : 'bg-gradient-to-br from-orange-500 to-rose-600 hover:shadow-orange-500/30 active:scale-95'}`}
                      >
                        {isSmsSent ? '인증번호 재전송' : '인증번호 전송'}
                      </button>
                    </div>
                    
                    {/* 인증번호 입력란 (회원가입 화면과 동일한 스타일) */}
                    {isSmsSent && !isPhoneVerified && (
                      <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input 
                              className="w-full bg-slate-100/50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:ring-2 focus:ring-orange-500/20 transition-all font-bold text-slate-800"
                              type="text" 
                              placeholder="인증번호 6자리"
                              value={verificationCode}
                              onChange={(e) => setVerificationCode(e.target.value)}
                            />
                            {timer > 0 && (
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-500 font-bold text-sm">
                                {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
                              </span>
                            )}
                          </div>
                          <button 
                            onClick={handleVerifySms}
                            className="px-8 bg-white border border-slate-200 text-slate-800 rounded-2xl font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                          >
                            확인
                          </button>
                        </div>
                        <p className="text-[11px] text-teal-600 font-medium ml-1">
                          인증번호가 전송되었습니다. (개발모드: 123456)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Password Change */}
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
                <h3 className="font-headline text-xl font-bold mb-8 flex items-center gap-3 text-teal-900">
                  <span className="material-symbols-outlined">lock_reset</span>
                  비밀번호 변경
                </h3>
                <div className="space-y-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">현재 비밀번호</label>
                    <input 
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all" 
                      placeholder="••••••••" 
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">새 비밀번호</label>
                      <input 
                        className="bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all" 
                        placeholder="새 비밀번호" 
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">비밀번호 확인</label>
                      <input 
                        className="bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all" 
                        placeholder="한번 더 입력" 
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Right: Security & SNS */}
            <section className="col-span-12 lg:col-span-5 space-y-8">
              <div className="bg-teal-950 text-white p-8 rounded-[2rem] shadow-xl relative overflow-hidden group min-h-[220px] flex flex-col justify-end">
                <div className="relative z-10">
                  <span className="inline-block px-3 py-1 bg-primary text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-4">Secured</span>
                  <h4 className="font-headline text-2xl font-bold mb-2">보안 등급: 높음</h4>
                  <p className="text-white/60 text-sm font-medium leading-relaxed">계정 정보가 안전하게 암호화되어 관리되고 있습니다.</p>
                </div>
                <span className="material-symbols-outlined absolute -top-4 -right-4 text-9xl opacity-5 rotate-12 group-hover:rotate-0 transition-transform duration-700">security</span>
              </div>

              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
                <h3 className="font-headline text-xl font-bold mb-8 flex items-center gap-3 text-teal-900">
                  <span className="material-symbols-outlined">link</span>
                  SNS 계정 연동
                </h3>
                <div className="space-y-4">
                  {[
                    { name: '카카오톡', color: 'bg-[#FEE500]', initial: 'K', status: '연동되지 않음', action: '연동하기' },
                    { name: '네이버', color: 'bg-[#03C75A]', initial: 'N', status: '연동 완료 (minsu***)', action: '연동 해제' },
                    { name: '구글', color: 'bg-white', initial: 'G', status: '연동되지 않음', action: '연동하기' }
                  ].map((sns) => (
                    <div key={sns.name} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 ${sns.color} rounded-full flex items-center justify-center font-black text-sm shadow-sm`}>{sns.initial}</div>
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{sns.name}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{sns.status}</div>
                        </div>
                      </div>
                      <button className="text-[11px] font-black text-teal-800 hover:text-orange-600 transition-colors uppercase tracking-widest">{sns.action}</button>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-3 p-6 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-[2rem] transition-all font-bold text-sm border-2 border-dashed border-slate-200 hover:border-red-100"
              >
                <span className="material-symbols-outlined">logout</span> 
                계정 로그아웃
              </button>
            </section>
          </div>
        </main>

        {/* Footer Action Bar */}
        <footer className="shrink-0 px-10 py-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-6 items-center sticky bottom-0">
          <button 
            onClick={onBack}
            className="text-slate-400 font-bold hover:text-teal-950 transition-colors text-sm"
          >
            취소
          </button>
          <button 
            onClick={handleSave}
            disabled={isLoading}
            className={`bg-primary text-white px-12 py-4 rounded-full font-headline text-lg font-bold shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? '저장 중...' : '변경사항 저장하기'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default AccountSettings;
