import React, { useState, useEffect } from 'react';
import { 
  Users, User, Search, RefreshCw, SlidersHorizontal, ShieldAlert, 
  CheckCircle, Clock, X, Info, Award, Phone, Mail, FileText, Bus, 
  Star, ShieldAlert as AlertTriangle, Activity, Eye, Check, AlertCircle
} from 'lucide-react';

const formatPhone = (phone) => {
  if (!phone) return '-';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('82')) {
    const local = '0' + cleaned.slice(2);
    if (local.length === 11) {
      return `${local.slice(0, 3)}-${local.slice(3, 7)}-${local.slice(7)}`;
    } else if (local.length === 10) {
      return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`;
    }
  }
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    if (cleaned.startsWith('02')) {
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 9) {
    if (cleaned.startsWith('02')) {
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5)}`;
    }
  }
  return phone;
};

const DriversManagement = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');

  // 상세 슬라이드오버 상태
  const [selectedCustId, setSelectedCustId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'vehicle', 'docs', 'reviews', 'limits'

  // 서류 심사 및 미리보기 상태
  const [previewFileUrl, setPreviewFileUrl] = useState(null);
  const [rejectingDoc, setRejectingDoc] = useState(null); // { docType, docTypeSeq }
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // 추천인 등록용 상태
  const [selectedDriverForRecom, setSelectedDriverForRecom] = useState(null);
  const [salesAgents, setSalesAgents] = useState([]);
  const [recomSearchKeyword, setRecomSearchKeyword] = useState('');
  const [recomLoading, setRecomLoading] = useState(false);

  const formatBytes = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const getFilePreviewUrl = (gcsPath) => {
    if (!gcsPath) return '';
    
    // 만약 gcsPath에 cafe24 도메인 주소가 포함되어 있다면 제거하여 상대 경로로 가공
    let cleanPath = gcsPath;
    const domainPrefix = 'https://bustaams.cafe24.com/';
    if (cleanPath.startsWith(domainPrefix)) {
      cleanPath = cleanPath.substring(domainPrefix.length);
    }
    
    // GCS 상대 경로 혹은 외부 전체 URL 모두 display-image API 프록시를 통해 로컬 디스크 & GCS 폴백 스트리밍 제공
    return `/api/common/display-image?path=${encodeURIComponent(cleanPath)}`;
  };

  const handleApproveDoc = async (docType, docTypeSeq) => {
    if (!selectedCustId) return;
    if (!window.confirm('이 서류를 승인하시겠습니까?')) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/drivers/${selectedCustId}/docs/${docType}/${docTypeSeq}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        alert('서류가 승인되었습니다.');
        await fetchDriverDetails(selectedCustId);
      } else {
        const errorData = await response.json();
        alert(errorData.error || '승인 처리 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('서류 승인 통신 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectDoc = async () => {
    if (!selectedCustId || !rejectingDoc) return;
    if (!rejectReason.trim()) {
      alert('반려 사유를 입력해주세요.');
      return;
    }
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/drivers/${selectedCustId}/docs/${rejectingDoc.docType}/${rejectingDoc.docTypeSeq}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectReason })
      });
      if (response.ok) {
        alert('서류가 반려 처리되었습니다.');
        setRejectingDoc(null);
        setRejectReason('');
        await fetchDriverDetails(selectedCustId);
      } else {
        const errorData = await response.json();
        alert(errorData.error || '반려 처리 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('서류 반려 통신 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        userType: 'DRIVER',
        searchType,
        searchKeyword: searchKeyword.trim(),
      });
      const response = await fetch(`/api/admin/members?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setDrivers(data);
      }
    } catch (error) {
      console.error('Failed to fetch drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDriverDetails = async (custId) => {
    setDetailLoading(true);
    setSelectedCustId(custId);
    setActiveTab('profile');
    try {
      const response = await fetch(`/api/admin/drivers/${custId}/details`);
      if (response.ok) {
        const data = await response.json();
        setDetailData(data);
      } else {
        console.error('Failed to fetch driver details');
      }
    } catch (error) {
      console.error('Error fetching driver details:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDrivers();
  };

  const handleReset = () => {
    setSearchType('all');
    setSearchKeyword('');
    setTimeout(() => {
      fetchDrivers();
    }, 0);
  };

  const closeDetail = () => {
    setSelectedCustId(null);
    setDetailData(null);
  };

  const fetchSalesAgents = async (keyword = '') => {
    setRecomLoading(true);
    try {
      const response = await fetch(`/api/admin/sales-agents?searchKeyword=${encodeURIComponent(keyword)}`);
      if (response.ok) {
        const data = await response.json();
        setSalesAgents(data);
      }
    } catch (error) {
      console.error('Failed to fetch sales agents:', error);
    } finally {
      setRecomLoading(false);
    }
  };

  const handleRegisterRecom = async (recomCode) => {
    if (!selectedDriverForRecom) return;
    if (!window.confirm(`선택한 영업사원(${recomCode})을 추천인으로 등록하시겠습니까?`)) return;
    setRecomLoading(true);
    try {
      const response = await fetch(`/api/admin/drivers/${selectedDriverForRecom.custId}/recommender`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recomCode })
      });
      if (response.ok) {
        alert('추천인이 성공적으로 등록되었습니다.');
        setSelectedDriverForRecom(null);
        setRecomSearchKeyword('');
        fetchDrivers(); // 리스트 갱신
      } else {
        const errorData = await response.json();
        alert(errorData.error || '추천인 등록 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Failed to register recommender:', error);
      alert('추천인 등록 통신 오류가 발생했습니다.');
    } finally {
      setRecomLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDriverForRecom) {
      fetchSalesAgents(recomSearchKeyword);
    }
  }, [selectedDriverForRecom, recomSearchKeyword]);

  // 회원 상태 배지 컴포넌트
  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-xs font-black flex items-center gap-1 w-fit shadow-sm">
            <CheckCircle size={12} /> 정상 (ACTIVE)
          </span>
        );
      case 'BANNED':
        return (
          <span className="px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg text-xs font-black flex items-center gap-1 w-fit shadow-sm">
            <ShieldAlert size={12} /> 정지 (BANNED)
          </span>
        );
      case 'LEAVE':
        return (
          <span className="px-2.5 py-1 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-xs font-black flex items-center gap-1 w-fit">
            탈퇴 (LEAVE)
          </span>
        );
      case 'TEMPORARY':
        return (
          <span className="px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg text-xs font-black flex items-center gap-1 w-fit shadow-sm">
            대기 (TEMPORARY)
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

  const renderAmenities = (amenitiesStr) => {
    try {
      if (!amenitiesStr) return <span className="text-slate-400 font-medium text-xs">옵션 없음</span>;
      const arr = typeof amenitiesStr === 'string' ? JSON.parse(amenitiesStr) : amenitiesStr;
      if (!Array.isArray(arr) || arr.length === 0) return <span className="text-slate-400 font-medium text-xs">옵션 없음</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {arr.map((item, idx) => (
            <span key={idx} className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded text-[11px] font-bold">
              {item}
            </span>
          ))}
        </div>
      );
    } catch {
      return <span className="text-slate-400 font-medium text-xs">옵션 없음</span>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8 animate-fade-in relative">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="text-emerald-500" size={32} />
            버스기사 관리
          </h1>
          <p className="text-slate-500 font-medium mt-1.5">
            플랫폼에 가입된 기사 회원 계정과 소속 버스 정보, 첨부 제출 서류, 리뷰 평점을 통합 모니터링합니다.
          </p>
        </div>
        <button
          onClick={fetchDrivers}
          disabled={loading}
          className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 text-sm"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          새로고침
        </button>
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
              <option value="userNm">기사명</option>
              <option value="userId">아이디</option>
              <option value="hpNo">전화번호</option>
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

      {/* Drivers List Card Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4.5 px-6">이름</th>
                <th className="py-4.5 px-6">아이디</th>
                <th className="py-4.5 px-6">버스 차량 정보</th>
                <th className="py-4.5 px-6 text-center">추천인 아이디</th>
                <th className="py-4.5 px-6">휴대폰 번호</th>
                <th className="py-4.5 px-6 text-center">회원 상태</th>
                <th className="py-4.5 px-6 text-center">가입 일시</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center text-slate-400">
                    <span className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin inline-block"></span>
                    <p className="mt-3 text-sm font-semibold text-slate-500">기사 정보를 불러오고 있습니다...</p>
                  </td>
                </tr>
              ) : drivers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center text-slate-400 font-medium">
                    가입된 버스기사 정보가 존재하지 않습니다.
                  </td>
                </tr>
              ) : (
                drivers.map((driver) => (
                  <tr 
                    key={driver.custId} 
                    onClick={() => fetchDriverDetails(driver.custId)}
                    className="hover:bg-emerald-50/30 cursor-pointer transition-colors text-sm font-medium text-slate-700"
                  >
                    {/* 이름 */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                          {driver.userNm ? driver.userNm.charAt(0) : 'D'}
                        </div>
                        <span className="text-slate-800 font-bold">{driver.userNm || '미확인 기사'}</span>
                      </div>
                    </td>
                    {/* 아이디 */}
                    <td className="py-4 px-6 text-slate-900 font-semibold">{driver.userId}</td>
                    {/* 버스 정보 */}
                    <td className="py-4 px-6">
                      {driver.vehicleNo ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-800 font-bold">{driver.modelNm}</span>
                          <span className="text-xs text-slate-500 font-medium">
                            {driver.vehicleNo} | {driver.serviceClass || '등급 미지정'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">등록된 버스 없음</span>
                      )}
                    </td>
                    {/* 추천인 아이디 */}
                    <td className="py-4 px-6 text-center">
                      {driver.recomCode ? (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold font-mono shadow-sm">
                          {driver.recomCode}
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDriverForRecom(driver);
                          }}
                          className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
                        >
                          추천인 등록
                        </button>
                      )}
                    </td>
                    {/* 휴대폰 번호 */}
                    <td className="py-4 px-6 text-slate-600 font-bold">{formatPhone(driver.hpNo)}</td>
                    {/* 회원 상태 */}
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center">
                        {getStatusBadge(driver.userStat)}
                      </div>
                    </td>
                    {/* 가입 일시 */}
                    <td className="py-4 px-6 text-center text-slate-400 text-xs">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} />
                        {driver.joinDt || '-'}
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
      {selectedCustId && (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
          {/* Backdrop glass */}
          <div 
            onClick={closeDetail}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
          ></div>

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl transform transition-transform duration-300 ease-out bg-white shadow-2xl flex flex-col h-full border-l border-slate-100 animate-slide-in">
              
              {/* Header */}
              <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between shadow-md shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase bg-emerald-500 px-2 py-0.5 rounded text-white tracking-wider shadow-sm">
                      기사 상세 정보
                    </span>
                  </div>
                  <h2 className="text-xl font-black mt-1 text-white">
                    {detailData?.driver?.userNm ? `${detailData.driver.userNm} 기사님` : '로딩 중...'}
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
                  <p className="mt-4 font-bold text-slate-600">기사의 상세 데이터를 조회하고 있습니다...</p>
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
                      onClick={() => setActiveTab('profile')}
                      className={`flex-1 py-3 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === 'profile' 
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <User size={14} />
                      기사 프로필
                    </button>
                    <button
                      onClick={() => setActiveTab('vehicle')}
                      className={`flex-1 py-3 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === 'vehicle' 
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Bus size={14} />
                      버스 차량 정보
                    </button>
                    <button
                      onClick={() => setActiveTab('docs')}
                      className={`flex-1 py-3 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === 'docs' 
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <FileText size={14} />
                      증빙 서류 상태
                    </button>
                    <button
                      onClick={() => setActiveTab('reviews')}
                      className={`flex-1 py-3 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === 'reviews' 
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Star size={14} />
                      리뷰/평점 ({detailData.reviews?.length || 0})
                    </button>
                    <button
                      onClick={() => setActiveTab('limits')}
                      className={`flex-1 py-3 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === 'limits' 
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Activity size={14} />
                      운행 가능 횟수
                    </button>
                  </div>

                  {/* Tab contents (Scrollable) */}
                  <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">

                    {/* TAB: Driver Profile */}
                    {activeTab === 'profile' && (
                      <div className="space-y-6 animate-fade-in">
                        {/* 1. Basic Account Card */}
                        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
                          <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                            <Info size={16} className="text-emerald-500" />
                            계정 및 기본 정보
                          </h3>
                          <div className="grid grid-cols-2 gap-4 text-sm font-medium">
                            <div>
                              <p className="text-xs text-slate-400 font-bold">아이디</p>
                              <p className="text-slate-800 font-semibold">{detailData.driver.userId}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400 font-bold">가입 일시</p>
                              <p className="text-slate-800 font-semibold">{detailData.driver.joinDt}</p>
                            </div>
                            <div className="border-t border-slate-50 pt-3">
                              <p className="text-xs text-slate-400 font-bold">연락처</p>
                              <p className="text-slate-800 font-semibold flex items-center gap-1">
                                <Phone size={13} className="text-slate-400" />
                                {formatPhone(detailData.driver.hpNo)}
                              </p>
                            </div>
                            <div className="border-t border-slate-50 pt-3">
                              <p className="text-xs text-slate-400 font-bold">이메일</p>
                              <p className="text-slate-800 font-semibold flex items-center gap-1">
                                <Mail size={13} className="text-slate-400" />
                                {detailData.driver.email || '-'}
                              </p>
                            </div>
                            <div className="col-span-2 border-t border-slate-50 pt-3">
                              <p className="text-xs text-slate-400 font-bold">계정 상태</p>
                              <p className="mt-1">{getStatusBadge(detailData.driver.userStat)}</p>
                            </div>
                          </div>
                        </div>

                        {/* 2. Professional Credentials */}
                        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
                          <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                            <Award size={16} className="text-emerald-500" />
                            전문성 정보
                          </h3>
                          <div className="space-y-4">
                            <div className="space-y-1">
                              <p className="text-xs text-slate-400 font-bold">운전 경력</p>
                              <p className="text-slate-800 font-black text-lg mt-0.5">정보 미등록</p>
                            </div>
                            <div className="border-t border-slate-50 pt-3">
                              <p className="text-xs text-slate-400 font-bold">한 줄 소개글</p>
                              <p className="text-slate-600 font-semibold mt-1 text-sm bg-slate-50 rounded-xl p-3 border border-slate-100 whitespace-pre-line leading-relaxed">
                                {detailData.driver.introText || '소개글이 등록되지 않았습니다.'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* 3. Additional Address Info */}
                        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
                          <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                            <FileText size={16} className="text-emerald-500" />
                            주소 정보
                          </h3>
                          <div className="grid grid-cols-2 gap-4 text-sm font-medium">
                            <div>
                              <p className="text-xs text-slate-400 font-bold">성별</p>
                              <p className="text-slate-800 font-semibold mt-0.5">
                                {detailData.driver.sex === 'M' ? '남성' : detailData.driver.sex === 'F' ? '여성' : '-'}
                              </p>
                            </div>
                            <div className="col-span-2 border-t border-slate-50 pt-3">
                              <p className="text-xs text-slate-400 font-bold">주소</p>
                              <p className="text-slate-800 font-semibold mt-0.5">
                                {detailData.driver.address || '-'}
                                {detailData.driver.detailAddress ? ` ${detailData.driver.detailAddress}` : ''}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB: Vehicle Details */}
                    {activeTab === 'vehicle' && (
                      <div className="space-y-6 animate-fade-in">
                        {!detailData.vehicle ? (
                          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 font-medium">
                            <Info size={36} className="mx-auto text-slate-300 mb-3" />
                            등록된 차량 및 버스 정보가 없습니다.
                          </div>
                        ) : (
                          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
                            <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                              <Bus size={16} className="text-emerald-500" />
                              버스 사양 및 성능
                            </h3>
                            <div className="grid grid-cols-2 gap-4 text-sm font-medium">
                              <div>
                                <p className="text-xs text-slate-400 font-bold">차량 번호</p>
                                <p className="text-slate-800 font-semibold mt-0.5">{detailData.vehicle.vehicleNo}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-400 font-bold">모델명</p>
                                <p className="text-slate-800 font-semibold mt-0.5">{detailData.vehicle.modelNm}</p>
                              </div>

                              <div className="border-t border-slate-50 pt-3">
                                <p className="text-xs text-slate-400 font-bold">제작 연식</p>
                                <p className="text-slate-800 font-semibold mt-0.5">{detailData.vehicle.manufactureYear || '-'}년</p>
                              </div>
                              <div className="border-t border-slate-50 pt-3">
                                <p className="text-xs text-slate-400 font-bold">주행거리 (Mileage)</p>
                                <p className="text-slate-800 font-semibold mt-0.5">{Number(detailData.vehicle.mileage || 0).toLocaleString()} km</p>
                              </div>

                              <div className="border-t border-slate-50 pt-3">
                                <p className="text-xs text-slate-400 font-bold">서비스 등급</p>
                                <p className="mt-0.5">
                                  <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-xs font-bold shadow-sm">
                                    {detailData.vehicle.serviceClass}
                                  </span>
                                </p>
                              </div>
                              <div className="border-t border-slate-50 pt-3">
                                <p className="text-xs text-slate-400 font-bold">ADAS 탑재 여부</p>
                                <p className="mt-0.5">
                                  {detailData.vehicle.hasAdas === 'Y' ? (
                                    <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-xs font-bold shadow-sm">탑재</span>
                                  ) : (
                                    <span className="px-2.5 py-0.5 bg-slate-100 text-slate-500 rounded text-xs font-bold">미탑재</span>
                                  )}
                                </p>
                              </div>

                              <div className="col-span-2 border-t border-slate-50 pt-3">
                                <p className="text-xs text-slate-400 font-bold mb-1.5">제공 편의 옵션</p>
                                {renderAmenities(detailData.vehicle.amenities)}
                              </div>

                              <div className="border-t border-slate-50 pt-3">
                                <p className="text-xs text-slate-400 font-bold">최근 검사일</p>
                                <p className="text-slate-800 font-semibold mt-0.5">{detailData.vehicle.lastInspectDt || '-'}</p>
                              </div>
                              <div className="border-t border-slate-50 pt-3">
                                <p className="text-xs text-slate-400 font-bold">보험 만기일</p>
                                <p className="text-slate-800 font-semibold mt-0.5">{detailData.vehicle.insuranceExpDt || '-'}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB: Document Status */}
                    {activeTab === 'docs' && (
                      <div className="space-y-6 animate-fade-in">
                        {(!detailData.documents || detailData.documents.length === 0) ? (
                          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 font-medium">
                            <Info size={36} className="mx-auto text-slate-300 mb-3" />
                            제출된 서류 정보가 없습니다.
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {/* 서류 검토 요약 현황 */}
                            <div className="bg-gradient-to-r from-slate-50 to-indigo-50/30 rounded-2xl border border-slate-100 p-5 flex justify-between items-center shadow-xs">
                              <div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">서류 검토 현황</p>
                                <h4 className="text-base font-black text-slate-800 mt-1">
                                  총 {detailData.documents.length}건 중 {' '}
                                  <span className="text-amber-500 font-extrabold">
                                    {detailData.documents.filter(d => d.approveStat === 'WAIT').length}건
                                  </span>의 대기 서류가 있습니다.
                                </h4>
                              </div>
                              <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-2xs">
                                <Clock size={20} className="text-amber-500 animate-pulse" />
                              </div>
                            </div>

                            {/* 1. 기사 자격 서류 섹션 */}
                            <div className="space-y-3">
                              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">
                                기사 개인 자격 증빙 서류
                              </h3>
                              <div className="grid grid-cols-1 gap-4">
                                {detailData.documents
                                  .filter(d => ['LICENSE', 'QUALIFICATION', 'CAREER_CERT'].includes(d.docType))
                                  .map(doc => {
                                    const docTypeMap = {
                                      LICENSE: '운전면허증',
                                      QUALIFICATION: '버스운전자격증',
                                      CAREER_CERT: '운전경력증명서'
                                    };
                                    
                                    const licenseTypeMap = {
                                      TYPE_1_LARGE: '1종 대형',
                                      TYPE_1_NORMAL: '1종 보통',
                                      TYPE_2_NORMAL: '2종 보통'
                                    };

                                    return (
                                      <div key={doc.docType} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                              {docTypeMap[doc.docType] || doc.docType}
                                            </span>
                                            <h4 className="text-sm font-black text-slate-800 mt-0.5 flex items-center gap-1.5">
                                              {doc.docType === 'LICENSE' && doc.licenseTypeCd && (
                                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md text-[10px] font-bold">
                                                  {licenseTypeMap[doc.licenseTypeCd] || doc.licenseTypeCd}
                                                </span>
                                              )}
                                              <span className="truncate max-w-[200px]" title={doc.orgFileNm}>
                                                {doc.orgFileNm}.{doc.orgFileExt}
                                              </span>
                                              <span className="text-[10px] text-slate-400 font-normal">
                                                ({formatBytes(doc.fileSize)})
                                              </span>
                                            </h4>
                                          </div>
                                          
                                          {/* 상태 표시 배지 */}
                                          {doc.approveStat === 'APPROVE' && (
                                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-black shadow-3xs flex items-center gap-1">
                                              <CheckCircle size={12} /> 승인 완료
                                            </span>
                                          )}
                                          {doc.approveStat === 'REJECT' && (
                                            <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-100 rounded-lg text-xs font-black shadow-3xs flex items-center gap-1">
                                              <AlertCircle size={12} /> 반려됨
                                            </span>
                                          )}
                                          {doc.approveStat === 'WAIT' && (
                                            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg text-xs font-black shadow-3xs flex items-center gap-1 animate-pulse">
                                              <Clock size={12} /> 승인 대기
                                            </span>
                                          )}
                                        </div>

                                        {/* 상세 데이터 메타 영역 */}
                                        <div className="grid grid-cols-2 gap-3 mt-4 bg-slate-50 rounded-xl p-3 text-xs">
                                          <div>
                                            <p className="text-slate-400 font-medium">문서 번호</p>
                                            <p className="text-slate-800 font-black mt-0.5 select-all">{doc.docNo || '미입력'}</p>
                                          </div>
                                          <div>
                                            <p className="text-slate-400 font-medium">발급 일자</p>
                                            <p className="text-slate-800 font-bold mt-0.5">{doc.issueDt || '미입력'}</p>
                                          </div>
                                        </div>

                                        {/* 반려 사유 노출 */}
                                        {doc.approveStat === 'REJECT' && doc.rejectReason && (
                                          <div className="mt-3 bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs text-rose-700 font-medium">
                                            <span className="font-bold flex items-center gap-1 mb-0.5">
                                              <AlertCircle size={12} /> 서류 반려 사유
                                            </span>
                                            {doc.rejectReason}
                                          </div>
                                        )}

                                        {/* 액션 영역 */}
                                        <div className="flex gap-2 mt-4 pt-3 border-t border-slate-50">
                                          <button 
                                            onClick={() => setPreviewFileUrl(getFilePreviewUrl(doc.gcsPath))}
                                            className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                          >
                                            <Eye size={13} /> 원본 확인
                                          </button>
                                          
                                          {doc.approveStat === 'WAIT' && (
                                            <>
                                              <button 
                                                onClick={() => handleApproveDoc(doc.docType, doc.docTypeSeq)}
                                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                                                disabled={actionLoading}
                                              >
                                                승인
                                              </button>
                                              <button 
                                                onClick={() => {
                                                  setRejectingDoc({ docType: doc.docType, docTypeSeq: doc.docTypeSeq });
                                                  setRejectReason('');
                                                }}
                                                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                                                disabled={actionLoading}
                                              >
                                                반려
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>

                            {/* 2. 차량 등록 서류 섹션 */}
                            <div className="space-y-3 pt-2">
                              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">
                                차량 관련 제출 서류 (조회 전용)
                              </h3>
                              <div className="grid grid-cols-1 gap-4">
                                {detailData.documents.filter(d => d.docType.startsWith('VEHICLE_')).length === 0 ? (
                                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-xs font-medium">
                                    차량 등록 서류가 제출되지 않았습니다.
                                  </div>
                                ) : (
                                  detailData.documents
                                    .filter(d => d.docType.startsWith('VEHICLE_'))
                                    .map(doc => {
                                      const vehicleDocTypeMap = {
                                        VEHICLE_BIZ_REG: '사업자등록증',
                                        VEHICLE_TRANSPORT_PERMIT: '여객운송사업허가(등록증)',
                                        VEHICLE_INSURANCE: '보험가입증명서'
                                      };

                                      return (
                                        <div key={doc.docType} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-2xs hover:shadow-xs transition-all">
                                          <div className="flex justify-between items-start">
                                            <div>
                                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                {vehicleDocTypeMap[doc.docType] || doc.docType}
                                              </span>
                                              <h4 className="text-sm font-black text-slate-800 mt-0.5 flex items-center gap-1.5">
                                                <span className="truncate max-w-[220px]" title={doc.orgFileNm}>
                                                  {doc.orgFileNm}.{doc.orgFileExt}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-normal">
                                                  ({formatBytes(doc.fileSize)})
                                                </span>
                                              </h4>
                                            </div>
                                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1">
                                              <CheckCircle size={12} className="text-slate-400" /> 제출 완료
                                            </span>
                                          </div>

                                          <div className="flex gap-2 mt-4 pt-3 border-t border-slate-50">
                                            <button 
                                              onClick={() => setPreviewFileUrl(getFilePreviewUrl(doc.gcsPath))}
                                              className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                            >
                                              <Eye size={13} /> 원본 확인
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB: Reviews & Ratings */}
                    {activeTab === 'reviews' && (
                      <div className="space-y-4 animate-fade-in">
                        {/* Summary Score Card */}
                        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-xs text-slate-400 font-bold">기사 종합 평점</p>
                            <p className="text-3xl font-black text-slate-800 flex items-center gap-1">
                              <Star className="text-amber-400 fill-amber-400" size={26} />
                              {detailData.driver.ratingAvg !== undefined && detailData.driver.ratingAvg !== null 
                                ? Number(detailData.driver.ratingAvg).toFixed(2)
                                : '0.0'}
                            </p>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                            <p className="text-xs text-slate-400 font-bold">누적 리뷰 수</p>
                            <p className="text-2xl font-black text-slate-800 mt-0.5">{detailData.driver.reviewCnt || 0}건</p>
                          </div>
                        </div>

                        {/* Recent Reviews List */}
                        <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wider pl-1 mt-6 mb-2">최근 작성된 평점 리뷰 (최대 5건)</h4>
                        {detailData.reviews.length === 0 ? (
                          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 font-medium">
                            이 기사 회원에게 작성된 고객 리뷰가 아직 없습니다.
                          </div>
                        ) : (
                          detailData.reviews.map((rev) => (
                            <div key={rev.reviewSeq} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-3.5">
                              <div className="flex items-center justify-between border-b border-slate-50 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-amber-500 font-extrabold text-sm flex items-center gap-0.5">
                                    {'★'.repeat(rev.starRating || 5)}
                                  </span>
                                  <span className="text-xs text-slate-400 font-bold">({rev.starRating}점)</span>
                                </div>
                                <div className="text-xs font-bold text-slate-400 flex items-center gap-2">
                                  <span>{rev.writerName || '익명 고객'}</span>
                                  <span>|</span>
                                  <span>{rev.regDt}</span>
                                </div>
                              </div>

                              <p className="text-sm font-semibold text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50/50 rounded-xl p-3 border border-slate-100/50">
                                {rev.commentText}
                              </p>

                              {rev.replyText ? (
                                <div className="bg-emerald-50/20 border border-emerald-100/50 rounded-xl p-3.5 space-y-1">
                                  <p className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                                    <CheckCircle size={12} />
                                    기사 답글
                                  </p>
                                  <p className="text-sm font-medium text-slate-700 whitespace-pre-line leading-relaxed">
                                    {rev.replyText}
                                  </p>
                                </div>
                              ) : null}
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* TAB: Driver Limits (TB_MOM_MEMBER) */}
                    {activeTab === 'limits' && (
                      <div className="space-y-4 animate-fade-in">
                        {/* Title & Description */}
                        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-2">
                          <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                            <Activity size={16} className="text-emerald-500" />
                            월별 운행 가능 횟수 관리 (TB_MOM_MEMBER)
                          </h3>
                          <p className="text-xs text-slate-400 font-bold leading-relaxed">
                            기사의 회원등급에 따라 부여된 월별 입찰(청약) 가능 횟수와 현재까지 사용한 횟수, 잔여 횟수를 조회합니다.
                          </p>
                        </div>

                        {/* Limits Table */}
                        {!detailData.momMember || detailData.momMember.length === 0 ? (
                          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 font-medium">
                            <Info size={36} className="mx-auto text-slate-300 mb-3" />
                            등록된 월별 운행 가능 횟수 정보가 없습니다.
                          </div>
                        ) : (
                          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden border-collapse">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                  <th className="py-3 px-4">구독년월</th>
                                  <th className="py-3 px-4">회원 등급</th>
                                  <th className="py-3 px-4 text-center">기본 제공 횟수</th>
                                  <th className="py-3 px-4 text-center">사용 횟수</th>
                                  <th className="py-3 px-4 text-center">잔여 횟수</th>
                                  <th className="py-3 px-4 text-center">최종 수정일</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50 text-sm font-semibold text-slate-700">
                                {detailData.momMember.map((mom) => {
                                  const getPolicyBadge = (policy) => {
                                    switch (policy) {
                                      case 'DRIVER_HIGH':
                                        return <span className="px-2 py-0.5 bg-purple-50 text-purple-600 border border-purple-100 rounded text-xs font-bold shadow-xs">프리미엄 기사</span>;
                                      case 'DRIVER_MIDDLE':
                                        return <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded text-xs font-bold shadow-xs">우수 기사</span>;
                                      case 'DRIVER_GENERAL':
                                        return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded text-xs font-bold shadow-xs">일반 기사</span>;
                                      case 'DRIVER':
                                        return <span className="px-2 py-0.5 bg-slate-50 text-slate-600 border border-slate-100 rounded text-xs font-bold shadow-xs">기본 기사</span>;
                                      default:
                                        return <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs font-bold">{policy || '미지정'}</span>;
                                    }
                                  };

                                  const formatYyyymm = (yyyymm) => {
                                    if (yyyymm && yyyymm.length === 6) {
                                      return `${yyyymm.slice(0, 4)}년 ${yyyymm.slice(4)}월`;
                                    }
                                    return yyyymm;
                                  };

                                  return (
                                    <tr key={mom.yyyymm} className="hover:bg-slate-50/50">
                                      <td className="py-3.5 px-4 font-bold text-slate-800">
                                        {formatYyyymm(mom.yyyymm)}
                                      </td>
                                      <td className="py-3.5 px-4">
                                        {getPolicyBadge(mom.feePolicy)}
                                      </td>
                                      <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                                        {mom.basicCnt}회
                                      </td>
                                      <td className="py-3.5 px-4 text-center text-slate-600">
                                        {mom.useCnt}회
                                      </td>
                                      <td className="py-3.5 px-4 text-center">
                                        <span className={`font-black ${mom.remainingCnt > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                          {mom.remainingCnt}회
                                        </span>
                                      </td>
                                      <td className="py-3.5 px-4 text-center text-slate-400 text-xs font-medium">
                                        {mom.regDt || '-'}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
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

      {/* 1. 이미지 및 서류 미리보기 모달 */}
      {previewFileUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 max-w-4xl w-full max-h-[85vh] flex flex-col relative animate-scale-in">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <FileText size={18} className="text-indigo-500" />
                서류 원본 미리보기
              </h3>
              <button 
                onClick={() => setPreviewFileUrl(null)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 bg-slate-50 p-6 overflow-auto flex items-center justify-center min-h-[300px]">
              {previewFileUrl.toLowerCase().includes('.pdf') ? (
                <iframe src={previewFileUrl} className="w-full h-[60vh] border-0 rounded-xl" title="PDF Preview" />
              ) : (
                <img src={previewFileUrl} alt="Document Preview" className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-xs" />
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <a 
                href={previewFileUrl} 
                target="_blank" 
                rel="noreferrer"
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                새 창으로 열기
              </a>
              <button 
                onClick={() => setPreviewFileUrl(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. 서류 반려 사유 입력 모달 */}
      {rejectingDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 max-w-md w-full relative animate-scale-in">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <AlertCircle size={18} className="text-rose-500" />
                서류 반려 사유 입력
              </h3>
              <button 
                onClick={() => setRejectingDoc(null)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500 font-medium">
                서류를 반려하는 구체적인 사유를 입력해주세요. 해당 사유는 기사 앱에 노출됩니다.
              </p>
              <textarea 
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="예: 주민등록번호 마스킹 미처리, 면허증 사진 흐림 등으로 반려합니다."
                className="w-full h-32 p-3.5 bg-slate-50 border border-slate-200 focus:border-rose-500 focus:bg-white rounded-2xl text-sm focus:outline-hidden transition-all resize-none text-slate-800 placeholder-slate-400 font-medium font-sans"
              />
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button 
                onClick={() => {
                  setRejectingDoc(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all"
                disabled={actionLoading}
              >
                취소
              </button>
              <button 
                onClick={handleRejectDoc}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                disabled={actionLoading}
              >
                {actionLoading && <RefreshCw size={12} className="animate-spin" />}
                반려 처리
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. 추천인(영업사원) 등록 모달 */}
      {selectedDriverForRecom && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 max-w-md w-full relative animate-scale-in flex flex-col max-h-[80vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Users size={18} className="text-emerald-500" />
                추천 영업사원 등록
              </h3>
              <button 
                onClick={() => {
                  setSelectedDriverForRecom(null);
                  setRecomSearchKeyword('');
                }}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 bg-slate-50 border-b border-slate-100 shrink-0">
              <p className="text-xs text-slate-500 font-bold mb-2">
                기사명: <span className="text-slate-900 font-black">{selectedDriverForRecom.userNm}</span> ({selectedDriverForRecom.userId})
              </p>
              <div className="relative">
                <input 
                  type="text"
                  value={recomSearchKeyword}
                  onChange={(e) => setRecomSearchKeyword(e.target.value)}
                  placeholder="영업사원 이름 또는 아이디 검색"
                  className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-2xl pl-4 pr-10 py-2.5 text-sm focus:outline-hidden transition-all text-slate-800 placeholder-slate-400 font-medium"
                />
                <Search className="absolute right-3.5 top-3 text-slate-400" size={16} />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[200px]">
              {recomLoading ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-500 text-sm">
                  <span className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin inline-block mb-2"></span>
                  <p className="font-semibold">영업사원 목록 검색 중...</p>
                </div>
              ) : salesAgents.length === 0 ? (
                <p className="text-sm text-slate-400 font-medium py-10 text-center">
                  검색된 영업사원이 없습니다.
                </p>
              ) : (
                salesAgents.map((agent) => (
                  <div 
                    key={agent.adminId}
                    onClick={() => handleRegisterRecom(agent.adminId)}
                    className="flex items-center justify-between bg-white border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/10 cursor-pointer rounded-2xl p-4 transition-all shadow-2xs active:scale-98"
                  >
                    <div>
                      <h4 className="text-sm font-black text-slate-800">{agent.adminName}</h4>
                      <p className="text-xs text-slate-400 font-bold mt-0.5">{agent.deptNm || '소속 부서 없음'} | ID: {agent.adminId}</p>
                    </div>
                    <button 
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100 rounded-xl text-xs font-black transition-all"
                    >
                      선택
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
              <button 
                onClick={() => {
                  setSelectedDriverForRecom(null);
                  setRecomSearchKeyword('');
                }}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DriversManagement;
