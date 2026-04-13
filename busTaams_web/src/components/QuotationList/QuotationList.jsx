import React, { useState, useEffect } from 'react';

const QuotationList = ({ user, reqUuid, onBack, onViewDetail }) => {
  const [bids, setBids] = useState([]);
  const [reqInfo, setReqInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('price'); // 'price' | 'rating'

  // 견적 데이터 및 요청 정보 조회
  useEffect(() => {
    if (!reqUuid || !user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. 선택된 요청 정보 가져오기 (마스터 데이터)
        const reqUrl = `http://localhost:8080/api/auction/user/${user.userUuid}`;
        console.log('[DEBUG] Fetching reqInfo from:', reqUrl);
        const reqRes = await fetch(reqUrl);
        console.log('[DEBUG] reqInfo response status:', reqRes.status);
        const reqData = await reqRes.json();
        if (Array.isArray(reqData)) {
          const found = reqData.find(r => r.REQ_UUID_STR === reqUuid);
          setReqInfo(found || null);
          console.log('[DEBUG] reqInfo found:', found ? 'Yes' : 'No');
        }

        // 2. 최신 입찰 목록 조회 (신규 API 활용)
        const bidsUrl = `http://localhost:8080/api/auction/bids/${reqUuid}`;
        console.log('[DEBUG] Fetching bids from:', bidsUrl);
        const bidsRes = await fetch(bidsUrl);
        console.log('[DEBUG] bids response status:', bidsRes.status);
        const bidsData = await bidsRes.json();
        
        console.log('[DEBUG] bidsData received:', bidsData);
        // 백엔드에서 준 raw 데이터를 bids 상태에 저장
        setBids(Array.isArray(bidsData) ? bidsData : []);
      } catch (err) {
        console.error('Data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [reqUuid, user]);

  const sortedBids = [...bids].sort((a, b) => {
    if (sortBy === 'price') return a.bidPrice - b.bidPrice;
    // 평점 로직은 di 테이블 연동 필요 (현재는 0으로 처리하거나 백엔드 수정 필요)
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
    return 0;
  });

  const getServiceLabel = (cls) => {
    const map = {
      'STANDARD_28': '우등 고속 (28인승)',
      'STANDARD_45': '일반 고속 (45인승)',
      'PREMIUM_28': '우등 고속 (28인승)',
      'GOLD_21': '프리미엄 골드 (21인승)',
      'VVIP_16': 'V-VIP (16인승)',
      'MINI_25': '중형/미니 (25인승)',
      'VAN_11': '대형 밴 (11인승)'
    };
    return map[cls] || cls || '일반';
  };

  const formatPrice = (amt) =>
    amt != null ? `₩${Number(amt).toLocaleString()}` : '견적 대기중';

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
    <div className="flex bg-[#f7f9fb] font-body text-on-surface min-h-[calc(100vh-96px)] w-full">
      {/* ── SideNavBar ── */}
      <aside className="w-72 bg-slate-50 flex flex-col py-12 gap-2 shrink-0 border-r border-slate-200/50 sticky top-0 self-start min-h-screen">
        <div className="px-8 mb-8">
          <h2 className="font-headline text-xl font-extrabold text-primary tracking-tight">고객 포털</h2>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">나의 플릿 여정 관리</p>
        </div>
        <nav className="flex flex-col gap-1 px-4 text-left">
          <button
            onClick={onBack}
            className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-orange-600 transition-all font-medium text-sm w-full"
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
          <a className="bg-white text-teal-700 shadow-sm rounded-r-full mr-4 flex items-center gap-3 px-4 py-3 font-bold text-sm" href="#">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>request_quote</span> 견적 리스트
          </a>
          <a className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-orange-600 transition-all font-medium text-sm" href="#">
            <span className="material-symbols-outlined">rate_review</span> 리뷰 관리
          </a>
          <div className="mt-6 border-t border-slate-200/50 pt-4">
            <a className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-orange-600 transition-all font-medium text-sm" href="#">
              <span className="material-symbols-outlined">settings</span> 설정
            </a>
          </div>
        </nav>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 px-12 py-16 max-w-[1400px]">
        <header className="flex justify-between items-end mb-14">
          <div className="max-w-2xl text-left">
            <span className="text-secondary font-bold tracking-[0.2em] uppercase text-xs mb-3 block">플릿 관리</span>
            <h1 className="font-headline text-5xl font-extrabold tracking-tighter text-on-surface leading-tight">
              견적 현황 리스트
            </h1>
            <p className="mt-4 text-on-surface-variant text-lg leading-relaxed">
              신청하신 차량별 실시간 견적 제안을 확인하고 관리하세요. 최적의 파트너를 선택하여 품격 있는 여정을 시작하십시오.
            </p>

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
          </div>
        </header>

        {loading ? (
          <div className="py-24 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-300 animate-pulse">hourglass_empty</span>
            <p className="mt-4 text-slate-500 font-medium">견적 정보를 불러오는 중입니다...</p>
          </div>
        ) : sortedBids.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-2xl shadow-sm">
            <span className="material-symbols-outlined text-6xl text-slate-300">request_quote</span>
            <p className="mt-4 text-xl font-bold text-slate-500">아직 접수된 견적이 없습니다.</p>
            <p className="mt-2 text-slate-400 text-sm">기사님들의 입찰을 기다려 주세요.</p>
          </div>
        ) : (
          <section className="mb-20">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-3xl">airport_shuttle</span>
              </div>
              <div className="text-left">
                <h3 className="text-2xl font-bold tracking-tight text-primary">
                  접수된 견적 제안 <span className="text-slate-400 font-normal ml-2 text-lg">총 {sortedBids.length}건</span>
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
              {sortedBids.map((bid, idx) => {
                const isLowest = idx === 0 && sortBy === 'price';
                return (
                  <div
                    key={bid.bidUuid}
                    className="bg-white rounded-2xl p-8 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 text-left"
                    style={{ boxShadow: '0 40px 60px -15px rgba(0, 104, 95, 0.06)' }}
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r-sm"
                      style={{ background: isLowest ? '#004e47' : 'rgba(157,67,0,0.3)' }}
                    />

                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-3xl text-primary font-bold">person</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-xl text-on-surface">{bid.driverName} 기사님</h4>
                          <div className="flex items-center gap-2 mt-1">
                            {renderStars(bid.rating || 4.8)}
                            <span className="font-bold text-secondary text-sm">{(bid.rating || 4.8).toFixed(1)}</span>
                            {bid.verifyStatus === 'VERIFIED' && (
                              <span className="px-2 py-0.5 bg-teal-50 text-teal-600 text-[10px] font-bold rounded-md border border-teal-100 uppercase tracking-tighter ml-2">자격인증</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">제시 견적가</p>
                        <p className="text-3xl font-black text-primary tracking-tighter">
                          {formatPrice(bid.bidPrice)}
                        </p>
                      </div>
                    </div>

                    <div className="-mx-8 mb-8 bg-[#f5f7f9] border-y border-slate-200/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                      <div className="grid grid-cols-4 divide-x divide-slate-200/50 w-full text-center">
                        <div className="flex flex-col gap-2 py-4">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">차량 모델</p>
                          <p className="font-bold text-on-surface text-sm line-clamp-1 px-2">{bid.busModel || '-'}</p>
                        </div>
                        <div className="flex flex-col gap-2 py-4">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">등급</p>
                          <p className="font-bold text-on-surface text-sm">{getServiceLabel(bid.busClass)}</p>
                        </div>
                        <div className="flex flex-col gap-2 py-4">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">연식</p>
                          <p className="font-bold text-on-surface text-sm">{bid.manufactureYear ? `${bid.manufactureYear}년형` : '-'}</p>
                        </div>
                        <div className="flex flex-col gap-2 py-4">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">보험상태</p>
                          <p className="font-bold text-teal-600 text-sm">프리미엄</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => onViewDetail(bid.bidUuid)}
                        className="flex-1 bg-gradient-to-br from-primary to-[#00685f] text-white py-4 rounded-full font-bold hover:shadow-xl hover:brightness-110 transition-all active:scale-95 text-sm"
                      >
                        상세보기
                      </button>
                      <button className="px-6 py-4 rounded-full border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all active:scale-95 text-sm">
                        채팅상담
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default QuotationList;
