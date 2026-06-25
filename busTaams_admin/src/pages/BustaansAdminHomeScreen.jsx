import React, { useState, useEffect } from 'react';
import LoginModal from '../components/LoginModal';
import googlePlayLogo from '../assets/Google_Play_logo.png';
import busLogoIcon from '../assets/BUSTAAMS_IMAGE_LOGO.png';
import bustaaamsAppInstall from '../assets/버스탐스_앱_설치.png';
import bustaaamsHeroImg from '../assets/BUSTAAM_FULL_LOGO_HERO.png';

const LOGO_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAZdAigMGOyFO28v4BTyVM3eBPR_k84hxtJ4YWvDd8aTC3wveQ_JYszbB9rR5KPEwJF25yDOxp6Vx2RQNXTELdRJMP-KeN5vQP_ao5bZXpgJIOHmnLpbWL421zT3L17DNQ2htjKSA4a9H1rAZASKe0Mnw_H952pviwWES_vJRmLDIMn23hVvMGI0PyVOwY0S78AvxSrGtW7qtJLX6TWkjXdzSCDx6jm8Otdcvywo6D5ODALFlVGUj_1zdJ7SMlr380hNYIvZX6_Ec0';

/**
 * 버스탐스 어드민 홈페이지
 * 영문 ID: BustaansAdminHomeScreen
 */
const BustaansAdminHomeScreen = ({ onLoginSuccess }) => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [headerShadow,   setHeaderShadow]   = useState(false);

  // 스크롤 시 헤더 그림자 토글
  useEffect(() => {
    const handleScroll = () => setHeaderShadow(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 앵커 부드러운 스크롤
  const handleAnchorClick = (e) => {
    const href = e.currentTarget.getAttribute('href');
    if (href && href.startsWith('#') && href.length > 1) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openLogin  = () => setShowLoginModal(true);
  const closeLogin = () => setShowLoginModal(false);

  return (
    <div className="bg-background text-on-surface font-body-md overflow-x-hidden">

      {/* ── TopNavBar ───────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 w-full z-40 bg-surface border-b border-outline-variant h-16 flex items-center transition-shadow duration-200 overflow-hidden ${
          headerShadow ? 'shadow-sm bg-opacity-95' : ''
        }`}
      >
        {/* 🚌 이동하는 버스 아이콘 */}
        <img
          src={busLogoIcon}
          alt=""
          aria-hidden="true"
          className="bus-animate"
          style={{ height: '44px', width: 'auto' }}
        />

        <div className="w-full max-w-container-max mx-auto px-margin-desktop flex items-center justify-between relative z-10">
          <div className="flex items-center">
            <a href="#" onClick={handleAnchorClick}>
              <img
                src={LOGO_URL}
                alt="Cheongsol Tech Logo"
                className="h-10 w-auto object-contain"
              />
            </a>
          </div>
          {/* 로그인 버튼: 오른쪽 끝에서 2cm 왼쪽으로 이동 */}
          <div className="flex items-center gap-4 mr-[2cm]">
            <button
              onClick={openLogin}
              className="px-6 py-2 rounded-lg bg-primary text-white font-button-text text-button-text hover:bg-primary-container transition-all"
            >
              로그인
            </button>
          </div>
        </div>
      </header>

      <main className="pt-16">

        {/* ── Hero Section ────────────────────────────────────────── */}
        <section className="relative flex overflow-hidden bg-background" style={{ minHeight: 'calc(100vh - 160px)' }}>
          <div className="w-full grid md:grid-cols-2 items-stretch">
            {/* 좌측 텍스트 */}
            <div className="z-10 flex flex-col justify-center px-margin-desktop pl-[3cm] py-16">
              {/* 대타이틀: 48px, Regular(400), 왼쪽 진한 파랑 → 오른쪽 밝은 파랑 그라디언트 */}
              <h1
                className="mb-6 leading-tight"
                style={{
                  fontSize: '48px',
                  fontWeight: 400,
                  background: 'linear-gradient(to right, #001a4a 0%, #0d47a1 45%, #2979ff 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                내 여행의 가치,<br />가격까지 내가 결정합니다.
              </h1>

              {/* 부타이틀: 22px, Semi-Bold(600) — 첫 문장 1줄 표시 */}
              <p
                className="text-on-surface-variant mb-2 whitespace-nowrap leading-relaxed"
                style={{ fontSize: '22px', fontWeight: 600 }}
              >
                출발지부터 경유지, 그리고 버스 대절 비용까지 맘편히 제안하세요.
              </p>
              <p
                className="text-on-surface-variant mb-8 leading-relaxed"
                style={{ fontSize: '22px', fontWeight: 600 }}
              >
                베테랑 기사님이 당신의 제안에 확답을 드립니다.
              </p>
              <div className="flex flex-wrap gap-4 items-center">
                <a href="#" onClick={handleAnchorClick} className="inline-block hover:opacity-80 transition-opacity">
                  <img
                    src={googlePlayLogo}
                    alt="Google Play"
                    className="h-14 w-auto object-contain"
                  />
                </a>
                <a href="#" onClick={handleAnchorClick} className="inline-block hover:opacity-80 transition-opacity">
                  <img
                    src={bustaaamsAppInstall}
                    alt="버스탐스 앱 설치"
                    className="h-14 w-auto object-contain"
                  />
                </a>
              </div>
            </div>

            {/* 우측 — BUSTAAMS 풀 로고 (배경색 홈페이지와 통일) */}
            <div className="relative flex justify-center items-center h-full bg-background">
              <img
                alt="BUSTAAMS 버스탐스 로고"
                className="w-full h-auto object-contain"
                src={bustaaamsHeroImg}
                style={{ mixBlendMode: 'multiply' }}
              />
            </div>
          </div>

        </section>

      </main>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer style={{ backgroundColor: '#126c40' }}>
        <div className="max-w-container-max mx-auto px-margin-desktop py-6 pb-8 flex flex-col items-center gap-3 text-center">
          <p className="font-label-technical text-label-technical leading-relaxed" style={{ color: '#ffffff' }}>
            (주) 청솔테크&nbsp;&nbsp;|&nbsp;&nbsp;사업자등록번호: 212-81-45502&nbsp;&nbsp;|&nbsp;&nbsp;통신판매 송파구청 1234-1234&nbsp;&nbsp;|&nbsp;&nbsp;대표 : 원동일&nbsp;&nbsp;|&nbsp;&nbsp;주소: 서울특별시 송파구 충민로 66, L-7145호(문정동, 가든파이브라이프)
          </p>
          <p className="font-label-technical text-label-technical leading-relaxed" style={{ color: '#c8e6d0', fontSize: '12px', marginTop: '4px' }}>
            &lt; 청솔테크(주)의 버스탐스 &gt;는 여행자와 버스 기사님을 연결하는 운송 매칭 플랫폼입니다.
            플랫폼에서 판매되는 모든 상품은 &lt; 청솔테크(주) &gt;에서 책임지고 관리하나, 실제 버스 운행 서비스 및 결제, 현장 서비스의 이행 책임은 거래 당사자(여행자 및 버스 기사)에게 있습니다.
            불편사항 및 민원 접수 : 담당자 원동일 (02-429-5459)
          </p>
          <p className="font-label-technical text-label-technical" style={{ color: 'rgba(255,255,255,0.8)' }}>
            © 2024 Cheongsol Tech Co., Ltd. All rights reserved.
            &nbsp;&nbsp;|&nbsp;&nbsp;
            <a href="#" onClick={handleAnchorClick} style={{ color: 'rgba(255,255,255,0.8)' }} className="hover:underline transition-all">약관 조회</a>
            &nbsp;&nbsp;|&nbsp;&nbsp;
            <a href="#" onClick={handleAnchorClick} style={{ color: 'rgba(255,255,255,0.8)' }} className="hover:underline transition-all">버스탐스 안내</a>
            &nbsp;&nbsp;|&nbsp;&nbsp;
            <a href="#" onClick={handleAnchorClick} style={{ color: 'rgba(255,255,255,0.8)' }} className="hover:underline transition-all">1:1 문의</a>
          </p>
        </div>
      </footer>

      {/* ── 로그인 모달 ──────────────────────────────────────────── */}
      {showLoginModal && (
        <LoginModal
          onClose={closeLogin}
          onLoginSuccess={onLoginSuccess}
        />
      )}
    </div>
  );
};

export default BustaansAdminHomeScreen;
