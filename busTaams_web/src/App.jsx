import React, { useState, useEffect, useRef } from 'react';
import busLogo from './assets/images/bustaams_bus_logo.png';
import nameLogo from './assets/images/bustaams_name_logo.png';
import Login from './components/Login/Login';


function Header({ setShowLoginModal, setShowDriverProfileModal, currentUser, setCurrentUser }) {
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
                onClick={() => setCurrentUser(null)}
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
        <Login onToggle={close} onLoginSuccess={(user) => { setCurrentUser(user); close(); }} />
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


function App() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showDriverProfileModal, setShowDriverProfileModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  return (
    <div className="min-h-screen flex flex-col font-body selection:bg-primary/20 selection:text-primary">
      <Header 
        setShowLoginModal={setShowLoginModal} 
        setShowDriverProfileModal={setShowDriverProfileModal} 
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
      />
      <main className="flex-1">
        <Hero />
        <Features />
        <SpringSpecial />
      </main>
      <Footer />
      
      {showLoginModal && <LoginModal close={() => setShowLoginModal(false)} setCurrentUser={setCurrentUser} />}
      {showDriverProfileModal && <DriverProfileModal close={() => setShowDriverProfileModal(false)} />}
    </div>
  );
}

export default App;
