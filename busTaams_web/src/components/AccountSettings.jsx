import React, { useState, useEffect } from 'react';

const AccountSettings = ({ user, onBack, onLogout }) => {
  const [userName, setUserName] = useState(user?.userNm || user?.userName || '');
  const [email, setEmail] = useState(user?.userId || '');
  const [phoneNo, setPhoneNo] = useState(user?.hpNo || user?.phoneNo || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // user 정보가 변경될 때마다 state 동기화
  useEffect(() => {
    if (user) {
      setUserName(user.userNm || user.userName || '');
      setEmail(user.email || user.userId || '');
      setPhoneNo(user.hpNo || user.phoneNo || user.phoneNumber || '');
    }
  }, [user]);

  // 뒷배경 스크롤 방지
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] bg-surface font-body text-on-surface overflow-hidden flex flex-col">
      {/* TopNavBar */}
      <nav className="shrink-0 w-full z-50 glass-nav shadow-[0_20px_40px_rgba(0,104,95,0.05)] h-20">
        <div className="flex items-center justify-between px-8 h-full max-w-[1920px] mx-auto">
          <div className="flex items-center gap-12">
            <span 
              className="text-2xl font-bold italic text-teal-800 font-headline tracking-tight cursor-pointer"
              onClick={onBack}
            >
              busTaams
            </span>
            <div className="hidden md:flex gap-8 items-center text-sm font-bold">
              {user?.userType === 'DRIVER' ? (
                <>
                  <a className="text-slate-600 hover:text-primary transition-all duration-300" href="#">경매 입찰</a>
                  <a className="text-slate-600 hover:text-primary transition-all duration-300" href="#">운행 일정</a>
                  <a className="text-slate-600 hover:text-primary transition-all duration-300" href="#">차량 관리</a>
                </>
              ) : (
                <>
                  <a className="text-slate-600 hover:text-primary transition-all duration-300" href="#">진행중 경매</a>
                  <a className="text-slate-600 hover:text-primary transition-all duration-300" href="#">예약 내역</a>
                  <a className="text-slate-600 hover:text-primary transition-all duration-300" href="#">고객 센터</a>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button className="material-symbols-outlined text-slate-600 hover:bg-slate-50/50 p-2 rounded-full transition-all">notifications</button>
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full">
              <span className="material-symbols-outlined text-teal-700" style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>
              <span className="text-sm font-semibold">{userName} 님</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex max-w-[1920px] mx-auto overflow-hidden w-full">
        {/* SideNavBar */}
        <aside className="w-72 bg-slate-50 flex flex-col py-12 gap-2 shrink-0 border-r border-slate-200/50 overflow-y-auto">
          <div className="px-8 mb-10">
            <h2 className="font-headline text-lg font-bold text-teal-800">고객 포털</h2>
            <p className="text-xs text-slate-500 uppercase tracking-widest mt-1 font-body">여정의 시작과 끝을 함께합니다</p>
          </div>
          <nav className="flex flex-col gap-1 pr-4">
            <a className="flex items-center gap-4 px-8 py-3 text-slate-500 hover:text-orange-600 hover:pl-10 transition-all font-medium text-sm" href="#">
              <span className="material-symbols-outlined">chat_bubble</span> 1:1 문의하기
            </a>
            <a className="flex items-center gap-4 px-8 py-3 text-slate-500 hover:text-orange-600 hover:pl-10 transition-all font-medium text-sm" href="#">
              <span className="material-symbols-outlined">history</span> 문의 내역
            </a>
            <a className="flex items-center gap-4 px-8 py-3 bg-white text-teal-700 shadow-sm rounded-r-full font-bold text-sm" href="#">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>person_check</span> 회원 정보 관리
            </a>
            <a className="flex items-center gap-4 px-8 py-3 text-slate-500 hover:text-orange-600 hover:pl-10 transition-all font-medium text-sm" href="#">
              <span className="material-symbols-outlined">event_available</span> 예약 내역
            </a>
            <a className="flex items-center gap-4 px-8 py-3 text-slate-500 hover:text-orange-600 hover:pl-10 transition-all font-medium text-sm" href="#">
              <span className="material-symbols-outlined">event_busy</span> 취소 내역
            </a>
            <a className="flex items-center gap-4 px-8 py-3 text-slate-500 hover:text-orange-600 hover:pl-10 transition-all font-medium text-sm" href="#">
              <span className="material-symbols-outlined">request_quote</span> 견적 요청 내역
            </a>
            <a className="flex items-center gap-4 px-8 py-3 text-slate-500 hover:text-orange-600 hover:pl-10 transition-all font-medium text-sm" href="#">
              <span className="material-symbols-outlined">rate_review</span> 이용 후기
            </a>
            <a className="flex items-center gap-4 px-8 py-3 text-slate-500 hover:text-orange-600 hover:pl-10 transition-all font-medium text-sm" href="#">
              <span className="material-symbols-outlined">settings</span> 설정
            </a>
            <div className="mt-12 border-t border-slate-200/50 pt-4">
              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-4 px-8 py-3 text-slate-400 hover:text-red-500 transition-all font-medium text-sm"
              >
                <span className="material-symbols-outlined">logout</span> 로그아웃
              </button>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 bg-surface px-12 py-16 overflow-y-auto custom-scrollbar">
          <header className="mb-16">
            <h1 className="font-headline text-5xl font-extrabold text-on-surface tracking-tighter mb-4">회원 정보 관리</h1>
            <p className="text-slate-500 text-lg max-w-2xl leading-relaxed font-body">계정 보안과 개인정보를 최신 상태로 유지하세요. busTaams는 고객님의 개인정보 보호를 최우선으로 합니다.</p>
          </header>

          <div className="grid grid-cols-12 gap-12">
            {/* Section: Personal Information */}
            <section className="col-span-12 lg:col-span-8">
              <div className="bg-surface-container-lowest rounded-xl p-10 shadow-[0_20px_40px_rgba(0,104,95,0.04)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-secondary"></div>
                <h3 className="font-headline text-2xl font-bold mb-8 flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">person</span>
                  기본 인적 사항
                </h3>
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-slate-400 font-label">이름</label>
                      <input 
                        className="bg-surface-container-high border-none rounded-lg p-4 focus:ring-2 focus:ring-primary/20 transition-all font-body" 
                        readOnly 
                        type="text" 
                        value={userName}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-slate-400 font-label">이메일 주소</label>
                      <input 
                        className="bg-surface-container-high border-none rounded-lg p-4 focus:ring-2 focus:ring-primary/20 transition-all font-body" 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 font-label">휴대폰 번호</label>
                    <div className="flex gap-4">
                      <input 
                        className="flex-1 bg-surface-container-high border-none rounded-lg p-4 focus:ring-2 focus:ring-primary/20 transition-all font-body" 
                        type="tel" 
                        value={phoneNo}
                        onChange={(e) => setPhoneNo(e.target.value)}
                      />
                      <button className="kinetic-gradient-primary text-white px-8 py-4 rounded-full font-bold text-sm transition-transform active:scale-95 shadow-lg shadow-primary/20 whitespace-nowrap">
                        인증번호 발송
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section: Sidebar Info Card */}
            <section className="col-span-12 lg:col-span-4 space-y-8">
              <div className="bg-primary text-white p-8 rounded-xl shadow-xl relative overflow-hidden group">
                <div className="relative z-10">
                  <h4 className="font-headline text-xl font-bold mb-4">보안 등급: 높음</h4>
                  <p className="text-primary-fixed text-sm leading-relaxed mb-6 opacity-80 font-body">현재 계정은 2단계 인증이 활성화되어 안전하게 보호되고 있습니다.</p>
                  <div className="w-full bg-primary-container h-2 rounded-full overflow-hidden">
                    <div className="bg-primary-fixed w-[85%] h-full"></div>
                  </div>
                </div>
                <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-9xl opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700">security</span>
              </div>
              <div className="bg-surface-container-high p-8 rounded-xl">
                <h4 className="font-headline text-sm font-bold text-slate-600 mb-4 uppercase tracking-widest font-label">계정 활동 내역</h4>
                <ul className="space-y-4 font-body">
                  <li className="flex items-center gap-3 text-sm text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                    최근 로그인: 오늘 14:22 (서울)
                  </li>
                  <li className="flex items-center gap-3 text-sm text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                    정보 수정: 3개월 전
                  </li>
                </ul>
              </div>
            </section>

            {/* Section: Password Change */}
            <section className="col-span-12 lg:col-span-6">
              <div className="bg-surface-container-lowest rounded-xl p-10 shadow-[0_20px_40px_rgba(0,104,95,0.04)] h-full">
                <h3 className="font-headline text-2xl font-bold mb-8 flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">lock_reset</span>
                  비밀번호 변경
                </h3>
                <div className="space-y-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 font-label">현재 비밀번호</label>
                    <input 
                      className="bg-surface-container-high border-none rounded-lg p-4 focus:ring-2 focus:ring-primary/20 transition-all font-body" 
                      placeholder="••••••••" 
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 font-label">새 비밀번호</label>
                    <input 
                      className="bg-surface-container-high border-none rounded-lg p-4 focus:ring-2 focus:ring-primary/20 transition-all font-body" 
                      placeholder="새 비밀번호 입력" 
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 font-label">새 비밀번호 확인</label>
                    <input 
                      className="bg-surface-container-high border-none rounded-lg p-4 focus:ring-2 focus:ring-primary/20 transition-all font-body" 
                      placeholder="다시 한번 입력" 
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  <div className="pt-4">
                    <button className="w-full bg-slate-100 text-slate-400 py-4 rounded-full font-bold hover:bg-slate-200 transition-colors font-body">
                      비밀번호 업데이트
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Section: SNS Account Linking */}
            <section className="col-span-12 lg:col-span-6">
              <div className="bg-surface-container-lowest rounded-xl p-10 shadow-[0_20px_40px_rgba(0,104,95,0.04)] h-full">
                <h3 className="font-headline text-2xl font-bold mb-8 flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">link</span>
                  SNS 계정 연동
                </h3>
                <p className="text-slate-500 text-sm mb-10 font-body">간편 로그인을 위해 외부 서비스 계정을 연동할 수 있습니다. 연동된 계정으로도 busTaams 서비스를 이용하실 수 있습니다.</p>
                <div className="space-y-4">
                  {/* Kakao */}
                  <div className="flex items-center justify-between p-6 bg-[#FEE500]/10 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="shrink-0 w-10 h-10 bg-[#FEE500] rounded-full flex items-center justify-center font-bold text-[#3C1E1E]">K</div>
                      <div>
                        <div className="font-bold text-slate-800 font-body">카카오톡</div>
                        <div className="text-xs text-slate-500 font-body">연동되지 않음</div>
                      </div>
                    </div>
                    <button className="bg-white px-6 py-2 rounded-full text-sm font-bold shadow-sm hover:shadow-md transition-shadow font-body">연동하기</button>
                  </div>
                  {/* Naver */}
                  <div className="flex items-center justify-between p-6 bg-[#03C75A]/10 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="shrink-0 w-10 h-10 bg-[#03C75A] rounded-full flex items-center justify-center font-bold text-white">N</div>
                      <div>
                        <div className="font-bold text-slate-800 font-body">네이버</div>
                        <div className="text-xs text-[#03C75A] font-bold font-body">연동 완료 (minsu***)</div>
                      </div>
                    </div>
                    <button className="text-slate-400 px-6 py-2 rounded-full text-sm font-bold hover:text-red-500 transition-colors font-body">연동 해제</button>
                  </div>
                  {/* Google */}
                  <div className="flex items-center justify-between p-6 bg-slate-100 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="shrink-0 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <img alt="Google Logo" className="w-6 h-6" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBjrj_Om43e8z-HkzuC-v4qWqMSkx42ZYoA7-JG4bEvLgTPWGeuRaG0uAMopUSWyRx8JANIy0p3zLLrUJWK3a_cbYhs6LmIyX9cPP17a7RUyvulByiu4Cf__pd9x1J8vaEaa3-XDYIAClNlnR67QKlDMK_jmEi76C-WiXCkEzr9n6oSmrqakktLVjerp-fil1mapPvM4_Go0ZTBhq1uRDyIFZT-Gv4kGOTdNYlrDQ7_CQaNFPzFGGgQxSkGDXh4FnFJgs3JDFjCJAg"/>
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 font-body">구글</div>
                        <div className="text-xs text-slate-500 font-body">연동되지 않음</div>
                      </div>
                    </div>
                    <button className="bg-white px-6 py-2 rounded-full text-sm font-bold shadow-sm hover:shadow-md transition-shadow font-body">연동하기</button>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Global Action Bar */}
          <div className="mt-16 flex justify-end gap-6 items-center">
            <button 
              onClick={onBack}
              className="text-slate-400 font-bold hover:text-on-surface transition-colors font-body"
            >
              취소
            </button>
            <button className="kinetic-gradient-primary text-white px-12 py-5 rounded-full font-headline text-lg font-bold shadow-2xl shadow-primary/30 transition-transform active:scale-95">
              모든 변경사항 저장하기
            </button>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="shrink-0 w-full py-8 px-8 bg-slate-50 border-t border-slate-200/50">
        <div className="flex flex-col md:flex-row justify-between items-center max-w-[1920px] mx-auto">
          <span className="text-sm font-black text-slate-300 font-headline uppercase tracking-widest">busTaams Kinetic Gallery</span>
          <div className="flex gap-8 my-4 md:my-0">
            <a className="text-slate-400 hover:text-teal-600 transition-colors text-[10px] font-headline uppercase tracking-widest" href="#">개인정보 처리방침</a>
            <a className="text-slate-400 hover:text-teal-600 transition-colors text-[10px] font-headline uppercase tracking-widest" href="#">이용 약관</a>
            <a className="text-slate-400 hover:text-teal-600 transition-colors text-[10px] font-headline uppercase tracking-widest" href="#">쿠키 설정</a>
          </div>
          <p className="text-slate-400 text-[10px] font-headline uppercase tracking-widest">© 2024 busTaams Kinetic Gallery. 모든 권리 보유.</p>
        </div>
      </footer>
    </div>
  );
};

export default AccountSettings;
