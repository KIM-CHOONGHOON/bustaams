import React, { useState, useEffect } from 'react';
import { UserPlus, Shield, User, Clock, X, Save } from 'lucide-react';

const UsersManagement = () => {
  // 휴대폰 번호 포맷 헬퍼 (010-1234-5678)
  const formatHpNo = (hp) => {
    if (!hp) return '';
    const cleaned = hp.replace(/[^0-9]/g, '');
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      if (cleaned.startsWith('02')) {
        return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
      }
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return hp;
  };

  // 상태 관리
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isRegModalOpen, setIsRegModalOpen] = useState(false); // 등록 모달 오픈 여부
  const [selectedAdmin, setSelectedAdmin] = useState(null); // 선택된 관리자

  // 신규 등록 폼 데이터
  const [regFormData, setRegFormData] = useState({
    adminId: '',
    adminNm: '',
    deptNm: '',
    hpNo: '',
    email: '',
    role: 'MANAGER',
    bankNm: '',
    acctNo: ''
  });

  // 수정 폼 데이터 (항상 표시하기 위해 기본값 세팅)
  const [editFormData, setEditFormData] = useState({
    adminId: '',
    adminNm: '',
    status: 'ACTIVE',
    deptNm: '',
    hpNo: '',
    email: '',
    bankNm: '',
    acctNo: '',
    role: '' // 등급 정보 보관용
  });

  // 관리자 목록 조회
  const fetchAdmins = async () => {
    try {
      const response = await fetch('/api/admin/list');
      if (response.ok) {
        const data = await response.json();
        setAdmins(data);
      }
    } catch (error) {
      console.error('Failed to fetch admin list:', error);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  // 목록에서 특정 관리자 선택
  const handleSelectAdmin = (admin) => {
    setSelectedAdmin(admin);
    setEditFormData({
      adminId: admin.adminId,
      adminNm: admin.adminNm,
      status: admin.adminStat || 'ACTIVE',
      deptNm: admin.deptNm || '',
      hpNo: formatHpNo(admin.hpNo || ''),
      email: admin.email || '',
      bankNm: admin.bankNm || '',
      acctNo: admin.acctNo || '',
      role: admin.role || 'MANAGER'
    });
  };

  // 신규 등록 입력 변경
  const handleRegChange = (e) => {
    const { name, value } = e.target;
    if (name === 'hpNo') {
      const cleaned = value.replace(/[^0-9]/g, '');
      let formatted = cleaned;
      if (cleaned.length > 3 && cleaned.length <= 7) {
        formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
      } else if (cleaned.length > 7) {
        formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
      }
      setRegFormData(prev => ({ ...prev, hpNo: formatted }));
    } else {
      setRegFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // 수정 입력 변경
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    if (name === 'hpNo') {
      const cleaned = value.replace(/[^0-9]/g, '');
      let formatted = cleaned;
      if (cleaned.length > 3 && cleaned.length <= 7) {
        formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
      } else if (cleaned.length > 7) {
        formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
      }
      setEditFormData(prev => ({ ...prev, hpNo: formatted }));
    } else {
      setEditFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // 신규 관리자 등록 처리 (모달 폼 제출)
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (!regFormData.adminId || !regFormData.adminNm || !regFormData.hpNo) {
      return alert('아이디, 이름, 휴대폰 번호는 필수 입력 항목입니다.');
    }

    if (regFormData.role === 'SALES' && (!regFormData.bankNm || !regFormData.acctNo)) {
      return alert('영업사원 등록 시 환급받을 은행명과 계좌번호는 필수입니다.');
    }

    setLoading(true);
    try {
      // 현재 로그인한 관리자 ID 가져오기 (REG_ID, MOD_ID 기록용)
      const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
      const registeredBy = adminUser.adminId || 'SYSTEM';

      const response = await fetch('/api/admin/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...regFormData, 
          registeredBy,
          bankNm: regFormData.role === 'SALES' ? regFormData.bankNm : null,
          acctNo: regFormData.role === 'SALES' ? regFormData.acctNo : null
        }),
      });

      let errorMsg = '관리자 등록에 실패했습니다.';
      const data = await response.json();
      if (response.ok) {
        alert(`신규 사용자가 성공적으로 등록되었습니다.\n\n초기 비밀번호: [ ${data.tempPassword} ] (휴대폰 번호 뒷 4자리)`);
        setRegFormData({
          adminId: '',
          adminNm: '',
          deptNm: '',
          hpNo: '',
          email: '',
          role: 'MANAGER',
          bankNm: '',
          acctNo: ''
        });
        setIsRegModalOpen(false); // 모달 닫기
        fetchAdmins(); // 목록 갱신
        return;
      } else {
        errorMsg = data.error || errorMsg;
      }
      alert(errorMsg);
    } catch (error) {
      console.error('Signup error:', error);
      alert(`통신 오류가 발생했습니다: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 관리자 정보 수정 처리 (하단 폼 저장 버튼)
  const handleEditSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!selectedAdmin) {
      return alert('수정할 사용자를 목록에서 먼저 선택해주세요.');
    }

    if (editFormData.role === 'SALES' && (!editFormData.bankNm || !editFormData.acctNo)) {
      return alert('영업사원은 환급받을 은행명과 계좌번호가 필수입니다.');
    }

    setLoading(true);
    try {
      const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
      const modifiedBy = adminUser.adminId || 'SYSTEM';

      const response = await fetch(`/api/admin/${editFormData.adminId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editFormData.status,
          adminNm: editFormData.adminNm,
          deptNm: editFormData.deptNm,
          hpNo: editFormData.hpNo,
          email: editFormData.email,
          bankNm: editFormData.role === 'SALES' ? editFormData.bankNm : null,
          acctNo: editFormData.role === 'SALES' ? editFormData.acctNo : null,
          modifiedBy
        }),
      });

      const data = await response.json();
      if (response.ok) {
        alert('사용자 정보가 정상적으로 수정되었습니다.');
        fetchAdmins(); // 목록 갱신
        
        // 로컬 상태 동기화
        setSelectedAdmin(prev => ({
          ...prev,
          adminNm: editFormData.adminNm,
          adminStat: editFormData.status,
          deptNm: editFormData.deptNm,
          hpNo: editFormData.hpNo,
          email: editFormData.email,
          bankNm: editFormData.role === 'SALES' ? editFormData.bankNm : null,
          acctNo: editFormData.role === 'SALES' ? editFormData.acctNo : null
        }));
      } else {
        alert(data.error || '정보 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 상태별 뱃지 스타일 정의
  const getStatusBadge = (status) => {
    const stat = status || 'ACTIVE';
    switch (stat) {
      case 'ACTIVE':
        return (
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-xs font-black">
            ACTIVE (활성)
          </span>
        );
      case 'LOCKED':
        return (
          <span className="px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg text-xs font-black">
            LOCKED (잠금)
          </span>
        );
      case 'LEAVE':
        return (
          <span className="px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg text-xs font-black">
            LEAVE (퇴사)
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">
            {stat}
          </span>
        );
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800">사용자 관리</h1>
        <p className="text-slate-500 font-medium mt-1">백오피스 시스템에 접근할 수 있는 관리자 목록을 관리하고 권한 및 상태를 편집합니다.</p>
      </div>

      {/* Top: Registered Admins List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex-1 min-h-[300px]">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="text-emerald-500" size={22} />
          <h2 className="text-lg font-bold text-slate-800">등록된 관리자 목록</h2>
          <span className="text-xs text-slate-400 font-medium ml-2">* 목록의 행을 선택하시면 하단에서 해당 정보를 수정할 수 있습니다.</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-4 text-center">관리자 아이디</th>
                <th className="py-4 px-4 text-center">이름</th>
                <th className="py-4 px-4 text-center">소속 부서</th>
                <th className="py-4 px-4 text-center">연락처</th>
                <th className="py-4 px-4 text-center">이메일</th>
                <th className="py-4 px-4 text-center">등록일자</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {admins.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400 font-medium">
                    등록된 관리자가 없습니다.
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr 
                    key={admin.adminId} 
                    onClick={() => handleSelectAdmin(admin)}
                    className={`cursor-pointer transition-colors text-sm font-medium text-slate-700 ${
                      selectedAdmin?.adminId === admin.adminId 
                        ? 'bg-emerald-500/10 hover:bg-emerald-500/15' 
                        : 'hover:bg-slate-50/50'
                    }`}
                  >
                    <td className="py-4 px-4 text-slate-900 font-bold text-center">{admin.adminId}</td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <User size={14} />
                        </div>
                        {admin.adminNm}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-600">
                        {admin.deptNm || '미정'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-500 text-center">{formatHpNo(admin.hpNo) || '-'}</td>
                    <td className="py-4 px-4 text-slate-500 text-center">{admin.email || '-'}</td>
                    <td className="py-4 px-4 text-slate-400 text-center">
                      <div className="flex items-center justify-center gap-1.5 py-1">
                        <Clock size={14} />
                        {admin.regDt ? admin.regDt.substring(0, 10) : '-'}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom: User Edit Form (수정 폼 - 항상 표시됨) */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="text-emerald-500" size={22} />
          <h2 className="text-lg font-bold text-slate-800">사용자 수정</h2>
          {!selectedAdmin && (
            <span className="text-xs text-amber-500 font-bold ml-2">* 목록에서 관리자를 클릭하시면 수정할 데이터가 아래에 표시됩니다.</span>
          )}
        </div>

        <form onSubmit={handleEditSubmit} className="flex flex-col gap-6">
          {/* 첫 번째 줄: 아이디, 이름, 부서, 상태 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 아이디 (비활성화) */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-600">아이디 (변경 불가)</label>
              <input
                type="text"
                name="adminId"
                placeholder={selectedAdmin ? "" : "목록에서 사용자를 선택하세요"}
                value={editFormData.adminId}
                disabled
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-400 font-bold cursor-not-allowed"
              />
            </div>

            {/* 이름 */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                이름 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="adminNm"
                placeholder="이름 입력"
                value={editFormData.adminNm}
                onChange={handleEditChange}
                disabled={!selectedAdmin}
                className={`w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${
                  selectedAdmin ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-100/50 border-slate-100 text-slate-400 cursor-not-allowed'
                }`}
                required
              />
            </div>

            {/* 소속 부서 */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-600">소속 부서</label>
              <input
                type="text"
                name="deptNm"
                placeholder="소속 부서 입력"
                value={editFormData.deptNm}
                onChange={handleEditChange}
                disabled={!selectedAdmin}
                className={`w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${
                  selectedAdmin ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-100/50 border-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              />
            </div>

            {/* 상태 선택 */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                관리자 상태 <span className="text-rose-500">*</span>
              </label>
              <select
                name="status"
                value={editFormData.status}
                onChange={handleEditChange}
                disabled={!selectedAdmin}
                className={`w-full border rounded-xl px-3 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${
                  selectedAdmin ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-100/50 border-slate-100 text-slate-400 cursor-not-allowed'
                }`}
                required
              >
                <option value="ACTIVE">ACTIVE (활성)</option>
                <option value="LOCKED">LOCKED (잠금)</option>
                <option value="LEAVE">LEAVE (퇴사)</option>
              </select>
            </div>
          </div>

          {/* 두 번째 줄: 연락처, 이메일 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 휴대폰 번호 */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-600">휴대폰 번호</label>
              <input
                type="text"
                name="hpNo"
                placeholder="010-0000-0000"
                value={editFormData.hpNo}
                onChange={handleEditChange}
                disabled={!selectedAdmin}
                className={`w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${
                  selectedAdmin ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-100/50 border-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              />
            </div>

            {/* 이메일 */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-600">업무용 이메일</label>
              <input
                type="email"
                name="email"
                placeholder="example@bustaams.com"
                value={editFormData.email}
                onChange={handleEditChange}
                disabled={!selectedAdmin}
                className={`w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${
                  selectedAdmin ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-100/50 border-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              />
            </div>
          </div>

          {/* 영업사원 전용 계좌정보 편집란 (동적 노출) */}
          {selectedAdmin && editFormData.role === 'SALES' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100/50 animate-fadeIn">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  환급 은행명 <span className="text-rose-500">*</span>
                </label>
                <select
                  name="bankNm"
                  value={editFormData.bankNm}
                  onChange={handleEditChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
                  required
                >
                  <option value="">은행 선택</option>
                  <option value="KB국민은행">KB국민은행</option>
                  <option value="신한은행">신한은행</option>
                  <option value="우리은행">우리은행</option>
                  <option value="하나은행">하나은행</option>
                  <option value="NH농협은행">NH농협은행</option>
                  <option value="IBK기업은행">IBK기업은행</option>
                  <option value="카카오뱅크">카카오뱅크</option>
                  <option value="토스뱅크">토스뱅크</option>
                  <option value="케이뱅크">케이뱅크</option>
                  <option value="SC제일은행">SC제일은행</option>
                  <option value="KDB산업은행">KDB산업은행</option>
                  <option value="Sh수협은행">Sh수협은행</option>
                  <option value="우체국">우체국</option>
                  <option value="대구은행 (iM뱅크)">대구은행 (iM뱅크)</option>
                  <option value="부산은행">부산은행</option>
                  <option value="광주은행">광주은행</option>
                  <option value="제주은행">제주은행</option>
                  <option value="전북은행">전북은행</option>
                  <option value="경남은행">경남은행</option>
                  <option value="새마을금고">새마을금고</option>
                  <option value="신협">신협</option>
                  <option value="상호저축은행">상호저축은행</option>
                  <option value="지역농·축협">지역농·축협</option>
                  <option value="한국씨티은행">한국씨티은행</option>
                  <option value="산림조합">산림조합</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  환급 계좌번호 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="acctNo"
                  placeholder="- 없이 계좌번호 입력"
                  value={editFormData.acctNo}
                  onChange={handleEditChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
                  required
                />
              </div>
            </div>
          )}

          {/* 버튼 영역 (사용자 등록 & 저장) */}
          <div className="flex justify-end items-center gap-3 mt-2 border-t border-slate-50 pt-4">
            <button
              type="button"
              onClick={() => setIsRegModalOpen(true)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold px-6 py-3.5 rounded-xl transition-all shadow-sm flex items-center gap-2 active:scale-95"
            >
              <UserPlus size={16} />
              사용자 등록
            </button>

            <button
              type="submit"
              disabled={loading || !selectedAdmin}
              className="bg-primary text-white text-sm font-bold px-10 py-3.5 rounded-xl hover:bg-emerald-800 transition-all shadow-md hover:shadow-lg flex items-center gap-2 active:scale-95 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <Save size={16} />
                  저장
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ==================== 사용자 등록 모달 팝업 ==================== */}
      {isRegModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden max-h-[90vh]">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <UserPlus className="text-emerald-500" size={22} />
                <h3 className="text-lg font-bold text-slate-800">신규 사용자 등록</h3>
              </div>
              <button 
                onClick={() => setIsRegModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* 모달 바디 */}
            <form onSubmit={handleRegisterSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {/* 계정 필수 정보 (아이디, 이름, 휴대폰) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                    아이디 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="adminId"
                    placeholder="영문/숫자 아이디 입력"
                    value={regFormData.adminId}
                    onChange={handleRegChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                    이름 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="adminNm"
                    placeholder="실명 입력"
                    value={regFormData.adminNm}
                    onChange={handleRegChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                    휴대폰 번호 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="hpNo"
                    placeholder="010-0000-0000"
                    value={regFormData.hpNo}
                    onChange={handleRegChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    required
                  />
                </div>
              </div>

              {/* 사용자 부가 정보 (소속, 이메일, 등급) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-600">소속 부서</label>
                  <input
                    type="text"
                    name="deptNm"
                    placeholder="예: 운영팀, 영업부"
                    value={regFormData.deptNm}
                    onChange={handleRegChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-600">업무용 이메일</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="example@bustaams.com"
                    value={regFormData.email}
                    onChange={handleRegChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                    관리자 등급 <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="role"
                    value={regFormData.role}
                    onChange={handleRegChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                    required
                  >
                    <option value="SUPER">SUPER (최고 관리자)</option>
                    <option value="MANAGER">MANAGER (일반 관리자)</option>
                    <option value="SALES">SALES (영업 담당자)</option>
                  </select>
                </div>
              </div>

              {/* 영업사원 전용 계좌정보 추가 등록 필드 (동적 노출) */}
              {regFormData.role === 'SALES' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-emerald-50/40 rounded-2xl border border-emerald-100/50 animate-fadeIn">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      환급 은행명 <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="bankNm"
                      value={regFormData.bankNm}
                      onChange={handleRegChange}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
                      required
                    >
                      <option value="">은행 선택</option>
                      <option value="KB국민은행">KB국민은행</option>
                      <option value="신한은행">신한은행</option>
                      <option value="우리은행">우리은행</option>
                      <option value="하나은행">하나은행</option>
                      <option value="NH농협은행">NH농협은행</option>
                      <option value="IBK기업은행">IBK기업은행</option>
                      <option value="카카오뱅크">카카오뱅크</option>
                      <option value="토스뱅크">토스뱅크</option>
                      <option value="케이뱅크">케이뱅크</option>
                      <option value="SC제일은행">SC제일은행</option>
                      <option value="KDB산업은행">KDB산업은행</option>
                      <option value="Sh수협은행">Sh수협은행</option>
                      <option value="우체국">우체국</option>
                      <option value="대구은행 (iM뱅크)">대구은행 (iM뱅크)</option>
                      <option value="부산은행">부산은행</option>
                      <option value="광주은행">광주은행</option>
                      <option value="제주은행">제주은행</option>
                      <option value="전북은행">전북은행</option>
                      <option value="경남은행">경남은행</option>
                      <option value="새마을금고">새마을금고</option>
                      <option value="신협">신협</option>
                      <option value="상호저축은행">상호저축은행</option>
                      <option value="지역농·축협">지역농·축협</option>
                      <option value="한국씨티은행">한국씨티은행</option>
                      <option value="산림조합">산림조합</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      환급 계좌번호 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="acctNo"
                      placeholder="- 없이 계좌번호 입력"
                      value={regFormData.acctNo}
                      onChange={handleRegChange}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
                      required
                    />
                  </div>
                </div>
              )}

              {/* 모달 하단 푸터 버튼 */}
              <div className="flex justify-end gap-3 mt-6 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsRegModalOpen(false)}
                  className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold rounded-xl transition-all active:scale-95"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-10 py-3.5 bg-primary hover:bg-emerald-800 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-95 disabled:bg-slate-300"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      등록
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;
