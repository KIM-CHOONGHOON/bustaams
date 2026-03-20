import React, { useState, useEffect } from 'react';
import busLogo from './assets/images/bustaams_bus_logo.png';
import nameLogo from './assets/images/bustaams_name_logo.png';

function Header({ setShowLoginModal, setShowDriverProfileModal, userRole }) {
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
          <button 
            className="text-base font-semibold text-gray-700 hover:text-primary transition-colors"
            onClick={() => setShowLoginModal(true)}
          >
            로그인
          </button>
          {/* Primary CTA button with gradient */}
          <button className="px-6 py-3 text-base font-bold bg-gradient-to-br from-primary to-primary-container text-white rounded-lg hover:opacity-90 transition-opacity shadow-ambient">회원가입</button>
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

function LoginModal({ close }) {
  const [activeTab, setActiveTab] = useState('customer');

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
            <span className="material-symbols-outlined text-secondary text-3xl">directions_bus</span>
            BUS TAMS
          </h1>
        </div>

        <div className="px-10 pb-10">
          <div className="flex bg-surface-container-low p-1.5 rounded-lg">
            <button 
              onClick={() => setActiveTab('customer')}
              className={`flex-1 flex flex-col items-center justify-center py-3 rounded-[0.5rem] transition-colors ${activeTab === 'customer' ? 'bg-surface-lowest shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-800'}`}
            >
              <p className="text-sm font-bold tracking-wide">소비자</p>
            </button>
            <button 
              onClick={() => setActiveTab('driver')}
              className={`flex-1 flex flex-col items-center justify-center py-3 rounded-[0.5rem] transition-colors ${activeTab === 'driver' ? 'bg-surface-lowest shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-800'}`}
            >
              <p className="text-sm font-bold tracking-wide">기사님</p>
            </button>
          </div>
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
              />
            </div>
          </div>
        </div>

        <div className="px-10 pt-4 flex justify-end">
          <a className="text-primary text-sm font-bold font-body hover:text-primary-container transition-colors" href="#">아이디/비밀번호 찾기</a>
        </div>

        <div className="px-10 pt-8 pb-10">
          <button className="w-full bg-gradient-to-br from-primary to-primary-container text-white font-bold h-14 rounded-lg transition-transform hover:-translate-y-0.5 shadow-ambient flex items-center justify-center font-body text-lg">
            로그인
          </button>
        </div>

        <div className="px-10 flex items-center justify-center pb-6">
           <span className="text-gray-400 text-xs font-bold tracking-widest uppercase font-body bg-surface-container-low px-4 py-1.5 rounded-full">간편 로그인</span>
        </div>

        <div className="px-10 space-y-4 pb-12">
          <button className="w-full bg-kakao text-[#3C1E1E] font-bold h-14 rounded-lg flex items-center justify-center gap-3 transition-transform hover:-translate-y-0.5 shadow-ambient">
            <div className="w-6 h-6 flex items-center justify-center">
              <span className="material-symbols-outlined">chat_bubble</span>
            </div>
            카카오로 시작하기
          </button>
          <button className="w-full bg-naver text-white font-bold h-14 rounded-lg flex items-center justify-center gap-3 transition-transform hover:-translate-y-0.5 shadow-ambient">
            <div className="w-6 h-6 flex items-center justify-center bg-white rounded-md text-naver font-black">
              N
            </div>
            네이버로 시작하기
          </button>
        </div>

        <div className="p-8 bg-surface-container-low text-center">
          <p className="text-gray-500 text-sm font-body">
            계정이 없으신가요? 
            <a className="text-secondary font-bold hover:text-secondary-container ml-2" href="#">회원가입</a>
          </p>
        </div>
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
      
      <div className="relative flex w-full max-w-[440px] h-[90vh] flex-col bg-surface-lowest rounded-xl shadow-ambient overflow-hidden animate-in zoom-in-95 duration-200">
        
        <header className="sticky top-0 z-20 flex items-center bg-surface-lowest/90 backdrop-blur-md px-6 py-4 justify-between border-b border-surface-container-low">
          <button onClick={close} className="flex size-10 items-center justify-center rounded-full hover:bg-surface-container-low cursor-pointer transition-colors text-gray-500">
             <span className="material-symbols-outlined font-bold">close</span>
          </button>
          <h1 className="text-gray-900 text-lg font-display font-bold flex-1 text-center">기사님 신뢰 프로필</h1>
          <div className="flex size-10 items-center justify-center rounded-full hover:bg-surface-container-low cursor-pointer transition-colors text-gray-500">
            <span className="material-symbols-outlined">share</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar pb-24 border-none">
          <div className="flex flex-col items-center px-6 pt-6 pb-8 bg-gradient-to-b from-primary/5 to-transparent flex-shrink-0">
            <div className="relative mb-6">
              <div 
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-32 w-32 border-[6px] border-surface-lowest shadow-ambient" 
                style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAkQpll1UM4qkVBGJYpjoQPLFYaC7SOWIM4GQdk0zGQG4nV827qNptP5Ejg-SG0L1mPE1jAc-fRo2e19zFvQI_gZmnVq9l_yoDjtJXYhnZkGAr1ZE0uLaYWax9CAqeoz2brWUx3XRer0beVWqxkVV7V_kq9xpIKemVCqYShRNyy70MQTINqgXUkABZpR7BqOP6GcgyrsicOPAPXoariwVw33Fqy7EBxAq9gFKpXKmSMuOq8aXEGrZzYOVtsjnaNvQGNVQeO_HyO")' }}
              ></div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gradient-to-br from-primary to-primary-container px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-ambient border-2 border-surface-lowest whitespace-nowrap">
                <span className="material-symbols-outlined text-white text-[16px] font-bold">verified</span>
                <span className="text-white text-xs font-bold tracking-wide">KoROAD 인증 완료</span>
              </div>
            </div>
            
            <div className="text-center">
              <h2 className="text-2xl font-display font-bold text-gray-900 mb-1">김명호 기사님</h2>
              <p className="text-primary font-bold text-sm bg-primary/10 inline-block px-3 py-1 rounded-full">베테랑 전문 운송 파트너</p>
              <div className="flex items-center justify-center gap-1 mt-3 text-gray-500 text-xs font-medium">
                <span className="material-symbols-outlined text-sm">location_on</span>
                <span>대한민국 서울특별시</span>
              </div>
            </div>

            <div className="grid grid-cols-3 w-full gap-4 mt-8">
              <div className="bg-surface-container-low p-4 rounded-xl flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-primary mb-2 text-2xl">star</span>
                <span className="text-lg font-display font-bold text-gray-900">4.9<span className="text-sm font-medium text-gray-500">/5.0</span></span>
                <span className="text-[11px] font-bold text-gray-500 mt-1 uppercase tracking-wider">평점</span>
              </div>
              <div className="bg-surface-container-low p-4 rounded-xl flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-primary mb-2 text-2xl">directions_bus</span>
                <span className="text-lg font-display font-bold text-gray-900">1,240회</span>
                <span className="text-[11px] font-bold text-gray-500 mt-1 uppercase tracking-wider">운행 횟수</span>
              </div>
              <div className="bg-surface-container-low p-4 rounded-xl flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-primary mb-2 text-2xl">workspace_premium</span>
                <span className="text-lg font-display font-bold text-gray-900">12년</span>
                <span className="text-[11px] font-bold text-gray-500 mt-1 uppercase tracking-wider">경력</span>
              </div>
            </div>
          </div>

          <div className="px-6 py-2 space-y-4">
            <div className="flex items-center justify-between p-5 bg-surface-container-low rounded-xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-2xl flex">shield_person</span>
                </div>
                <div>
                  <p className="text-base font-bold text-gray-900 font-display">종합보험 가입 완료</p>
                  <p className="text-sm text-gray-500 mt-0.5">영업배상책임보험 적용 차량</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-primary text-2xl bg-surface-lowest rounded-full shadow-ambient flex">check_circle</span>
            </div>

            <div className="flex items-center justify-between p-5 bg-surface-container-low rounded-xl">
              <div className="flex items-center gap-4 w-full">
                <div className="p-3 bg-secondary/10 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary text-2xl flex">hotel_class</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                     <p className="text-base font-bold text-gray-900 font-display">차량 컨디션</p>
                     <span className="text-xs font-bold text-secondary bg-surface-lowest px-2 py-0.5 rounded shadow-sm">최상급 (3년식)</span>
                  </div>
                  <div className="w-full bg-surface-dim h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-secondary to-secondary-container h-full w-[15%] rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 px-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-display font-bold text-gray-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">photo_library</span>
                차량 갤러리
              </h3>
              <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">3장</span>
            </div>
            
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-6 -mx-6 px-6 snap-x">
              <div className="relative w-[80%] h-48 rounded-xl overflow-hidden shadow-ambient group snap-center shrink-0">
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDYMKVMpoJohkVbDKo38KFZfcQSdfDPpxXjYzkDQf5wStr_z8K_Qj4kO5Goqi6ohVumkFea2LlB564jPal82MvjYUanpNvsGHXFcC7Q84EzcxIjg4l-vyKOZbOLNhQllGoD2Hcm5pErc59VZo9lIHU4v68t7xVjwR-lBSE9GRh3D0SasdlwIl_h-9_gH0Ub0-qxm2YqiAw3lmmEFPILQxDziaOGkKE5T8RB9K6dnu-Jw03pBwnuNlyRkWO3JC4Gn2rQnNeLOW98")' }}></div>
                <div className="absolute bottom-3 left-3 bg-surface-lowest/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs text-gray-900 font-bold shadow-sm">차량 전면</div>
              </div>
              <div className="relative w-[80%] h-48 rounded-xl overflow-hidden shadow-ambient group snap-center shrink-0">
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCjALg74-MmC0bSL5rsAn4zLDWVLZqQdAwvv8C0wbxY0H-IMACjP4hoeIUQc4V_B3q3VplC40NPL0VtTqVEAlQHBpWhGhPTXpYvAH7HI4diMw832dDmPiLrsKRPCeVyDYBdmNZ3UjEPoQTuELfrM6kmcjToMrLXKmCb2k9FlAqrYwPlqIDH7u3XupQWJhYW-8ii4Tbd8Wa3qhPnCOsM7wr6X3YxuTlcbhMutMWl0hZtmq5W2VgN0ghrWO6-qSC6q3mSkvd-h0cw")' }}></div>
                <div className="absolute bottom-3 left-3 bg-surface-lowest/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs text-gray-900 font-bold shadow-sm">내부 좌석</div>
              </div>
              <div className="relative w-[80%] h-48 rounded-xl overflow-hidden shadow-ambient group snap-center shrink-0">
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCmOtvHG4vm_3Q7kysJDgsLSTQ-Kd7mP9oe8UmnDtdQrN5O6UxIYpRU89zUBIWIzqCfjRyai7LjxqSH2xLyZV4IHWN68SmT-FTzRG0lFXHrUfHwdBwadSaGnrEl2IbbHBsIPWZJHKFfa80vigLvxFxJ-k-uWAqaVncXI1sn9z4mP6hyk5v8oIccZyU9Rl-xT2gNuoW83npcuWsMCORgdwiCjwi-VaoA0_nwbOxQhgX6v1QiILo6FaZZiTZFWORbB-tSTaRKqsvp")' }}></div>
                <div className="absolute bottom-3 left-3 bg-surface-lowest/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs text-gray-900 font-bold shadow-sm">운전석</div>
              </div>
            </div>
          </div>

          <div className="mx-6 mb-6 border-t border-surface-container-low pt-6">
            <h3 className="text-lg font-display font-bold text-gray-900 mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">assignment_turned_in</span>
              상세 스펙
            </h3>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg">
                <div className="flex items-center gap-3 text-gray-600">
                  <span className="material-symbols-outlined">event_seat</span>
                  <span className="text-sm font-bold">승차 정원</span>
                </div>
                <span className="text-sm text-gray-900 font-bold">45인승 대형</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg">
                <div className="flex items-center gap-3 text-gray-600">
                  <span className="material-symbols-outlined">wifi</span>
                  <span className="text-sm font-bold">인터넷</span>
                </div>
                <span className="text-sm text-primary font-bold">무료 5G Wi-Fi 제공</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg">
                <div className="flex items-center gap-3 text-gray-600">
                  <span className="material-symbols-outlined">power</span>
                  <span className="text-sm font-bold">전원 포트</span>
                </div>
                <span className="text-sm text-gray-900 font-bold">전 좌석 220V/USB 적용</span>
              </div>
            </div>
          </div>
        </main>
        
        <div className="absolute bottom-0 left-0 right-0 p-5 bg-surface-lowest/95 backdrop-blur-xl border-t border-surface-container-low z-40">
          <button className="w-full bg-gradient-to-br from-primary to-primary-container hover:opacity-90 text-white h-14 rounded-xl font-bold flex items-center justify-center gap-2 shadow-ambient transition-transform hover:-translate-y-0.5">
            <span className="material-symbols-outlined font-bold font-['Material_Symbols_Outlined']">mail</span>
            기사님께 1:1 문의하기
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showDriverProfileModal, setShowDriverProfileModal] = useState(false);
  const [userRole, setUserRole] = useState('customer');

  return (
    <div className="min-h-screen flex flex-col font-body selection:bg-primary/20 selection:text-primary">
      <Header setShowLoginModal={setShowLoginModal} setShowDriverProfileModal={setShowDriverProfileModal} userRole={userRole} />
      <main className="flex-1">
        <Hero />
        <Features />
        <SpringSpecial />
      </main>
      <Footer />
      
      {showLoginModal && <LoginModal close={() => setShowLoginModal(false)} />}
      {showDriverProfileModal && <DriverProfileModal close={() => setShowDriverProfileModal(false)} />}
    </div>
  );
}

export default App;
