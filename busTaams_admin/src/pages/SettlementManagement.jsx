import React, { useState, useEffect } from 'react';
import {
  Receipt, Calendar, SlidersHorizontal, Search, RefreshCw,
  MapPin, User, Phone, TrendingUp, CheckCircle2, Info
} from 'lucide-react';

const SettlementManagement = () => {
  const [settlements, setSettlements] = useState([]);
  const [summary, setSummary] = useState({ totalCount: 0, totalReqAmt: 0, totalFee6pct: 0 });
  const [loading, setLoading] = useState(false);

  // 조회기간 — 기본값: 당월 1일 ~ 당월 말일
  const formatDateLocal = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const today = new Date();
  const firstDay = formatDateLocal(new Date(today.getFullYear(), today.getMonth(), 1));
  const lastDay  = formatDateLocal(new Date(today.getFullYear(), today.getMonth() + 1, 0));

  const [confirmDtFrom, setConfirmDtFrom] = useState(firstDay);
  const [confirmDtTo, setConfirmDtTo]     = useState(lastDay);
  const [searchType, setSearchType]       = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');

  const fetchSettlements = async (overrideParams = {}) => {
    setLoading(true);
    try {
      const currentFrom = overrideParams.hasOwnProperty('confirmDtFrom') ? overrideParams.confirmDtFrom : confirmDtFrom;
      const currentTo = overrideParams.hasOwnProperty('confirmDtTo') ? overrideParams.confirmDtTo : confirmDtTo;
      const currentType = overrideParams.hasOwnProperty('searchType') ? overrideParams.searchType : searchType;
      const currentKeyword = overrideParams.hasOwnProperty('searchKeyword') ? overrideParams.searchKeyword : searchKeyword;

      const params = new URLSearchParams({ searchType: currentType, searchKeyword: currentKeyword.trim() });
      if (currentFrom) params.append('confirmDtFrom', currentFrom);
      if (currentTo)   params.append('confirmDtTo',   currentTo);

      const res = await fetch(`/api/admin/settlement?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSettlements(data.list || []);
        setSummary(data.summary || { totalCount: 0, totalReqAmt: 0, totalFee6pct: 0 });
      }
    } catch (err) {
      console.error('정산 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSettlements();
  };

  const handleReset = () => {
    setConfirmDtFrom(firstDay);
    setConfirmDtTo(lastDay);
    setSearchType('all');
    setSearchKeyword('');
    fetchSettlements({
      confirmDtFrom: firstDay,
      confirmDtTo: lastDay,
      searchType: 'all',
      searchKeyword: ''
    });
  };

  const formatAmt = (amt) => Number(amt || 0).toLocaleString('ko-KR') + '원';

  const getShortAddr = (addr) => {
    if (!addr) return '-';
    const parts = addr.split(' ');
    return parts.length >= 2 ? `${parts[0]} ${parts[1]}` : addr;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="text-indigo-500" size={32} />
            여정/입찰 정산
          </h1>
          <p className="text-slate-500 font-medium mt-1.5">
            예약 확정(CONFIRM) 기준으로 일정 기간의 매출을 조회합니다. 조회기간은 <strong>예약 확정일(CONFIRM_DT)</strong> 기준입니다.
          </p>
        </div>
        <button
          onClick={fetchSettlements}
          disabled={loading}
          className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 text-sm"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          새로고침
        </button>
      </div>

      {/* Search Bar Panel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4">

          {/* 1행: 확정일자 조회기간 */}
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-2 text-slate-700 shrink-0 w-full md:w-auto">
              <Calendar size={18} className="text-indigo-500" />
              <span className="text-sm font-bold">확정일자</span>
            </div>
            <div className="flex items-center gap-2 flex-1 w-full">
              <input
                type="date"
                id="confirmDtFrom"
                value={confirmDtFrom}
                onChange={(e) => setConfirmDtFrom(e.target.value)}
                max={confirmDtTo || undefined}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
              />
              <span className="text-slate-400 font-bold text-sm shrink-0">~</span>
              <input
                type="date"
                id="confirmDtTo"
                value={confirmDtTo}
                onChange={(e) => setConfirmDtTo(e.target.value)}
                min={confirmDtFrom || undefined}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
              />
            </div>
          </div>

          {/* 2행: 키워드 검색 */}
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-2 text-slate-700 shrink-0 w-full md:w-auto">
              <SlidersHorizontal size={18} className="text-indigo-500" />
              <span className="text-sm font-bold">검색 조건</span>
            </div>

            <div className="w-full md:w-48">
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold"
              >
                <option value="all">전체 통합 검색</option>
                <option value="tripTitle">여행 제목</option>
                <option value="travelerName">예약자명</option>
                <option value="driverName">기사명</option>
              </select>
            </div>

            <div className="flex-1 w-full relative">
              <input
                type="text"
                placeholder="검색어를 입력하고 Enter를 누르거나 검색 버튼을 클릭하세요."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
              />
              <Search className="absolute right-3.5 top-3 text-slate-400" size={16} />
            </div>

            <div className="flex w-full md:w-auto gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 md:flex-initial bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md active:scale-95"
              >
                조회
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className="flex-1 md:flex-initial bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-sm active:scale-95"
              >
                초기화
              </button>
            </div>
          </div>

        </form>
      </div>

      {/* Settlement Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-5">예약자</th>
                <th className="py-4 px-5">담당 기사</th>
                <th className="py-4 px-5">여행 제목</th>
                <th className="py-4 px-5">출발지 / 목적지</th>
                <th className="py-4 px-5">여행 금액</th>
                <th className="py-4 px-5">확정 일시</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center text-slate-400">
                    <span className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin inline-block"></span>
                    <p className="mt-3 text-sm font-semibold text-slate-500">정산 데이터를 조회하고 있습니다...</p>
                  </td>
                </tr>
              ) : settlements.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center">
                    <Info size={36} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-400 font-medium">조회 기간 내 확정된 예약 건이 없습니다.</p>
                  </td>
                </tr>
              ) : (
                settlements.map((item, idx) => (
                  <tr
                    key={`${item.resId}-${idx}`}
                    className="hover:bg-indigo-50/20 transition-colors text-sm font-medium text-slate-700"
                  >
                    {/* 예약자 */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200 shrink-0">
                          {item.travelerName ? item.travelerName.charAt(0) : 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{item.travelerName || '미확인'}</p>
                          {item.travelerPhone && (
                            <p className="text-xs text-slate-400 flex items-center gap-1">
                              <Phone size={10} />{item.travelerPhone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 담당 기사 */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 font-bold border border-indigo-100 shrink-0">
                          {item.driverName ? item.driverName.charAt(0) : '-'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{item.driverName || '-'}</p>
                          {item.vehicleNo && (
                            <p className="text-xs text-slate-400">{item.vehicleNo}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 여행 제목 */}
                    <td className="py-4 px-5 text-slate-900 font-semibold max-w-[180px] truncate">
                      {item.tripTitle || '-'}
                    </td>

                    {/* 출발지 / 목적지 */}
                    <td className="py-4 px-5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                          <span className="text-slate-700 font-medium truncate max-w-[140px]">{getShortAddr(item.startAddr)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                          <span className="text-slate-700 font-medium truncate max-w-[140px]">{getShortAddr(item.endAddr)}</span>
                        </div>
                      </div>
                    </td>

                    {/* 여행 금액 */}
                    <td className="py-4 px-5 text-sm text-slate-800 font-bold whitespace-nowrap">
                      {formatAmt(item.driverBiddingPrice)}
                    </td>

                    {/* 확정 일시 */}
                    <td className="py-4 px-5">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg whitespace-nowrap">
                        <CheckCircle2 size={12} />
                        {item.confirmDt || '-'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 누적 합계 푸터 */}
        {!loading && (
          <div className="border-t border-slate-200 bg-gradient-to-r from-indigo-50 to-slate-50 px-5 py-5">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">

              <div className="flex items-center gap-2 text-sm text-slate-600 font-bold">
                <TrendingUp size={18} className="text-indigo-500" />
                <span>
                  조회기간:&nbsp;
                  <span className="text-indigo-600">{confirmDtFrom || '전체'}</span>
                  &nbsp;~&nbsp;
                  <span className="text-indigo-600">{confirmDtTo || '전체'}</span>
                </span>
              </div>

              <div className="flex items-center gap-6">
                {/* 건수 합계 */}
                <div className="text-center">
                  <p className="text-xs text-slate-400 font-bold">건수 합계</p>
                  <p className="text-xl font-black text-slate-800">
                    {Number(summary.totalCount || 0).toLocaleString()}건
                  </p>
                </div>
                <div className="w-px h-10 bg-slate-200"></div>
                {/* 총 여정금액 누적 */}
                <div className="text-center">
                  <p className="text-xs text-slate-400 font-bold">총 여정금액 누적</p>
                  <p className="text-xl font-black text-slate-800">
                    {Number(summary.totalReqAmt || 0).toLocaleString('ko-KR')}원
                  </p>
                </div>
                <div className="w-px h-10 bg-slate-200"></div>
                {/* 수수료 누적 (REQ_AMT × 6%) */}
                <div className="text-center">
                  <p className="text-xs text-slate-400 font-bold">수수료 누적 (6%)</p>
                  <p className="text-xl font-black text-indigo-600">
                    {Number(summary.totalFee6pct || 0).toLocaleString('ko-KR')}원
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default SettlementManagement;
