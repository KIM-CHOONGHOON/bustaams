import React, { useState, useEffect } from 'react';

const AccountSettings = ({ user, onBack, onLogout, onUpdateUser }) => {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
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
      console.log('[DEBUG] AccountSettings User Prop Full:', JSON.stringify(user, null, 2));
      console.log('[DEBUG] User Keys:', Object.keys(user));
      setUserName(user.userName || user.USER_NM || '');
      setEmail(user.email || user.EMAIL || '');
      const phone = user.phoneNo || user.HP_NO || '';
      setPhoneNo(phone);
      setOriginalPhoneNo(phone);
      setIsPhoneVerified(true);
    }
  }, [user]);

  // 프로필 이미지 ID 추출 (대소문자 및 매핑 호환성)
  const profileFileId = user?.profileFileId || user?.PROFILE_FILE_ID || null;

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

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPhoto, setNewPhoto] = useState(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('사진 크기는 2MB 이하여야 합니다.');
        return;
      }
      setNewPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!currentPassword) {
      alert('본인 확인을 위해 현재 비밀번호를 입력해주세요.');
      return;
    }

    if (!isPhoneVerified) {
      alert('휴대폰 번호 인증을 완료해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          custId: user.custId,
          email,
          phoneNo,
          currentPassword, // 정보 수정을 위한 인증용
          photoBase64: newPhotoPreview, // 신규 추가
          photoName: newPhoto?.name || 'profile.png'
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(result.message || '회원 정보가 성공적으로 수정되었습니다.');
        
        if (onUpdateUser) {
          const updatedUser = {
            ...user,
            email,
            phoneNo,
            profileFileId: result.profileFileId || profileFileId // 서버에서 돌려받은 신규 ID 반영
          };
          onUpdateUser(updatedUser);
        }
        setCurrentPassword('');
        setNewPhoto(null);
        setNewPhotoPreview(null);
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

  const handlePasswordChangeSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('모든 항목을 입력해주세요.');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          custId: user.custId,
          currentPassword,
          newPassword // 비밀번호 변경 요청
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert('비밀번호가 변경되었습니다. 보안을 위해 다시 로그인해주세요.');
        setShowPasswordModal(false); // 모달 닫기
        if (onBack) onBack(); // 내 정보 관리 화면도 닫기
        onLogout(); // 로그아웃 처리
      } else {
        alert(result.error || '비밀번호 변경에 실패했습니다.');
      }
    } catch (error) {
      alert('서버 오류가 발생했습니다.');
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

              {/* Security Section (Password Change) */}
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-teal-600"></div>
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-headline text-xl font-bold flex items-center gap-3 text-teal-900">
                    <span className="material-symbols-outlined">security</span>
                    보안 설정
                  </h3>
                  <span className="px-3 py-1 bg-teal-50 text-teal-700 text-[10px] font-black uppercase tracking-widest rounded-full">Secure</span>
                </div>
                
                <div className="space-y-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">본인 확인 (현재 비밀번호)</label>
                    <input 
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-bold" 
                      placeholder="정보 수정을 위해 입력하세요" 
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group-hover:bg-slate-100/50 transition-colors">
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800">비밀번호 변경</h4>
                      <p className="text-xs text-slate-500">주기적인 비밀번호 변경으로 계정을 안전하게 보호하세요.</p>
                    </div>
                    <button 
                      onClick={() => setShowPasswordModal(true)}
                      className="px-6 py-3 bg-white border border-slate-200 text-slate-800 rounded-xl font-bold text-sm hover:border-primary hover:text-primary transition-all shadow-sm active:scale-95"
                    >
                      변경하기
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Right: Security Branding & SNS */}
            <section className="col-span-12 lg:col-span-5 space-y-8">
              {/* Right Side Card: Profile Photo (Driver only) */}
              {user?.userType === 'DRIVER' ? (
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 flex flex-col items-center justify-center space-y-6 relative overflow-hidden group min-h-[300px]">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-teal-600 to-teal-400"></div>
                  
                  {/* Hidden File Input */}
                  <input 
                    type="file" 
                    id="profile-photo-input" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handlePhotoChange}
                  />

                  <div className="relative">
                    <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-white shadow-xl ring-4 ring-teal-50">
                      {newPhotoPreview ? (
                        <img src={newPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : profileFileId ? (
                        <img 
                          src={`${API_BASE}/api/user/profile-image?fileId=${profileFileId}`} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                          <span className="material-symbols-outlined text-6xl">person</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Edit Button Overlay */}
                    <button 
                      onClick={() => document.getElementById('profile-photo-input').click()}
                      className="absolute bottom-1 right-1 w-10 h-10 bg-teal-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-teal-700 transition-all active:scale-90 border-2 border-white"
                    >
                      <span className="material-symbols-outlined text-xl">photo_camera</span>
                    </button>
                  </div>

                  <div className="text-center">
                    <h4 className="font-headline text-2xl font-black text-teal-950">{user?.userNm || '기사님'}</h4>
                  </div>
                </div>
              ) : null}

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

        {/* Footer Actions */}
        <footer className="shrink-0 px-10 py-8 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button 
            onClick={onBack}
            className="px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all"
          >
            취소
          </button>
          <button 
            onClick={handleSave}
            disabled={isLoading}
            className="px-10 py-4 bg-primary text-white rounded-2xl font-bold hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-95 disabled:bg-slate-300 disabled:shadow-none"
          >
            {isLoading ? '저장 중...' : '변경사항 저장하기'}
          </button>
        </footer>
      </div>

      {/* Password Change Modal (Sub-Modal) */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[110] bg-teal-950/40 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-2xl font-black text-teal-900 tracking-tighter">비밀번호 변경</h4>
                <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-slate-600">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">현재 비밀번호</label>
                  <input 
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all" 
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">새 비밀번호</label>
                  <input 
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all" 
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">새 비밀번호 확인</label>
                  <input 
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all" 
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <button 
                  onClick={handlePasswordChangeSubmit}
                  disabled={isLoading}
                  className="w-full py-4 bg-teal-900 text-white rounded-2xl font-bold hover:bg-teal-800 transition-all active:scale-95 shadow-lg shadow-teal-900/20"
                >
                  {isLoading ? '변경 중...' : '비밀번호 변경 및 다시 로그인'}
                </button>
                <button 
                  onClick={() => setShowPasswordModal(false)}
                  className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSettings;
