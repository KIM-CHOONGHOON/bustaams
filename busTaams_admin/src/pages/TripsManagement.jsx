import React, { useState, useEffect } from 'react';
import { 
  Compass, User, Search, RefreshCw, SlidersHorizontal, Clock, DollarSign,
  X, ShieldAlert, Send, FileText, Phone, MapPin, Calendar, HelpCircle,
  CheckCircle2, XCircle, AlertCircle, Info, ChevronRight, MessageSquare
} from 'lucide-react';

const TripsManagement = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState('all'); // 검색 조건
  const [searchKeyword, setSearchKeyword] = useState(''); // 검색어
  const [startDtFrom, setStartDtFrom] = useState(''); // 출발일자 시작
  const [startDtTo, setStartDtTo] = useState('');   // 출발일자 종료

  // 상세 모달/패널 상태
  const [selectedReqId, setSelectedReqId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('trip'); // 'trip', 'bids', 'inquiries', 'sms'

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        searchType,
        searchKeyword: searchKeyword.trim(),
      });
      if (startDtFrom) params.append('startDtFrom', startDtFrom);
      if (startDtTo)   params.append('startDtTo', startDtTo);
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

  const fetchTripDetails = async (reqId) => {
    setDetailLoading(true);
    setSelectedReqId(reqId);
    setActiveTab('trip');
    try {
      const response = await fetch(`/api/admin/trips/${reqId}/details`);
      if (response.ok) {
        const data = await response.json();
        setDetailData(data);
      } else {
        console.error('Failed to fetch details');
      }
    } catch (error) {
      console.error('Error fetching details:', error);
    } finally {
      setDetailLoading(false);
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
    setStartDtFrom('');
    setStartDtTo('');
    setTimeout(() => {
      fetchTrips();
    }, 0);
  };

  const closeDetail = () => {
    setSelectedReqId(null);
    setDetailData(null);
  };

  // 결제 상태 배지 컴포넌트
  const getPaymentBadge = (status) => {
    switch (status) {
      case '2':
        return (
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-bold shadow-sm whitespace-nowrap">
            결제완료
          </span>
        );
      case '1':
        return (
          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-xs font-bold animate-pulse shadow-sm whitespace-nowrap">
            결제요청
          </span>
        );
      case '0':
      default:
        return (
          <span className="px-2.5 py-1 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-xs font-medium whitespace-nowrap">
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
          <span className="px-2.5 py-1 bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm whitespace-nowrap">
            확정됨
          </span>
        );
      case 'BIDDING':
        return (
          <span className="px-2.5 py-1 bg-blue-500 text-white rounded-lg text-xs font-bold shadow-sm whitespace-nowrap">
            입찰중
          </span>
        );
      case 'AUCTION':
        return (
          <span className="px-2.5 py-1 bg-amber-500 text-white rounded-lg text-xs font-bold shadow-sm whitespace-nowrap">
            대기중
          </span>
        );
      case 'DONE':
        return (
          <span className="px-2.5 py-1 bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-sm whitespace-nowrap">
            완료
          </span>
        );
      case 'TRAVELER_CANCEL':
        return (
          <span className="px-2.5 py-1 bg-rose-500 text-white rounded-lg text-xs font-bold shadow-sm whitespace-nowrap">
            여행자 취소
          </span>
        );
      case 'DRIVER_CANCEL':
        return (
          <span className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold shadow-sm whitespace-nowrap">
            기사 취소
          </span>
        );
      case 'BUS_CANCEL':
        return (
          <span className="px-2.5 py-1 bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm whitespace-nowrap">
            차량 취소
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-slate-400 text-white rounded-lg text-xs font-medium whitespace-nowrap">
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
    // 괄호 및 괄호 안의 문자열 제거
    const cleanAddr = addr.replace(/\s*[\(\[].*?[\)\]]/g, '').trim();
    const parts = cleanAddr.split(' ');
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[1]}`;
    }
    return cleanAddr;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8 animate-fade-in relative">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Compass className="text-emerald-500" size={32} />
            여정/입찰현황
          </h1>
          <p className="text-slate-500 font-medium mt-1.5">
            등록된 모든 여행 요청 건의 상세 진행 상황, 기사 입찰 내역 및 고객 민원(상담, 취소 페널티, 발송 이력)을 모니터링합니다.
          </p>
        </div>
        <button
          onClick={fetchTrips}
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

          {/* 1행: 출발일자 조회기간 */}
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-2 text-slate-700 shrink-0 w-full md:w-auto">
              <Calendar size={18} className="text-emerald-500" />
              <span className="text-sm font-bold">출발일자</span>
            </div>
            <div className="flex items-center gap-2 flex-1 w-full">
              <input
                type="date"
                id="startDtFrom"
                value={startDtFrom}
                onChange={(e) => setStartDtFrom(e.target.value)}
                max={startDtTo || undefined}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
              />
              <span className="text-slate-400 font-bold text-sm shrink-0">~</span>
              <input
                type="date"
                id="startDtTo"
                value={startDtTo}
                onChange={(e) => setStartDtTo(e.target.value)}
                min={startDtFrom || undefined}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
              />
            </div>
          </div>

          {/* 2행: 키워드 검색 */}
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-2 text-slate-700 shrink-0 w-full md:w-auto">
              <SlidersHorizontal size={18} className="text-emerald-500" />
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
                className="flex-1 md:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
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
          </div>

        </form>
      </div>

      {/* Trips Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4.5 px-6">예약 고객</th>
                <th className="py-4.5 px-6">여행 제목</th>
                <th className="py-4.5 px-6">출발지 / 목적지</th>
                <th className="py-4.5 px-6">여행 일정</th>
                <th className="py-4.5 px-6 text-right">요청 금액</th>
                <th className="py-4.5 px-6 text-center">결제 상태</th>
                <th className="py-4.5 px-6 text-center">진행 상태</th>
                <th className="py-4.5 px-6 text-center">등록 일시</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center text-slate-400">
                    <span className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin inline-block"></span>
                    <p className="mt-3 text-sm font-semibold text-slate-500">여정 정보를 불러오고 있습니다...</p>
                  </td>
                </tr>
              ) : trips.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center text-slate-400 font-medium">
                    등록된 여행 정보가 존재하지 않습니다.
                  </td>
                </tr>
              ) : (
                trips.map((item) => (
                  <tr 
                    key={item.reqId} 
                    onClick={() => fetchTripDetails(item.reqId)}
                    className="hover:bg-emerald-50/30 cursor-pointer transition-colors text-sm font-medium text-slate-700"
                  >
                    {/* 예약 고객 */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                          {item.travelerName ? item.travelerName.charAt(0) : 'U'}
                        </div>
                        <span className="text-slate-800 font-bold">{item.travelerName || '미확인 고객'}</span>
                      </div>
                    </td>
                    {/* 여행 제목 */}
                    <td className="py-4 px-6 text-slate-900 font-semibold">{item.tripTitle || '-'}</td>
                    {/* 출발지 / 목적지 */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1 max-w-[220px]">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span className="text-slate-700 font-medium truncate">{getShortAddr(item.startAddr)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                          <span className="text-slate-700 font-medium truncate">{getShortAddr(item.destAddr || item.endAddr)}</span>
                        </div>
                      </div>
                    </td>
                    {/* 여행 일정 */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col text-xs gap-0.5">
                        <span className="font-bold text-slate-700">{item.startDt} 출발</span>
                        <span className="text-slate-400">{item.endDt} 도착</span>
                      </div>
                    </td>
                    {/* 요청 금액 */}
                    <td className="py-4 px-6 text-right text-slate-900 font-extrabold text-base">{formatAmt(item.reqAmt)}</td>
                    {/* 결제 상태 */}
                    <td className="py-4 px-6 text-center">
                      {getPaymentBadge(item.paymentSts)}
                    </td>
                    {/* 진행 상태 */}
                    <td className="py-4 px-6 text-center">
                      {getStatusBadge(item.dataStat)}
                    </td>
                    {/* 등록 일시 */}
                    <td className="py-4 px-6 text-center text-slate-400 text-xs">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} />
                        {item.regDt || '-'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Detail Drawer Panel */}
      {selectedReqId && (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
          {/* Backdrop glass */}
          <div 
            onClick={closeDetail}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
          ></div>

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-3xl transform transition-transform duration-300 ease-out bg-white shadow-2xl flex flex-col h-full border-l border-slate-100 animate-slide-in">
              
              {/* Header */}
              <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between shadow-md shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase bg-emerald-500 px-2 py-0.5 rounded text-white tracking-wider shadow-sm">
                      여정 상세 조회
                    </span>
                  </div>
                  <h2 className="text-xl font-black mt-1 text-white">
                    {detailData?.trip?.tripTitle || '로딩 중...'}
                  </h2>
                </div>
                <button 
                  onClick={closeDetail}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Detail Content Container */}
              {detailLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-500">
                  <span className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
                  <p className="mt-4 font-bold text-slate-600">여정의 상세 데이터를 조회하고 있습니다...</p>
                </div>
              ) : !detailData ? (
                <div className="flex-1 flex items-center justify-center p-10 text-slate-400 font-medium">
                  데이터를 가져오는 중 오류가 발생했거나 데이터가 존재하지 않습니다.
                </div>
              ) : (
                <>
                  {/* Tabs menu */}
                  <div className="flex bg-slate-100 p-1 shrink-0 border-b border-slate-200">
                    <button
                      onClick={() => setActiveTab('trip')}
                      className={`flex-1 py-3 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === 'trip' 
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Compass size={14} />
                      여정 정보
                    </button>
                    <button
                      onClick={() => setActiveTab('bids')}
                      className={`flex-1 py-3 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === 'bids' 
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Compass size={14} className="rotate-45" />
                      기사 입찰 ({detailData.bids?.length || 0})
                    </button>
                    <button
                      onClick={() => setActiveTab('inquiries')}
                      className={`flex-1 py-3 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === 'inquiries' 
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <MessageSquare size={14} />
                      고객 민원/문의 ({detailData.inquiries?.length || 0})
                    </button>
                    <button
                      onClick={() => setActiveTab('sms')}
                      className={`flex-1 py-3 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === 'sms' 
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Send size={14} />
                      문자 이력 ({detailData.smsLogs?.length || 0})
                    </button>
                  </div>

                  {/* Tab contents (Scrollable) */}
                  <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">

                    {/* TAB: Trip details */}
                    {activeTab === 'trip' && (
                      <div className="space-y-6 animate-fade-in">
                        {/* 1. Basic Travel Specification */}
                        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
                          <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                            <Info size={16} className="text-emerald-500" />
                            여정 정보 스펙
                          </h3>
                          <div className="grid grid-cols-2 gap-4 text-sm font-medium">
                            <div className="col-span-2 space-y-3">
                              <div className="flex items-start gap-3">
                                <MapPin size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-xs text-slate-400 font-bold">출발지 주소</p>
                                  <p className="text-slate-800 font-semibold">{detailData.trip.startAddr}</p>
                                </div>
                              </div>
                              {detailData.trip.destAddr && (
                                <div className="flex items-start gap-3">
                                  <MapPin size={18} className="text-teal-500 mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-xs text-slate-400 font-bold">목적지 주소</p>
                                    <p className="text-slate-800 font-semibold">{detailData.trip.destAddr}</p>
                                  </div>
                                </div>
                              )}
                              <div className="flex items-start gap-3">
                                <MapPin size={18} className="text-indigo-500 mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-xs text-slate-400 font-bold">도착지 주소 (귀가행선지)</p>
                                  <p className="text-slate-800 font-semibold">{detailData.trip.endAddr}</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="border-t border-slate-50 pt-3 flex items-center gap-2">
                              <Calendar size={16} className="text-slate-400" />
                              <div>
                                <p className="text-xs text-slate-400 font-bold">출발 시각</p>
                                <p className="text-slate-700 font-semibold">{detailData.trip.startDt}</p>
                              </div>
                            </div>
                            <div className="border-t border-slate-50 pt-3 flex items-center gap-2">
                              <Calendar size={16} className="text-slate-400" />
                              <div>
                                <p className="text-xs text-slate-400 font-bold">도착 예정 시각</p>
                                <p className="text-slate-700 font-semibold">{detailData.trip.endDt}</p>
                              </div>
                            </div>
                            
                            <div className="border-t border-slate-50 pt-3">
                              <p className="text-xs text-slate-400 font-bold">요청 가격</p>
                              <p className="text-emerald-600 font-black text-lg">{formatAmt(detailData.trip.reqAmt)}</p>
                            </div>

                            <div className="border-t border-slate-50 pt-3">
                              <p className="text-xs text-slate-400 font-bold">진행 상태</p>
                              <p className="mt-1">{getStatusBadge(detailData.trip.dataStat)}</p>
                            </div>
                          </div>
                        </div>

                        {/* 1-2. Requested Bus Info */}
                        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
                          <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                            <Compass size={16} className="text-emerald-500" />
                            요청 버스 정보
                          </h3>
                          {detailData.buses && detailData.buses.length > 0 ? (
                            <div className="space-y-3">
                              {detailData.buses.map((bus) => (
                                <div key={bus.reqBusSeq} className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-100 text-sm font-medium">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                                      {bus.reqBusSeq}
                                    </div>
                                    <div>
                                      <p className="text-slate-800 font-semibold">{bus.busTypeNm || bus.busTypeCd}</p>
                                      <p className="text-xs text-slate-400 font-bold">버스 일련번호: {bus.reqBusSeq}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-slate-900 font-extrabold">{formatAmt(bus.resBusAmt)}</p>
                                    <p className="mt-0.5">
                                      {getStatusBadge(bus.dataStat)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-400 font-medium py-2 text-center">
                              요청된 버스 정보가 없습니다.
                            </p>
                          )}
                        </div>

                        {/* 2. Customer Profile Card */}
                        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
                          <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                            <User size={16} className="text-emerald-500" />
                            예약 고객 정보
                          </h3>
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-black text-lg">
                              {detailData.trip.travelerName ? detailData.trip.travelerName.charAt(0) : 'U'}
                            </div>
                            <div className="flex-1 space-y-1">
                              <p className="text-base font-black text-slate-800">{detailData.trip.travelerName || '미확인'}</p>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 font-bold text-slate-700">
                              <Phone size={14} className="text-slate-400" />
                              {detailData.trip.travelerPhone || '연락처 없음'}
                            </div>
                          </div>
                        </div>

                        {/* 3. Traveler Cancellation Penalty Status */}
                        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
                          <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                            <ShieldAlert size={16} className="text-rose-500" />
                            취소 페널티 및 제재 현황
                          </h3>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                              <p className="text-xs text-slate-400 font-bold">누적 예약 취소 횟수</p>
                              <p className="text-2xl font-black text-slate-800 mt-1">{detailData.cancelManage.cancelCnt}회</p>
                            </div>
                            
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                              <p className="text-xs text-slate-400 font-bold">거래 제한 여부</p>
                              <p className={`text-2xl font-black mt-1 ${detailData.cancelManage.tradeRestrictYn === 'Y' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {detailData.cancelManage.tradeRestrictYn === 'Y' ? '제한 중' : '정상'}
                              </p>
                            </div>
                          </div>

                          {detailData.cancelManage.tradeRestrictYn === 'Y' ? (
                            <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex gap-3 text-rose-700 text-sm font-medium animate-pulse">
                              <AlertCircle size={20} className="shrink-0 mt-0.5" />
                              <div>
                                <p className="font-bold">현재 플랫폼 내 거래(입찰/예약)가 제한된 회원입니다.</p>
                                <p className="text-xs text-rose-500 mt-1 font-bold">
                                  제한 기간: {detailData.cancelManage.restrictStartDt || detailData.cancelManage.tradeRestrictStartDt || '-'} ~ {detailData.cancelManage.restrictEndDt || detailData.cancelManage.tradeRestrictEndDt || '-'}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex gap-3 text-emerald-700 text-sm font-medium">
                              <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
                              <div>
                                <p className="font-bold">거래 제한 정책의 기준을 위반하지 않았으며, 정상 상태입니다.</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TAB: Driver Bids */}
                    {activeTab === 'bids' && (
                      <div className="space-y-4 animate-fade-in">
                        {detailData.bids.length === 0 ? (
                          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 font-medium">
                            <Info size={36} className="mx-auto text-slate-300 mb-3" />
                            응찰에 참여한 버스 기사가 아직 없습니다.
                          </div>
                        ) : (
                          detailData.bids.map((bid) => (
                            <div key={bid.resId} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:border-emerald-200 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 font-bold shrink-0 mt-0.5">
                                  기사
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-slate-900 text-base">{bid.driverName} 기사</span>
                                  </div>
                                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 font-bold">
                                    <span className="flex items-center gap-1">
                                      <Phone size={12} className="text-slate-400" />
                                      {bid.driverPhone || '연락처 없음'}
                                    </span>
                                    <span>차량: {bid.modelNm || '차종 미등록'} ({bid.vehicleNo || '번호판 미등록'})</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex md:flex-col items-end justify-between md:justify-center border-t md:border-t-0 border-slate-50 pt-3.5 md:pt-0">
                                <p className="text-xs text-slate-400 font-bold">제시 입찰가</p>
                                <p className="text-lg font-black text-slate-900 tracking-tight mt-0.5">{formatAmt(bid.biddingPrice)}</p>
                                <div className="mt-1.5 flex items-center gap-1.5">
                                  {bid.bidStat === 'CONFIRM' ? (
                                    <span className="px-2 py-0.5 bg-emerald-500 text-white rounded text-[10px] font-bold">매칭낙찰</span>
                                  ) : bid.bidStat === 'BIDDING' ? (
                                    <span className="px-2 py-0.5 bg-blue-500 text-white rounded text-[10px] font-bold animate-pulse">입찰진행</span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-rose-500 text-white rounded text-[10px] font-bold">{bid.bidStat}</span>
                                  )}
                                  {bid.confirmDt && (
                                    <span className="text-[10px] text-slate-400 font-medium">({bid.confirmDt})</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* TAB: Inquiries */}
                    {activeTab === 'inquiries' && (
                      <div className="space-y-4 animate-fade-in">
                        {detailData.inquiries.length === 0 ? (
                          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 font-medium">
                            <HelpCircle size={36} className="mx-auto text-slate-300 mb-3" />
                            최근 등록된 고객 민원 및 1:1 문의 내역이 없습니다.
                          </div>
                        ) : (
                          detailData.inquiries.map((inq) => (
                            <div key={inq.inqSeq} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4.5">
                              <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] font-black text-slate-600">
                                    {inq.inqCategory}
                                  </span>
                                  <h4 className="text-sm font-black text-slate-800">{inq.title}</h4>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold">
                                  <span className="text-slate-400">{inq.regDt}</span>
                                  {inq.inqStat === 'COMPLETED' ? (
                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md">답변완료</span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-md">답변대기</span>
                                  )}
                                </div>
                              </div>

                              <div className="text-sm text-slate-600 whitespace-pre-line leading-relaxed font-medium bg-slate-50/50 rounded-xl p-3.5 border border-slate-100">
                                {inq.content}
                              </div>

                              {inq.replyContent ? (
                                <div className="bg-emerald-50/20 border border-emerald-100/50 rounded-xl p-4 space-y-1.5">
                                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                                    <CheckCircle2 size={14} />
                                    <span>관리자 답변 답변 완료</span>
                                  </div>
                                  <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed font-medium">
                                    {inq.replyContent}
                                  </p>
                                </div>
                              ) : (
                                <div className="bg-amber-50/20 border border-amber-100/50 rounded-xl p-4 text-amber-700 font-bold text-xs flex items-center gap-1.5">
                                  <AlertCircle size={14} />
                                  <span>이 문의사항은 아직 관리자 답변이 작성되지 않았습니다.</span>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* TAB: SMS logs */}
                    {activeTab === 'sms' && (
                      <div className="space-y-4 animate-fade-in">
                        {detailData.smsLogs.length === 0 ? (
                          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 font-medium">
                            <Send size={36} className="mx-auto text-slate-300 mb-3" />
                            해당 여정 요청과 관련된 시스템 문자 발송 이력이 존재하지 않습니다.
                          </div>
                        ) : (
                          detailData.smsLogs.map((sms) => (
                            <div key={sms.logSeq} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-3">
                              <div className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 bg-slate-800 text-white rounded text-[10px] font-black uppercase">
                                    {sms.sendCategory}
                                  </span>
                                  <span className="text-slate-500 font-bold">수신번호: {sms.receiverPhone}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {sms.sendStat === 'SUCCESS' ? (
                                    <span className="text-emerald-600 font-black flex items-center gap-0.5">
                                      <CheckCircle2 size={12} /> 성공
                                    </span>
                                  ) : (
                                    <span className="text-rose-600 font-black flex items-center gap-0.5">
                                      <XCircle size={12} /> 실패
                                    </span>
                                  )}
                                  <span className="text-slate-400 font-bold">{sms.regDt}</span>
                                </div>
                              </div>

                              <p className="text-sm font-medium text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50 rounded-xl p-3 border border-slate-100">
                                {sms.msgContent}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                  </div>

                  {/* Sticky Footer */}
                  <div className="p-4 bg-white border-t border-slate-100 flex justify-end shrink-0">
                    <button
                      onClick={closeDetail}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md active:scale-95"
                    >
                      상세 닫기
                    </button>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TripsManagement;
