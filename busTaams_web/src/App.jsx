import React, { useState, useEffect, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import busLogo from './assets/images/bustaams_bus_logo.png';
import nameLogo from './assets/images/bustaams_name_logo.png';
import Login from './components/Login/Login';

import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

try {
  const app = initializeApp(firebaseConfig);
  window.auth = getAuth(app);
  // 테스트 환경(localhost)에서 그림 맞추기(reCAPTCHA) 로직 강제 패스
  window.auth.settings.appVerificationDisabledForTesting = true;
  window.firebaseAuth = { RecaptchaVerifier, signInWithPhoneNumber };
} catch (e) {
  console.error("Firebase Auth Init Failed", e);
}


function Header({ setShowLoginModal, setShowDriverProfileModal, setShowSignUpModal, currentUser, setCurrentUser }) {
  // Glassmorphic header
  return (
    <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl transition-all">
      <div className="container mx-auto px-6 h-24 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <img src={busLogo} alt="busTaams 심볼" className="h-[60px] md:h-[72px] w-auto object-contain transition-transform group-hover:scale-105" />
          <img src={nameLogo} alt="busTaams 네임" className="h-[60px] md:h-[72px] w-auto object-contain transition-transform group-hover:scale-105" />
        </div>
        <nav className="hidden md:flex items-center gap-10 font-medium text-gray-700">
          <a className="hover:text-primary transition-colors" href="#">이용 고객 전용</a>
          
          <div className="relative group">
            <div className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer py-4">
              기사님 전용
              <span className="material-symbols-outlined text-[18px]">expand_more</span>
            </div>
            
            {/* Dropdown Menu */}
            <div className="absolute top-[80%] left-0 pt-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-10 w-48">
              <div className="bg-surface-lowest rounded-xl shadow-ambient border border-surface-container-low py-2 flex flex-col overflow-hidden">
                <button className="px-5 py-3 text-left hover:bg-surface-container-low transition-colors text-sm font-bold text-gray-700 hover:text-primary">입찰 대쉬보드</button>
                <button 
                  className="px-5 py-3 text-left hover:bg-surface-container-low transition-colors text-sm font-bold text-gray-700 hover:text-primary"
                  onClick={() => setShowDriverProfileModal(true)}
                >
                  기사님 프로필
                </button>
                <button className="px-5 py-3 text-left hover:bg-surface-container-low transition-colors text-sm font-bold text-gray-700 hover:text-primary">보유 차량 정보</button>
              </div>
            </div>
          </div>

          <a className="hover:text-primary transition-colors" href="#">bus-Taams ?</a>
          <a className="hover:text-primary transition-colors" href="#">이용 약관</a>
        </nav>
        <div className="flex items-center gap-6">
          {currentUser ? (
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-gray-900">{currentUser.name} {currentUser.type === 'DRIVER' ? '기사님' : '님'}</span>
              <button 
                onClick={() => {
                  setCurrentUser(null);
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                }}
                className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <>
              <button 
                className="text-base font-semibold text-gray-700 hover:text-primary transition-colors"
                onClick={() => setShowLoginModal(true)}
              >
                로그인
              </button>
              <button 
                className="px-6 py-3 text-base font-bold bg-gradient-to-br from-primary to-primary-container text-white rounded-lg hover:opacity-90 transition-opacity shadow-ambient"
                onClick={() => setShowSignUpModal(true)}
              >
                회원가입
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative min-h-[700px] flex items-center justify-center overflow-hidden bg-surface-container-low">
      <div className="absolute inset-0 z-0">
        <img alt="Beautiful landscape" className="w-full h-full object-cover opacity-60 mix-blend-multiply" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBy7X950jpLbFXsnVk30hsoWpEMUy8HXnJwvGfUM5LDRtVbX3HAwVq00-L_tcSyLv4QwVWnYMTNHcxHTXE_WGn2WCfp4Og7WoXmrn2rzsJfR7JeDOoXULk6Z44CkHpKplp0JL9T6UUoLPnjVTuuW-wWR-rmrdZihaw4l6DUGU17IEU9BYYTYwV9ji9XhYXFdNcxS3rbVbTYAUiIQZ04T-w2iw4oIMt-qlFYwH7-Pa2lEjP67EAEVB5b7KcNgYQBOTpdJglnWX5qVSg" />
      </div>
      <div className="container mx-auto px-6 z-10 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="font-display text-6xl lg:text-[4rem] font-bold leading-[1.1] mb-8 text-gray-900 tracking-tight">
            여행의 시작,<br />
            <span className="text-secondary bg-clip-text">busTaams</span>와 함께
          </h1>
          <p className="font-body text-xl lg:text-2xl font-normal text-gray-800 mb-12 max-w-lg leading-relaxed">
            전국 어디든, 가장 합리적인 가격으로<br />
            당신의 특별한 여행을 완성하세요.
          </p>
          <div className="flex flex-wrap gap-5">
            <button className="px-8 py-4 bg-gradient-to-br from-primary to-primary-container text-white rounded-lg font-bold text-lg shadow-ambient transition-transform hover:-translate-y-1">견적 요청하기</button>
            <button className="px-8 py-4 bg-surface-lowest text-primary rounded-lg font-bold text-lg shadow-ambient transition-transform hover:-translate-y-1">이용 가이드</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="py-32 bg-surface">
      <div className="container mx-auto px-6 text-center">
        <h2 className="font-display text-5xl font-bold mb-6 text-gray-900 tracking-tight">왜 busTaams 인가요?</h2>
        <p className="font-body text-gray-600 text-xl mb-20 max-w-2xl mx-auto">복잡한 전세버스 대절, 이제 스마트하게 해결하세요.</p>
        
        {/* Layering: Interactive Cards (surface_lowest) on top of Surface */}
        <div className="grid md:grid-cols-3 gap-10">
          <div className="p-12 bg-surface-lowest rounded-xl shadow-ambient transition-transform hover:-translate-y-2 group group-hover:bg-surface-container-low">
            <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/20 text-primary rounded-xl flex items-center justify-center mx-auto mb-8">
              <span className="material-symbols-outlined text-4xl">payments</span>
            </div>
            <h4 className="font-display text-2xl font-bold mb-4 text-gray-900">최저가 역경매</h4>
            <p className="font-body text-gray-600 leading-relaxed text-lg">전국 기사님들이 제안하는 최적의 가격을 직접 비교하고 선택하세요.</p>
          </div>
          <div className="p-12 bg-surface-lowest rounded-xl shadow-ambient transition-transform hover:-translate-y-2 group group-hover:bg-surface-container-low flex flex-col items-center relative overflow-hidden">
            {/* Design system rule: left orange border/accent instead of badges? "subtle orange accent line (2px) on the left side of the card" */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary pointer-events-none rounded-r-lg"></div>
            <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/20 text-primary rounded-xl flex items-center justify-center mx-auto mb-8">
               <span className="material-symbols-outlined text-4xl">security</span>
            </div>
            <h4 className="font-display text-2xl font-bold mb-4 text-gray-900">검증된 파트너</h4>
            <p className="font-body text-gray-600 leading-relaxed text-lg">보험 가입 여부부터 실사용자 리뷰까지 꼼꼼하게 검증된 기사님만 매칭합니다.</p>
          </div>
          <div className="p-12 bg-surface-lowest rounded-xl shadow-ambient transition-transform hover:-translate-y-2 group group-hover:bg-surface-container-low">
            <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/20 text-primary rounded-xl flex items-center justify-center mx-auto mb-8">
              <span className="material-symbols-outlined text-4xl">touch_app</span>
            </div>
            <h4 className="font-display text-2xl font-bold mb-4 text-gray-900">간편한 예약</h4>
            <p className="font-body text-gray-600 leading-relaxed text-lg">전화 통화 없이 모바일로 1분 만에 끝내는 스마트한 예약 프로세스.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function SpringSpecial() {
  return (
    <section className="py-24 bg-surface-container-low">
      <div className="container mx-auto px-6">
        <div className="bg-surface-lowest rounded-xl shadow-ambient flex flex-col md:flex-row items-center overflow-hidden">
          <div className="p-16 lg:p-24 flex-1">
            <span className="inline-block px-4 py-1 bg-secondary/10 text-secondary font-bold text-sm tracking-wide rounded-full mb-8 uppercase font-body">Spring Special</span>
            <h2 className="font-display text-5xl font-bold text-gray-900 mb-8 leading-tight tracking-tight">봄맞이 단체 여행 특가</h2>
            <p className="font-body text-xl text-gray-600 mb-12 leading-relaxed max-w-xl">지금 예약하면 최대 15% 할인 혜택과 여행자 보험 무료 가입까지!<br />소중한 사람들과의 봄나들이를 busTaams와 함께하세요.</p>
            <button className="px-10 py-4 bg-gradient-to-br from-secondary to-secondary-container text-white rounded-lg font-bold text-lg hover:opacity-90 transition-opacity shadow-ambient">혜택 받기</button>
          </div>
          <div className="flex-1 w-full lg:w-auto p-8 lg:p-0 flex justify-center items-center h-full">
            <div className="relative w-full max-w-lg">
              <img alt="Spring Flowers" className="rounded-xl shadow-ambient object-cover h-[450px] w-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC2RDtu2ifln9MGPG_-GBxOO5S2stpsmVTaE8EGHJpdoNyiKXBvEWBKVTmpW_vh2fu7oJbeFLFb8JAMXvFOEOWCgZA7sKXnJdlE5-lLm4WL4oAGrRJUJxV0DWmy8-2RJnrouXNUrUguKqCXhXsXOSfIAPXgkqcpJtam-GE54DHd2kdrvfWt3nWEdWltvoroLn3T8npy2eDA9M7fdGaIw1vYIsSBtpPCD-0Ylmbft26tsQIejvbDNGOZ1w9SCtw76yr8rb3U9Dg6qX4" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-surface py-24">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-20 text-center md:text-left">
          <div className="col-span-1 md:col-span-1">
            <div className="flex flex-col items-center md:items-start gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-container rounded-lg flex items-center justify-center shadow-ambient">
                <span className="material-symbols-outlined text-white text-2xl">directions_bus</span>
              </div>
              <span className="font-display text-2xl font-bold text-gray-900 tracking-tight">busTaams</span>
            </div>
            <p className="font-body text-gray-500 text-base leading-relaxed">
              전세버스 매칭의 새로운 기준, busTaams.<br />
              우리는 기술을 통해 더 안전하고 투명한 여행 문화를 만듭니다.
            </p>
          </div>
          <div>
            <h5 className="font-display font-bold text-gray-900 mb-8 text-lg">서비스</h5>
            <ul className="space-y-5 font-body text-gray-500 text-base">
              <li><a className="hover:text-primary transition-colors" href="#">견적요청</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">기사 파트너 지원</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">이용 요금 안내</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-display font-bold text-gray-900 mb-8 text-lg">고객지원</h5>
            <ul className="space-y-5 font-body text-gray-500 text-base">
              <li><a className="hover:text-primary transition-colors" href="#">자주 묻는 질문</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">공지사항</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">1:1 문의하기</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-display font-bold text-gray-900 mb-8 text-lg">소셜 미디어</h5>
            <div className="flex justify-center md:justify-start gap-5">
              <a className="w-12 h-12 bg-surface-lowest shadow-ambient rounded-lg flex items-center justify-center hover:text-primary transition-colors" href="#">
                 <span className="material-symbols-outlined">share</span>
              </a>
              <a className="w-12 h-12 bg-surface-lowest shadow-ambient rounded-lg flex items-center justify-center hover:text-primary transition-colors" href="#">
                 <span className="material-symbols-outlined">mail</span>
              </a>
            </div>
          </div>
        </div>
        <div className="pt-10 flex flex-col md:flex-row items-center justify-between gap-6 font-body">
          <p className="text-gray-400 text-sm">© 2026 busTaams. All rights reserved.</p>
          <div className="flex gap-8 text-sm text-gray-500">
            <a className="hover:text-gray-800" href="#">이용약관</a>
            <a className="hover:text-gray-800 font-bold" href="#">개인정보처리방침</a>
            <a className="hover:text-gray-800" href="#">위치기반서비스 이용약관</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function LoginModal({ close, setCurrentUser }) {
  // Use the premium Login component we created
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-0 md:p-6 animate-in fade-in duration-200">
      <div className="absolute inset-0 cursor-pointer" onClick={close}></div>
      <div className="relative w-full h-full md:h-auto md:max-w-[1000px] bg-surface-lowest rounded-none md:rounded-3xl shadow-ambient overflow-hidden animate-in zoom-in-95 duration-200">
        <Login onToggle={close} onLoginSuccess={(user) => {
          setCurrentUser({
            uuid:     user.userUuid,
            id:       user.userId,
            name:     user.userName,
            type:     user.userType,
            hpNo:     user.hpNo,
          });
          localStorage.setItem('user', JSON.stringify(user));
          close();
        }} />
      </div>
    </div>
  );
}

function DriverProfileModal({ close }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 cursor-pointer" onClick={close}></div>
      
      <div className="relative w-full max-w-2xl max-h-[95vh] bg-surface-lowest rounded-3xl shadow-ambient flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-6 bg-surface-lowest sticky top-0 z-20 border-b border-surface-container-low">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-widest text-secondary uppercase mb-1">busTaams Driver Portal</span>
            <h1 className="font-display font-extrabold text-2xl text-primary tracking-tight">기사님 프로필 관리</h1>
          </div>
          <button onClick={close} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors duration-200 text-gray-500">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-8 py-4 no-scrollbar">
          <div className="space-y-8 pb-8">
            
            {/* Section 1: Profile Photo */}
            <section className="flex flex-col items-center pt-4">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-surface-container-low shadow-sm ring-2 ring-primary/10">
                  <img alt="Driver Profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAVP2cSwYA5bmTFahSdVEwx8d6WcQmTzsuPMdE7Spdt3qlWNaROREPNi7n5Ij7Wi1sWk19Bylt1BBmnHiVoc60Xen7h7HNqO2Ogyh_yDqJIwHCg404_HIPZa5D1d_fn66FbgOhUYXdyXGYfVU2-Pv9n8lLfol0jEUJC7befbzL8n1HdrKxKzS5mGUCyK-FWJkHGe-A2KTuRsmWeuJKiV2FgHBDVuUjZ5fdpWdQ7ISpe6fKybXD0nAvN77HjM6tTSOIy_07X0asJdn4" />
                </div>
                <button className="absolute bottom-1 right-1 bg-primary text-white p-2.5 rounded-full shadow-ambient hover:scale-110 active:scale-95 transition-all duration-200">
                  <span className="material-symbols-outlined text-sm flex items-center justify-center">photo_camera</span>
                </button>
              </div>
              <div className="mt-4 flex items-center gap-2 px-4 py-1.5 bg-surface-container-low rounded-full border border-gray-200">
                <span className="material-symbols-outlined text-primary text-base">attachment</span>
                <span className="text-xs font-bold text-gray-600">DRIVER_PHOTO_2024.jpg</span>
              </div>
            </section>

            {/* Section 2: License Info */}
            <section className="space-y-3">
              <label className="block text-[13px] font-bold text-gray-500 tracking-wide px-1 uppercase">1종 대형 면허 번호</label>
              <div className="relative">
                <input 
                  className="w-full bg-surface-container-low border-2 border-transparent rounded-2xl py-4 px-5 text-gray-900 font-bold focus:ring-0 focus:border-primary/30 focus:bg-surface-lowest transition-all duration-200 outline-none" 
                  placeholder="면허 번호를 입력해주세요" 
                  type="text" 
                  defaultValue="13-01-234567-89" 
                />
                <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-primary/50">badge</span>
              </div>
            </section>

            {/* Section 3: Certifications */}
            <section className="space-y-4">
              <label className="block text-[13px] font-bold text-gray-500 tracking-wide px-1 uppercase">자격증 및 증명서 관리</label>
              <div className="space-y-3">
                {/* Cert Item 1 (Registered) */}
                <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl hover:bg-gray-100 border border-transparent transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary">verified</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">버스운전 자격증</p>
                      <p className="text-[11px] text-gray-500">2023_cert_v2.pdf</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                      <span className="material-symbols-outlined text-xl flex">delete</span>
                    </button>
                    <button className="px-4 py-2 bg-surface-lowest text-primary text-xs font-bold rounded-lg shadow-sm border border-gray-200 hover:bg-primary hover:text-white transition-all duration-200">변경</button>
                  </div>
                </div>
                
                {/* Cert Item 2 (Not Registered) */}
                <div className="flex items-center justify-between p-4 bg-surface-lowest border-2 border-dashed border-gray-300 rounded-2xl hover:bg-gray-50 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-surface-container-low rounded-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-gray-400">safety_check</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-500">무사고 증명서</p>
                      <p className="text-[11px] text-gray-400 italic">파일을 업로드해주세요</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg shadow-sm hover:bg-primary-container transition-all duration-200 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">upload</span>
                    업로드
                  </button>
                </div>
              </div>
            </section>

            {/* Section 4: Membership Selection */}
            <section className="space-y-4">
              <label className="block text-[13px] font-bold text-gray-500 tracking-wide px-1 uppercase">멤버십 유형 선택</label>
              <div className="grid grid-cols-3 gap-3">
                <label className="flex flex-col items-center p-4 bg-surface-container-low rounded-2xl border-2 border-transparent cursor-pointer transition-all hover:bg-gray-100">
                  <span className="text-[10px] font-black mb-2 text-gray-500 uppercase">Normal</span>
                  <span className="material-symbols-outlined text-gray-400 text-2xl">person</span>
                </label>
                
                <label className="flex flex-col items-center p-4 bg-secondary rounded-2xl border-2 border-secondary cursor-pointer shadow-md transform scale-105 transition-all text-white">
                  <span className="text-[10px] font-black mb-2 text-white uppercase">Premium</span>
                  <span className="material-symbols-outlined text-white text-2xl">workspace_premium</span>
                </label>
                
                <label className="flex flex-col items-center p-4 bg-surface-container-low rounded-2xl border-2 border-transparent cursor-pointer transition-all hover:bg-gray-100">
                  <span className="text-[10px] font-black mb-2 text-gray-500 uppercase">VIP</span>
                  <span className="material-symbols-outlined text-gray-400 text-2xl">diamond</span>
                </label>
              </div>
            </section>

            {/* Section 5: Bio */}
            <section className="space-y-3">
              <label className="block text-[13px] font-bold text-gray-500 tracking-wide px-1 uppercase">자기소개 및 강점 (Bio)</label>
              <textarea 
                className="w-full bg-surface-container-low border-2 border-transparent rounded-2xl py-4 px-5 text-gray-900 font-medium focus:ring-0 focus:border-primary/30 focus:bg-surface-lowest transition-all duration-200 resize-none min-h-[120px] outline-none" 
                placeholder="간단한 자기소개를 작성해주세요."
                defaultValue="안녕하세요, 15년 경력의 베테랑 기사 김태준입니다. 대형 버스 운전뿐만 아니라 고객 응대 및 안전 교육 이수 경험이 풍부합니다. 언제나 쾌적하고 안전한 여행을 약속드립니다. 특히 장거리 투어 및 단체 관광 전문입니다."
              ></textarea>
            </section>
            
          </div>
        </div>

        {/* Footer */}
        <footer className="p-6 bg-surface-lowest flex flex-col gap-4 border-t border-surface-container-low z-20">
          <button className="w-full py-4 bg-gradient-to-r from-primary to-primary-container text-white font-extrabold text-lg rounded-2xl shadow-ambient active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 group">
            <span className="material-symbols-outlined text-2xl group-hover:rotate-12 transition-transform">save</span>
            수정 사항 저장하기
          </button>
          <div className="flex flex-col items-center mt-2">
            <button className="px-6 py-2 text-red-500/80 text-sm font-bold hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">delete_forever</span>
              프로필 삭제하기
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
}


function SignUpModal({ close }) {
  // 모든 API 호출의 base URL - 환경변수에서 로드 (하드코딩 금지)
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';

  const sigCanvas = useRef(null);
  const [userRole, setUserRole] = useState('customer');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [signature, setSignature] = useState('');
  const [hasSignature, setHasSignature] = useState(false);

  // Mapped States
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [firebaseIdToken, setFirebaseIdToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Setup recaptcha (Requires actual firebase initialization at top of file eventually)
  useEffect(() => {
    if (!window.recaptchaVerifier && window.auth) {
      window.recaptchaVerifier = new window.firebaseAuth.RecaptchaVerifier(window.auth, 'recaptcha-wrapper', {
        'size': 'invisible',
        'callback': (response) => {}
      });
    }
  }, []);

  const clearSignature = () => {
    if (sigCanvas.current && sigCanvas.current.clear) sigCanvas.current.clear();
    setSignature('');
    setHasSignature(false);
  };

  const handleEndDrawing = () => {
    if (sigCanvas.current && sigCanvas.current.getCanvas) {
      setSignature(sigCanvas.current.getCanvas().toDataURL('image/png'));
      setHasSignature(true);
    }
  };

  const [agreements, setAgreements] = useState({
    all: false, term1: false, term2: false, term3: false, termMarketing: false, termDriver: false
  });

  const allRequiredChecked = agreements.term1 && agreements.term2 && agreements.term3 && (userRole === 'customer' || agreements.termDriver);

  const handleAllAgree = (e) => {
    const checked = e.target.checked;
    setAgreements({
      all: checked, term1: checked, term2: checked, term3: checked, termMarketing: checked, 
      termDriver: userRole === 'driver' ? checked : false
    });
  };

  const handleAgreeChange = (key) => (e) => {
    const checked = e.target.checked;
    setAgreements(prev => {
      const next = { ...prev, [key]: checked };
      next.all = next.term1 && next.term2 && next.term3 && next.termMarketing && (userRole === 'customer' || next.termDriver);
      return next;
    });
  };

  const validatePassword = (pw) => /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{6,}$/.test(pw);

  // 이메일 blur 시 중복 검사
  const handleEmailBlur = async () => {
    if (!email) return;
    try {
      const res = await fetch(`${API_BASE}/api/auth/check-email?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (res.status === 409) setEmailError(data.message);
      else setEmailError('');
    } catch (e) {
      console.warn('이메일 중복 검사 실패 (서버 미응답)', e);
    }
  };

  // 전화번호 인증 완료 후 중복 검사
  const checkPhoneDuplicate = async (phoneNo) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/check-phone?phoneNo=${encodeURIComponent(phoneNo)}`);
      const data = await res.json();
      if (res.status === 409) {
        setPhoneError(data.message);
        return false;
      }
      setPhoneError('');
      return true;
    } catch (e) {
      console.warn('전화번호 중복 검사 실패 (서버 미응답)', e);
      return true;
    }
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    setPasswordError((val.length > 0 && !validatePassword(val)) ? '6자리 이상 통과 오류' : '');
  };

  const handleSendSms = async () => {
    if (!phoneNumber) return alert("휴대폰 번호를 입력해주세요.");

    // 개발 환경 우회 로직 (Firebase 설정이 없거나 localhost인 경우)
    if (!import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY.includes('Dummy') || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      alert("[개발 모드] 인증번호 발송 없이 바로 인증 완료 처리됩니다.");
      setIsPhoneVerified(true);
      setFirebaseIdToken("DEV_TOKEN_SKIP");
      return;
    }

    const formattedPhone = "+82" + phoneNumber.replace(/^0/, '');
    try {
      if (!window.recaptchaVerifier) {
        throw new Error("Recaptcha not initialized");
      }
      const confirmation = await window.firebaseAuth.signInWithPhoneNumber(window.auth, formattedPhone, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
      alert("인증번호가 발송되었습니다.");
    } catch (e) {
      console.error("Firebase SMS Auth Error:", e);
      alert(`인증번호 전송 실패: ${e.message}\n(Firebase 프로젝트 설정이나 테스트 번호를 확인해주세요.)`);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || !confirmationResult) return;
    try {
      const result = await confirmationResult.confirm(verificationCode);
      setFirebaseIdToken(await result.user.getIdToken());
      // 인증 완료 즉시 전화번호 중복 검사
      const available = await checkPhoneDuplicate(phoneNumber);
      if (!available) {
        alert('이미 가입된 휴대폰 번호입니다. 다른 번호를 사용해주세요.');
        return;
      }
      setIsPhoneVerified(true);
      alert('본인 인증 확인!');
    } catch (e) {
      alert('인증번호 오류');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 강제로 현재 캔버스 상태 추출 시도 (가끔 onEnd 이벤트가 씹히는 브라우저 버그 방지)
    let finalSignature = signature;
    let finalHasSignature = hasSignature;
    
    if (sigCanvas.current && sigCanvas.current.isEmpty && !sigCanvas.current.isEmpty()) {
       finalSignature = sigCanvas.current.getCanvas().toDataURL('image/png');
       finalHasSignature = true;
       setSignature(finalSignature);
       setHasSignature(true);
    }

    // 개발 환경 서명 우회
    if (!finalHasSignature && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      finalSignature = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
      finalHasSignature = true;
      setSignature(finalSignature);
      setHasSignature(true);
    }

    if (!userName || !email || !password || !finalHasSignature || !allRequiredChecked || !isPhoneVerified) {
      const missing = [];
      if (!userName) missing.push('이름(실명)');
      if (!email) missing.push('이메일(ID)');
      if (!password) missing.push('비밀번호');
      if (!isPhoneVerified) missing.push('휴대폰 본인 인증');
      if (!allRequiredChecked) missing.push('필수 약관 동의');
      if (!finalHasSignature) missing.push('전자 서명');
      return alert(`다음 필수 항목이 누락되었습니다:\n- ${missing.join('\n- ')}`);
    }
    // 비밀번호 확인 일치 검사
    if (password !== passwordConfirm) {
      return alert('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
    }
    // 이메일/전화번호 중복 에러 재확인
    if (emailError || phoneError) {
      return alert(`중복 오류가 있습니다:\n${emailError || phoneError}`);
    }
    setIsLoading(true);
    setErrorMsg('');
    
    const agreedTerms = Object.keys(agreements).filter(k => k !== 'all' && agreements[k]).map((k, idx) => idx + 1);

    try {
      const res = await window.fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: email, password, userName, phoneNo: phoneNumber || "01000000000",
          userType: userRole === 'customer' ? 'TRAVELER' : 'DRIVER',
          firebaseIdToken: firebaseIdToken || "DEV_SKIP",
          mktAgreeYn: agreements.termMarketing ? 'Y' : 'N',
          signatureBase64: signature, agreedTerms
        })
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error);
      alert(data.message);
      close();
    } catch (err) {
      const isNetworkError = err.name === 'TypeError' || err.message === 'Failed to fetch';
      const userMsg = isNetworkError ? '백엔드 서버와 연결할 수 없습니다. (서버가 꺼져있는 것 같습니다.)' : err.message;
      setErrorMsg(userMsg);
      alert(`[가입 실패]\n${userMsg}`);
    } finally { setIsLoading(false); }
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="absolute inset-0 cursor-pointer" onClick={close}></div>
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-surface-lowest rounded-2xl p-8 shadow-ambient z-10">
        <div id="recaptcha-wrapper"></div>
        <button onClick={close} className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-lg transition-colors z-10">
          <span className="material-symbols-outlined font-bold">close</span>
        </button>
        
        <div className="flex items-center pb-8 justify-center">
          <h1 className="font-display text-primary text-[2.5rem] font-bold tracking-tight flex items-center gap-4">
            <img src={busLogo} alt="bus icon" className="w-[84px] h-[84px] object-contain mix-blend-multiply" />
            BUS TAAMS
          </h1>
        </div>
        
        <form className="space-y-5" onSubmit={handleSubmit}>
          {errorMsg && <div className="text-red-500 font-bold mb-4">{errorMsg}</div>}
          
          <div className="flex bg-gray-100 rounded-lg p-1.5 mb-6">
            <button type="button" onClick={()=>setUserRole('customer')} className={`flex-1 py-2 ${userRole==='customer'?'bg-white shadow font-bold':'text-gray-500'}`}>소비자</button>
            <button type="button" onClick={()=>setUserRole('driver')} className={`flex-1 py-2 ${userRole==='driver'?'bg-white shadow font-bold':'text-gray-500'}`}>기사님</button>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
               <label>실명 Name</label>
               <input value={userName} onChange={e=>setUserName(e.target.value)} type="text" className="w-full bg-gray-100 p-3 rounded" />
             </div>
             <div>
               <label>Email ID</label>
               <input
                 value={email}
                 onChange={e=>{ setEmail(e.target.value); setEmailError(''); }}
                 onBlur={handleEmailBlur}
                 type="email"
                 className={`w-full p-3 rounded ${emailError ? 'bg-red-50 ring-2 ring-red-400' : 'bg-gray-100'}`}
               />
               {emailError && <p className="text-red-500 text-xs mt-1 font-bold">{emailError}</p>}
             </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div><label>Password</label><input value={password} onChange={handlePasswordChange} type="password" className="w-full bg-gray-100 p-3 rounded" /></div>
             <div><label>Confirm</label><input value={passwordConfirm} onChange={e=>setPasswordConfirm(e.target.value)} type="password" className="w-full bg-gray-100 p-3 rounded" /></div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">휴대폰 인증</label>
            <div className="flex gap-2">
              <select className="bg-gray-100 p-3 rounded-xl border-2 border-transparent focus:border-primary/30 outline-none text-gray-700 font-medium w-[130px] cursor-pointer">
                <option value="">통신사 선택</option>
                <option value="SKT">SKT</option>
                <option value="KT">KT</option>
                <option value="LGU">LG U+</option>
                <option value="SKT_MVNO">SKT 알뜰폰</option>
                <option value="KT_MVNO">KT 알뜰폰</option>
                <option value="LGU_MVNO">LGU+ 알뜰폰</option>
              </select>
              <input type="tel" value={phoneNumber} onChange={e=>setPhoneNumber(e.target.value)} placeholder="01012345678" className="flex-1 bg-gray-100 p-3 rounded-xl border-2 border-transparent focus:border-primary/30 outline-none text-gray-900 font-medium"/>
              <button type="button" disabled={isPhoneVerified} onClick={handleSendSms} className="bg-gray-900 text-white px-5 rounded-xl font-bold active:scale-95 transition-transform disabled:opacity-50 whitespace-nowrap">
                {isPhoneVerified ? '인증완료' : '인증전송'}
              </button>
            </div>
            {!isPhoneVerified && confirmationResult && (
              <div className="flex gap-2 mt-2 animate-in slide-in-from-top-2 duration-200">
                <input type="text" value={verificationCode} onChange={e=>setVerificationCode(e.target.value)} placeholder="수신된 인증번호 6자리" className="flex-1 bg-gray-100 p-3 rounded-xl border-2 border-transparent focus:border-primary/30 outline-none text-gray-900 font-medium tracking-widest"/>
                <button type="button" onClick={handleVerifyCode} className="border-2 border-primary text-primary px-6 rounded-xl font-bold bg-transparent hover:bg-primary/5 active:scale-95 transition-all">확인</button>
              </div>
            )}
            {phoneError && <p className="text-red-500 text-xs mt-1 font-bold">{phoneError}</p>}
          </div>

          <div className="mt-4 border-t pt-4 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer w-fit mb-3">
              <input type="checkbox" checked={agreements.all} onChange={handleAllAgree} className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"/>
              <span className="text-base font-bold text-gray-900">전체 약관 동의</span>
            </label>
            
            <div className="flex flex-wrap items-center gap-6">
               <div className="flex items-center gap-1">
                 <label className="flex items-center gap-2 cursor-pointer">
                   <input type="checkbox" checked={agreements.term1} onChange={handleAgreeChange('term1')} className="w-4 h-4 rounded border-gray-300 text-primary"/>
                   <span className="text-sm font-medium text-gray-800">이용약관(필수)</span>
                 </label>
                 <button type="button" onClick={() => alert('이용약관 상세 보기 팝업')} className="text-xs font-bold text-gray-500 hover:text-primary transition-colors ml-1">[보기]</button>
               </div>
               
               <div className="flex items-center gap-1">
                 <label className="flex items-center gap-2 cursor-pointer">
                   <input type="checkbox" checked={agreements.term2} onChange={handleAgreeChange('term2')} className="w-4 h-4 rounded border-gray-300 text-primary"/>
                   <span className="text-sm font-medium text-gray-800">개인정보(필수)</span>
                 </label>
                 <button type="button" onClick={() => alert('개인정보 처리방침 팝업')} className="text-xs font-bold text-gray-500 hover:text-primary transition-colors ml-1">[보기]</button>
               </div>
               
               <div className="flex items-center gap-1">
                 <label className="flex items-center gap-2 cursor-pointer">
                   <input type="checkbox" checked={agreements.term3} onChange={handleAgreeChange('term3')} className="w-4 h-4 rounded border-gray-300 text-primary"/>
                   <span className="text-sm font-medium text-gray-800">위치약관(필수)</span>
                 </label>
                 <button type="button" onClick={() => alert('위치약관 팝업')} className="text-xs font-bold text-gray-500 hover:text-primary transition-colors ml-1">[보기]</button>
               </div>
               
               <div className="flex items-center gap-1">
                 <label className="flex items-center gap-2 cursor-pointer">
                   <input type="checkbox" checked={agreements.termMarketing} onChange={handleAgreeChange('termMarketing')} className="w-4 h-4 rounded border-gray-300 text-primary"/>
                   <span className="text-sm font-medium text-gray-800">마케팅(선택)</span>
                 </label>
                 <button type="button" onClick={() => alert('마케팅 동의서 팝업')} className="text-xs font-bold text-gray-500 hover:text-primary transition-colors ml-1">[보기]</button>
               </div>
            </div>

            {userRole === 'driver' && (
               <div className="flex items-center gap-1 mt-2">
                 <label className="flex items-center gap-2 cursor-pointer">
                   <input type="checkbox" checked={agreements.termDriver} onChange={handleAgreeChange('termDriver')} className="w-4 h-4 rounded border-gray-300 text-[#007E69]"/>
                   <span className="text-sm font-bold text-[#007E69]">기사님 입점 계약(필수)</span>
                 </label>
                 <button type="button" onClick={() => alert('기사님 입점 계약 상세 보기')} className="text-xs font-bold text-gray-500 hover:text-primary transition-colors ml-1">[보기]</button>
               </div>
            )}
          </div>

          <div className="mt-6 border-t pt-4">
             <div className="flex justify-between">
                <label>서명 캔버스 (이름 정자)</label>
                {allRequiredChecked && <button type="button" onClick={clearSignature} className="text-sm text-gray-500">초기화</button>}
             </div>
             <div className={`mt-2 border-2 rounded-xl h-40 ${allRequiredChecked ? 'border-primary' : 'border-gray-300 opacity-50 pointer-events-none'}`}>
                 <SignatureCanvas ref={sigCanvas} onEnd={handleEndDrawing} canvasProps={{ className: 'w-full h-full' }} />
             </div>
          </div>

          <button disabled={isLoading} type="submit" className="w-full mt-6 bg-primary text-white py-4 rounded-xl font-bold">
            {isLoading ? "진행 중..." : "최종 가입 제출"}
          </button>
        </form>
      </div>
    </div>
  );
}

function App() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showDriverProfileModal, setShowDriverProfileModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser({
          uuid: user.userUuid,
          id: user.userId,
          name: user.userName,
          type: user.userType,
          hpNo: user.hpNo
        });
      } catch (e) {
        console.error("Failed to restore session", e);
      }
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-body selection:bg-primary/20 selection:text-primary">
      <Header 
        setShowLoginModal={setShowLoginModal} 
        setShowDriverProfileModal={setShowDriverProfileModal} 
        setShowSignUpModal={setShowSignUpModal}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
      />
      <main className="flex-1">
        <Hero />
        <Features />
        <SpringSpecial />
      </main>
      <Footer />
      
      {showLoginModal && (
        <LoginModal 
          close={() => setShowLoginModal(false)} 
          setCurrentUser={setCurrentUser} 
          openSignUp={() => setShowSignUpModal(true)} 
        />
      )}
      {showDriverProfileModal && <DriverProfileModal close={() => setShowDriverProfileModal(false)} />}
      {showSignUpModal && <SignUpModal close={() => setShowSignUpModal(false)} />}
    </div>
  );
}

export default App;
