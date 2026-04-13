import React, { useState, useEffect, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import DriverProfileModal from './components/DriverProfileModal';
import SignupPage from './components/SignupPage';
import AccountSettings from './components/AccountSettings';
import CreateBusRequest from './components/CreateBusRequest/CreateBusRequest';
import ReservationList from './components/ReservationList/ReservationList';
import ReservationCompletedList from './components/ReservationList/ReservationCompletedList';
import CustomerDashboard from './components/CustomerDashboard';
import Login from './components/Login/Login';
import PartnerDashboard from './components/PartnerDashboard/PartnerDashboard';
import DriverDashboard from './components/DriverDashboard/DriverDashboard';
import DriverProfileSetup from './components/DriverProfileSetup/DriverProfileSetup';
import BusInformationSetup from './components/BusInformationSetup/BusInformationSetup';
import ListOfTravelerQuotations from './components/ListOfTravelerQuotations/ListOfTravelerQuotations';
import TravelerQuoteRequestDetails from './components/TravelerQuoteRequestDetails/TravelerQuoteRequestDetails';
import LiveChatTraveler from './components/LiveChatTraveler/LiveChatTraveler';
import busLogo from './assets/images/bustaams_bus_logo.png';
import { registerWebFcmTokenIfPossible } from './firebaseMessagingRegister';
import nameLogo from './assets/images/bustaams_name_logo.png';

import { phoneAuth, RecaptchaVerifier, signInWithPhoneNumber } from './firebasePhoneVerify';

window.auth = phoneAuth;
window.firebaseAuth = { RecaptchaVerifier, signInWithPhoneNumber };

/** 로그인 응답·localStorage 복원 시 userType·uuid 필드 정규화 (DB/클라이언트 대소문자 차이 대비) */
function normalizeUserSession(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const u = { ...raw };
  const t = u.userType ?? u.USER_TYPE;
  if (t != null && String(t).trim() !== '') {
    u.userType = String(t).trim().toUpperCase();
  }
  if (!u.uuid && u.userUuid) u.uuid = u.userUuid;
  if (!u.userUuid && u.uuid) u.userUuid = u.uuid;
  return u;
}

function Header({
  setShowLoginModal,
  setShowDriverProfileModal,
  setShowAccountSettings,
  setShowSignUpModal,
  user,
  onLogout,
  onLogoClick,
}) {
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
        <button
          type="button"
          className="flex items-center gap-2 md:gap-3 cursor-pointer group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          onClick={onLogoClick}
          aria-label="BusTaams 홈 또는 내 대시보드로 이동"
        >
          <img
            src={busLogo}
            alt=""
            width={120}
            height={120}
            className="h-11 w-auto max-h-[56px] md:max-h-[64px] object-contain object-left shrink-0 transition-transform group-hover:scale-[1.02]"
            decoding="async"
            aria-hidden
          />
          <img
            src={nameLogo}
            alt="BusTaams"
            width={280}
            height={64}
            className="h-11 w-auto max-h-[56px] md:h-[64px] md:max-h-[64px] max-w-[min(55vw,280px)] object-contain object-left transition-transform group-hover:scale-[1.02]"
            decoding="async"
          />
        </button>
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
          <p className="font-body text-xl lg:text-2xl font-normal text-gray-800 max-w-lg leading-relaxed">
            전국 어디든, 가장 합리적인 가격으로<br />
            당신의 특별한 여행을 완성하세요.
          </p>
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

function LoginModal({ close, onLoginSuccess, setCurrentView }) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleLogin = async () => {
    if (!userId || !password) {
      setMessage({ text: '아이디와 비밀번호를 입력해주세요.', type: 'error' });
      return;
    }

    setIsLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const response = await fetch('http://localhost:8080/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ text: `${result.user.userName}님, 환영합니다!`, type: 'success' });
        setTimeout(() => {
          onLoginSuccess(result.user);
          close();
        }, 1500);
      } else {
        setMessage({ text: result.error || '로그인에 실패했습니다.', type: 'error' });
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage({ text: '서버와 통신 중 오류가 발생했습니다.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // 홈페이지에 pop-up 형식으로 출력될 때, 뒷배경 스크롤 방지 효과
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-6 animate-in fade-in duration-200">
      <div className="absolute inset-0 cursor-pointer" onClick={close}></div>
      
      <div className="relative flex w-full max-w-[440px] flex-col bg-surface-lowest rounded-xl shadow-ambient overflow-hidden animate-in zoom-in-95 duration-200">
        
        <button 
          onClick={close} 
          className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-surface hover:bg-surface-container-low text-gray-500 rounded-lg transition-colors z-10"
        >
          <span className="material-symbols-outlined font-bold">close</span>
        </button>

        <div className="flex items-center p-10 pb-6 justify-center">
          <h1 className="font-display text-primary text-3xl font-bold tracking-tight flex items-center gap-3">
            <img src={busLogo} alt="bus icon" className="w-16 h-16 object-contain mix-blend-multiply" />
            BUS TAAMS
          </h1>
        </div>


        <div className="px-10 space-y-6">
          <div className="flex flex-col">
            <label className="text-gray-700 text-sm font-bold pb-2 px-1 font-body">아이디</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">person</span>
              <input 
                className="w-full bg-surface-container-high focus:bg-surface-lowest border-0 focus:ring-[2px] focus:ring-primary/20 rounded-lg h-14 pl-12 pr-4 text-base font-body text-gray-900 placeholder:text-gray-400 focus:outline-none transition-all" 
                placeholder="아이디를 입력해주세요" 
                type="text" 
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col">
            <label className="text-gray-700 text-sm font-bold pb-2 px-1 font-body">비밀번호</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">lock</span>
              <input 
                className="w-full bg-surface-container-high focus:bg-surface-lowest border-0 focus:ring-[2px] focus:ring-primary/20 rounded-lg h-14 pl-12 pr-4 text-base font-body text-gray-900 placeholder:text-gray-400 focus:outline-none transition-all" 
                placeholder="비밀번호를 입력해주세요" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
          </div>
        </div>

        <div className="px-10 pt-4 flex justify-end">
          <a className="text-primary text-sm font-bold font-body hover:text-primary-container transition-colors" href="#">아이디/비밀번호 찾기</a>
        </div>

        {message.text && (
          <div className={`px-10 pt-4 text-center text-sm font-bold ${message.type === 'error' ? 'text-red-500' : 'text-primary'}`}>
            {message.text}
          </div>
        )}

        <div className="px-10 pt-8 pb-10">
          <button 
            onClick={handleLogin}
            disabled={isLoading}
            className={`w-full bg-gradient-to-br from-primary to-primary-container text-white font-bold h-14 rounded-lg transition-transform hover:-translate-y-0.5 shadow-ambient flex items-center justify-center font-body text-lg ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </div>

        <div className="px-10 flex items-center justify-center pb-6">
           <span className="text-gray-400 text-xs font-bold tracking-widest uppercase font-body bg-surface-container-low px-4 py-1.5 rounded-full">간편 로그인</span>
        </div>

        <div className="px-10 pb-12 text-center">
          <p className="text-gray-500 text-sm font-body">아직 회원이 아니신가요?</p>
          <button 
            type="button"
            onClick={() => { close(); setCurrentView('signup'); }}
            className="text-secondary font-bold hover:text-secondary-container mt-1"
          >
            회원가입
          </button>
        </div>
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
          userType: userRole === 'customer' ? 'CONSUMER' : 'DRIVER',
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
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [currentView, setCurrentView] = useState('home'); // 'home' or 'signup'
  const [userRole, setUserRole] = useState('customer');
  const [user, setUser] = useState(null);

  const [showBusInfoModal, setShowBusInfoModal] = useState(false);
  const [showProfileSetupModal, setShowProfileSetupModal] = useState(false);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  /** 실시간 입찰 기회 카드 → 여행자 견적 요청 상세 */
  const [travelerQuoteReqUuid, setTravelerQuoteReqUuid] = useState(null);
  const [driverView, setDriverView] = useState('dashboard');
  const [customerView, setCustomerView] = React.useState('dashboard');
  const [showBusRegisterModal, setShowBusRegisterModal] = useState(false);
  const [showLiveChatTraveler, setShowLiveChatTraveler] = useState(false);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(normalizeUserSession(JSON.parse(savedUser)));
      } catch {
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const uid = user.userUuid || user.uuid;
    if (!uid) return;
    registerWebFcmTokenIfPossible(uid).catch(() => {});
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setCustomerView('dashboard');
    setShowBusRegisterModal(false);
    setDriverView('dashboard');
    setTravelerQuoteReqUuid(null);
    setShowLiveChatTraveler(false);
  };

  /** 로고 클릭: 비로그인 시 랜딩 상단으로, 로그인 시 역할별 대시보드(메인 화면)로 */
  const handleLogoClick = () => {
    setShowLoginModal(false);
    setShowDriverProfileModal(false);
    setShowAccountSettings(false);
    setShowBusRegisterModal(false);
    setShowBusInfoModal(false);
    setShowProfileSetupModal(false);
    setTravelerQuoteReqUuid(null);
    setShowLiveChatTraveler(false);
    setCurrentView('home');
    if (user?.userType === 'DRIVER') {
      setDriverView('dashboard');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col min-h-screen font-body selection:bg-primary/20 selection:text-primary">
      <Header 
        setShowLoginModal={setShowLoginModal} 
        setShowDriverProfileModal={setShowDriverProfileModal} 
        setShowAccountSettings={setShowAccountSettings}
        setShowSignUpModal={() => setCurrentView('signup')}
        user={user}
        onLogout={handleLogout}
        onLogoClick={handleLogoClick}
      />
      <main className="flex-1 min-h-0 flex flex-col">
        {currentView === 'home' ? (
          user ? (
            user.userType === 'CONSUMER' || user.userType === 'TRAVELER' || user.userType === 'CUSTOMER' ? (
              customerView === 'reservationList' ? (
                <ReservationList user={user} onBack={() => setCustomerView('dashboard')} />
              ) : customerView === 'confirmedList' ? (
                <ReservationCompletedList user={user} onBack={() => setCustomerView('dashboard')} />
              ) : (
                <CustomerDashboard 
                  user={user} 
                  setShowAccountSettings={setShowAccountSettings} 
                  onBusRegister={() => setShowBusRegisterModal(true)}
                  onViewReservationList={() => setCustomerView('reservationList')}
                  onViewConfirmedList={() => setCustomerView('confirmedList')}
                  onOpenLiveChat={() => setShowLiveChatTraveler(true)}
                />
              )
            ) : user.userType === 'DRIVER' ? (
                <DriverDashboard 
                  currentUser={user} 
                  onProfileSetup={() => setShowProfileSetupModal(true)}
                  onBusInfoSetup={() => setShowBusInfoModal(true)}
                  onQuotationList={() => setShowQuotationModal(true)}
                  onTravelerQuoteDetail={(reqUuid) => setTravelerQuoteReqUuid(reqUuid)}
                />
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
        <div className="fixed inset-0 z-[100] bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-[800px] h-[600px] bg-surface-bright rounded-2xl shadow-ambient overflow-hidden animate-in zoom-in-95 duration-200">
            <Login 
              onToggle={() => setShowLoginModal(false)} 
              onLoginSuccess={(userData) => {
                const normalized = normalizeUserSession(userData);
                localStorage.setItem('user', JSON.stringify(normalized));
                setUser(normalized);
                setShowLoginModal(false);
                setCurrentView('home');
              }}
              setCurrentView={setCurrentView}
            />
          </div>
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
          onUpdateUser={(updatedUser) => setUser(updatedUser)}
        />
      )}
      {showSignUpModal && <SignUpModal close={() => setShowSignUpModal(false)} />}
      {showBusInfoModal && <BusInformationSetup close={() => setShowBusInfoModal(false)} currentUser={user} />}
      {showProfileSetupModal && <DriverProfileSetup close={() => setShowProfileSetupModal(false)} currentUser={user} />}
      {showQuotationModal && <ListOfTravelerQuotations close={() => setShowQuotationModal(false)} currentUser={user} />}
      {travelerQuoteReqUuid && (
        <TravelerQuoteRequestDetails
          reqUuid={travelerQuoteReqUuid}
          close={() => setTravelerQuoteReqUuid(null)}
          currentUser={user}
        />
      )}
      <LiveChatTraveler
        open={showLiveChatTraveler}
        onClose={() => setShowLiveChatTraveler(false)}
        travelerUuid={user?.userUuid || user?.uuid}
      />
      {showBusRegisterModal && (
        <CreateBusRequest 
          user={user} 
          onBack={() => setShowBusRegisterModal(false)}
          onSuccess={() => {
            setShowBusRegisterModal(false);
            setCustomerView('reservationList');
          }}
        />
      )}
    </div>
  );
}

export default App;
