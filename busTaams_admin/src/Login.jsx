import React, { useState } from 'react';
import logo from './assets/logo.png';

const Login = ({ onLoginSuccess, onGoSignup }) => {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // 비밀번호 변경 강제 처리 관련 상태
  const [step, setStep] = useState('login'); // 'login' or 'changePassword'
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [tempAdmin, setTempAdmin] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!adminId || !password) return alert('아이디와 비밀번호를 입력해주세요.');

    setLoading(true);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId, password })
      });
      const data = await response.json();
      if (response.ok) {
        if (data.requirePasswordChange) {
          // 최초 로그인 시 비밀번호 변경 강제
          setTempAdmin(data.admin);
          setStep('changePassword');
        } else {
          localStorage.setItem('adminUser', JSON.stringify(data.admin));
          onLoginSuccess();
        }
      } else {
        alert(data.error || '로그인에 실패했습니다.');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('서버와 통신하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmNewPassword) {
      return alert('새 비밀번호를 입력해주세요.');
    }
    if (newPassword !== confirmNewPassword) {
      return alert('입력하신 새 비밀번호가 서로 일치하지 않습니다.');
    }
    if (newPassword === password) {
      return alert('새 비밀번호는 초기 임시 비밀번호와 달라야 합니다.');
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: adminId,
          currentPassword: password, // 로그인 시 입력한 임시 비밀번호
          newPassword: newPassword
        })
      });
      const data = await response.json();
      if (response.ok) {
        alert('비밀번호가 안전하게 변경되었습니다. 대시보드로 로그인합니다.');
        // 로컬스토리지 저장 및 메인 레이아웃 진입
        localStorage.setItem('adminUser', JSON.stringify(tempAdmin));
        onLoginSuccess();
      } else {
        alert(data.error || '비밀번호 변경에 실패했습니다.');
      }
    } catch (err) {
      console.error('Password change error:', err);
      alert('비밀번호 변경 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans overflow-hidden relative p-4 sm:p-6 md:p-8">
      {/* 백그라운드 디자인 블러 */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-400/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* 하나의 일체형 카드 프레임 */}
      <div className="flex w-full max-w-4xl bg-white rounded-[32px] shadow-2xl shadow-slate-200 border border-slate-100/80 overflow-hidden min-h-[580px] z-10">
        
        {/* 좌측 브랜드 영역 */}
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-tr from-slate-50 via-emerald-50/20 to-sky-50/20 flex-col justify-between p-12 relative overflow-hidden border-r border-slate-100">
          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-emerald-200/20 rounded-full blur-[80px] pointer-events-none"></div>
          
          <div className="z-10">
            <img src={logo} alt="버스탐스" className="h-12 w-auto object-contain" />
          </div>

          <div className="z-10 my-auto space-y-6">
            <div className="space-y-3">
              <span className="inline-block px-3 py-1 bg-emerald-600/10 text-emerald-700 text-xs font-bold rounded-full tracking-wider">
                관리자 시스템
              </span>
              <h1 className="text-3xl font-black text-slate-800 leading-tight tracking-tight">
                스마트한 통합 차량 대절 플랫폼,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">버스탐스</span>
              </h1>
              <p className="text-slate-500 text-sm leading-relaxed font-normal">
                안전하고 투명한 차량 매칭과 입찰 현황을 한눈에 파악하고 직관적으로 관리할 수 있습니다.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 bg-white/50 backdrop-blur-md border border-slate-100 p-3 rounded-2xl shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-base">📊</div>
                <div><h3 className="text-xs font-bold text-slate-700">실시간 예약 및 입찰 관리</h3></div>
              </div>

              <div className="flex items-center gap-3 bg-white/50 backdrop-blur-md border border-slate-100 p-3 rounded-2xl shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-base">🚌</div>
                <div><h3 className="text-xs font-bold text-slate-700">버스 기사 승인 및 정보 관리</h3></div>
              </div>

              <div className="flex items-center gap-3 bg-white/50 backdrop-blur-md border border-slate-100 p-3 rounded-2xl shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-base">💳</div>
                <div><h3 className="text-xs font-bold text-slate-700">정산 및 매출 통계 모니터링</h3></div>
              </div>
            </div>
          </div>

          <div className="z-10">
            <p className="text-[10px] text-slate-400 font-medium">© 2026 버스탐스 플랫폼. 모든 권리 보유.</p>
          </div>
        </div>

        {/* 우측 입력 폼 영역 */}
        <div className="w-full md:w-1/2 bg-white flex flex-col justify-between p-8 sm:p-12 md:p-14 relative">
          <div className="flex justify-between items-center z-10 md:hidden mb-6">
            <img src={logo} alt="버스탐스" className="h-9 w-auto object-contain" />
          </div>

          {step === 'login' ? (
            /* 로그인 폼 */
            <div className="my-auto w-full max-w-sm mx-auto z-10">
              <div className="mb-8">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-1.5">로그인</h2>
                <p className="text-slate-400 text-xs leading-relaxed">관리자 계정 정보를 입력하여 시스템에 접속하십시오.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 ml-1">관리자 아이디</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all font-medium text-sm" 
                    placeholder="아이디를 입력하세요" 
                    value={adminId}
                    onChange={(e) => setAdminId(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 ml-1">비밀번호</label>
                  <input 
                    type="password" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all font-medium text-sm" 
                    placeholder="비밀번호를 입력하세요" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>로그인 중...</span>
                    </div>
                  ) : (
                    '관리자 로그인'
                  )}
                </button>
              </form>

              {/* 신규 등록 링크 추가 */}
              {onGoSignup && (
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={onGoSignup}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    신규 관리자 가입 신청
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* 최초 로그인 비밀번호 변경 강제 폼 */
            <div className="my-auto w-full max-w-sm mx-auto z-10">
              <div className="mb-6">
                <span className="inline-block px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-full mb-2 uppercase tracking-wide">
                  보안 통과 필요
                </span>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-1.5">비밀번호 변경</h2>
                <p className="text-slate-400 text-xs leading-relaxed">
                  임시 비밀번호 상태입니다. 시스템을 안전하게 이용하시려면 새로운 비밀번호를 설정해야 합니다.
                </p>
              </div>

              <form onSubmit={handlePasswordChangeSubmit} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 ml-1">새 비밀번호</label>
                  <input 
                    type="password" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all font-medium text-sm" 
                    placeholder="사용할 새 비밀번호 입력" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 ml-1">새 비밀번호 확인</label>
                  <input 
                    type="password" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all font-medium text-sm" 
                    placeholder="새 비밀번호 한번 더 입력" 
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button 
                    type="button" 
                    onClick={() => {
                      setStep('login');
                      setNewPassword('');
                      setConfirmNewPassword('');
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3.5 rounded-xl transition-all text-sm active:scale-95"
                  >
                    취소
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="flex-[2] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm active:scale-95 disabled:bg-slate-300"
                  >
                    {loading ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      '비밀번호 변경 및 로그인'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 모바일 전용 하단 카피라이트 */}
          <div className="lg:hidden text-center z-10">
            <p className="text-xs text-slate-400 font-medium">© 2026 버스탐스 플랫폼. 모든 권리 보유.</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
