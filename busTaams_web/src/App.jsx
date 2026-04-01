import React, { useState, useEffect, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import DriverProfileModal from './components/DriverProfileModal';
import SignupPage from './components/SignupPage';
import AccountSettings from './components/AccountSettings';
import CustomerDashboard from './components/CustomerDashboard';
import Login from './components/Login/Login';
import PartnerDashboard from './components/PartnerDashboard/PartnerDashboard';
import busLogo from './assets/images/bustaams_bus_logo.png';
import nameLogo from './assets/images/bustaams_name_logo.png';
import DriverDashboard from './components/DriverDashboard/DriverDashboard';
import DriverProfileSetup from './components/DriverProfileSetup/DriverProfileSetup';
import BusInformationSetup from './components/BusInformationSetup/BusInformationSetup';
import QuotationRequests from './components/QuotationRequests/QuotationRequests';

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

function Header({ setShowLoginModal, setShowDriverProfileModal, setShowAccountSettings, setShowSignUpModal, user, onLogout }) {
  // USER_TYPE 변환 함수
  const translateUserType = (type) => {
    switch (type) {
      case 'CONSUMER':
      case 'TRAVELER':
      case 'CUSTOMER': return '소비자';
      case 'SALES':
      case 'PARTNER': return '영업사원';
      case 'DRIVER': return '기사';
      default: return type;
    }
  };
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
          <a 
            className={`transition-all ${(user?.userType === 'CONSUMER' || user?.userType === 'TRAVELER' || user?.userType === 'CUSTOMER' || user?.userType === 'SALES' || user?.userType === 'PARTNER') ? 'text-primary font-bold cursor-pointer hover:opacity-80' : 'opacity-40 pointer-events-none cursor-not-allowed'}`} 
            href="#"
          >
            이용 고객 전용
          </a>
          
          <div className={`relative group transition-all ${user?.userType === 'DRIVER' ? 'opacity-100' : 'opacity-40 pointer-events-none cursor-not-allowed'}`}>
            <div className={`flex items-center gap-1 transition-colors py-4 ${user?.userType === 'DRIVER' ? 'text-primary font-bold cursor-pointer hover:opacity-80' : ''}`}>
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
          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 py-2 px-5 bg-surface-container-low rounded-full border border-primary/10 transition-all hover:bg-surface-container animate-in fade-in slide-in-from-right-4 duration-500">
                 <span className="material-symbols-outlined text-primary text-[20px]">account_circle</span>
                 <p className="text-gray-800 font-bold text-sm tracking-tight">
                   <span className="text-primary">{user.userName}</span>
                   <span className="text-gray-400 font-medium ml-1">({translateUserType(user.userType)})</span>
                   <span className="ml-1">님, 환영합니다!</span>
                 </p>
              </div>
              <button 
                onClick={() => setShowAccountSettings(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-500 hover:text-primary hover:bg-surface-container rounded-lg transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">person</span>
                내 정보
              </button>
              <button 
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-500 hover:text-primary hover:bg-surface-container rounded-lg transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
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

function Hero({ user, setShowLoginModal }) {
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

function App() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showDriverProfileModal, setShowDriverProfileModal] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [currentView, setCurrentView] = useState('home'); // 'home' or 'signup'
  const [userRole, setUserRole] = useState('customer');
  const [user, setUser] = useState(null);

  const [showBusInfoModal, setShowBusInfoModal] = useState(false);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [driverView, setDriverView] = useState('dashboard'); // 'dashboard' | 'profileSetup'

  const handleLogout = () => {
    setUser(null);
  };
  

  return (
    <div className="min-h-screen flex flex-col font-body selection:bg-primary/20 selection:text-primary">
      <Header 
        setShowLoginModal={setShowLoginModal} 
        setShowDriverProfileModal={setShowDriverProfileModal} 
        setShowAccountSettings={setShowAccountSettings}
        setShowSignUpModal={() => setCurrentView('signup')}
        user={user}
        onLogout={handleLogout}
      />
      <main className="flex-1">
        {currentView === 'home' ? (
          user ? (
            user.userType === 'CONSUMER' || user.userType === 'TRAVELER' || user.userType === 'CUSTOMER' ? (
               <CustomerDashboard 
                 user={user} 
                 setShowAccountSettings={setShowAccountSettings} 
               />
            ) : user.userType === 'DRIVER' ? (
               driverView === 'profileSetup' ? (
                 <DriverProfileSetup 
                   currentUser={user} 
                   onBack={() => setDriverView('dashboard')} 
                 />
               ) : (
                 <DriverDashboard 
                   currentUser={user} 
                   onLogout={handleLogout} 
                   onProfileSetup={() => setDriverView('profileSetup')}
                   onBusInfoSetup={() => setShowBusInfoModal(true)}
                   onQuotationRequests={() => setShowQuotationModal(true)}
                 />
               )
            ) : null
          ) : (
            <>
              <Hero user={user} setShowLoginModal={setShowLoginModal} />
              <Features user={user} />
              <SpringSpecial />
            </>
          )
        ) : (
          <SignupPage onBack={() => setCurrentView('home')} />
        )}
      </main>
      
      {currentView === 'home' && !user && <Footer />}
      
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <Login 
            onToggle={() => setShowLoginModal(false)} 
            onLoginSuccess={(userData) => {
              setUser(userData);
              setShowLoginModal(false);
            }} 
          />
        </div>
      )}
      {showDriverProfileModal && (
        <DriverProfileModal 
          isOpen={showDriverProfileModal} 
          onClose={() => setShowDriverProfileModal(false)} 
          user={user} 
        />
      )}
      {showAccountSettings && (
        <AccountSettings 
          user={user} 
          onBack={() => setShowAccountSettings(false)} 
          onLogout={handleLogout}
        />
      )}
      {showSignUpModal && <SignUpModal close={() => setShowSignUpModal(false)} />}
      {showBusInfoModal && <BusInformationSetup close={() => setShowBusInfoModal(false)} currentUser={user} />}
      {showQuotationModal && <QuotationRequests close={() => setShowQuotationModal(false)} currentUser={user} />}
    </div>
  );
}

export default App;
