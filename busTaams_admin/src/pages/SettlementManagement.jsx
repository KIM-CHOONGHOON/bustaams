import React, { useState, useEffect } from 'react';
import {
  Receipt, Calendar, SlidersHorizontal, Search, RefreshCw,
  Phone, TrendingUp, CheckCircle2, Info, CreditCard, UserCheck, Percent
} from 'lucide-react';

const SettlementManagement = () => {
  const [settlements, setSettlements] = useState([]);
  const [summary, setSummary] = useState({ totalCount: 0, totalBiddingPrice: 0, totalDriverPayout: 0, totalPlatformFee: 0, totalSalesCommission: 0 });
  const [subscriptionList, setSubscriptionList] = useState([]);
  const [subscriptionSummary, setSubscriptionSummary] = useState({ totalCount: 0, totalAmt: 0 });
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
        setSummary(data.summary || { totalCount: 0, totalBiddingPrice: 0, totalDriverPayout: 0, totalPlatformFee: 0, totalSalesCommission: 0 });
        setSubscriptionList(data.subscriptionList || []);
        setSubscriptionSummary(data.subscriptionSummary || { totalCount: 0, totalAmt: 0 });
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
    const cleanAddr = addr.replace(/\s*[\(\[].*?[\)\]]/g, '').trim();
    const parts = cleanAddr.split(' ');
    return parts.length >= 2 ? `${parts[0]} ${parts[1]}` : cleanAddr;
  };

  const getFeePolicyBadgeColor = (policy) => {
    if (!policy) return 'bg-slate-50 text-slate-600 border-slate-100';
    if (policy.includes('HIGH')) return 'bg-purple-50 text-purple-700 border-purple-100';
    if (policy.includes('MIDDLE')) return 'bg-blue-50 text-blue-700 border-blue-100';
    if (policy.includes('GENERAL') || policy.includes('GENNERAL')) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    return 'bg-amber-50 text-amber-700 border-amber-100';
  };

  const getFeePolicyLabel = (item) => {
    return item.feePolicyLabel || item.feePolicy || '일반 회원';
  };

  const isRegularDriver = (policy) => {
    if (!policy) return false;
    return policy.includes('GENERAL') || policy.includes('GENNERAL') || policy.includes('MIDDLE') || policy.includes('HIGH');
  };

  // 재무 계산용 변수
  const totalBidding = Number(summary.totalBiddingPrice || 0); // 총 여행금액
  const totalSub = Number(subscriptionSummary.totalAmt || 0); // 월정액 수입
  const grossSales = totalBidding + totalSub; // 총 매출규모

  const totalDriverPayout = Number(summary.totalDriverPayout || 0); // 정회원 기사에게 지급할 총 환급 수수료 (5.5%)
  const platformFeeIncome = Number(summary.totalPlatformFee || 0); // 본사 귀속 수수료 (일반 6.6% / 정회원 1.1%)
  
  // 세무 및 원천징수 계산
  const totalSalesCommission = Number(summary.totalSalesCommission || 0); // 영업사원 지급 총 수당
  const salesTax3_3 = Math.round(totalSalesCommission * 0.033); // 영업사원 수당 원천세 3.3%
  const salesNetPay = totalSalesCommission - salesTax3_3; // 영업사원 실지급액 (세후)
  
  // 플랫폼 매출액 (본사 귀속 수수료 + 기사 월정액 매출에 대한 10% VAT 포함)
  const vat10 = Math.round((platformFeeIncome + totalSub) / 11);
  const netPlatformProfit = (platformFeeIncome + totalSub) - totalSalesCommission - vat10; // 세후 플랫폼 이익 추정

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="text-indigo-500" size={32} />
            통합 정산 및 매출 현황 관리
          </h1>
          <p className="text-slate-500 font-medium mt-1.5">
            기사 등급(정회원/일반)에 따른 페이백 지급 수수료를 구분하고 세금과 영업 수당을 원스톱으로 확인합니다.
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

      {/* 1. 재무 종합 요약판 (종합 대시보드) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 총 매출 규모 카드 */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-950 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[220px]">
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5">
            <TrendingUp size={160} />
          </div>
          <div>
            <span className="text-indigo-400 text-xs font-black uppercase tracking-widest bg-indigo-500/10 px-2.5 py-1 rounded-full">플랫폼 총 매출 규모</span>
            <h3 className="text-4xl font-black mt-4 tracking-tight">{formatAmt(grossSales)}</h3>
            <p className="text-xs text-slate-400 mt-2 font-medium">총 여행금액({formatAmt(totalBidding)}) + 기사 월정액 수입({formatAmt(totalSub)})</p>
          </div>
          <div className="flex justify-between items-center text-xs text-slate-400 border-t border-slate-800/80 pt-4 mt-4">
            <span>여정 {summary.totalCount}건 성사</span>
            <span>정액 결제 {subscriptionSummary.totalCount}건</span>
          </div>
        </div>

        {/* 지급 및 세무 요약 카드 */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col justify-between min-h-[220px]">
          <div>
            <span className="text-rose-600 text-xs font-bold uppercase tracking-widest bg-rose-50 px-2.5 py-1 rounded-full">지출 수수료 및 공제 세금</span>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-center text-sm font-semibold text-slate-700">
                <span className="flex items-center gap-1.5 text-indigo-600">■ 정회원 기사 지급액 (환급 수수료):</span>
                <span className="font-extrabold text-indigo-700">{formatAmt(totalDriverPayout)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-semibold text-slate-700">
                <span className="flex items-center gap-1.5"><UserCheck size={14} className="text-slate-400" />영업사원 총 수수료 (세전):</span>
                <span className="font-extrabold text-slate-900">{formatAmt(totalSalesCommission)}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-medium text-slate-500 pl-5">
                <span>└ 원천세 공제 (3.3%): -{formatAmt(salesTax3_3)}</span>
                <span>실지급액: {formatAmt(salesNetPay)}</span>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1"><Percent size={14} className="text-slate-400" />부가세(VAT 10%) 예수금액:</span>
            <span className="text-amber-600 font-extrabold">{formatAmt(vat10)}</span>
          </div>
        </div>

        {/* 본사 매출 & 세후이익 카드 */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-8 text-white shadow-md flex flex-col justify-between min-h-[220px]">
          <div>
            <span className="text-emerald-100 text-xs font-black uppercase tracking-widest bg-white/10 px-2.5 py-1 rounded-full">본사 순수입 & 세후이익</span>
            <div className="mt-4 space-y-1.5">
              <h3 className="text-3xl font-black tracking-tight">{formatAmt(platformFeeIncome + totalSub)}</h3>
              <p className="text-xs text-emerald-100/90 font-medium">본사 귀속 수수료({formatAmt(platformFeeIncome)}) + 정액제 수입({formatAmt(totalSub)})</p>
            </div>
          </div>
          <div className="border-t border-white/10 pt-4 flex justify-between items-center text-xs font-bold text-white/90">
            <span>영업사원 수수료 및 부가세 차감후 순이익:</span>
            <span className="text-lg font-black text-yellow-300">{formatAmt(netPlatformProfit)}</span>
          </div>
        </div>

      </div>

      {/* Search Bar Panel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4">

          {/* 1행: 확정일자 조회기간 */}
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-2 text-slate-700 shrink-0 w-full md:w-auto">
              <Calendar size={18} className="text-indigo-500" />
              <span className="text-sm font-bold">조회기간</span>
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
                <option value="tripTitle">여행 제목 (여정 전용)</option>
                <option value="travelerName">예약자명 (여정 전용)</option>
                <option value="driverName">기사명 (공통)</option>
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

      {/* 2. 여정 정산 및 기사 환급/본사 귀속 구분 테이블 (상단 테이블) */}
      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
          여정별 매출 및 수수료 정산 내역 ({summary.totalCount}건)
        </h3>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-5">담당 기사 (등급)</th>
                  <th className="py-4 px-5">예약자 (연락처)</th>
                  <th className="py-4 px-5">여행 제목</th>
                  <th className="py-4 px-5">출발지 / 목적지</th>
                  <th className="py-4 px-5">여행 금액</th>
                  <th className="py-4 px-5 text-indigo-700">기사 지급액 (5.5%)</th>
                  <th className="py-4 px-5 text-emerald-700">본사 귀속분</th>
                  <th className="py-4 px-5 text-rose-600">영업사원 수당</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-16 text-center text-slate-400">
                      <span className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin inline-block"></span>
                      <p className="mt-3 text-sm font-semibold text-slate-500">여정 데이터를 조회하고 있습니다...</p>
                    </td>
                  </tr>
                ) : settlements.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-16 text-center">
                      <Info size={36} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-400 font-medium">조회 기간 내 확정된 예약 건이 없습니다.</p>
                    </td>
                  </tr>
                ) : (
                  settlements.map((item, idx) => {
                    const regular = isRegularDriver(item.feePolicy);
                    return (
                      <tr
                        key={`${item.resId}-${idx}`}
                        className="hover:bg-indigo-50/20 transition-colors text-sm font-medium text-slate-700"
                      >
                        {/* 담당 기사 */}
                        <td className="py-4 px-5">
                          <div>
                            <p className="font-bold text-slate-800">{item.driverName || '-'}</p>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black border mt-1 ${getFeePolicyBadgeColor(item.feePolicy)}`}>
                              {regular ? getFeePolicyLabel(item).replace('운전기사 ', '') : '일반 회원'}
                            </span>
                          </div>
                        </td>

                        {/* 예약자 */}
                        <td className="py-4 px-5">
                          <div>
                            <p className="font-bold text-slate-800">{item.travelerName || '미확인'}</p>
                            {item.travelerPhone && (
                              <p className="text-xs text-slate-400">{item.travelerPhone}</p>
                            )}
                          </div>
                        </td>

                        {/* 여행 제목 */}
                        <td className="py-4 px-5 text-slate-900 font-semibold max-w-[150px] truncate">
                          {item.tripTitle || '-'}
                        </td>

                        {/* 출발지 / 목적지 */}
                        <td className="py-4 px-5">
                          <div className="flex flex-col gap-0.5">
                            <div className="text-xs text-slate-700 font-medium truncate max-w-[120px]">S: {getShortAddr(item.startAddr)}</div>
                            <div className="text-xs text-slate-700 font-medium truncate max-w-[120px]">E: {getShortAddr(item.destAddr || item.endAddr)}</div>
                          </div>
                        </td>

                        {/* 여행 금액 */}
                        <td className="py-4 px-5 text-sm text-slate-800 font-bold whitespace-nowrap">
                          {formatAmt(item.driverBiddingPrice)}
                        </td>

                        {/* 기사 지급액 (정회원은 5.5% 페이백, 일반은 0원) */}
                        <td className="py-4 px-5 text-sm text-indigo-700 font-black whitespace-nowrap">
                          {regular ? (
                            <div>
                              <span>{formatAmt(item.driverPayout)}</span>
                              <span className="text-[9px] text-indigo-500 font-semibold block">정회원 환급 (5.5%)</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-semibold">0원 <small className="text-[9px] text-slate-400 block font-normal">(지급 대상 아님)</small></span>
                          )}
                        </td>

                        {/* 본사 귀속분 (정회원 건은 1.1%, 일반회원 건은 6.6%) */}
                        <td className="py-4 px-5 text-sm text-emerald-700 font-black whitespace-nowrap">
                          <div>
                            <span>{formatAmt(item.platformFee)}</span>
                            <span className="text-[9px] text-emerald-600 block">({regular ? '1.1%' : '6.6%'})</span>
                          </div>
                        </td>

                        {/* 영업사원 지급 수수료 */}
                        <td className="py-4 px-5 text-sm text-rose-600 font-extrabold whitespace-nowrap">
                          {item.salesCommission > 0 ? (
                            <div>
                              <span>{formatAmt(item.salesCommission)}</span>
                              <span className="text-[9px] text-slate-400 font-normal block">
                                (담당: {item.recomCode} / {regular ? '10.6%' : '6.6%'})
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-normal">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {/* 테이블 푸터 */}
          {!loading && settlements.length > 0 && (
            <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-3 flex justify-between items-center text-xs text-slate-500 font-bold">
              <span>여정 건수: {summary.totalCount}건</span>
              <div className="flex gap-6">
                <span>총 여행금액: <strong className="text-slate-800">{formatAmt(totalBidding)}</strong></span>
                <span>총 기사 지급액: <strong className="text-indigo-600">{formatAmt(totalDriverPayout)}</strong></span>
                <span>총 본사 귀속액: <strong className="text-emerald-600">{formatAmt(platformFeeIncome)}</strong></span>
                <span>총 영업수당: <strong className="text-rose-600">{formatAmt(totalSalesCommission)}</strong></span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. 기사 월정액 결제 내역 테이블 (하단 테이블) */}
      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
          기사 월정액 구독 매출 상세 내역 ({subscriptionSummary.totalCount}건)
        </h3>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-5">기사명 (연락처)</th>
                  <th className="py-4 px-5">등급 정책</th>
                  <th className="py-4 px-5">청구 귀속월</th>
                  <th className="py-4 px-5">결제 금액</th>
                  <th className="py-4 px-5">결제 수단 정보</th>
                  <th className="py-4 px-5">결제 완료 일시</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-16 text-center text-slate-400">
                      <span className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin inline-block"></span>
                      <p className="mt-3 text-sm font-semibold text-slate-500">결제 데이터를 조회하고 있습니다...</p>
                    </td>
                  </tr>
                ) : subscriptionList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-16 text-center">
                      <Info size={36} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-400 font-medium">조회 기간 내 결제된 기사 월정액 데이터가 없습니다.</p>
                    </td>
                  </tr>
                ) : (
                  subscriptionList.map((item, idx) => (
                    <tr
                      key={`${item.payHistSeq}-${idx}`}
                      className="hover:bg-indigo-50/20 transition-colors text-sm font-medium text-slate-700"
                    >
                      {/* 기사명 */}
                      <td className="py-4 px-5">
                        <div>
                          <p className="font-bold text-slate-800">{item.driverName || '미확인'}</p>
                          {item.driverPhone && (
                            <p className="text-xs text-slate-400">{item.driverPhone}</p>
                          )}
                        </div>
                      </td>

                      {/* 등급 정책 */}
                      <td className="py-4 px-5">
                        <span className={`inline-block px-2.5 py-1 rounded-lg border text-xs font-bold ${getFeePolicyBadgeColor(item.feePolicy)}`}>
                          {getFeePolicyLabel(item)}
                        </span>
                      </td>

                      {/* 청구 귀속월 */}
                      <td className="py-4 px-5 font-semibold text-slate-600">
                        {item.billingYyyymm ? `${item.billingYyyymm.slice(0,4)}년 ${item.billingYyyymm.slice(4)}월` : '-'}
                      </td>

                      {/* 결제 금액 */}
                      <td className="py-4 px-5 text-sm text-slate-800 font-bold whitespace-nowrap">
                        {formatAmt(item.payAmt)}
                      </td>

                      {/* 결제 수단 */}
                      <td className="py-4 px-5">
                        {item.cardNickname ? (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                            <CreditCard size={12} className="text-slate-400" />
                            <span>{item.cardNickname} (끝 {item.cardLastFour || '****'})</span>
                          </div>
                        ) : item.cardLastFour ? (
                          <span className="text-xs text-slate-500">카드 (끝 {item.cardLastFour})</span>
                        ) : (
                          <span className="text-xs text-slate-400">자동결제 정보 없음</span>
                        )}
                      </td>

                      {/* 결제 완료 일시 */}
                      <td className="py-4 px-5">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-lg whitespace-nowrap">
                          <CheckCircle2 size={12} />
                          {item.payCompletedDt || '-'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* 테이블 푸터 */}
          {!loading && subscriptionList.length > 0 && (
            <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-3 flex justify-between items-center text-xs text-slate-500 font-bold">
              <span>구독 결제 건수: {subscriptionSummary.totalCount}건</span>
              <span>구독 총액 누적: <strong className="text-indigo-600">{formatAmt(subscriptionSummary.totalAmt)}</strong></span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default SettlementManagement;
