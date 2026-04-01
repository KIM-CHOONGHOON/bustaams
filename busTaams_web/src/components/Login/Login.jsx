import React, { useState } from 'react';
import './Login.css';

const Login = ({ onToggle, onLoginSuccess }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId || !password) {
      setError('아이디와 비밀번호를 모두 입력해 주세요.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password, snsType: 'NONE' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '로그인에 실패했습니다.');
      }

      // Success
      if (onLoginSuccess) {
        onLoginSuccess(data.user);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSNSLogin = (type) => {
    alert(`${type} 간편 로그인은 준비 중입니다.`);
  };

  return (
    <div className="bg-background font-body text-on-surface antialiased overflow-hidden h-full relative">
      <main className="flex h-full">
        {/* Left Side: Editorial Image Section */}
        <section className="hidden lg:flex w-1/2 relative overflow-hidden bg-primary">
          <img 
            alt="Premium Luxury Bus" 
            className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD6xczmkFSGMYVMinPgG7inGZBrqW_RXrF-KGC1fNOXgwnGOy93Zh62TRZWZbIDh_hb3ZPw-6uhd0wyHQ9yyK88s5NLgxvTHvK4Xs2z1sCIAlfEo1O81X8ABPx6EbIz2Sz59wP5fQNPZqmfCA8Przh7FP4NQZFDhduTmnvoi5fwrdBghm2jdjUX_76jUSrWuo0jXrbLoJM0gG0y2ybGY85iDoErFj2YJU-y2es5Fykhb2-XjQ6SSj_ijJ-uYYrw1tAEjSOCEQ0UXC4"
          />
          <div className="relative z-10 flex flex-col justify-between p-12 w-full">
            <div>
              <h1 className="font-headline font-extrabold text-3xl tracking-tighter text-white">
                Editorial Velocity
              </h1>
            </div>
            <div className="max-w-md">
              <span className="inline-block px-3 py-1 bg-secondary text-white text-[10px] font-bold tracking-widest uppercase mb-4 rounded-full">Kinetic Gallery</span>
              <h2 className="font-headline text-4xl font-bold text-white leading-[1.1] mb-6">
                The Future of <br/>
                <span className="text-primary-fixed">Premium Auctions</span>
              </h2>
              <p className="text-white/80 text-base font-light leading-relaxed">
                최고급 전세 버스 입찰 시스템. <br/>
                감각적인 디자인과 투명한 데이터가 만나는 곳, <br/>
                에디토리얼 벨로시티에서 당신의 비즈니스를 시작하세요.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="h-1 w-10 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-secondary-container"></div>
              </div>
              <div className="h-1 w-10 bg-white/10 rounded-full"></div>
              <div className="h-1 w-10 bg-white/10 rounded-full"></div>
            </div>
          </div>
        </section>

        {/* Right Side: Login Form Section */}
        <section className="w-full lg:w-1/2 bg-surface-bright flex items-center justify-center p-8 relative">
          <button 
            onClick={onToggle}
            className="absolute top-6 right-6 text-outline hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>

          <div className="w-full max-w-[400px] flex flex-col">
            <div className="mb-10">
              <h3 className="font-headline text-2xl font-bold tracking-tight text-on-surface mb-2">환영합니다</h3>
              <p className="text-on-surface-variant text-sm font-medium">서비스를 이용하시려면 로그인해 주세요.</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-bold animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}

            {/* Login Form */}
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="group relative">
                  <label 
                    className="absolute -top-2.5 left-4 px-1 bg-surface-bright text-[10px] font-bold text-outline uppercase tracking-wider group-focus-within:text-primary transition-colors" 
                    htmlFor="user_id"
                  >
                    ID / 이메일
                  </label>
                  <input 
                    className="w-full h-12 px-5 bg-surface-container-high border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-highest transition-all text-on-surface placeholder-transparent" 
                    id="user_id" 
                    name="user_id" 
                    placeholder="아이디를 입력하세요" 
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    required
                  />
                </div>
                <div className="group relative">
                  <label 
                    className="absolute -top-2.5 left-4 px-1 bg-surface-bright text-[10px] font-bold text-outline uppercase tracking-wider group-focus-within:text-primary transition-colors" 
                    htmlFor="password"
                  >
                    Password / 비밀번호
                  </label>
                  <input 
                    className="w-full h-12 px-5 bg-surface-container-high border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-highest transition-all text-on-surface placeholder-transparent" 
                    id="password" 
                    name="password" 
                    placeholder="비밀번호를 입력하세요" 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input className="peer appearance-none w-5 h-5 rounded border-2 border-outline-variant checked:bg-primary checked:border-primary transition-all" type="checkbox"/>
                    <span 
                      className="material-symbols-outlined absolute text-white text-[16px] left-1/2 -translate-x-1/2 opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check
                    </span>
                  </div>
                  <span className="text-sm font-medium text-on-surface-variant group-hover:text-on-surface">로그인 상태 유지</span>
                </label>
                <a className="text-xs font-semibold text-secondary hover:text-secondary-container transition-colors" href="#">비밀번호 찾기</a>
              </div>

              <button 
                disabled={isLoading}
                className="w-full h-12 editorial-gradient-primary text-white font-bold rounded-full shadow-[0_8px_16px_-4px_rgba(0,78,71,0.3)] hover:shadow-[0_12px_24px_-4px_rgba(0,78,71,0.4)] transition-all transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-70 flex items-center justify-center" 
                type="submit"
              >
                {isLoading ? (
                  <span className="animate-spin material-symbols-outlined">progress_activity</span>
                ) : (
                  'Secure Login'
                )}
              </button>
            </form>

            <div className="mt-8 flex items-center gap-4 justify-center">
              <a 
                className="text-xs font-medium text-outline hover:text-primary transition-colors cursor-pointer" 
                onClick={() => {
                  onToggle(); // Close login
                  // The parent (App.jsx) needs to open SignUpModal. 
                  // In our current App.jsx, Header manages these, but Login.jsx doesn't have direct access to setShowSignUpModal.
                  // However, the Login.html design was converted to Login.jsx which has onToggle.
                  // In App.jsx, Login.jsx is rendered as LoginModal.
                }}
              >
                회원가입
              </a>
              <div className="w-px h-3 bg-outline-variant"></div>
              <a className="text-xs font-medium text-outline hover:text-primary transition-colors" href="#">ID/비밀번호 찾기</a>
            </div>

            {/* Social Login */}
            <div className="mt-12">
              <div className="relative flex items-center justify-center mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-outline-variant/30"></div>
                </div>
                <span className="relative px-4 bg-surface-bright text-[10px] font-bold text-outline uppercase tracking-[0.2em]">간편 로그인</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleSNSLogin('카카오')}
                  className="w-full h-12 bg-[#FEE500] text-[#191919] rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-sm"
                >
                  <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>chat_bubble</span>
                  <span>Kakao</span>
                </button>
                <button 
                  onClick={() => handleSNSLogin('네이버')}
                  className="w-full h-12 bg-[#03C75A] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-sm"
                >
                  <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span>Naver</span>
                </button>
              </div>
            </div>

            {/* Copyright Footer */}
            <div className="mt-12 text-center">
              <p className="text-[9px] uppercase tracking-widest text-outline-variant font-bold">
                © 2024 Editorial Velocity. All rights reserved.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Visual Tonal Stacking Accent */}
      <div className="fixed top-0 left-0 w-1 h-full bg-secondary-container z-50"></div>
    </div>
  );
};

export default Login;
