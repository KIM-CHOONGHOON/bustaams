/**
 * @screen   bustaamsAdminScreen
 * @desc     버스탐스 어드민 홈페이지 (공개용 랜딩)
 *
 * ※ 이 컴포넌트의 화면 ID(bustaamsAdminScreen)는 frontend/backend/REST API
 *    어디서도 중복·공유하지 않도록 이 파일에서만 단독으로 관리합니다.
 */
import React, { useState } from 'react';
import LoginModal from '../components/LoginModal';
import busLogo from '../assets/BUSTAAMS_IMAGE_LOGO.png';
import mainLogo from '../assets/bustaams_main_logo.png';
import textLogo from '../assets/bustaams_text_logo.png';
import googlePlayLogo from '../assets/Google_Play_logo.png';
import appInstallLogo from '../assets/버스탐스_앱_설치.png';
import bgImage from '../assets/bustaams_bg.png';

/* ─────────────────────────────────────────────────────────── */
const BustaamsAdminScreen = ({ onLoginSuccess }) => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);

  const openLogin  = () => setShowLoginModal(true);
  const closeLogin = () => setShowLoginModal(false);

  return (
    <div
      id="bustaamsAdminScreen"
      className="flex flex-col min-h-screen"
      style={{
        backgroundColor: '#f8f9fa',
        color: '#191c1d',
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* 반투명 오버레이 — 배경 이미지를 살짝 밝게만 처리 */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.38)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* ── Top Navigation Bar ─────────────────────────────── */}
      <header
        className="w-full top-0 sticky z-50 overflow-hidden"
        style={{ backgroundColor: 'transparent', position: 'relative', zIndex: 10 }}
      >
        {/* 이동하는 버스 아이콘 */}
        <img
          src={busLogo}
          alt=""
          aria-hidden="true"
          className="bus-animate"
          style={{ height: '44px', width: 'auto' }}
        />

        <div
          className="relative z-10 flex justify-between items-center h-16 w-full"
          style={{ paddingLeft: '8px', paddingRight: '24px' }}
        >
          {/* 왼쪽 맨 끝: 버스탐스 텍스트 로고 */}
          <img
            src={textLogo}
            alt="버스탐스"
            style={{ height: '36px', width: 'auto', objectFit: 'contain', mixBlendMode: 'multiply' }}
          />

          {/* 오른쪽 맨 끝: 로그인 버튼 */}
          <button
            onClick={openLogin}
            className="px-6 py-2 rounded font-medium transition-all cursor-pointer active:opacity-80 hover:opacity-90"
            style={{
              backgroundColor: '#003366',
              color: '#ffffff',
              fontSize: '18px',
              lineHeight: '24px',
            }}
          >
            로그인
          </button>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────── */}
      <main
        className="flex-grow w-full flex items-center overflow-hidden"
        style={{ padding: '0 64px', position: 'relative', zIndex: 1 }}
      >
        {/* 왼쪽: 텍스트 + 앱 설치 버튼 — 중앙에서 3줄(~5rem) 위로, 오른쪽으로 3cm */}
        <div
          className="flex-1 flex flex-col gap-6 pr-8"
          style={{ marginBottom: '8rem', paddingLeft: '3cm' }}
        >
          <h1
            style={{
              fontSize: '48px',
              fontWeight: 400,
              lineHeight: '1.25',
              background: 'linear-gradient(90deg, #001a4a 0%, #2979ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            내 여행의 가치,<br />
            가격까지 내가 결정하니까.
          </h1>
          <p
            style={{
              fontSize: '22px',
              fontWeight: 600,
              lineHeight: '1.6',
              color: '#43474f',
            }}
          >
            출발지부터 경유지, 그리고 버스 대절 비용까지 맘편히 제안하세요.<br />
            베테랑 기사님이 당신의 제안에 확답을 드립니다.
          </p>

          {/* 앱 설치 이미지 버튼 */}
          <div className="flex items-center" style={{ gap: '2cm', marginTop: '8px' }}>
            <a href="#" aria-label="구글 플레이에서 다운로드">
              <img
                src={googlePlayLogo}
                alt="Google Play"
                style={{ height: '56px', width: 'auto', objectFit: 'contain' }}
              />
            </a>
            <a href="#" aria-label="버스탐스 앱 설치">
              <img
                src={appInstallLogo}
                alt="버스탐스 앱 설치"
                style={{ height: '56px', width: 'auto', objectFit: 'contain' }}
              />
            </a>
          </div>
        </div>

        {/* 오른쪽: 로고 이미지 — 왼쪽으로 3cm */}
        <img
          src={mainLogo}
          alt="버스탐스"
          style={{
            maxHeight: '35vh',
            width: 'auto',
            display: 'block',
            flexShrink: 0,
            mixBlendMode: 'multiply',
            marginRight: '3cm',
          }}
        />
      </main>

      {/* ── Corporate Footer — 화면 하단 fixed, hover 시 슬라이드업 ── */}
      <footer
        className="w-full fixed bottom-0 left-0 z-40"
        onMouseEnter={() => setFooterVisible(true)}
        onMouseLeave={() => setFooterVisible(false)}
      >
        {/* 항상 보이는 트리거 바 (진한 녹색 얇은 띠) */}
        <div
          style={{
            height: '6px',
            backgroundColor: '#0d5c2e',
            cursor: 'pointer',
          }}
        />

        {/* 호버 시 슬라이드업 되는 본문 */}
        <div
          style={{
            backgroundColor: '#0d5c2e',
            borderTop: '1px solid #0a4a24',
            overflow: 'hidden',
            maxHeight: footerVisible ? '160px' : '0',
            opacity:   footerVisible ? 1 : 0,
            transition: 'max-height 0.35s ease, opacity 0.3s ease',
          }}
        >
          <div
            className="grid grid-cols-2 items-start mx-auto"
            style={{ maxWidth: '1280px', padding: '12px 64px' }}
          >
            {/* 왼쪽: 회사 정보 */}
            <div className="flex flex-col gap-1" style={{ color: '#c8e6d0', fontSize: '13px', lineHeight: '22px' }}>
              <p className="font-bold" style={{ color: '#ffffff', fontSize: '14px' }}>
                (주) 청솔테크
              </p>
              <p>대표자: 원동일 | 사업자등록번호: 212-81-45502 | 통신판매 송파 1234-1234호</p>
              <p>주소: 서울특별시 송파구 충민로 66, L-7145호(문정동, 가든파이브라이프)</p>
              <p style={{ marginTop: '6px', color: '#a3d9b1', fontSize: '12px', lineHeight: '1.6' }}>
                &lt; 청솔테크(주)의 버스탐스 &gt;는 여행자와 버스 기사님을 연결하는 운송 매칭 플랫폼입니다.<br />
                플랫폼에서 판매되는 모든 상품은 &lt; 청솔테크(주) &gt;에서 책임지고 관리하나, 실제 버스 운행 서비스 및 결제, 현장 서비스의 이행 책임은 거래 당사자(여행자 및 버스 기사)에게 있습니다.<br />
                불편사항 및 민원 접수 : 담당자 원동일 (02-429-5459)
              </p>
            </div>

            {/* 오른쪽: 링크 + 저작권 */}
            <div className="flex flex-col items-end gap-1" style={{ color: '#c8e6d0', fontSize: '13px', lineHeight: '22px' }}>
              <div className="flex gap-4">
                <a href="#" className="hover:text-white transition-colors">약관 조회</a>
                <span>|</span>
                <a href="#" className="hover:text-white transition-colors">1:1 문의</a>
              </div>
              <p>© 2024 (주) 청솔테크. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>

      {/* ── 로그인 모달 (bustaamsAdminScreen 전용) ─────────── */}
      {showLoginModal && (
        <LoginModal
          onClose={closeLogin}
          onLoginSuccess={() => {
            closeLogin();
            onLoginSuccess?.();
          }}
        />
      )}
    </div>
  );
};

export default BustaamsAdminScreen;
