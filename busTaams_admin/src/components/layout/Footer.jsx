import React from 'react';

const Footer = () => {
  return (
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
        </div>

        {/* 저작권 표시 */}
        <div className="text-slate-400 text-left lg:text-right text-[11px] shrink-0 self-start lg:self-center">
          <p>© 2026 (주)청솔테크. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
