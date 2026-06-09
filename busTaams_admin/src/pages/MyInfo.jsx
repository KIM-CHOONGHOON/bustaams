import React, { useState, useEffect } from 'react';
import { User, Shield, Key, Save, Phone, Mail, MapPin } from 'lucide-react';

const MyInfo = () => {
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

  // 로컬스토리지에서 로그인된 관리자 정보 로드
  const [adminUser, setAdminUser] = useState(() => {
    const saved = localStorage.getItem('adminUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [profileData, setProfileData] = useState({
    adminId: '',
    adminNm: '',
    deptNm: '',
    hpNo: '',
    email: '',
    role: '',
    bankNm: '',
    acctNo: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (adminUser) {
      setProfileData({
        adminId: adminUser.adminId || '',
        adminNm: adminUser.adminNm || '',
        deptNm: adminUser.deptNm || '',
        hpNo: formatHpNo(adminUser.hpNo || ''),
        email: adminUser.email || '',
        role: adminUser.role || 'MANAGER',
        bankNm: adminUser.bankNm || '',
        acctNo: adminUser.acctNo || ''
      });
    }
  }, [adminUser]);

  // 프로필 정보 변경 입력 처리
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    if (name === 'hpNo') {
      const cleaned = value.replace(/[^0-9]/g, '');
      let formatted = cleaned;
      if (cleaned.length > 3 && cleaned.length <= 7) {
        formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
      } else if (cleaned.length > 7) {
        formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
      }
      setProfileData((prev) => ({ ...prev, hpNo: formatted }));
    } else {
      setProfileData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // 비밀번호 변경 입력 처리
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  // 프로필 정보 업데이트 제출
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profileData.adminNm) {
      return alert('이름은 필수 입력 사항입니다.');
    }

    if (profileData.role === 'SALES' && (!profileData.bankNm || !profileData.acctNo)) {
      return alert('영업사원은 환급 은행명과 계좌번호가 필수 입력 사항입니다.');
    }

    setProfileLoading(true);
    try {
      const response = await fetch(`/api/admin/${profileData.adminId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminNm: profileData.adminNm,
          deptNm: profileData.deptNm,
          hpNo: profileData.hpNo,
          email: profileData.email,
          bankNm: profileData.role === 'SALES' ? profileData.bankNm : null,
          acctNo: profileData.role === 'SALES' ? profileData.acctNo : null,
          modifiedBy: profileData.adminId
        }),
      });

      const data = await response.json();
      if (response.ok) {
        alert('내 정보가 성공적으로 수정되었습니다.');
        // 로컬스토리지 정보 업데이트 및 상태 반영
        const updatedUser = {
          ...adminUser,
          adminNm: profileData.adminNm,
          deptNm: profileData.deptNm,
          hpNo: profileData.hpNo,
          email: profileData.email,
          bankNm: profileData.role === 'SALES' ? profileData.bankNm : null,
          acctNo: profileData.role === 'SALES' ? profileData.acctNo : null
        };
        localStorage.setItem('adminUser', JSON.stringify(updatedUser));
        setAdminUser(updatedUser);
      } else {
        alert(data.error || '정보 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      alert('서버와 통신하는 중 오류가 발생했습니다.');
    } finally {
      setProfileLoading(false);
    }
  };

  // 비밀번호 업데이트 제출
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmNewPassword } = passwordData;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return alert('현재 비밀번호와 새 비밀번호를 모두 입력해주세요.');
    }
    if (newPassword !== confirmNewPassword) {
      return alert('입력하신 새 비밀번호와 새 비밀번호 확인이 서로 일치하지 않습니다.');
    }
    if (newPassword === currentPassword) {
      return alert('새 비밀번호는 현재 비밀번호와 동일할 수 없습니다.');
    }

    setPasswordLoading(true);
    try {
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: profileData.adminId,
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        alert('비밀번호가 안전하게 변경되었습니다.');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: '',
        });
      } else {
        alert(data.error || '비밀번호 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Change password error:', error);
      alert('서버와 통신하는 중 오류가 발생했습니다.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const getRoleLabel = (r) => {
    switch (r) {
      case 'SUPER': return '최고 관리자';
      case 'MANAGER': return '일반 관리자';
      case 'SALES': return '영업 담당자';
      default: return r || '관리자';
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col gap-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800">내 정보 관리</h1>
        <p className="text-slate-500 font-medium mt-1">개인 프로필 정보를 변경하고 비밀번호를 업데이트할 수 있습니다.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Left Side: Profile Summary Card */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-4 border border-emerald-100 shadow-sm">
            <User size={36} />
          </div>
          
          <h2 className="text-xl font-black text-slate-800">{profileData.adminNm}</h2>
          <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">{profileData.adminId}</p>
          
          <div className="mt-3 flex items-center gap-1.5 px-3 py-1 bg-emerald-600/10 text-emerald-700 text-xs font-bold rounded-full">
            <Shield size={12} />
            {getRoleLabel(profileData.role)}
          </div>

          <div className="w-full border-t border-slate-50 my-6"></div>

          <div className="w-full space-y-4 text-left text-sm text-slate-600 font-medium">
            <div className="flex items-center gap-3">
              <Phone size={16} className="text-slate-400 shrink-0" />
              <span className="truncate">{profileData.hpNo || '휴대폰 번호 미등록'}</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-slate-400 shrink-0" />
              <span className="truncate">{profileData.email || '이메일 미등록'}</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin size={16} className="text-slate-400 shrink-0" />
              <span className="truncate">{profileData.deptNm || '소속 부서 미정'}</span>
            </div>
            {profileData.role === 'SALES' && (
              <div className="flex items-center gap-3 border-t border-slate-50 pt-3 mt-1 text-xs">
                <div className="w-4 text-center text-slate-400 font-bold">🏦</div>
                <div className="truncate text-slate-500 font-semibold">
                  {profileData.bankNm ? `${profileData.bankNm} ${profileData.acctNo}` : '계좌 정보 미등록'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Form Inputs */}
        <div className="md:col-span-2 flex flex-col gap-8">
          
          {/* Card 1: Edit Profile Info */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-50 pb-4">
              <User size={20} className="text-emerald-500" />
              <h2 className="text-lg font-bold text-slate-800">개인 정보 수정</h2>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-600">관리자 ID (변경 불가능)</label>
                  <input
                    type="text"
                    value={profileData.adminId}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-400 font-bold cursor-not-allowed"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                    이름 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="adminNm"
                    value={profileData.adminNm}
                    onChange={handleProfileChange}
                    placeholder="실명을 입력하세요"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-600">소속 부서</label>
                  <input
                    type="text"
                    name="deptNm"
                    value={profileData.deptNm}
                    onChange={handleProfileChange}
                    placeholder="소속 부서를 입력하세요"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-600">휴대폰 번호</label>
                  <input
                    type="text"
                    name="hpNo"
                    value={profileData.hpNo}
                    onChange={handleProfileChange}
                    placeholder="010-0000-0000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-600">이메일 주소</label>
                <input
                  type="email"
                  name="email"
                  value={profileData.email}
                  onChange={handleProfileChange}
                  placeholder="email@example.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                />
              </div>

              {/* 영업사원 전용 환급계좌정보 노출 및 편집 */}
              {profileData.role === 'SALES' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100/50 animate-fadeIn">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      환급 은행명 <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="bankNm"
                      value={profileData.bankNm}
                      onChange={handleProfileChange}
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
                      value={profileData.acctNo}
                      onChange={handleProfileChange}
                      placeholder="- 없이 계좌번호 입력"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="bg-primary text-white text-sm font-bold px-8 py-3.5 rounded-xl hover:bg-emerald-800 transition-all shadow-md flex items-center gap-2 active:scale-95 disabled:bg-slate-300"
                >
                  {profileLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <Save size={16} />
                      정보 수정 저장
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Edit Password */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-50 pb-4">
              <Key size={20} className="text-emerald-500" />
              <h2 className="text-lg font-bold text-slate-800">비밀번호 변경</h2>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-600">현재 비밀번호</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="현재 사용 중인 비밀번호 입력"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-600">새 비밀번호</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="변경할 새 비밀번호 입력"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-600">새 비밀번호 확인</label>
                  <input
                    type="password"
                    name="confirmNewPassword"
                    value={passwordData.confirmNewPassword}
                    onChange={handlePasswordChange}
                    placeholder="새 비밀번호 한번 더 입력"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="bg-primary text-white text-sm font-bold px-8 py-3.5 rounded-xl hover:bg-emerald-800 transition-all shadow-md flex items-center gap-2 active:scale-95 disabled:bg-slate-300"
                >
                  {passwordLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <Key size={16} />
                      비밀번호 업데이트
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

export default MyInfo;
