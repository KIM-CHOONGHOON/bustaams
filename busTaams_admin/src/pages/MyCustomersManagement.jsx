import React, { useState, useEffect } from 'react';
import { HeartHandshake, User, RefreshCw, Clock, Award, ShieldCheck } from 'lucide-react';

const MyCustomersManagement = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // 로그인한 관리자 정보 가져오기
  const adminUserStr = localStorage.getItem('adminUser');
  const adminUser = adminUserStr ? JSON.parse(adminUserStr) : null;
  const adminId = adminUser?.adminId || '';
  const adminNm = adminUser?.adminNm || '관리자';

  const fetchMyCustomers = async () => {
    if (!adminId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/my-customers?adminId=${adminId}`);
      if (response.ok) {
        const data = await response.json();
        setDrivers(data);
      }
    } catch (error) {
      console.error('Failed to fetch my customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyCustomers();
  }, [adminId]);

  // 회원 상태 배지 컴포넌트
  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-xs font-black flex items-center gap-1 w-fit">
            <ShieldCheck size={12} /> ACTIVE (정상)
          </span>
        );
      case 'BANNED':
        return (
          <span className="px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg text-xs font-black w-fit">
            BANNED (정지)
          </span>
        );
      case 'LEAVE':
        return (
          <span className="px-2.5 py-1 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-xs font-black w-fit">
            LEAVE (탈퇴)
          </span>
        );
      case 'TEMPORARY':
        return (
          <span className="px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg text-xs font-black w-fit">
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800">나의 고객관리</h1>
          <p className="text-slate-500 font-medium mt-1">
            본인의 관리자 ID를 추천인으로 등록하여 가입한 버스 기사님들의 목록입니다.
          </p>
        </div>
        <button
          onClick={fetchMyCustomers}
          disabled={loading}
          className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 text-sm"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          새로고침
        </button>
      </div>

      {/* Info Card Panel */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg shadow-slate-950/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Award size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{adminNm} ({adminId}) 님의 추천 현황</h3>
            <p className="text-slate-400 text-sm mt-0.5">버스 기사님들 중 가입 시 추천인 코드에 해당 ID를 기재한 고객입니다.</p>
          </div>
        </div>
        <div className="bg-slate-800 px-6 py-3 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center shrink-0 w-full md:w-auto">
          <span className="text-xs text-slate-400 font-medium">추천 등록된 기사님</span>
          <span className="text-2xl font-black text-emerald-400 mt-0.5">{drivers.length}명</span>
        </div>
      </div>

      {/* Driver List Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <HeartHandshake className="text-emerald-500" size={22} />
          <h2 className="text-lg font-bold text-slate-800">추천 기사 목록</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-4">기사명</th>
                <th className="py-4 px-4">아이디 (로그인용)</th>
                <th className="py-4 px-4">휴대폰 번호</th>
                <th className="py-4 px-4">이메일</th>
                <th className="py-4 px-4">추천인 코드</th>
                <th className="py-4 px-4">가입 일시</th>
                <th className="py-4 px-4">회원 상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 font-medium">
                    <span className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin inline-block"></span>
                    <p className="mt-2 text-xs">고객 정보를 불러오는 중입니다...</p>
                  </td>
                </tr>
              ) : drivers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 font-medium">
                    추천 기사 정보가 존재하지 않습니다.
                  </td>
                </tr>
              ) : (
                drivers.map((driver) => (
                  <tr 
                    key={driver.custId} 
                    data-cust-id={driver.custId}
                    className="hover:bg-slate-50/50 transition-colors text-sm font-medium text-slate-700"
                  >
                    {/* 기사명 */}
                    <td className="py-4.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <User size={14} />
                        </div>
                        <span className="text-slate-800 font-bold">{driver.userNm || '-'}</span>
                      </div>
                    </td>
                    {/* 아이디 */}
                    <td className="py-4.5 px-4 text-slate-900 font-bold">{driver.userId}</td>
                    {/* 휴대폰 번호 */}
                    <td className="py-4.5 px-4 text-slate-600 font-bold">{driver.hpNo || '-'}</td>
                    {/* 이메일 */}
                    <td className="py-4.5 px-4 text-slate-500">{driver.email || '-'}</td>
                    {/* 추천인 코드 */}
                    <td className="py-4.5 px-4 text-slate-500 font-mono text-xs font-bold">{driver.recomCode || '-'}</td>
                    {/* 가입 일시 */}
                    <td className="py-4.5 px-4 text-slate-400 flex items-center gap-1.5">
                      <Clock size={14} />
                      {driver.joinDt}
                    </td>
                    {/* 회원 상태 */}
                    <td className="py-4.5 px-4">
                      {getStatusBadge(driver.userStat)}
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

export default MyCustomersManagement;
