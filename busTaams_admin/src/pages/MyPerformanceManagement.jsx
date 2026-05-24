import React, { useState, useEffect } from 'react';
import { RefreshCw, Clock, DollarSign, Calendar, TrendingUp, Bus, User } from 'lucide-react';

const MyPerformanceManagement = () => {
  const [performanceList, setPerformanceList] = useState([]);
  const [loading, setLoading] = useState(false);

  // 로그인한 관리자 정보 가져오기
  const adminUserStr = localStorage.getItem('adminUser');
  const adminUser = adminUserStr ? JSON.parse(adminUserStr) : null;
  const adminId = adminUser?.adminId || '';
  const adminNm = adminUser?.adminNm || '관리자';

  const fetchPerformance = async () => {
    if (!adminId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/my-performance?adminId=${adminId}`);
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
    fetchPerformance();
  }, [adminId]);

  // 완료/확정된 실적 요약 계산
  const completedTrips = performanceList.filter(
    (item) => item.dataStat === 'CONFIRM' || item.dataStat === 'DONE'
  );

  const totalSales = completedTrips.reduce(
    (sum, item) => sum + Number(item.biddingPrice || 0), 0
  );

  const totalFee = completedTrips.reduce(
    (sum, item) => sum + Number(item.feeTotalAmt || 0), 0
  );

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800">나의 실적관리</h1>
          <p className="text-slate-500 font-medium mt-1">
            본인을 추천인으로 등록한 버스 기사님들의 운행 및 매출 실적 내역을 실시간으로 확인합니다.
          </p>
        </div>
        <button
          onClick={fetchPerformance}
          disabled={loading}
          className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 text-sm"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          실적 갱신
        </button>
      </div>

      {/* KPI Cards Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 누적 운행 완료 */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-400">누적 운행 완료</span>
            <span className="text-2xl font-black text-slate-800 mt-1">{completedTrips.length}건</span>
            <span className="text-xs text-slate-400 mt-2 font-medium">전체 {performanceList.length}건 중</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
            <TrendingUp size={24} />
          </div>
        </div>

        {/* 누적 운행 금액 */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-400">누적 매출 실적</span>
            <span className="text-2xl font-black text-emerald-600 mt-1">{formatAmt(totalSales)}</span>
            <span className="text-xs text-slate-400 mt-2 font-medium">완료 건 기준 총 매출액</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
            <DollarSign size={24} />
          </div>
        </div>

        {/* 누적 수수료 실적 */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-400">누적 수수료 실적</span>
            <span className="text-2xl font-black text-indigo-600 mt-1">{formatAmt(totalFee)}</span>
            <span className="text-xs text-slate-400 mt-2 font-medium">플랫폼 수수료 발생 실적</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
            <Calendar size={24} />
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
                <th className="py-4 px-4">여행 제목</th>
                <th className="py-4 px-4">매칭 고객</th>
                <th className="py-4 px-4">운행 경로</th>
                <th className="py-4 px-4">운행 금액</th>
                <th className="py-4 px-4">매칭 일시</th>
                <th className="py-4 px-4">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 font-medium">
                    <span className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin inline-block"></span>
                    <p className="mt-2 text-xs">실적 정보를 불러오는 중입니다...</p>
                  </td>
                </tr>
              ) : performanceList.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 font-medium">
                    추천 기사의 운행 실적이 존재하지 않습니다.
                  </td>
                </tr>
              ) : (
                performanceList.map((item) => (
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
                    {/* 매칭 일시 */}
                    <td className="py-4.5 px-4 text-slate-400 flex items-center gap-1.5">
                      <Clock size={14} />
                      {item.confirmDt || item.regDt}
                    </td>
                    {/* 상태 */}
                    <td className="py-4.5 px-4">
                      {getStatusBadge(item.dataStat)}
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

export default MyPerformanceManagement;
