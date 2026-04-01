import React, { useState, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';

const DriverProfileSetup = ({ currentUser, onBack }) => {
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    rrnFront: '',
    rrnBack: '',
    phoneNo: currentUser?.hpNo || '',
    verificationCode: '',
    licenseType: '1종 대형',
    licenseNo: '',
    licenseIssueDt: '2023-01-01',
    licenseExpiryDt: '2033-01-01',
    qualCertNo: '',
    bioText: ''
  });

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [qualCert, setQualCert] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef(null);
  const certInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'profile') setProfilePhoto(reader.result);
      else setQualCert(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const payload = {
        userUuid: currentUser.uuid,
        rrn: `${formData.rrnFront}-${formData.rrnBack}`,
        licenseType: formData.licenseType,
        licenseNo: formData.licenseNo,
        licenseIssueDt: formData.licenseIssueDt,
        licenseExpiryDt: formData.licenseExpiryDt,
        qualCertNo: formData.qualCertNo,
        bioText: formData.bioText,
        profilePhotoBase64: profilePhoto,
        qualCertBase64: qualCert
      };

      const res = await fetch(`${API_BASE}/api/driver/profile-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '프로필 저장 실패');

      alert('기사 프로필 등록이 완료되었습니다!');
      if (onBack) onBack();
    } catch (error) {
      console.error('Submit error:', error);
      alert(`오류: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background font-body text-on-surface min-h-screen">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl flex justify-between items-center px-8 h-20 shadow-[0_20px_40px_-15px_rgba(0,104,95,0.08)]">
        <div className="flex items-center gap-12">
          <span className="text-2xl font-bold italic text-primary font-headline tracking-tight pointer-events-none">busTaams</span>
          <div className="hidden md:flex gap-8">
            <a className="text-slate-500 hover:text-primary transition-colors font-semibold" href="#" onClick={(e) => { e.preventDefault(); if (onBack) onBack(); }}>대시보드</a>
            <a className="text-slate-500 hover:text-primary transition-colors font-semibold" href="#">경매내역</a>
            <a className="text-slate-500 hover:text-primary transition-colors font-semibold" href="#">운행일정</a>
            <a className="text-slate-500 hover:text-primary transition-colors font-semibold" href="#">견적관리</a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-primary/5 rounded-full transition-all">
            <span className="material-symbols-outlined text-primary">notifications</span>
          </button>
          <div className="flex items-center gap-3 pl-4 border-l border-outline-variant/30">
            <span className="material-symbols-outlined text-primary text-3xl">account_circle</span>
          </div>
        </div>
      </nav>

      <div className="pt-20 flex min-h-screen">
        {/* Sidebar Navigation (Static for visual matching) */}
        <aside className="h-screen w-72 flex-col sticky left-0 top-20 bg-slate-50/50 p-6 gap-4 hidden md:flex">
          <div className="flex items-center gap-4 mb-8 p-2">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-container-high">
              <img 
                src={profilePhoto || "https://lh3.googleusercontent.com/aida-public/AB6AXuDyfbTDE22uiGCRoBcu6vYjS5bte5LQ3KVhR8FWfMLFJXmCHzeCxChnorafSXiXUvkCe1tZKgjTMlXo0iTcnLWwkJ-c8t9BuPz2eZr9z5ggj7FgP_FBqnPm6ae4zi6rIKJaYpGRuYTMa0pXO1AC9k_Kxv4MFrBVFhDvet6M1lVAZzGkaN2jCVSjE7DxdI3QQ1_6FILHflppumZBH2UU7regHdHtOlFFxUP6xDXiwNfFgD_OOR-e3ISRanILs6B1YLgCxiPH3aBXj3I"} 
                alt="프로필" 
                className="w-full h-full object-cover" 
              />
            </div>
            <div>
              <h3 className="font-headline font-bold text-primary leading-tight">{formData.name || '프리미엄 캡틴'}</h3>
              <p className="text-xs text-slate-500">인증 회원</p>
            </div>
          </div>
          <nav className="flex flex-col gap-2">
            <a className="flex items-center gap-3 p-3 text-slate-500 font-semibold" href="#"><span className="material-symbols-outlined">directions_bus</span>차량 관리</a>
            <a className="flex items-center gap-3 p-3 text-slate-500 font-semibold" href="#"><span className="material-symbols-outlined">gavel</span>실시간 입찰</a>
            <a className="flex items-center gap-3 p-3 text-slate-500 font-semibold" href="#"><span className="material-symbols-outlined">event_available</span>배차 내역</a>
            <a className="flex items-center gap-3 p-3 text-slate-500 font-semibold" href="#"><span className="material-symbols-outlined">payments</span>정산 관리</a>
            <a className="flex items-center gap-3 p-3 bg-white text-primary rounded-xl shadow-sm font-semibold" href="#"><span className="material-symbols-outlined">verified_user</span>인증 센터</a>
            <a className="flex items-center gap-3 p-3 text-slate-500 font-semibold" href="#"><span className="material-symbols-outlined">settings</span>설정</a>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 md:p-12 max-w-5xl mx-auto">
          <header className="mb-12">
            <h1 className="text-4xl font-headline font-extrabold text-primary tracking-tight mb-2">기사 등록</h1>
            <p className="text-on-surface-variant font-medium">busTaams의 프리미엄 캡틴이 되기 위한 필수 정보를 입력해주세요.</p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left: Progress */}
            <div className="lg:col-span-4">
              <div className="sticky top-32 space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">1</div>
                  <span className="font-bold text-primary">기본 인적사항</span>
                </div>
                <div className="flex items-center gap-4 opacity-40">
                  <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center font-bold">2</div>
                  <span className="font-bold">운전면허 정보</span>
                </div>
                <div className="flex items-center gap-4 opacity-40">
                  <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center font-bold">3</div>
                  <span className="font-bold">운송종사자 자격</span>
                </div>
                <div className="pt-8 mt-8 border-t border-outline-variant/20">
                  <div className="p-6 bg-secondary-container/10 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-secondary"></div>
                    <h4 className="font-headline font-bold text-secondary mb-2">주의사항</h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      등록하신 정보는 관리자 승인 후 활성화됩니다. 허위 사실 기재 시 서비스 이용이 제한될 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Form */}
            <div className="lg:col-span-8 space-y-12">
              {/* Photo Upload */}
              <section className="bg-surface-container-lowest p-8 rounded-3xl shadow-[0_40px_60px_-15px_rgba(0,104,95,0.04)] relative">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-3xl bg-surface-container-high flex items-center justify-center overflow-hidden border-2 border-primary/10">
                      {profilePhoto ? (
                        <img src={profilePhoto} alt="미리보기" className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-4xl text-outline">add_a_photo</span>
                      )}
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={(e) => handleFileChange(e, 'profile')} 
                    />
                    <button 
                      onClick={() => fileInputRef.current.click()}
                      className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all"
                    >
                      <span className="material-symbols-outlined text-xl">edit</span>
                    </button>
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-xl font-headline font-bold text-primary mb-2">프로필 사진 업로드</h3>
                    <p className="text-sm text-on-surface-variant mb-4">고객에게 신뢰를 줄 수 있는 밝고 선명한 정면 사진을 권장합니다.</p>
                    <button 
                      onClick={() => fileInputRef.current.click()}
                      className="px-6 py-2 bg-surface-container-high text-primary font-bold rounded-full text-sm hover:bg-surface-container-highest transition-colors"
                    >
                      파일 선택
                    </button>
                  </div>
                </div>
              </section>

              {/* Personal Info */}
              <section className="space-y-6">
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className="text-2xl font-headline font-bold text-primary">기본 인적사항</h2>
                  <span className="text-xs text-secondary font-bold">* 필수 입력</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-on-surface-variant px-1">성명</label>
                    <input 
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full h-14 px-5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 transition-all font-bold" 
                      placeholder="홍길동" 
                      type="text" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-on-surface-variant px-1">주민등록번호</label>
                    <div className="flex items-center gap-2">
                      <input 
                        name="rrnFront"
                        value={formData.rrnFront}
                        onChange={handleChange}
                        maxLength={6}
                        className="w-full h-14 px-5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 text-center font-bold" 
                        placeholder="900101" 
                        type="text" 
                      />
                      <span>-</span>
                      <input 
                        name="rrnBack"
                        value={formData.rrnBack}
                        onChange={handleChange}
                        maxLength={7}
                        className="w-full h-14 px-5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 text-center font-bold" 
                        placeholder="1******" 
                        type="password" 
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-bold text-on-surface-variant px-1">휴대전화 번호</label>
                    <div className="flex gap-3">
                      <input 
                        name="phoneNo"
                        value={formData.phoneNo}
                        onChange={handleChange}
                        className="flex-1 h-14 px-5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 font-bold" 
                        placeholder="010-0000-0000" 
                        type="tel" 
                      />
                      <button className="px-8 bg-primary text-white font-bold rounded-xl active:scale-95 transition-all text-sm">인증번호 발송</button>
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-bold text-on-surface-variant px-1">인증번호 (6자리)</label>
                    <input 
                      name="verificationCode"
                      value={formData.verificationCode}
                      onChange={handleChange}
                      className="w-full h-14 px-5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 font-bold" 
                      placeholder="000000" 
                      type="text" 
                    />
                  </div>
                </div>
              </section>

              {/* License Info */}
              <section className="space-y-6 pt-8">
                <h2 className="text-2xl font-headline font-bold text-primary">운전면허 정보</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-on-surface-variant px-1">면허 종류</label>
                    <select 
                      name="licenseType"
                      value={formData.licenseType}
                      onChange={handleChange}
                      className="w-full h-14 px-5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 appearance-none font-bold"
                    >
                      <option>1종 대형</option>
                      <option>1종 보통</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-on-surface-variant px-1">면허 번호</label>
                    <input 
                      name="licenseNo"
                      value={formData.licenseNo}
                      onChange={handleChange}
                      className="w-full h-14 px-5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 font-bold" 
                      placeholder="00-00-000000-00" 
                      type="text" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-on-surface-variant px-1">발급 일자</label>
                    <input 
                      name="licenseIssueDt"
                      value={formData.licenseIssueDt}
                      onChange={handleChange}
                      className="w-full h-14 px-5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 font-bold" 
                      type="date" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-on-surface-variant px-1">유효 기간</label>
                    <input 
                      name="licenseExpiryDt"
                      value={formData.licenseExpiryDt}
                      onChange={handleChange}
                      className="w-full h-14 px-5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 font-bold" 
                      type="date" 
                    />
                  </div>
                </div>
              </section>

              {/* Qualification */}
              <section className="space-y-6 pt-8">
                <h2 className="text-2xl font-headline font-bold text-primary">운송종사자 자격 정보</h2>
                <div className="p-8 bg-surface-container-lowest rounded-3xl shadow-[0_40px_60px_-15px_rgba(0,104,95,0.04)]">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-on-surface-variant px-1">버스운전 자격번호</label>
                      <input 
                        name="qualCertNo"
                        value={formData.qualCertNo}
                        onChange={handleChange}
                        className="w-full h-14 px-5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 font-bold" 
                        placeholder="자격번호를 입력하세요" 
                        type="text" 
                      />
                    </div>
                    <div className="flex flex-col gap-4">
                      <p className="text-sm font-bold text-on-surface-variant">자격증 사본 업로드</p>
                      <input 
                        type="file" 
                        ref={certInputRef} 
                        className="hidden" 
                        accept="image/*,application/pdf" 
                        onChange={(e) => handleFileChange(e, 'cert')} 
                      />
                      <div 
                        onClick={() => certInputRef.current.click()}
                        className="w-full h-40 border-2 border-dashed border-outline-variant rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        {qualCert ? (
                          <div className="flex items-center gap-2 text-primary font-bold">
                            <span className="material-symbols-outlined">description</span>
                            <span>파일이 선택되었습니다</span>
                          </div>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-3xl text-outline group-hover:text-primary transition-colors">cloud_upload</span>
                            <span className="text-sm text-outline-variant font-medium">JPG, PNG, PDF (최대 5MB)</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Bio / Strengths */}
              <section className="space-y-6 pt-8">
                <h2 className="text-2xl font-headline font-bold text-primary">자기소개 및 강점</h2>
                <textarea 
                  name="bioText"
                  value={formData.bioText}
                  onChange={handleChange}
                  className="w-full h-40 px-5 py-4 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 transition-all font-medium resize-none" 
                  placeholder="당신의 15년 이상의 경력과 안전 노하우를 기재해주세요. 예: '15년 경력의 베테랑 기사로서 고객의 안전을 최우선으로 생각합니다...'" 
                />
              </section>

              {/* Action Buttons */}
              <footer className="flex items-center justify-end gap-4 pt-12">
                <button 
                  onClick={onBack}
                  className="px-10 py-4 font-bold text-primary hover:bg-surface-container-high rounded-full transition-all"
                >
                  취소
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-12 py-4 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "처리 중..." : "등록 완료 및 대시보드로 이동"}
                </button>
              </footer>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DriverProfileSetup;
