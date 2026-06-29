import React from 'react';

const TermsSelectModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const docs = [
    {
      name: '버스탐스 통합 이용 약관',
      path: '/documents/버스탐스_통합_이용_약관.pdf',
      type: 'PDF (열람/다운로드)'
    },
    {
      name: '버스기사 파트너 입점 계약서',
      path: '/documents/버스기사_파트너_입점_계약서.docx',
      type: 'Word (자동 다운로드)'
    },
    {
      name: '버스탐스(BUSTAAMS) 위치정보 이용약관',
      path: '/documents/버스탐스(BUSTAAMS) 위치정보 이용약관.docx',
      type: 'Word (자동 다운로드)'
    },
    {
      name: '버스탐스(BUSTAAMS) 마케팅 정보 수신 동의서',
      path: '/documents/버스탐스(BUSTAAMS) 마케팅 정보 수신 동의서.docx',
      type: 'Word (자동 다운로드)'
    }
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden transform transition-all border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600">description</span>
            약관 및 계약서 조회
          </h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100 flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          <p className="text-xs text-slate-500 mb-2">원하시는 약관 및 계약서 명을 클릭하면 새 창에서 열리거나 다운로드됩니다.</p>
          
          <div className="space-y-2">
            {docs.map((doc, idx) => (
              <a
                key={idx}
                href={doc.path}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all group"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-emerald-800 transition-colors">
                    {doc.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {doc.type}
                  </span>
                </div>
                <span className="material-symbols-outlined text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all text-lg">
                  open_in_new
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm active:scale-95"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsSelectModal;
