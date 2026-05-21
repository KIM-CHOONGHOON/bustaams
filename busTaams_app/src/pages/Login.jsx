
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notify } from '../utils/toast';
import { login, checkVehicle } from '../api';
import { requestFirebaseToken } from '../utils/fcm';
import Swal from 'sweetalert2';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ userId: '', password: '' });

  const [showPassword, setShowPassword] = useState(false);

  const handleCheckVehicle = async () => {
    // [추가] 차량 번호 입력창 팝업 띄우기
    const { value: vehicleNo } = await Swal.fire({
      title: '차량 가입 여부 확인',
      input: 'text',
      inputLabel: '차량 번호를 입력해주세요.',
      placeholder: '예: 서울70자1234',
      showCancelButton: true,
      confirmButtonText: '확인',
      cancelButtonText: '취소',
      customClass: {
          popup: 'rounded-[2.5rem] border-none shadow-2xl p-8',
          title: 'font-black text-2xl text-[#1D3557] mb-2',
          confirmButton: 'bg-primary text-white px-8 py-4 rounded-full font-bold shadow-lg mx-2 active:scale-95 transition-all',
          cancelButton: 'bg-gray-100 text-gray-500 px-8 py-4 rounded-full font-bold mx-2 active:scale-95 transition-all'
      },
      buttonsStyling: false,
      inputValidator: (value) => {
        if (!value) {
          return '차량 번호를 입력해주세요!';
        }
      }
    });

    // 차량 번호가 입력되었으면 백엔드 조회 요청
    if (vehicleNo) {
      try {
        const res = await checkVehicle(vehicleNo);
        if (res.success) {
          if (res.exists) {
            await Swal.fire({
              title: '확인 결과',
              text: '이미가입된 차량 입니다.',
              icon: 'info',
              confirmButtonText: '확인',
              customClass: {
                  popup: 'rounded-[2.5rem]',
                  confirmButton: 'bg-primary text-white px-8 py-4 rounded-full font-bold'
              },
              buttonsStyling: false
            });
          } else {
            await Swal.fire({
              title: '확인 결과',
              text: '미가입된 차량 입니다.',
              icon: 'success',
              confirmButtonText: '확인',
              customClass: {
                  popup: 'rounded-[2.5rem]',
                  confirmButton: 'bg-primary text-white px-8 py-4 rounded-full font-bold'
              },
              buttonsStyling: false
            });
          }
        }
      } catch (err) {
        notify.error('오류 발생', err.message || '차량 조회 중 오류가 발생했습니다.');
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
        const response = await login(formData.userId, formData.password);
        if (response.success) {
            localStorage.setItem('accessToken', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
            
            // FCM 토큰 등록 시도 (실패하더라도 로그인 흐름에 영향이 없도록 안전하게 감싸줍니다)
            try {
                requestFirebaseToken();
            } catch (fcmError) {
                console.error('FCM 토큰 등록 프로세스 시작 오류:', fcmError);
            }

            // 로그인 성공 알림창이 닫힌 뒤에 안전하게 페이지 이동이 되도록 await 처리합니다.
            await notify.success('로그인 성공', '오늘도 탁월한 선택을 환영합니다.');

            const userType = response.user.userType;
            if (userType === 'DRIVER') {
                navigate('/driver-dashboard');
            } else {
                navigate('/customer-dashboard');
            }
        }
    } catch (error) {
        notify.error('로그인 실패', error.message || '인증 정보가 일치하지 않습니다.');
    }
  };

  return (
    <div className="bg-background font-body text-on-background min-h-screen flex flex-col overflow-x-hidden">
      <header className="flex justify-between items-center w-full px-6 pt-8 pb-4 max-w-7xl mx-auto z-10">
        <div className="flex items-center gap-3">
          <img src="/assets/BUSTAAMS_IMAGE_LOGO.png" alt="busTaams Logo" className="w-14 h-14 object-contain rounded-xl shadow-sm" />
          <div className="text-teal-900 font-black tracking-tighter font-headline text-3xl">BUSTAAMS</div>
          <div 
            onClick={() => navigate('/signup')} 
            className="w-[40px] h-[40px] lg:w-[48px] lg:h-[48px] ml-2 flex-shrink-0 bg-white p-1 rounded-lg shadow-sm border border-outline/10 flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            title="회원가입 바로가기 QR코드"
          >
            <img src="/assets/signup_qr.png" alt="Sign Up QR" className="w-full h-full object-contain" />
          </div>
        </div>
        <div className="flex items-center gap-4">
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
            <div className="space-y-6">
              <div>
                <p className="text-xl lg:text-2xl font-black uppercase tracking-widest text-primary italic">전세버스 예약</p>
              </div>
              <div className="rounded-2xl overflow-hidden shadow-md">
                <img src="/assets/login_banner.png" alt="Promotion Banner" className="w-full h-auto object-cover" />
              </div>
              <div>
                <h1 className="font-headline font-extrabold text-xl lg:text-2xl text-on-surface tracking-normal text-[22px]">귀하의  방문을  환영합니다.</h1>
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
            </div>
          </section>
        </div>
      </main>

      <footer className="w-full px-6 py-12 max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 border-t border-transparent">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div 
            onClick={handleCheckVehicle} 
            className="text-teal-900/40 font-black tracking-tighter font-headline text-xl cursor-pointer hover:text-teal-900/60 transition-colors"
          >
            busTaams
          </div>
        </div>
        <div className="text-xs font-bold text-outline uppercase tracking-widest text-[10px]">
          © 2000 (주)청솔테크
        </div>
      </footer>
      <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary opacity-20"></div>
    </div>
  );
};

export default Login;
