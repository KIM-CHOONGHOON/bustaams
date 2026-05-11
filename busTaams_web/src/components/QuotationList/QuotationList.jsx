import React, { useState, useEffect } from 'react';

const QuotationList = ({ user, reqId, onBack, onViewDetail: onPropViewDetail, isModal = false, onConfirmSuccess }) => {
  const [bids, setBids] = useState([]);
  const [reqInfo, setReqInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payDataMap, setPayDataMap] = useState({});
  const [fetchError, setFetchError] = useState(false);

  // --- 기사 상세 정보 모달 관련 상태 ---
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  const fetchQuotations = async () => {
    if (!reqId || !user) return;
    setLoading(true);
    setFetchError(false);
    try {
      // 1. 요청 정보 가져오기
      const reqRes = await fetch(`/api/auction/user/${user.custId}`);
      const reqData = await reqRes.json();
      if (Array.isArray(reqData)) {
        const found = reqData.find(r => r.REQ_ID === reqId);
        setReqInfo(found || null);
      }

      // 2. 입찰 목록 조회
      const bidsRes = await fetch(`/api/auction/bids/${reqId}`);
      const bidsData = await bidsRes.json();
      const validBids = Array.isArray(bidsData) ? bidsData : [];
      setBids(validBids);

      // 3. 결제 데이터 미리 생성
      const pMap = {};
      await Promise.all(validBids.map(async (bid) => {
        try {
          const readyRes = await fetch(`/api/payment/ready?reqId=${reqId}&driverId=${bid.DRIVER_ID}&amount=${bid.DRIVER_BIDDING_PRICE}`);
          if (readyRes.ok) {
            pMap[bid.DRIVER_ID] = await readyRes.json();
          }
        } catch (e) {
          console.warn(`Pre-fetching payData failed for ${bid.DRIVER_ID}`, e);
        }
      }));
      setPayDataMap(pMap);

    } catch (err) {
      console.error('Data fetch error:', err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [reqId, user]);

  const handleConfirm = (bid) => {
    const payData = payDataMap[bid.DRIVER_ID];
    if (!payData) {
      alert('결제 정보를 준비 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    const oldForm = document.getElementById('SendPayForm');
    if (oldForm) oldForm.remove();

    const formHtml = `
      <form id="SendPayForm" name="SendPayForm" method="POST" action="/api/payment/return" target="_self" style="display:none;">
        <input type="hidden" name="version" value="1.0">
        <input type="hidden" name="mid" value="${payData.mid}">
        <input type="hidden" name="oid" value="${payData.oid}">
        <input type="hidden" name="price" value="${payData.amount}">
        <input type="hidden" name="timestamp" value="${payData.timestamp}">
        <input type="hidden" name="signature" value="${payData.signature}">
        <input type="hidden" name="mKey" value="${payData.mKey}">
        <input type="hidden" name="currency" value="WON">
        <input type="hidden" name="gopaymethod" value="Card">
        <input type="hidden" name="acceptmethod" value="popup">
        <input type="hidden" name="goodname" value="${reqInfo?.START_ADDR?.slice(0,10) || '버스 대절'}">
        <input type="hidden" name="buyername" value="${user.userNm || '고객'}">
        <input type="hidden" name="buyertel" value="${user.hpNo || '01000000000'}">
        <input type="hidden" name="buyeremail" value="${user.userId?.includes('@') ? user.userId : 'test@test.com'}">
        <input type="hidden" name="returnUrl" value="${window.location.origin}/api/payment/return">
        <input type="hidden" name="closeUrl" value="${window.location.origin}/payment-close.html">
        <input type="hidden" name="merchantData" value="${reqId}:${bid.DRIVER_ID}">
      </form>
    `;
    document.body.insertAdjacentHTML('beforeend', formHtml);

    if (window.INIStdPay) {
      try {
        window.INIStdPay.pay('SendPayForm');
      } catch (e) {
        console.error('[SDK ERROR]', e);
        alert('결제 모듈 실행 중 오류가 발생했습니다.');
      }
    } else {
      alert('결제 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  const handleCancelByTraveler = async (bid) => {
    if (!window.confirm(`[${bid.driverName}] 기사님과의 예약을 취소하시겠습니까?\n\n※ 취소 시 해당 기사님께 알림이 발송되며, 귀하의 기사 거절 횟수가 누적됩니다.`)) {
      return;
    }

    try {
      const response = await fetch('/api/reservation/refuse-driver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reqId: reqId,
          driverId: bid.DRIVER_ID,
          travelerId: user.custId
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(data.message);
        fetchQuotations();
      } else {
        alert(data.error || "취소 처리 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("Cancel error:", error);
      alert("서버 통신 오류가 발생했습니다.");
    }
  };

  const onHandleViewDetail = async (bid) => {
    setSelectedDriver(bid);
    setIsDetailOpen(true);
    setDetailLoading(true);
    setDetailData(null);

    try {
      const response = await fetch(`/api/driver/detail/${bid.DRIVER_ID}`);
      const data = await response.json();
      setDetailData(data);
    } catch (error) {
      console.error("Detail fetch error:", error);
    } finally {
      setDetailLoading(false);
    }
  };

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

  const formatPrice = (amt) => amt != null ? `₩${Number(amt).toLocaleString()}` : '견적 대기중';

  const trimAddress = (addr) => {
    if (!addr || typeof addr !== 'string') return '';
    const parts = addr.trim().split(/\s+/);
    return parts.slice(0, 2).join(' ');
  };

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

  const DriverDetailModal = () => {
    if (!isDetailOpen) return null;
    const { driver, reviews } = detailData || {};
    const avgRating = reviews?.length > 0 
      ? (reviews.reduce((acc, curr) => acc + curr.starRating, 0) / reviews.length).toFixed(1)
      : (selectedDriver?.rating || 0).toFixed(1);

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm text-left">
        <div className="bg-white w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
          <div className="relative h-32 bg-gradient-to-r from-primary to-primary-container">
            <button onClick={() => setIsDetailOpen(false)} className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-all">
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
          
          {/* Profile Section - Simplified */}
          <div className="px-8 pb-6 -mt-12 relative flex flex-col items-center border-b border-slate-100">
            <div className="w-24 h-24 rounded-3xl bg-white p-1 shadow-xl">
              <div className="w-full h-full rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden">
                {driver?.profilePhotoId ? (
                  <img src={`/api/files/${driver.profilePhotoId}`} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-4xl text-slate-300">person</span>
                )}
              </div>
            </div>
            <h3 className="mt-4 text-2xl font-black text-on-surface">{driver?.userNm || selectedDriver?.driverName} 기사님</h3>
            <p className="text-primary font-bold text-sm mt-1 bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
              차량번호: {driver?.busNo || '정보 없음'}
            </p>
          </div>

          {/* Trip Reviews Section */}
          <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
            <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">history_edu</span>
              최근 운행 및 평가 이력
            </h4>

            {detailLoading ? (
              <div className="py-20 text-center text-slate-400 text-sm">리뷰를 불러오는 중입니다...</div>
            ) : (!reviews || reviews.length === 0) ? (
              <div className="py-20 text-center text-slate-400 text-sm">아직 작성된 운행 이력이 없습니다.</div>
            ) : (
              <div className="space-y-6">
                {reviews.map((rev, i) => (
                  <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="text-[10px] text-primary font-bold uppercase tracking-wider mb-1">운행 여정</p>
                        <h5 className="font-bold text-on-surface text-sm mb-1">{rev.tripTitle || '일반 대절'}</h5>
                      </div>
                      <div className="text-right">
                        {renderStars(rev.starRating)}
                        <span className="text-[10px] text-slate-400 block mt-1">{new Date(rev.regDt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-50">
                      <p className="text-slate-600 text-sm leading-relaxed">"{rev.commentText}"</p>
                      <p className="text-[10px] text-slate-400 mt-2">— {rev.writerName?.slice(0,1)}* * 여행자님</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading && bids.length === 0) return <div className="p-20 text-center text-slate-500 animate-pulse">데이터를 불러오는 중...</div>;

  return (
    <div className="flex bg-[#f7f9fb] font-body text-on-surface min-h-screen w-full">
      {!isModal && (
        <aside className="w-72 bg-slate-50 flex flex-col py-12 gap-2 shrink-0 border-r border-slate-200/50 sticky top-0 self-start h-screen">
          <div className="px-8 mb-8 text-left">
            <h2 className="font-headline text-xl font-extrabold text-primary tracking-tight">고객 포털</h2>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">나의 플릿 여정 관리</p>
          </div>
          <nav className="flex flex-col gap-1 px-4 text-left">
            <button onClick={() => { if(onBack) onBack(); else window.history.back(); }} className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-orange-600 transition-all font-medium text-sm w-full">
              <span className="material-symbols-outlined">arrow_back</span> 뒤로 가기
            </button>
            <a className="bg-white text-teal-700 shadow-sm rounded-r-full mr-4 flex items-center gap-3 px-4 py-3 font-bold text-sm" href="#">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>request_quote</span> 견적 리스트
            </a>
          </nav>
        </aside>
      )}

      <main className="flex-1 px-12 py-16 max-w-[1400px] mx-auto w-full">
        <header className="mb-14 text-left">
          <span className="text-secondary font-bold tracking-[0.2em] uppercase text-xs mb-3 block">플릿 관리</span>
          <h1 className="font-headline text-5xl font-extrabold tracking-tighter text-on-surface leading-tight">견적 현황 리스트</h1>
          <p className="mt-4 text-on-surface-variant text-lg leading-relaxed max-w-2xl">신청하신 차량별 실시간 견적 제안을 확인하세요.</p>
          
          {reqInfo && (
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-bold">
                {trimAddress(reqInfo?.START_ADDR)} → {trimAddress(reqInfo?.END_ADDR)}
              </span>
            </div>
          )}
        </header>

        {bids.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-2xl shadow-sm border border-slate-100">
            <span className="material-symbols-outlined text-6xl text-slate-300">request_quote</span>
            <p className="mt-4 text-xl font-bold text-slate-500">아직 접수된 견적이 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {bids.map((bid) => (
              <div key={bid.RES_ID} className="bg-white rounded-2xl p-8 relative overflow-hidden shadow-sm hover:shadow-md transition-all text-left border border-slate-100">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-3xl text-primary font-bold">person</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-xl text-on-surface">{bid.driverName} 기사님</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {renderStars(bid.rating || 4.8)}
                        <span className="font-bold text-secondary">{(bid.rating || 4.8).toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">제시 견적가</p>
                    <p className="text-3xl font-black text-primary tracking-tighter">{formatPrice(bid.DRIVER_BIDDING_PRICE)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 bg-slate-50 rounded-xl p-4 mb-8">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">차량 모델</p>
                    <p className="font-bold text-sm truncate">{bid.busModel || '-'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">등급</p>
                    <p className="font-bold text-sm">{getServiceLabel(bid.busClass)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">연식</p>
                    <p className="font-bold text-sm">{bid.manufactureYear}년형</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">상태</p>
                    <p className="font-bold text-teal-600 text-sm">프리미엄</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <button onClick={() => onHandleViewDetail(bid)} className="bg-slate-100 text-slate-600 py-3.5 rounded-xl font-bold hover:bg-slate-200 transition-all text-xs flex items-center justify-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">person_check</span>기사 상세 정보
                  </button>
                  <button onClick={() => handleConfirm(bid)} className="bg-primary text-white py-3.5 rounded-xl font-bold hover:opacity-90 transition-all text-xs flex items-center justify-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>예약 확정하기
                  </button>
                  <button onClick={() => handleCancelByTraveler(bid)} className="bg-white border border-slate-200 text-slate-400 py-3.5 rounded-xl font-bold hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all text-xs flex items-center justify-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">delete_forever</span>예약 취소
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <DriverDetailModal />
    </div>
  );
};

export default QuotationList;
