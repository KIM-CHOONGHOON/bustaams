import React, { useState } from 'react';
import TermsSelectModal from '../TermsSelectModal';

const Footer = () => {
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  return (
    <>
      <footer className="bg-white border-t border-slate-200 py-6 px-8 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="space-y-2">
            {/* 상호, 대표자, 연락처, 등록번호 */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-slate-700 font-semibold">
              <span className="text-sm font-bold text-slate-800">(주)청솔테크</span>
              <span className="w-px h-3 bg-slate-300 hidden sm:inline"></span>
              <span>대표자: 원동일</span>
              <span className="w-px h-3 bg-slate-300"></span>
              <span>대표번호: 010-8306-2459</span>
              <span className="w-px h-3 bg-slate-300 hidden sm:inline"></span>
              <span>사업자등록번호: 212-81-45502</span>
              <span className="w-px h-3 bg-slate-300 hidden md:inline"></span>
              <span>법인등록번호: 110111-1871486</span>
            </div>

            {/* 주소 및 이메일 */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-slate-500">
              <span>주소: 서울특별시 송파구 충민로 66, L-7145호 (문정동, 가든파이브라이프)</span>
              <span className="w-px h-3 bg-slate-300"></span>
              <span>이메일: tong45502@hometax.go.kr</span>
            </div>

            {/* 업태 및 종목 */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-slate-400 text-[11px]">
              <span>업태: 제조, 서비스</span>
              <span className="w-px h-2.5 bg-slate-200"></span>
              <span>종목: 전자부품, 태양보일러(농업용), 자동차부품, 부가통신</span>
            </div>

            {/* 플랫폼 매칭 및 이행 책임 안내 (추가됨) */}
            <div className="mt-3 text-slate-400 text-[11px] leading-relaxed max-w-4xl border-t border-slate-100 pt-3">
              <p>&lt; 청솔테크(주)의 버스탐스 &gt;는 여행자와 버스 기사님을 연결하는 운송 매칭 플랫폼입니다.</p>
              <p className="mt-1">플랫폼에서 판매되는 모든 상품은 &lt; 청솔테크(주) &gt;에서 책임지고 관리하나, 실제 버스 운행 서비스 및 결제, 현장 서비스의 이행 책임은 거래 당사자(여행자 및 버스 기사)에게 있습니다.</p>
              <p className="mt-1 font-semibold text-slate-500">불편사항 및 민원 접수 : 담당자 원동일 (02-429-5459)</p>
            </div>
          </div>

          {/* 저작권 표시 및 약관 조회 링크 */}
          <div className="text-slate-400 text-left lg:text-right text-[11px] shrink-0 self-start lg:self-center flex flex-col lg:items-end gap-1">
            <div className="flex gap-2 items-center">
              <button 
                onClick={() => setIsTermsOpen(true)}
                className="text-slate-500 hover:text-emerald-600 font-semibold transition-colors hover:underline"
              >
                약관 조회
              </button>
              <span className="text-slate-300">|</span>
              <span className="text-slate-400">© 2026 (주)청솔테크. All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>

      <TermsSelectModal 
        isOpen={isTermsOpen} 
        onClose={() => setIsTermsOpen(false)} 
      />
    </>
  );
};

export default Footer;
