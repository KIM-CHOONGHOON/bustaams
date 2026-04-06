import React, { useEffect } from 'react';

const DetailBusRequestModal = ({ reqData, onClose }) => {
  // 모달이 열려있을 때 뒤 배경 스크롤 방지
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  if (!reqData) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch (e) {
      return dateStr;
    }
  };

  const startAddr = reqData.START_ADDR || '서울 서초구';
  const endAddr = reqData.END_ADDR || '부산 해운대구';
  const tripTitle = reqData.TRIP_TITLE || '대형 전세버스 패키지';
  const startDt = formatDate(reqData.START_DT) || '2024년 10월 24일 09:00';
  const endDt = formatDate(reqData.END_DT) || '2024년 10월 27일 18:00';
  const passengerCnt = reqData.PASSENGER_CNT || 0;
  
  // 비용 정보 하드코딩 또는 reqData 매핑
  const reqAmt = Number(reqData.REQ_AMT) || 875000;
  const baseFare = Math.floor(reqAmt * 0.85);
  const surge = Math.floor(reqAmt * 0.1);
  const extra = reqAmt - baseFare - surge;

  // 버스 타입 처리
  const isPremium = reqData.BUS_TYPE_CD === '우등 고속' || (reqData.vehicles && reqData.vehicles.some(v => v.BUS_TYPE_CD.includes('우등')));

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto duration-300 transition-opacity"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-3xl my-8 relative shadow-2xl flex flex-col transform transition-all scale-100 opacity-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header / Close Button */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-8 py-6 border-b border-surface-variant/20 flex justify-between items-center rounded-t-3xl">
          <div>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">예약 상세 정보</p>
            <h2 className="text-2xl font-extrabold font-headline text-on-surface tracking-tight">{tripTitle}</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center text-on-surface transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-8 space-y-12">
          
          {/* 01: Journey Identity */}
          <section>
            <span className="text-secondary font-bold uppercase tracking-widest text-[10px] mb-3 block">여정 정보</span>
            <div className="bg-surface-container-low p-6 rounded-2xl flex items-center gap-5 border border-surface-variant/20">
               <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-2xl">luggage</span>
               </div>
               <div>
                  <label className="block text-[10px] font-bold text-outline mb-1 uppercase tracking-widest">여정 제목</label>
                  <p className="text-xl font-bold text-on-surface">{tripTitle}</p>
               </div>
            </div>
          </section>

          {/* 02: Route Configuration */}
          <section>
            <span className="text-secondary font-bold uppercase tracking-widest text-[10px] mb-3 block">경로 설정</span>
            <div className="space-y-4">
              <div className="flex items-center gap-5 group">
                <div className="flex-none w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white shadow-lg shadow-primary/20">
                  <span className="material-symbols-outlined">location_on</span>
                </div>
                <div className="flex-grow bg-surface-container-lowest border border-surface-variant/30 p-5 rounded-2xl shadow-sm">
                  <label className="block text-[10px] font-bold text-outline uppercase mb-1 tracking-widest">출발지</label>
                  <p className="text-base font-bold text-on-surface">{startAddr}</p>
                </div>
              </div>

              <div className="flex items-center gap-5 group">
                <div className="flex-none w-12 h-12 rounded-full bg-gradient-to-br from-[#9d4300] to-[#ff8d4b] flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                  <span className="material-symbols-outlined">flag</span>
                </div>
                <div className="flex-grow bg-surface-container-lowest border border-surface-variant/30 p-5 rounded-2xl shadow-sm">
                  <label className="block text-[10px] font-bold text-outline uppercase mb-1 tracking-widest">도착지</label>
                  <p className="text-base font-bold text-on-surface">{endAddr}</p>
                </div>
              </div>
            </div>
          </section>

          {/* 03: Schedule & Expense */}
          <section>
            <span className="text-secondary font-bold uppercase tracking-widest text-[10px] mb-3 block">일정 및 예상 경비</span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-surface-container-low p-6 rounded-2xl border border-surface-variant/20">
                <label className="block text-[10px] font-bold text-outline mb-2 uppercase tracking-widest">출발 일시</label>
                <p className="text-base font-extrabold text-on-surface">{startDt}</p>
              </div>
              <div className="bg-surface-container-low p-6 rounded-2xl border border-surface-variant/20 border-l-4 border-l-[#9d4300]">
                <label className="block text-[10px] font-bold text-outline mb-2 uppercase tracking-widest">도착 일시</label>
                <p className="text-base font-extrabold text-on-surface">{endDt}</p>
              </div>
            </div>

            {/* Moved Expense Panel */}
            <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,104,95,0.08)] border border-surface-variant/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary to-primary-container opacity-5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
                <h3 className="text-lg font-extrabold font-headline mb-6 text-on-surface tracking-tight">예상 견적 상세</h3>
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-outline font-medium">기본 대여료</span>
                        <span className="font-bold">{baseFare.toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-outline font-medium">거리 할증</span>
                        <span className="font-bold">{surge.toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-outline font-medium">부대비용 (톨비 등)</span>
                        <span className="font-bold">{extra.toLocaleString()}원</span>
                    </div>
                    <div className="pt-6 mt-2 border-t border-surface-variant/40">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[10px] font-bold text-outline uppercase tracking-widest mb-1">총 견적 금액</p>
                                <p className="text-3xl font-extrabold font-headline text-primary tracking-tighter">{reqAmt.toLocaleString()}원</p>
                            </div>
                            <span className="text-[10px] text-outline bg-surface-variant/30 px-2 py-1 rounded">부가세 포함</span>
                        </div>
                    </div>
                </div>
            </div>
          </section>

          {/* 04: Bus Information */}
          <section>
             <span className="text-secondary font-bold uppercase tracking-widest text-[10px] mb-3 block">예약 인원 및 차량</span>
             <div className="bg-surface-container-lowest border border-surface-variant/20 p-2 rounded-3xl flex flex-col sm:flex-row gap-6 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
                 <div className="sm:w-2/5 h-40 relative overflow-hidden rounded-2xl">
                    <img 
                        alt="Bus Type" 
                        className="w-full h-full object-cover" 
                        src={isPremium 
                            ? "https://lh3.googleusercontent.com/aida-public/AB6AXuAGncAn9mwP0CppdRcVNcRyyp7BM0Fwr-7IAo-UukujgT7dSh2z_8Ba0-8jHE15cYFNL1CW_lTPzVeSOiKP9OvIwyPH7sUwITsY_pZIwfEo8Us4ucyhl70uOHt6njBNLkODWl9T37DIWWsUWRerSxgzmhYBw7L-a45ye0ewYfPS9sY9Dj9O2wx2Q62XKSoHR7t0ol0eOTUQGqVGpnA0hqylsq4zJc6AmqSUSV_9IzmJGprI0TaVm5kP2ih028fYvHDVfAjM1oqvTLE" 
                            : "https://lh3.googleusercontent.com/aida-public/AB6AXuAfK78k5ZUsYSniO-ql0ZmiRyc1AoDCtW69CIjw1G3fTvwXaM1WWnx61DQshz68pgzkuOrTbpW-B4_scGSd1XIdySNfhJkSxYFdvur9B5KpmX3CYtQox2eqsSZz0jRCDYbDnLr6cuy_GAOlx3wl7CJW_h2BtJGU-zroRQYQy35IvU5-eweGfcCFLRdaOkScLoUdn4B3rdiS4Mb-7xWuAHQKFhKLuIBuk654T5MMPKbt2cIwMoS1KcLILRtEGlFw4wBHN2o_oisl0go"
                        }
                    />
                    <div className={`absolute top-3 left-3 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase shadow-lg ${isPremium ? 'bg-primary' : 'bg-slate-600'}`}>
                        {isPremium ? 'Premium' : 'Standard'}
                    </div>
                 </div>
                 <div className="p-4 sm:p-6 sm:pl-0 flex-1 flex flex-col justify-center">
                    <h3 className="text-xl font-bold font-headline mb-2">{reqData.BUS_TYPE_CD || (isPremium ? '우등 고속 (28인승)' : '일반 고속 (45인승)')}</h3>
                    <p className="text-xs text-outline mb-6 leading-relaxed">{isPremium ? '넓은 좌석, 개인 모니터, USB 포트 등 최고급 편의시설 제공' : '경제적인 단체 이동, 쾌적하고 안전한 운행 환경'}</p>
                    
                    <div className="flex gap-8 items-center bg-surface-container-low p-4 rounded-xl">
                        <div>
                            <p className="text-[10px] text-outline uppercase tracking-widest font-bold mb-1">탑승 인원</p>
                            <p className="text-base font-extrabold text-on-surface">{passengerCnt}명</p>
                        </div>
                        <div className="w-[1px] h-8 bg-surface-variant/50"></div>
                        <div>
                            <p className="text-[10px] text-outline uppercase tracking-widest font-bold mb-1">배차 대수</p>
                            <p className="text-base font-extrabold text-on-surface">{reqData.REQ_BUS_CNT || 1}대</p>
                        </div>
                    </div>
                 </div>
             </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default DetailBusRequestModal;
