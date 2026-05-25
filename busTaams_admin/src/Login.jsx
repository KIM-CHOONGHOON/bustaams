import React, { useState } from 'react';
import logo from './assets/logo.png';

const Login = ({ onLoginSuccess }) => {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
        localStorage.setItem('adminUser', JSON.stringify(data.admin));
        onLoginSuccess();
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

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans overflow-hidden relative p-4 sm:p-6 md:p-8">
      {/* 백그라운드 디자인 블러 */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-400/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* 하나의 일체형 카드 프레임 */}
      <div className="flex w-full max-w-4xl bg-white rounded-[32px] shadow-2xl shadow-slate-200 border border-slate-100/80 overflow-hidden min-h-[580px] z-10">
        
        {/* 좌측 브랜드 영역: 카드 내부로 완전히 종속됨 */}
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-tr from-slate-50 via-emerald-50/20 to-sky-50/20 flex-col justify-between p-12 relative overflow-hidden border-r border-slate-100">
          {/* 은은한 파스텔 배경 블러 */}
          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-emerald-200/20 rounded-full blur-[80px] pointer-events-none"></div>
          
          {/* 상단 로고 */}
          <div className="z-10">
            <img src={logo} alt="버스탐스" className="h-12 w-auto object-contain" />
          </div>

          {/* 중앙 안내 문구 */}
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

            {/* 카드 내부의 소개 아이템들 */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 bg-white/50 backdrop-blur-md border border-slate-100 p-3 rounded-2xl shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-base">
                  📊
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-700">실시간 예약 및 입찰 관리</h3>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/50 backdrop-blur-md border border-slate-100 p-3 rounded-2xl shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-base">
                  🚌
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-700">버스 기사 승인 및 정보 관리</h3>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/50 backdrop-blur-md border border-slate-100 p-3 rounded-2xl shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-base">
                  💳
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-700">정산 및 매출 통계 모니터링</h3>
                </div>
              </div>
            </div>
          </div>

          {/* 하단 카피라이트 */}
          <div className="z-10">
            <p className="text-[10px] text-slate-400 font-medium">
              © 2026 버스탐스 플랫폼. 모든 권리 보유.
            </p>
          </div>
        </div>

        {/* 우측 로그인 폼 영역 */}
        <div className="w-full md:w-1/2 bg-white flex flex-col justify-between p-8 sm:p-12 md:p-14 relative">
          {/* 모바일 상단 로고 노출 (데스크톱에선 좌측에 이미 로고가 있으므로 모바일 md 미만 화면에서만 노출) */}
          <div className="flex justify-between items-center z-10 md:hidden mb-6">
            <img src={logo} alt="버스탐스" className="h-9 w-auto object-contain" />
          </div>

          {/* 로그인 입력 폼 */}
          <div className="my-auto w-full max-w-sm mx-auto z-10">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-1.5">로그인</h2>
              <p className="text-slate-400 text-xs leading-relaxed">관리자 계정 정보를 입력하여 시스템에 접속하십시오.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 ml-1">
                  관리자 아이디
                </label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all font-medium text-sm" 
                  placeholder="아이디를 입력하세요" 
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 ml-1">
                  비밀번호
                </label>
                <input 
                  type="password" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all font-medium text-sm" 
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
          </div>

          {/* 모바일 전용 하단 카피라이트 */}
          <div className="lg:hidden text-center z-10">
            <p className="text-xs text-slate-400 font-medium">
              © 2026 버스탐스 플랫폼. 모든 권리 보유.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;

