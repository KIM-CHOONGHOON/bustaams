import React, { useState, useEffect } from 'react';

const QuotationList = ({ user, reqUuid, onBack, onViewDetail }) => {
  const [bids, setBids] = useState([]);
  const [reqInfo, setReqInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('price'); // 'price' | 'rating'

  // 견적 요청 정보 조회
  useEffect(() => {
    if (!reqUuid) return;

    // 선택된 예약 정보 가져오기
    fetch(`http://localhost:8080/api/auction/user/${user.userUuid}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const found = data.find(r => r.REQ_UUID_STR === reqUuid);
          setReqInfo(found || null);
        }
      })
      .catch(err => console.error('reqInfo fetch error:', err));

    // 입찰 목록 조회
    fetch(`http://localhost:8080/api/auction/bids/${reqUuid}`)
      .then(res => res.json())
      .then(data => {
        setBids(data.bids || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('bids fetch error:', err);
        setLoading(false);
      });
  }, [reqUuid, user]);

  const sortedBids = [...bids].sort((a, b) => {
    if (sortBy === 'price') return a.bidAmt - b.bidAmt;
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
    return 0;
  });

  const getServiceLabel = (cls) => {
    const map = {
      'VVIP': 'V-VIP',
      'PREMIUM': '프리미엄',
      'STANDARD': '일반',
      'GOLD': '골드',
      'NORMAL_45': '일반 45석',
    };
    return map[cls] || cls || '일반';
  };

  const formatPrice = (amt) =>
    amt != null ? `₩${Number(amt).toLocaleString()}` : '-';

  const renderStars = (rating) => {
    const r = rating || 0;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <span
            key={i}
            className="material-symbols-outlined text-sm"
            style={{ fontVariationSettings: `'FILL' ${i <= Math.round(r) ? 1 : 0}`, color: i <= Math.round(r) ? '#ff8d4b' : '#d1d5db' }}
          >
            star
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="flex bg-[#f7f9fb] font-body text-on-surface min-h-[calc(100vh-96px)]">

      {/* ── SideNavBar ── */}
      <aside className="w-72 bg-slate-50 flex flex-col py-12 gap-2 shrink-0 border-r border-slate-200/50 sticky top-0 self-start min-h-screen">
        <div className="px-8 mb-8">
          <h2 className="font-headline text-xl font-extrabold text-primary tracking-tight">고객 포털</h2>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">나의 플릿 여정 관리</p>
        </div>
        <nav className="flex flex-col gap-1 px-4">
          <button
            onClick={onBack}
            className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-orange-600 transition-all font-medium text-sm text-left"
          >
            <span className="material-symbols-outlined">arrow_back</span> 예약 내역으로 돌아가기
          </button>
          <a className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-orange-600 transition-all font-medium text-sm" href="#">
            <span className="material-symbols-outlined">chat_bubble</span> 1:1 문의하기
          </a>
          <a className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-orange-600 transition-all font-medium text-sm" href="#">
            <span className="material-symbols-outlined">history</span> 문의 내역
          </a>
          <a className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-orange-600 transition-all font-medium text-sm" href="#">
            <span className="material-symbols-outlined">person_check</span> 프로필
          </a>
          <a className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-orange-600 transition-all font-medium text-sm" href="#">
            <span className="material-symbols-outlined">event_available</span> 예약 리스트
          </a>
          <a className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-orange-600 transition-all font-medium text-sm" href="#">
            <span className="material-symbols-outlined">event_busy</span> 취소 내역
          </a>
          {/* 현재 활성 탭 */}
          <a className="bg-white text-teal-700 shadow-sm rounded-r-full mr-4 flex items-center gap-3 px-4 py-3 font-bold text-sm" href="#">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>request_quote</span> 견적 리스트
          </a>
          <a className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-orange-600 transition-all font-medium text-sm" href="#">
            <span className="material-symbols-outlined">rate_review</span> 리뷰 관리
          </a>
          <div className="mt-6 border-t border-slate-200/50 pt-4 px-0">
            <a className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-orange-600 transition-all font-medium text-sm" href="#">
              <span className="material-symbols-outlined">settings</span> 설정
            </a>
          </div>
        </nav>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 px-12 py-16 max-w-[1400px]">

        {/* Editorial Header */}
        <header className="flex justify-between items-end mb-14">
          <div className="max-w-2xl">
            <span className="text-secondary font-bold tracking-[0.2em] uppercase text-xs mb-3 block">플릿 관리</span>
            <h1 className="font-headline text-5xl font-extrabold tracking-tighter text-on-surface leading-tight">
              견적 현황 리스트
            </h1>
            <p className="mt-4 text-on-surface-variant text-lg leading-relaxed">
              신청하신 차량별 실시간 견적 제안을 확인하고 관리하세요.{' '}
              최적의 파트너를 선택하여 품격 있는 여정을 시작하십시오.
            </p>

            {/* 요청 정보 요약 */}
            {reqInfo && (
              <div className="mt-6 flex flex-wrap gap-3">
                <span className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-bold">
                  {reqInfo.START_ADDR} → {reqInfo.END_ADDR}
                </span>
                {reqInfo.START_DT && (
                  <span className="px-4 py-2 bg-surface-container-high text-on-surface-variant rounded-full text-sm font-semibold">
                    {new Date(reqInfo.START_DT).toLocaleDateString('ko-KR')} 출발
                  </span>
                )}
                <span className="px-4 py-2 bg-surface-container-high text-on-surface-variant rounded-full text-sm font-semibold">
                  {reqInfo.PASSENGER_CNT}명
                </span>
              </div>
            )}
          </div>

          {/* 정렬 + 전체취소 */}
          <div className="flex items-center gap-3 self-start mt-2">
            <div className="flex items-center gap-2 bg-white rounded-full px-2 py-1 shadow-sm border border-slate-200">
              <button
                onClick={() => setSortBy('price')}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${sortBy === 'price' ? 'bg-primary text-white' : 'text-slate-500 hover:text-primary'}`}
              >
                금액순
              </button>
              <button
                onClick={() => setSortBy('rating')}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${sortBy === 'rating' ? 'bg-primary text-white' : 'text-slate-500 hover:text-primary'}`}
              >
                평점순
              </button>
            </div>
            <button className="bg-gradient-to-r from-error to-[#93000a] text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg active:scale-95 text-sm">
              <span className="material-symbols-outlined text-sm">cancel</span> 전체 취소
            </button>
          </div>
        </header>

        {/* Loading / Empty */}
        {loading ? (
          <div className="py-24 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-300 animate-pulse">hourglass_empty</span>
            <p className="mt-4 text-slate-500 font-medium">견적 정보를 불러오는 중입니다...</p>
          </div>
        ) : bids.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-2xl shadow-sm">
            <span className="material-symbols-outlined text-6xl text-slate-300">request_quote</span>
            <p className="mt-4 text-xl font-bold text-slate-500">아직 접수된 견적이 없습니다.</p>
            <p className="mt-2 text-slate-400 text-sm">기사님들의 입찰을 기다려 주세요.</p>
          </div>
        ) : (
          <section className="mb-20">
            {/* 섹션 헤더 */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-3xl">airport_shuttle</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-primary">
                  접수된 견적{' '}
                  <span className="text-slate-400 font-normal ml-2 text-lg">
                    총 {bids.length}건
                  </span>
                </h3>
                {reqInfo && (
                  <p className="text-sm text-slate-500 mt-1">
                    {reqInfo.START_ADDR} → {reqInfo.END_ADDR}
                  </p>
                )}
              </div>
            </div>

            {/* 견적 카드 그리드 */}
            <div className="grid grid-cols-1 gap-8">
              {sortedBids.map((bid, idx) => {
                const isLowest = idx === 0 && sortBy === 'price';
                return (
                  <div
                    key={bid.bidUuid}
                    className="bg-white rounded-2xl p-8 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300"
                    style={{ boxShadow: '0 40px 60px -15px rgba(0, 104, 95, 0.06)' }}
                  >
                    {/* 왼쪽 컬러 강조선 */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r-sm"
                      style={{ background: isLowest ? '#004e47' : 'rgba(157,67,0,0.3)' }}
                    />



                    {/* 기사 정보 + 견적가 */}
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        {/* 프로필 이미지 */}
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                          {bid.profilePhotoUrl ? (
                            <img src={bid.profilePhotoUrl} alt={bid.driverNm} className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-3xl text-primary">person</span>
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-xl text-on-surface">{bid.driverNm} 기사님</h4>
                          <div className="flex items-center gap-2 mt-1">
                            {renderStars(bid.rating)}
                            <span className="font-bold text-secondary text-sm">{bid.rating?.toFixed(1) || '-'}</span>
                            <span className="text-slate-400 text-sm">(리뷰 {bid.reviewCnt || 0}개)</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">추천 견적가</p>
                        <p className="text-3xl font-black text-primary tracking-tighter">
                          {formatPrice(bid.bidAmt)}
                        </p>
                      </div>
                    </div>

                    {/* 서비스 메시지 */}
                    {bid.bidMsg && (
                      <div className="mb-5 px-4 py-3 bg-slate-50 rounded-xl border-l-2 border-primary/30">
                        <p className="text-sm text-slate-600 leading-relaxed italic">"{bid.bidMsg}"</p>
                      </div>
                    )}

                    {/* 차량 상세 정보 - 풀 와이드 에디션 (Full-Bleed) */}
                    <div className="-mx-8 mb-8 bg-[#f5f7f9] border-y border-slate-200/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                      <div className="grid grid-cols-6 divide-x divide-slate-200/50 w-full text-center">
                        {/* Columns */}
                        <div className="flex flex-col gap-2 py-6 hover:bg-white/60 transition-colors cursor-default">
                          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">출시 연도</p>
                          <p className="font-bold text-on-surface text-base">
                            {bid.manufactureYear 
                              ? (bid.manufactureYear.toString().includes('년형') ? bid.manufactureYear : `${bid.manufactureYear}년형`) 
                              : '-'}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 py-6 hover:bg-white/60 transition-colors cursor-default">
                          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">좌석수</p>
                          <p className="font-bold text-on-surface text-base">
                            {bid.totalSeats ? `${bid.totalSeats}석` : '-'}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 py-6 hover:bg-white/60 transition-colors cursor-default">
                          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">와이파이</p>
                          <p className={`font-bold text-base ${bid.hasWifi === 'Y' ? 'text-teal-600' : 'text-slate-400'}`}>
                            {bid.hasWifi === 'Y' ? '보유' : '미보유'}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 py-6 hover:bg-white/60 transition-colors cursor-default">
                          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">냉장고</p>
                          <p className={`font-bold text-base ${bid.hasRefrigerator === 'Y' ? 'text-teal-600' : 'text-slate-400'}`}>
                            {bid.hasRefrigerator === 'Y' ? '보유' : '미보유'}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 py-6 hover:bg-white/60 transition-colors cursor-default">
                          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">USB 포트</p>
                          <p className={`font-bold text-base ${bid.hasUsbPort === 'Y' ? 'text-teal-600' : 'text-slate-400'}`}>
                            {bid.hasUsbPort === 'Y' ? '보유' : '미보유'}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 py-6 hover:bg-white/60 transition-colors cursor-default">
                          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">TV/모니터</p>
                          <p className={`font-bold text-base ${bid.hasMonitor === 'Y' ? 'text-teal-600' : 'text-slate-400'}`}>
                            {bid.hasMonitor === 'Y' ? '보유' : '미보유'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 모델명 */}
                    {bid.modelNm && (
                      <div className="flex items-center gap-2 mb-6">
                        <span className="material-symbols-outlined text-slate-400 text-base">directions_bus</span>
                        <span className="text-sm text-slate-500 font-medium">{bid.modelNm}</span>
                        {bid.serviceClass && (
                          <span className="ml-auto px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full">
                            {getServiceLabel(bid.serviceClass)}
                          </span>
                        )}
                      </div>
                    )}

                    {/* 액션 버튼 */}
                    <div className="flex gap-3">
                      <button 
                        onClick={() => onViewDetail(bid.bidUuid)}
                        className="flex-1 bg-gradient-to-br from-primary to-[#00685f] text-white py-4 rounded-full font-bold hover:shadow-xl hover:brightness-110 transition-all active:scale-95 text-sm"
                      >
                        상세보기
                      </button>
                      <button className="px-6 py-4 rounded-full border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all active:scale-95 text-sm">
                        취소
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Bottom Banner */}
        {!loading && bids.length > 0 && (
          <div className="rounded-3xl overflow-hidden relative h-[320px] flex items-center px-16"
            style={{ background: 'linear-gradient(135deg, #004e47 0%, #00685f 100%)' }}>
            <div className="relative z-10 text-white">
              <h2 className="text-3xl font-black mb-3">The Premium Fleet Experience</h2>
              <p className="text-teal-200 leading-relaxed mb-6 max-w-lg">
                검증된 기사님들과 함께하는 안전하고 품격 있는 이동. 실시간 견적을 비교하고 최상의 선택을 내리세요.
              </p>
              <div className="flex gap-8">
                <div className="flex flex-col">
                  <span className="text-2xl font-black">2,400+</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">검증된 파트너</span>
                </div>
                <div className="w-px bg-white/20" />
                <div className="flex flex-col">
                  <span className="text-2xl font-black">98.2%</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">매칭 성공률</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default QuotationList;
