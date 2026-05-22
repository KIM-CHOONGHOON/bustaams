import React, { useState, useEffect } from 'react';
import { Users, User, Search, RefreshCw, SlidersHorizontal, ShieldAlert, CheckCircle, Clock } from 'lucide-react';

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

const MembersManagement = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState('all'); // 검색 조건
  const [searchKeyword, setSearchKeyword] = useState(''); // 검색어

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        userType: 'TRAVELER',
        searchType,
        searchKeyword: searchKeyword.trim(),
      });
      const response = await fetch(`/api/admin/members?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMembers();
  };

  const handleReset = () => {
    setSearchType('all');
    setSearchKeyword('');
    setTimeout(() => {
      fetchMembers();
    }, 0);
  };

  // 회원 상태 배지 컴포넌트
  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-xs font-black flex items-center gap-1 w-fit">
            <CheckCircle size={12} /> ACTIVE (정상)
          </span>
        );
      case 'BANNED':
        return (
          <span className="px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg text-xs font-black flex items-center gap-1 w-fit">
            <ShieldAlert size={12} /> BANNED (정지)
          </span>
        );
      case 'LEAVE':
        return (
          <span className="px-2.5 py-1 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-xs font-black flex items-center gap-1 w-fit">
            LEAVE (탈퇴)
          </span>
        );
      case 'TEMPORARY':
        return (
          <span className="px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg text-xs font-black flex items-center gap-1 w-fit">
            TEMPORARY (대기)
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

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800">여행자 관리</h1>
        <p className="text-slate-500 font-medium mt-1">플랫폼에 가입한 일반 여행객들의 계정 정보를 조회하고 검색할 수 있습니다.</p>
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
              <option value="userNm">사용자명</option>
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

      {/* Member List Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Users className="text-emerald-500" size={22} />
            <h2 className="text-lg font-bold text-slate-800">여행자 목록</h2>
          </div>
          <button
            onClick={fetchMembers}
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
                <th className="py-4 px-4">이름</th>
                <th className="py-4 px-4">아이디 (로그인용)</th>
                <th className="py-4 px-4">이메일</th>
                <th className="py-4 px-4">휴대폰 번호</th>
                <th className="py-4 px-4">가입 일시</th>
                <th className="py-4 px-4">회원 상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400 font-medium">
                    <span className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin inline-block"></span>
                    <p className="mt-2 text-xs">회원 목록을 불러오는 중입니다...</p>
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400 font-medium">
                    조회된 회원 정보가 존재하지 않습니다.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr 
                    key={member.custId} 
                    data-cust-id={member.custId}
                    className="hover:bg-slate-50/50 transition-colors text-sm font-medium text-slate-700"
                  >
                    <td className="py-4.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <User size={14} />
                        </div>
                        <span className="text-slate-800 font-bold">{member.userNm || '-'}</span>
                      </div>
                    </td>
                    <td className="py-4.5 px-4 text-slate-900 font-bold">{member.userId}</td>
                    <td className="py-4.5 px-4 text-slate-500">{member.email || '-'}</td>
                    <td className="py-4.5 px-4 text-slate-600 font-bold">{formatPhone(member.hpNo)}</td>
                    <td className="py-4.5 px-4 text-slate-400 flex items-center gap-1.5 py-5.5">
                      <Clock size={14} />
                      {member.joinDt}
                    </td>
                    <td className="py-4.5 px-4">
                      {getStatusBadge(member.userStat)}
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

export default MembersManagement;
