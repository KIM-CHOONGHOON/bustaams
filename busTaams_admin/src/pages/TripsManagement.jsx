import React, { useState, useEffect } from 'react';
import { Compass, User, Search, RefreshCw, SlidersHorizontal, Clock, DollarSign } from 'lucide-react';

const TripsManagement = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState('all'); // 검색 조건
  const [searchKeyword, setSearchKeyword] = useState(''); // 검색어

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        searchType,
        searchKeyword: searchKeyword.trim(),
      });
      const response = await fetch(`/api/admin/trips?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTrips(data);
      }
    } catch (error) {
      console.error('Failed to fetch trips:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTrips();
  };

  const handleReset = () => {
    setSearchType('all');
    setSearchKeyword('');
    setTimeout(() => {
      fetchTrips();
    }, 0);
  };

  // 결제 상태 배지 컴포넌트
  const getPaymentBadge = (status) => {
    switch (status) {
      case '2':
        return (
          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-md text-[11px] font-black">
            결제완료
          </span>
        );
      case '1':
        return (
          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-md text-[11px] font-black animate-pulse">
            결제요청
          </span>
        );
      case '0':
      default:
        return (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-md text-[11px] font-bold">
            결제대기
          </span>
        );
    }
  };

  // 진행 상태 배지 컴포넌트
  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRM':
        return (
          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-md text-[11px] font-black">
            CONFIRM (확정)
          </span>
        );
      case 'BIDDING':
        return (
          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-md text-[11px] font-black">
            BIDDING (입찰중)
          </span>
        );
      case 'AUCTION':
        return (
          <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-md text-[11px] font-black">
            AUCTION (대기)
          </span>
        );
      case 'DONE':
        return (
          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-md text-[11px] font-black">
            DONE (완료)
          </span>
        );
      case 'TRAVELER_CANCEL':
      case 'DRIVER_CANCEL':
      case 'BUS_CANCEL':
        return (
          <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-md text-[11px] font-black">
            CANCEL (취소)
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[11px] font-bold">
            {status || '미지정'}
          </span>
        );
    }
  };

  const formatAmt = (amt) => {
    return Number(amt || 0).toLocaleString('ko-KR') + '원';
  };

  const getShortAddr = (addr) => {
    if (!addr) return '-';
    const parts = addr.split(' ');
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[1]}`;
    }
    return addr;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800">여행 목록</h1>
        <p className="text-slate-500 font-medium mt-1">플랫폼에 등록된 모든 여행 요청 건의 예약 정보 및 결제/진행 현황을 모니터링합니다.</p>
      </div>

      {/* Search Bar Panel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex items-center gap-2 text-slate-600 shrink-0">
            <SlidersHorizontal size={18} className="text-slate-400" />
            <span className="text-sm font-bold">검색 조건</span>
          </div>

          <div className="w-full md:w-48">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
            >
              <option value="all">전체 통합 검색</option>
              <option value="tripTitle">여행 제목</option>
              <option value="travelerName">예약자명</option>
            </select>
          </div>

          <div className="flex-1 w-full relative">
            <input
              type="text"
              placeholder="검색어를 입력하고 Enter를 누르거나 검색 버튼을 클릭하세요."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
            />
            <Search className="absolute right-3.5 top-3 text-slate-400" size={16} />
          </div>

          <div className="flex w-full md:w-auto gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 md:flex-initial bg-primary hover:bg-emerald-800 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
            >
              검색
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="flex-1 md:flex-initial bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
            >
              초기화
            </button>
          </div>
        </form>
      </div>

      {/* Trips Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Compass className="text-emerald-500" size={22} />
            <h2 className="text-lg font-bold text-slate-800">등록된 여행 내역</h2>
          </div>
          <button
            onClick={fetchTrips}
            disabled={loading}
            className="flex items-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm active:scale-95 text-xs"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            목록 갱신
          </button>
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
                <th className="py-4 px-4 text-center">결제 상태</th>
                <th className="py-4 px-4">진행 상태</th>
                <th className="py-4 px-4">등록 일시</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 font-medium">
                    <span className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin inline-block"></span>
                    <p className="mt-2 text-xs">여행 목록을 불러오는 중입니다...</p>
                  </td>
                </tr>
              ) : trips.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 font-medium">
                    등록된 여행 정보가 존재하지 않습니다.
                  </td>
                </tr>
              ) : (
                trips.map((item) => (
                  <tr 
                    key={item.reqId} 
                    data-req-id={item.reqId}
                    data-traveler-id={item.travelerId}
                    className="hover:bg-slate-50/50 transition-colors text-sm font-medium text-slate-700"
                  >
                    {/* 예약 고객 */}
                    <td className="py-4.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <User size={14} />
                        </div>
                        <span className="text-slate-800 font-bold">{item.travelerName || '미확인 고객'}</span>
                      </div>
                    </td>
                    {/* 여행 제목 */}
                    <td className="py-4.5 px-4 text-slate-800 font-bold">{item.tripTitle || '-'}</td>
                    {/* 출발지 / 목적지 */}
                    <td className="py-4.5 px-4">
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
                    <td className="py-4.5 px-4">
                      <div className="flex flex-col text-xs text-slate-500 gap-0.5">
                        <span className="font-bold text-slate-700">{item.startDt} 출발</span>
                        <span>{item.endDt} 도착</span>
                      </div>
                    </td>
                    {/* 요청 금액 */}
                    <td className="py-4.5 px-4 text-slate-900 font-black text-base">{formatAmt(item.reqAmt)}</td>
                    {/* 결제 상태 */}
                    <td className="py-4.5 px-4 text-center">
                      {getPaymentBadge(item.paymentSts)}
                    </td>
                    {/* 진행 상태 */}
                    <td className="py-4.5 px-4">
                      {getStatusBadge(item.dataStat)}
                    </td>
                    {/* 등록 일시 */}
                    <td className="py-4.5 px-4 text-slate-400 flex items-center gap-1.5">
                      <Clock size={14} />
                      {item.regDt || '-'}
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

export default TripsManagement;
