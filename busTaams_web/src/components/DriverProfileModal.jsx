import React, { useState, useRef } from 'react';

function DriverProfileModal({ isOpen, onClose, user }) {
  const [formData, setFormData] = useState({
    licenseNo: '',
    bioDesc: '',
    membershipType: 'NORMAL',
    profileImgBase64: '',
    licenseImgBase64: ''
  });
  const [profilePreview, setProfilePreview] = useState(null);
  const [licensePreview, setLicensePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const profileInputRef = useRef(null);
  const licenseInputRef = useRef(null);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result;
        if (type === 'profile') {
          setFormData(prev => ({ ...prev, profileImgBase64: base64 }));
          setProfilePreview(base64);
        } else {
          setFormData(prev => ({ ...prev, licenseImgBase64: base64 }));
          setLicensePreview(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('http://localhost:8080/api/driver/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.userId,
          ...formData
        }),
      });

      if (response.ok) {
        alert('프로필이 성공적으로 저장되었습니다.');
        onClose();
      } else {
        const data = await response.json();
        alert(data.error || '저장 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay with Blur */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-white/90 backdrop-blur-2xl rounded-[2rem] shadow-ambient overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="px-8 py-6 flex items-center justify-between border-b border-gray-100/50">
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">기사님 프로필 설정</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-8 space-y-8">
          
          {/* Profile Photo Section */}
          <div className="flex flex-col items-center space-y-4">
            <div 
              className="relative w-32 h-32 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden group cursor-pointer border-4 border-white shadow-md"
              onClick={() => profileInputRef.current.click()}
            >
              {profilePreview ? (
                <img src={profilePreview} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-12 h-12 text-slate-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-xs font-medium">사진 변경</span>
              </div>
            </div>
            <input 
              type="file" 
              ref={profileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={(e) => handleFileChange(e, 'profile')} 
            />
            <p className="text-sm text-slate-500 font-medium">기사님 프로필 사진 (선택)</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            {/* License Number */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">면허번호</label>
              <input
                type="text"
                name="licenseNo"
                value={formData.licenseNo}
                onChange={handleInputChange}
                placeholder="00-00-000000-00"
                className="w-full px-5 py-4 bg-slate-50 rounded-2xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 outline-none transition-all placeholder:text-slate-300"
                required
              />
            </div>

            {/* Membership Type */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">멤버십 등급</label>
              <select
                name="membershipType"
                value={formData.membershipType}
                onChange={handleInputChange}
                className="w-full px-5 py-4 bg-slate-50 rounded-2xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 outline-none transition-all appearance-none"
              >
                <option value="NORMAL">일반 기사</option>
                <option value="PREMIUM">프리미엄 기사</option>
                <option value="VIP">VIP 기사</option>
              </select>
            </div>
          </div>

          {/* Bio / Introduction */}
          <div className="space-y-2 text-left">
            <label className="text-sm font-semibold text-slate-700 ml-1">기사님 소개글</label>
            <textarea
              name="bioDesc"
              value={formData.bioDesc}
              onChange={handleInputChange}
              rows="4"
              placeholder="고객님께 보여질 소개글을 입력해주세요."
              className="w-full px-5 py-4 bg-slate-50 rounded-2xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 outline-none transition-all resize-none placeholder:text-slate-300"
            />
          </div>

          {/* License Photo Upload */}
          <div className="space-y-2 text-left">
            <label className="text-sm font-semibold text-slate-700 ml-1">면허증 사본</label>
            <div 
              className="w-full h-48 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center group cursor-pointer hover:bg-slate-100/50 transition-all overflow-hidden"
              onClick={() => licenseInputRef.current.click()}
            >
              {licensePreview ? (
                <img src={licensePreview} alt="License" className="w-full h-full object-contain" />
              ) : (
                <>
                  <svg className="w-10 h-10 text-slate-300 mb-2 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs text-slate-400 font-medium tracking-tight">면허증 사진 촬영 또는 파일 업로드</span>
                </>
              )}
            </div>
            <input 
              type="file" 
              ref={licenseInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={(e) => handleFileChange(e, 'license')} 
            />
          </div>

        </form>

        {/* Footer Actions */}
        <div className="px-8 py-6 bg-slate-50/50 border-t border-gray-100 flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-4 bg-white text-slate-600 font-bold rounded-2xl hover:bg-gray-100 transition-all"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`flex-1 py-4 text-white font-bold rounded-2xl transition-all shadow-lg ${
              isSubmitting 
              ? 'bg-slate-300 cursor-not-allowed' 
              : 'bg-gradient-to-br from-teal-600 to-teal-700 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {isSubmitting ? '저장 중...' : '프로필 저장하기'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DriverProfileModal;
