import React, { useState, useEffect } from 'react';
import logo from '../assets/logo.png';

const LoginModal = ({ onClose, onLoginSuccess }) => {
  const [adminId, setAdminId]   = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // 모달 열릴 때 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!adminId || !password) return alert('아이디와 비밀번호를 입력해주세요.');

    setLoading(true);
    try {
      const response = await fetch('/api/admin/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ adminId, password }),
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
    /* ── 백드롭 ── */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* ── 모달 카드 ── */}
      <div className="relative flex w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden min-h-[520px]">

        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
          aria-label="닫기"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {/* 좌측 브랜드 패널 */}
        <div className="hidden md:flex md:w-5/12 bg-gradient-to-tr from-slate-50 via-emerald-50/20 to-sky-50/20 flex-col justify-between p-10 relative overflow-hidden border-r border-slate-100">
          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-emerald-200/20 rounded-full blur-[80px] pointer-events-none" />

          <div className="z-10">
            <img src={logo} alt="버스탐스" className="h-10 w-auto object-contain" />
          </div>

          <div className="z-10 my-auto space-y-5">
            <div className="space-y-2">
              <span className="inline-block px-3 py-1 bg-emerald-600/10 text-emerald-700 text-xs font-bold rounded-full tracking-wider">
                관리자 시스템
              </span>
              <h2 className="text-2xl font-black text-slate-800 leading-tight tracking-tight">
                스마트한 통합<br />
                차량 대절 플랫폼,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">버스탐스</span>
              </h2>
              <p className="text-slate-500 text-xs leading-relaxed">
                안전하고 투명한 차량 매칭과 입찰 현황을<br />한눈에 파악하고 직관적으로 관리하세요.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              {[
                { icon: '📊', text: '실시간 예약 및 입찰 관리' },
                { icon: '🚌', text: '버스 기사 승인 및 정보 관리' },
                { icon: '💳', text: '정산 및 매출 통계 모니터링' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-3 bg-white/50 backdrop-blur-md border border-slate-100 p-2.5 rounded-2xl shadow-sm">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-sm shrink-0">{icon}</div>
                  <span className="text-xs font-bold text-slate-700">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="z-10">
            <p className="text-[10px] text-slate-400 font-medium">© 2026 버스탐스 플랫폼. 모든 권리 보유.</p>
          </div>
        </div>

        {/* 우측 로그인 폼 */}
        <div className="w-full md:w-7/12 flex flex-col justify-center p-8 sm:p-12">
          {/* 모바일 로고 */}
          <div className="md:hidden mb-6">
            <img src={logo} alt="버스탐스" className="h-9 w-auto object-contain" />
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-1.5">관리자 로그인</h2>
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
                autoFocus
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
              className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>로그인 중...</span>
                </>
              ) : '관리자 로그인'}
            </button>
          </form>

          <p className="mt-6 text-center text-[10px] text-slate-400 md:hidden">
            © 2026 버스탐스 플랫폼. 모든 권리 보유.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
