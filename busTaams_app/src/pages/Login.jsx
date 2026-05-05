import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notify } from '../utils/toast';
import { login } from '../api';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ userId: '', password: '' });

  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
        const response = await login(formData.userId, formData.password);
        if (response.success) {
            localStorage.setItem('accessToken', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
            notify.success('로그인 성공', '오늘도 탁월한 선택을 환영합니다.');
            setTimeout(() => {
                const userType = response.user.userType;
                if (userType === 'DRIVER') {
                    navigate('/driver-dashboard');
                } else {
                    navigate('/customer-dashboard');
                }
            }, 500);
        }
    } catch (error) {
        notify.error('로그인 실패', error.message || '인증 정보가 일치하지 않습니다.');
    }
  };

  return (
    <div className="bg-background font-body text-on-background min-h-screen flex flex-col overflow-x-hidden">
      <header className="flex justify-between items-center w-full px-6 pt-8 pb-4 max-w-7xl mx-auto z-10">
        <div className="text-teal-900 font-black tracking-tighter font-headline text-3xl">busTaams</div>
        <div className="flex items-center gap-4">
          <span className="text-on-surface-variant font-medium text-sm text-[12px]">도움이 필요하신가요?</span>
          <span className="material-symbols-outlined text-primary text-2xl">help_outline</span>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center px-6 py-12 lg:py-24">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-16 items-center">
          <section className="lg:col-span-7 hidden lg:block space-y-8">
            <div className="relative rounded-3xl overflow-hidden shadow-[0_40px_60px_-15px_rgba(0,104,95,0.12)]">
              <img className="w-full h-[600px] object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB2_JILn7mpxcPVWf7f25BXFRPeS5wXBWwaTbiej9aujPjZq15DdC1zA7K-Vxv1v_2DCsNShqOivhNMumvzYVNldsL-2clBJbzQMB4RVm6A3mBWXxgkS8JTn9ze4LuHvLD0mJH-rCqGT7cjQQ5G3TG4hJHkxByQYbHAuRO9evHsoUVpZaR5uS-vB5KkE7MjpBss83OkUkGiT92jiXSr3ArqnXoekBUOgbv91fZ2Td3aMNvWBLQsWektJOJdzdDyVHuT6eHr6ZhVYgY" alt="Bus" />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex flex-col justify-end p-12">
                <h2 className="font-headline font-extrabold text-5xl text-white tracking-tight leading-tight mb-4 text-[42px]">
                  이동의 미학, <br/>키네틱 갤러리.
                </h2>
                <p className="text-primary-fixed text-lg max-w-md font-medium opacity-90 text-[16px]">
                  럭셔리 버스 경매의 품격을 경험하십시오. 모든 차량은 하나의 걸작이며, 모든 입찰은 탁월함을 향한 진보입니다.
                </p>
              </div>
            </div>
          </section>

          <section className="lg:col-span-5 w-full">
            <div className="space-y-12">
              <div className="space-y-4">
                <h1 className="font-headline font-extrabold text-4xl lg:text-5xl text-on-surface tracking-tighter text-[40px]">다시 오신 것을 환영합니다</h1>
                <p className="text-on-surface-variant text-lg text-[16px]">개인 대시보드에 접속하려면 자격 증명을 입력하세요.</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-on-surface-variant ml-1" htmlFor="user-id">아이디</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">badge</span>
                    <input 
                      className="w-full bg-surface-container-high border-none rounded-xl py-4 pl-12 pr-4 focus:ring-0 focus:bg-surface-container-highest transition-all text-on-surface placeholder:text-outline/50 font-medium" 
                      id="user-id" 
                      placeholder="BT-000000" 
                      type="text"
                      value={formData.userId}
                      onChange={(e) => setFormData({...formData, userId: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="block text-sm font-bold text-on-surface-variant" htmlFor="password">비밀번호</label>
                    <button type="button" onClick={() => navigate('/find-account')} className="text-sm font-bold text-primary hover:text-primary-container transition-colors">키를 잊으셨나요?</button>
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">lock</span>
                    <input 
                      className="w-full bg-surface-container-high border-none rounded-xl py-4 pl-12 pr-4 focus:ring-0 focus:bg-surface-container-highest transition-all text-on-surface placeholder:text-outline/50 font-medium" 
                      id="password" 
                      placeholder="••••••••••••" 
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                    <span 
                      className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline cursor-pointer hover:text-primary"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2">
                  <label className="relative flex items-center cursor-pointer group">
                    <input className="peer sr-only" type="checkbox"/>
                    <div className="w-6 h-6 bg-surface-container-high rounded-lg peer-checked:bg-primary transition-all flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-sm scale-0 peer-checked:scale-100 transition-transform">check</span>
                    </div>
                    <span className="ml-3 text-sm font-bold text-on-surface-variant group-hover:text-on-surface transition-colors">로그인 상태 유지</span>
                  </label>
                </div>
                <div className="pt-4">
                  <button className="w-full bg-primary text-white font-headline font-bold py-5 px-8 rounded-full shadow-[0_20px_40px_-10px_rgba(0,104,95,0.3)] hover:shadow-[0_25px_50px_-12px_rgba(0,104,95,0.4)] active:scale-[0.98] transition-all duration-300 text-lg" type="submit">
                    안전한 로그인
                  </button>
                </div>
                <div className="flex items-center justify-center gap-4 mt-6 text-sm font-bold">
                  <button type="button" onClick={() => navigate('/signup')} className="text-on-surface-variant hover:text-primary transition-colors">회원가입</button>
                  <div className="w-[1px] h-3 bg-outline/30"></div>
                  <button type="button" onClick={() => navigate('/find-account')} className="text-on-surface-variant hover:text-primary transition-colors">아이디 / 비밀번호 찾기</button>
                </div>
              </form>
              <div className="relative py-4 flex items-center">
                <div className="flex-grow h-[1px] bg-surface-container-high"></div>
                <span className="px-4 text-xs font-bold text-outline uppercase tracking-[0.2em]">간편 로그인</span>
                <div className="flex-grow h-[1px] bg-surface-container-high"></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button className="flex items-center justify-center gap-3 bg-[#FEE500] hover:bg-[#FEE500]/90 text-[#191919] font-bold py-4 rounded-xl transition-all shadow-sm">
                  <span className="text-sm">카카오 로그인</span>
                </button>
                <button className="flex items-center justify-center gap-3 bg-[#03C75A] hover:bg-[#03C75A]/90 text-white font-bold py-4 rounded-xl transition-all shadow-sm">
                  <span className="text-sm">네이버 로그인</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="w-full px-6 py-12 max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 border-t border-transparent">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="text-teal-900/40 font-black tracking-tighter font-headline text-xl">busTaams</div>
          <nav className="flex gap-8">
            <span className="text-xs font-bold text-outline uppercase tracking-widest hover:text-primary transition-colors cursor-pointer">개인정보 처리방침</span>
            <span className="text-xs font-bold text-outline uppercase tracking-widest hover:text-primary transition-colors cursor-pointer">준법지원</span>
            <span className="text-xs font-bold text-outline uppercase tracking-widest hover:text-primary transition-colors cursor-pointer">프레스룸</span>
          </nav>
        </div>
        <div className="text-xs font-bold text-outline uppercase tracking-widest text-[10px]">
          © 2024 키네틱 갤러리 시스템즈
        </div>
      </footer>
      <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary opacity-20"></div>
    </div>
  );
};

export default Login;
