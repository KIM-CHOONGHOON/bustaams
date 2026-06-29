import React, { useState, useEffect } from 'react';
import { RefreshCw, Clock, Calendar, TrendingUp, Bus, User, Receipt, Users } from 'lucide-react';

const MyPerformanceManagement = () => {
  const [performanceList, setPerformanceList] = useState([]);
  const [loading, setLoading] = useState(false);

  // 실적년월 필터 (YYYY-MM 형식) - 기본값: 당월
  const getDefaultYm = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  };
  const [searchPerfYm, setSearchPerfYm] = useState(getDefaultYm);

  // 로그인한 관리자 정보 가져오기
  const adminUserStr = localStorage.getItem('adminUser');
  const adminUser = adminUserStr ? JSON.parse(adminUserStr) : null;
  const adminId = adminUser?.adminId || '';
  const adminNm = adminUser?.adminNm || '관리자';

  const fetchPerformance = async (perfYm = '') => {
    if (!adminId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('adminId', adminId);
      const targetYm = perfYm || searchPerfYm;
      if (targetYm) {
        params.append('perfYm', targetYm.replace('-', ''));
      }
      const response = await fetch(`/api/admin/my-performance?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setPerformanceList(data);
      }
    } catch (error) {
      console.error('Failed to fetch performance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance(searchPerfYm);
  }, [adminId]);

  // 완료/확정된 실적 요약 계산
  const completedTrips = Array.isArray(performanceList)
    ? performanceList.filter(
        (item) => item && (item.dataStat === 'CONFIRM' || item.dataStat === 'DONE')
      )
    : [];

  const totalSales = completedTrips.reduce(
    (sum, item) => sum + Number(item?.biddingPrice || 0), 0
  );

  const totalFee = completedTrips.reduce((sum, item) => {
    if (!item) return sum;
    return sum + Math.floor(Number(item.biddingPrice || 0) * 0.006);
  }, 0);

  const businessTax = Math.floor(totalFee * 0.03 / 10) * 10; // 사업소득세 3% (원 단위 절삭)
  const localTax = Math.floor(businessTax * 0.1 / 10) * 10;  // 지방소득세 (사업소득세의 10% = 총수당의 0.3%)
  const netPayout = totalFee - businessTax - localTax; // 실지급액

  // 진행 상태 배지 컴포넌트
  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRM':
        return (
          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-md text-[11px] font-black">
            CONFIRM (확정)
          </span>
        );
      case 'DONE':
        return (
          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-md text-[11px] font-black">
            DONE (완료)
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">나의 실적관리</h1>
          <p className="text-slate-500 font-medium mt-1">
            본인을 추천인으로 등록한 버스 기사님들의 운행 및 매출 실적 내역을 실시간으로 확인합니다.
          </p>
        </div>
        {searchPerfYm && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 text-emerald-800 text-sm font-black shadow-xs self-start sm:self-auto">
            <Clock size={16} className="text-emerald-600 animate-pulse" />
            <span>조회 기준월: {searchPerfYm.split('-')[0]}년 {searchPerfYm.split('-')[1]}월</span>
          </div>
        )}
      </div>

      {/* Month Filter Panel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-bold text-slate-700">실적 조회 월 선택:</label>
          <input
            type="month"
            value={searchPerfYm}
            onChange={(e) => {
              setSearchPerfYm(e.target.value);
              fetchPerformance(e.target.value);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
          />
        </div>
        <button
          onClick={() => fetchPerformance(searchPerfYm)}
          disabled={loading}
          className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 rounded-xl transition-all shadow-sm active:scale-95 text-sm"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          실적 갱신
        </button>
      </div>

      {/* KPI Cards Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 당월 운행 완료 */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-400">당월 매칭 완료</span>
            <span className="text-2xl font-black text-slate-800 mt-1">{completedTrips.length}건</span>
            <span className="text-xs text-slate-400 mt-2 font-medium">조회 월 매칭 완료 건수</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
            <TrendingUp size={24} />
          </div>
        </div>

        {/* 당월 매출 실적 */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-400">당월 총 운행금액</span>
            <span className="text-2xl font-black text-emerald-600 mt-1">{formatAmt(totalSales)}</span>
            <span className="text-xs text-slate-400 mt-2 font-medium">완료 건 기준 매출 총액</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0 font-bold text-xl">
            ₩
          </div>
        </div>

        {/* 당월 총 수당금액 */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-400">당월 총 수당액</span>
            <span className="text-2xl font-black text-indigo-600 mt-1">{formatAmt(totalFee)}</span>
            <span className="text-xs text-slate-400 mt-2 font-medium">세전 수당 합계 금액</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0 font-bold text-xl">
            ₩
          </div>
        </div>

        {/* 당월 실지급액 (세후) */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-emerald-600 flex items-center gap-1">
              실지급액 <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 rounded">세후</span>
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1">{formatAmt(netPayout)}</span>
            <span className="text-xs text-slate-400 mt-2 font-medium">원천세 3.3% 공제 후 금액</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0 font-bold text-xl">
            ₩
          </div>
        </div>
      </div>

      {/* Tax Withholding & Settlement Statement Panel */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-slate-300 rounded-3xl p-6 shadow-md border border-slate-850">
        <h3 className="text-base font-black text-white flex items-center gap-2 mb-4">
          <Receipt size={18} className="text-emerald-400" />
          당월 영업 수당 및 원천세 공제 상세 명세서
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
          <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/30">
            <p className="text-xs text-slate-400 font-bold">① 총 수당금액 (세전)</p>
            <p className="text-lg font-black text-white mt-1.5">{formatAmt(totalFee)}</p>
            <p className="text-[10px] text-slate-500 mt-1">영업 수당 (0.6%) 적용 합계</p>
          </div>
          <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/30">
            <p className="text-xs text-slate-400 font-bold">② 사업소득세 (3.0%)</p>
            <p className="text-lg font-black text-rose-400 mt-1.5">-{formatAmt(businessTax)}</p>
            <p className="text-[10px] text-slate-500 mt-1">총 수당액 × 0.03</p>
          </div>
          <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/30">
            <p className="text-xs text-slate-400 font-bold">③ 지방소득세 (0.3%)</p>
            <p className="text-lg font-black text-rose-400 mt-1.5">-{formatAmt(localTax)}</p>
            <p className="text-[10px] text-slate-500 mt-1">사업소득세의 10%</p>
          </div>
          <div className="bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/20">
            <p className="text-xs text-emerald-400 font-bold">④ 실제 총 지급액 (세후)</p>
            <p className="text-xl font-black text-emerald-400 mt-1.5">{formatAmt(netPayout)}</p>
            <p className="text-[10px] text-emerald-500/70 mt-1">① - (② + ③) 실제 이체 금액</p>
          </div>
        </div>
      </div>

      {/* Driver Performance Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <Bus className="text-emerald-500" size={22} />
          <h2 className="text-lg font-bold text-slate-800">추천 기사 운행 내역 ({adminNm} 님 추천)</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-4">기사명</th>
                <th className="py-4 px-4">기사 유형</th>
                <th className="py-4 px-4">여행 제목</th>
                <th className="py-4 px-4">매칭 고객</th>
                <th className="py-4 px-4">운행 경로</th>
                <th className="py-4 px-4">운행 금액</th>
                <th className="py-4 px-4">나의 수당</th>
                <th className="py-4 px-4">매칭 일시</th>
                <th className="py-4 px-4">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400 font-medium">
                    <span className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin inline-block"></span>
                    <p className="mt-2 text-xs">실적 정보를 불러오는 중입니다...</p>
                  </td>
                </tr>
              ) : !Array.isArray(performanceList) || performanceList.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400 font-medium">
                    추천 기사의 운행 실적이 존재하지 않습니다.
                  </td>
                </tr>
              ) : (
                performanceList.map((item) => {
                  if (!item) return null;
                  const rateLabel = '영업 수당 (0.6%)';
                  const itemComm = Math.floor(Number(item.biddingPrice || 0) * 0.006);
                  return (
                    <tr 
                      key={item.resId} 
                      data-res-id={item.resId}
                      data-driver-id={item.driverId}
                      className="hover:bg-slate-50/50 transition-colors text-sm font-medium text-slate-700"
                    >
                      {/* 기사명 */}
                      <td className="py-4.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                            <User size={14} />
                          </div>
                          <span className="text-slate-800 font-bold">{item.driverName || '-'}</span>
                        </div>
                      </td>
                      {/* 기사 유형 */}
                      <td className="py-4.5 px-4">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-black border ${
                          isRegular ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {rateLabel}
                        </span>
                      </td>
                      {/* 여행 제목 */}
                      <td className="py-4.5 px-4 text-slate-800 font-bold">{item.tripTitle || '-'}</td>
                      {/* 매칭 고객 */}
                      <td className="py-4.5 px-4 text-slate-900 font-bold">{item.travelerName || '-'}</td>
                      {/* 운행 경로 */}
                      <td className="py-4.5 px-4">
                        <div className="flex flex-col gap-1 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span className="text-slate-600 font-medium">{getShortAddr(item.startAddr)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            <span className="text-slate-600 font-medium">{getShortAddr(item.endAddr)}</span>
                          </div>
                        </div>
                      </td>
                      {/* 운행 금액 */}
                      <td className="py-4.5 px-4 text-slate-900 font-black">{formatAmt(item.biddingPrice)}</td>
                      {/* 나의 수당 */}
                      <td className="py-4.5 px-4 text-emerald-600 font-extrabold">
                        {item.dataStat === 'CONFIRM' || item.dataStat === 'DONE' ? formatAmt(itemComm) : '-'}
                      </td>
                      {/* 매칭 일시 */}
                      <td className="py-4.5 px-4 text-slate-400">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <Clock size={14} />
                          {item.confirmDt || item.regDt}
                        </div>
                      </td>
                      {/* 상태 */}
                      <td className="py-4.5 px-4">
                        {getStatusBadge(item.dataStat)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MyPerformanceManagement;
