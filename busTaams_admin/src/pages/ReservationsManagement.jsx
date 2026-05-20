import React, { useState, useEffect } from 'react';
import { Bus, User, Calendar, DollarSign, Activity, CheckCircle, RefreshCw } from 'lucide-react';

const ReservationsManagement = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/reservations');
      if (response.ok) {
        const data = await response.json();
        setReservations(data);
      }
    } catch (error) {
      console.error('Failed to fetch reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  // 상태 배지 컴포넌트
  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRM':
        return (
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-xs font-black flex items-center gap-1 w-fit">
            <CheckCircle size={12} /> CONFIRM (확정)
          </span>
        );
      case 'BIDDING':
        return (
          <span className="px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-xs font-black flex items-center gap-1 w-fit">
            <Activity size={12} /> BIDDING (입찰중)
          </span>
        );
      case 'AUCTION':
        return (
          <span className="px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg text-xs font-black flex items-center gap-1 w-fit">
            AUCTION (경매대기)
          </span>
        );
      case 'DONE':
        return (
          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg text-xs font-black flex items-center gap-1 w-fit">
            DONE (완료)
          </span>
        );
      case 'TRAVELER_CANCEL':
      case 'DRIVER_CANCEL':
      case 'BUS_CANCEL':
        return (
          <span className="px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg text-xs font-black flex items-center gap-1 w-fit">
            CANCEL (취소)
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold w-fit">
            {status || '미지정'}
          </span>
        );
    }
  };

  // 금액 포맷 (1,000원 단위)
  const formatAmt = (amt) => {
    return Number(amt || 0).toLocaleString('ko-KR') + '원';
  };

  // 주소를 '시도 시군구'만 표시하도록 포맷팅하는 헬퍼 함수
  const getShortAddr = (addr) => {
    if (!addr) return '-';
    const parts = addr.split(' ');
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[1]}`;
    }
    return addr;
  };

  // 결제처리 버튼 핸들러
  const handlePaymentProcess = async (item) => {
    const startText = getShortAddr(item.startAddr);
    const endText = getShortAddr(item.endAddr);
    if (!window.confirm(`여행 [${item.tripTitle || '제목 없음'}] (${startText} ➡️ ${endText})에 대한 결제 및 예약 확정 처리를 진행하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/reservations/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reqId: item.reqId }),
      });

      const data = await response.json();
      if (response.ok) {
        alert(data.message || '결제 처리가 완료되었습니다.');
        fetchReservations(); // 목록 갱신
      } else {
        alert(data.error || '결제 처리 중 에러가 발생했습니다.');
      }
    } catch (error) {
      console.error('Payment process error:', error);
      alert(`통신 오류가 발생했습니다: ${error.message}`);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800">예약 및 입찰 관리</h1>
          <p className="text-slate-500 font-medium mt-1">고객의 결제처리 여행 목록을 모니터링하고 관리합니다.</p>
        </div>
        <button
          onClick={fetchReservations}
          disabled={loading}
          className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 text-sm"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          새로고침
        </button>
      </div>

      {/* Travel List Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <Bus className="text-emerald-500" size={22} />
          <h2 className="text-lg font-bold text-slate-800">결제처리 여행 목록</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-4">예약 고객</th>
                <th className="py-4 px-4">여행 제목</th>
                <th className="py-4 px-4">출발지 / 목적지</th>
                <th className="py-4 px-4">여행 일정</th>
                <th className="py-4 px-4">요청 금액</th>
                <th className="py-4 px-4">진행 상태</th>
                <th className="py-4 px-4 text-center">결제 처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 font-medium">
                    <span className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin inline-block"></span>
                    <p className="mt-2 text-xs">여행 목록을 불러오는 중입니다...</p>
                  </td>
                </tr>
              ) : reservations.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 font-medium">
                    결제가 완료된 여행 요청 내역이 존재하지 않습니다.
                  </td>
                </tr>
              ) : (
                reservations.map((item) => (
                  <tr 
                    key={item.reqId} 
                    data-req-id={item.reqId}
                    data-traveler-id={item.travelerId}
                    className="hover:bg-slate-50/50 transition-colors text-sm font-medium text-slate-700"
                  >
                    {/* 예약 고객 (이름만 표시, ID는 TR 엘리먼트 데이터셋에 hidden 상태로 보유) */}
                    <td className="py-5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <User size={14} />
                        </div>
                        <span className="text-slate-800 font-bold">{item.travelerName || '미확인 고객'}</span>
                      </div>
                    </td>
                    {/* 여행 제목 */}
                    <td className="py-5 px-4 text-slate-800 font-bold">{item.tripTitle || '-'}</td>
                    {/* 출발지 / 목적지 (시도/시군구 만 표시하도록 포맷팅) */}
                    <td className="py-5 px-4">
                      <div className="flex flex-col gap-1 max-w-[200px]">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span className="text-slate-600 font-bold truncate">{getShortAddr(item.startAddr)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                          <span className="text-slate-600 font-bold truncate">{getShortAddr(item.endAddr)}</span>
                        </div>
                      </div>
                    </td>
                    {/* 여행 일정 */}
                    <td className="py-5 px-4">
                      <div className="flex flex-col text-xs text-slate-500 gap-0.5">
                        <span className="font-bold text-slate-700">{item.startDt} 출발</span>
                        <span>{item.endDt} 도착</span>
                      </div>
                    </td>
                    {/* 요청 금액 */}
                    <td className="py-5 px-4 text-slate-900 font-black text-base">{formatAmt(item.reqAmt)}</td>
                    {/* 진행 상태 */}
                    <td className="py-5 px-4">
                      {getStatusBadge(item.dataStat)}
                    </td>
                    {/* 결제 처리 버튼 */}
                    <td className="py-5 px-4 text-center">
                      <button
                        onClick={() => handlePaymentProcess(item)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
                      >
                        결제처리
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReservationsManagement;
