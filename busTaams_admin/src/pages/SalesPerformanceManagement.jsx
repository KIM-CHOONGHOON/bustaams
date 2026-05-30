import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Award, Clock, ArrowRight, UserCheck, Search, RotateCcw, Receipt, Bus, User } from 'lucide-react';

const SalesPerformanceManagement = () => {
  const [salespeople, setSalespeople] = useState([]);
  const [filteredSalespeople, setFilteredSalespeople] = useState([]);
  const [selectedSalesperson, setSelectedSalesperson] = useState(null);
  const [details, setDetails] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // 검색 필터 상태
  const [searchId, setSearchId] = useState('');
  const [searchName, setSearchName] = useState('');
  // 실적년월 필터 (YYYY-MM 형식) - 기본값: 당월
  const getDefaultYm = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  };
  const [searchPerfYm, setSearchPerfYm] = useState(getDefaultYm);

  // 상단 요약 카드 데이터
  const [summary, setSummary] = useState({
    totalDrivers: 0,
    totalMatches: 0,
    totalRevenue: 0,
  });

  // 영업사원별 실적 데이터 조회 (실적년월 파라미터 포함)
  const fetchSalesPerformance = async (perfYm = '') => {
    setLoadingMaster(true);
    try {
      const params = new URLSearchParams();
      if (perfYm) params.append('perfYm', perfYm.replace('-', ''));
      const response = await fetch(`/api/admin/sales-performance${params.toString() ? '?' + params.toString() : ''}`);
      if (response.ok) {
        const data = await response.json();
        setSalespeople(data);
        setFilteredSalespeople(data); // 실적년월 필터는 서버에서 처리하므로 전체 노출

        // 총계 계산
        const sumDrivers = data.reduce((acc, curr) => acc + parseInt(curr.driverCount || 0), 0);
        const sumMatches = data.reduce((acc, curr) => acc + parseInt(curr.matchCount || 0), 0);
        const sumRevenue = data.reduce((acc, curr) => acc + parseFloat(curr.totalFee || 0), 0);

        setSummary({
          totalDrivers: sumDrivers,
          totalMatches: sumMatches,
          totalRevenue: sumRevenue,
        });
      }
    } catch (error) {
      console.error('Failed to fetch sales performance:', error);
    } finally {
      setLoadingMaster(false);
    }
  };

  useEffect(() => {
    fetchSalesPerformance(getDefaultYm());
  }, []);

  // 검색(조회) 실행 - 실적년월은 서버에서 필터, 사원ID/이름은 클라이언트 필터
  const handleSearch = async (e) => {
    if (e) e.preventDefault();

    // 실적년월이 변경된 경우 서버에서 새로 조회
    await fetchSalesPerformance(searchPerfYm);

    // 사원ID/이름은 클라이언트 사이드 필터 (fetchSalesPerformance 완료 후 아래서 처리)
    // fetchSalesPerformance가 setSalespeople + setFilteredSalespeople를 갱신하므로
    // 이름/ID 필터는 그 결과에서 다시 필터링
    const idQuery = searchId.trim().toLowerCase();
    const nameQuery = searchName.trim().toLowerCase();

    if (idQuery || nameQuery) {
      setFilteredSalespeople(prev => {
        const filtered = prev.filter(sp => {
          const matchId = idQuery ? sp.adminId.toLowerCase().includes(idQuery) : true;
          const matchName = nameQuery ? sp.adminName.toLowerCase().includes(nameQuery) : true;
          return matchId && matchName;
        });
        // 선택된 사원이 필터에서 사라지면 닫기
        if (selectedSalesperson && !filtered.some(sp => sp.adminId === selectedSalesperson.adminId)) {
          setSelectedSalesperson(null);
          setDetails([]);
        }
        return filtered;
      });
    }
  };

  // 초기화 실행 - 실적년월은 당월로 복원
  const handleReset = () => {
    setSearchId('');
    setSearchName('');
    const defaultYm = getDefaultYm();
    setSearchPerfYm(defaultYm);
    fetchSalesPerformance(defaultYm);
  };

  // 특정 영업사원 선택 시 상세 정보 조회
  const handleSelectSalesperson = async (salesperson, perfYm) => {
    setSelectedSalesperson(salesperson);
    setLoadingDetail(true);
    setDetails([]);
    try {
      const params = new URLSearchParams();
      params.append('adminId', salesperson.adminId);
      const ym = perfYm !== undefined ? perfYm : searchPerfYm;
      if (ym) params.append('perfYm', ym.replace('-', ''));
      const response = await fetch(`/api/admin/my-performance?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setDetails(data);
      }
    } catch (error) {
      console.error('Failed to fetch detail performance:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  // 등급별 뱃지 스타일 정의
  const getRoleBadge = (role) => {
    switch (role) {
      case 'SUPER':
        return <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded text-xs font-bold">SUPER</span>;
      case 'MANAGER':
        return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded text-xs font-bold">MANAGER</span>;
      case 'SALES':
        return <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded text-xs font-bold">SALES</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">{role || '미정'}</span>;
    }
  };

  const selectedCompleted = Array.isArray(details)
    ? details.filter((item) => item && (item.dataStat === 'CONFIRM' || item.dataStat === 'DONE'))
    : [];

  const selectedTotalSales = selectedCompleted.reduce(
    (sum, item) => sum + Number(item?.biddingPrice || 0), 0
  );

  const selectedTotalFee = selectedCompleted.reduce((sum, item) => {
    if (!item) return sum;
    const isRegular = ['DRIVER_GENERAL', 'DRIVER_GENNERAL', 'DRIVER_MIDDLE', 'DRIVER_HIGH'].includes(item.feePolicy);
    const rate = isRegular ? 0.106 : 0.066;
    return sum + Math.floor(Number(item.biddingPrice || 0) * rate);
  }, 0);

  const selectedBusinessTax = Math.floor(selectedTotalFee * 0.03);
  const selectedLocalTax = Math.floor(selectedBusinessTax * 0.1);
  const selectedNetPayout = selectedTotalFee - selectedBusinessTax - selectedLocalTax;

  const formatAmt = (amt) => {
    return Number(amt || 0).toLocaleString('ko-KR') + '원';
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <BarChart3 className="text-emerald-500" size={26} />
            영업사원 실적 관리
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            사원별로 추천 가입한 드라이버 수 및 이들이 수행한 배차/입찰 실적 통계를 모니터링합니다.
          </p>
        </div>
        {searchPerfYm && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 text-emerald-800 text-sm font-black shadow-xs self-start sm:self-auto">
            <Clock size={16} className="text-emerald-600 animate-pulse" />
            <span>조회 기준월: {searchPerfYm.split('-')[0]}년 {searchPerfYm.split('-')[1]}월</span>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        {/* Card 1: Total Registered Drivers */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-slate-400">총 기사 유치수</span>
            <span className="text-2xl font-black text-slate-800">{summary.totalDrivers.toLocaleString()} 명</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
            <Users size={24} />
          </div>
        </div>

        {/* Card 2: Total Matches Completed */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-slate-400">총 매칭 성사 건수</span>
            <span className="text-2xl font-black text-slate-800">{summary.totalMatches.toLocaleString()} 건</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
            <UserCheck size={24} />
          </div>
        </div>

        {/* Card 3: Total Platform Fee Revenue */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-slate-400">총 플랫폼 수수료 수익</span>
            <span className="text-2xl font-black text-slate-800">{summary.totalRevenue.toLocaleString()} 원</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 font-bold text-xl shrink-0">
            ₩
          </div>
        </div>
      </div>

      {/* Middle: Search Panel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4 text-left">
          <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-slate-600">사원 아이디</label>
            <input
              type="text"
              placeholder="사원 ID 입력"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
            />
          </div>

          <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-slate-600">사원 이름</label>
            <input
              type="text"
              placeholder="사원 이름 입력"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
            />
          </div>

          <div className="flex flex-col gap-2" style={{minWidth: '180px'}}>
            <label className="text-xs font-bold text-slate-600">실적년월</label>
            <input
              type="month"
              value={searchPerfYm}
              onChange={(e) => setSearchPerfYm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold px-5 py-3.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
            >
              <RotateCcw size={15} />
              초기화
            </button>
            <button
              type="submit"
              className="bg-primary hover:bg-emerald-800 text-white text-sm font-bold px-8 py-3.5 rounded-xl transition-all shadow-md flex items-center gap-1.5 active:scale-95"
            >
              <Search size={15} />
              조회
            </button>
          </div>
        </form>
      </div>

      {/* Top: Salespeople Master Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <Award className="text-emerald-500" size={22} />
          <h2 className="text-lg font-bold text-slate-800">사원별 실적 집계 목록</h2>
          <span className="text-xs text-slate-400 font-medium ml-2">* 사원을 선택하면 하단에 세부 성사 내역이 표시됩니다.</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-4 text-center">사원 아이디</th>
                <th className="py-4 px-4 text-center">이름</th>
                <th className="py-4 px-4 text-center">실적년월</th>
                <th className="py-4 px-4 text-center">유치 기사 수</th>
                <th className="py-4 px-4 text-center">매칭 성사 수</th>
                <th className="py-4 px-4 text-center">총 거래액 (입찰가)</th>
                <th className="py-4 px-4 text-center">총 수수료 수익</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loadingMaster ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400 font-medium">
                    데이터를 불러오는 중입니다...
                  </td>
                </tr>
              ) : filteredSalespeople.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400 font-medium">
                    검색 조건에 일치하는 영업사원 실적 정보가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredSalespeople.map((sp) => (
                  <tr
                    key={sp.adminId}
                    onClick={() => handleSelectSalesperson(sp)}
                    className={`cursor-pointer transition-colors text-sm font-medium text-slate-700 ${
                      selectedSalesperson?.adminId === sp.adminId
                        ? 'bg-emerald-500/10 hover:bg-emerald-500/15'
                        : 'hover:bg-slate-50/50'
                    }`}
                  >
                    <td className="py-4 px-4 text-slate-900 font-bold text-center">{sp.adminId}</td>
                    <td className="py-4 px-4 text-slate-800 font-bold text-center">{sp.adminName}</td>
                    <td className="py-4 px-4 text-center">
                      <span className="px-2 py-0.5 bg-emerald-50 rounded text-xs font-bold text-emerald-700">
                        {searchPerfYm ? searchPerfYm : '전체'}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-bold text-blue-600 text-center">{sp.driverCount.toLocaleString()} 명</td>
                    <td className="py-4 px-4 font-bold text-emerald-600 text-center">{sp.matchCount.toLocaleString()} 건</td>
                    <td className="py-4 px-4 text-slate-600 text-center">{parseInt(sp.totalBidding).toLocaleString()} 원</td>
                    <td className="py-4 px-4 font-bold text-slate-900 text-center">{parseInt(sp.totalFee).toLocaleString()} 원</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom: Detailed Matching List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="text-emerald-500" size={22} />
          <h2 className="text-lg font-bold text-slate-800">
            {selectedSalesperson ? (
              <span className="text-emerald-600">
                [{selectedSalesperson.adminName}] 사원의 상세 매칭 실적
                <span className="ml-2 text-sm font-bold text-slate-400">({searchPerfYm || '전체'})</span>
              </span>
            ) : (
              '상세 매칭 실적 내역'
            )}
          </h2>
        </div>

        {selectedSalesperson ? (
          loadingDetail ? (
            <div className="py-12 text-center text-slate-400 font-medium">
              상세 내역 데이터를 가져오는 중입니다...
            </div>
          ) : details.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-medium">
              이 사원이 매칭 완료한 버스기사 운행 이력이 아직 없습니다.
            </div>
          ) : (
            <div className="flex flex-col gap-8 animate-fade-in">
              {/* KPI Cards Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* 당월 운행 완료 */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 flex items-center justify-between shadow-sm text-left">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-400">당월 매칭 완료</span>
                    <span className="text-2xl font-black text-slate-800 mt-1">{selectedCompleted.length}건</span>
                    <span className="text-xs text-slate-400 mt-2 font-medium">조회 월 매칭 완료 건수</span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
                    <TrendingUp size={24} />
                  </div>
                </div>

                {/* 당월 매출 실적 */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 flex items-center justify-between shadow-sm text-left">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-400">당월 총 운행금액</span>
                    <span className="text-2xl font-black text-emerald-600 mt-1">{formatAmt(selectedTotalSales)}</span>
                    <span className="text-xs text-slate-400 mt-2 font-medium">완료 건 기준 매출 총액</span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0 font-bold text-xl">
                    ₩
                  </div>
                </div>

                {/* 당월 총 수당금액 */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 flex items-center justify-between shadow-sm text-left">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-400">당월 총 수당액</span>
                    <span className="text-2xl font-black text-indigo-600 mt-1">{formatAmt(selectedTotalFee)}</span>
                    <span className="text-xs text-slate-400 mt-2 font-medium">세전 수당 합계 금액</span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0 font-bold text-xl">
                    ₩
                  </div>
                </div>

                {/* 당월 실지급액 (세후) */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 flex items-center justify-between shadow-sm text-left">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                      실지급액 <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 rounded">세후</span>
                    </span>
                    <span className="text-2xl font-black text-slate-900 mt-1">{formatAmt(selectedNetPayout)}</span>
                    <span className="text-xs text-slate-400 mt-2 font-medium">원천세 3.3% 공제 후 금액</span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0 font-bold text-xl">
                    ₩
                  </div>
                </div>
              </div>

              {/* Tax Withholding & Settlement Statement Panel */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-slate-300 rounded-3xl p-6 shadow-md border border-slate-800 text-left">
                <h3 className="text-base font-black text-white flex items-center gap-2 mb-4">
                  <Receipt size={18} className="text-emerald-400" />
                  당월 영업 수당 및 원천세 공제 상세 명세서
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                  <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/30">
                    <p className="text-xs text-slate-400 font-bold">① 총 수당금액 (세전)</p>
                    <p className="text-lg font-black text-white mt-1.5">{formatAmt(selectedTotalFee)}</p>
                    <p className="text-[10px] text-slate-500 mt-1">일반(6.6%) / 정회원(10.6%) 적용 합계</p>
                  </div>
                  <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/30">
                    <p className="text-xs text-slate-400 font-bold">② 사업소득세 (3.0%)</p>
                    <p className="text-lg font-black text-rose-400 mt-1.5">-{formatAmt(selectedBusinessTax)}</p>
                    <p className="text-[10px] text-slate-500 mt-1">총 수당액 × 0.03</p>
                  </div>
                  <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/30">
                    <p className="text-xs text-slate-400 font-bold">③ 지방소득세 (0.3%)</p>
                    <p className="text-lg font-black text-rose-400 mt-1.5">-{formatAmt(selectedLocalTax)}</p>
                    <p className="text-[10px] text-slate-500 mt-1">사업소득세의 10%</p>
                  </div>
                  <div className="bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/20">
                    <p className="text-xs text-emerald-400 font-bold">④ 실제 총 지급액 (세후)</p>
                    <p className="text-xl font-black text-emerald-400 mt-1.5">{formatAmt(selectedNetPayout)}</p>
                    <p className="text-[10px] text-emerald-500/70 mt-1">① - (② + ③) 실제 이체 금액</p>
                  </div>
                </div>
              </div>

              {/* Table List */}
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm text-slate-700 font-medium">
                    {details.map((row) => {
                      const isRegular = ['DRIVER_GENERAL', 'DRIVER_GENNERAL', 'DRIVER_MIDDLE', 'DRIVER_HIGH'].includes(row.feePolicy);
                      const rateLabel = isRegular ? '정회원 (10.6%)' : '일반 (6.6%)';
                      const rateVal = isRegular ? 0.106 : 0.066;
                      const itemComm = Math.floor(Number(row.biddingPrice || 0) * rateVal);

                      const getShortAddr = (addr) => {
                        if (!addr) return '-';
                        const parts = addr.split(' ');
                        return parts.length >= 2 ? `${parts[0]} ${parts[1]}` : addr;
                      };

                      return (
                        <tr key={row.resId} className="hover:bg-slate-50/50">
                          {/* 기사명 */}
                          <td className="py-4.5 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                <User size={14} />
                              </div>
                              <span className="text-slate-800 font-bold">{row.driverName || '-'}</span>
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
                          <td className="py-4.5 px-4 text-slate-800 font-bold">{row.tripTitle || '-'}</td>
                          {/* 매칭 고객 */}
                          <td className="py-4.5 px-4 text-slate-900 font-bold">{row.travelerName || '-'}</td>
                          {/* 운행 경로 */}
                          <td className="py-4.5 px-4">
                            <div className="flex flex-col gap-1 text-xs text-left">
                              <div className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <span className="text-slate-600 font-medium">{getShortAddr(row.startAddr)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                <span className="text-slate-600 font-medium">{getShortAddr(row.endAddr)}</span>
                              </div>
                            </div>
                          </td>
                          {/* 운행 금액 */}
                          <td className="py-4.5 px-4 text-slate-900 font-black">{formatAmt(row.biddingPrice)}</td>
                          {/* 나의 수당 */}
                          <td className="py-4.5 px-4 text-emerald-600 font-extrabold">
                            {row.dataStat === 'CONFIRM' || row.dataStat === 'DONE' ? formatAmt(itemComm) : '-'}
                          </td>
                          {/* 매칭 일시 */}
                          <td className="py-4.5 px-4 text-slate-400">
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              <Clock size={14} />
                              {row.confirmDt || row.regDt}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          <div className="py-12 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <TrendingUp className="text-slate-300 mb-3" size={40} />
            <p className="text-sm font-medium text-slate-500">
              상단 실적 집계 목록에서 사원을 클릭하시면 상세 매칭 운행 이력이 이곳에 표시됩니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesPerformanceManagement;
