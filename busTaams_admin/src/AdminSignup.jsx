import React, { useState } from 'react';

const AdminSignup = ({ onBack }) => {
  const [formData, setFormData] = useState({
    adminId: '',
    password: '',
    adminNm: '',
    deptNm: '',
    hpNo: '',
    email: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 필수값 검증
    if (!formData.adminId || !formData.password || !formData.adminNm) {
      return alert('아이디, 비밀번호, 이름은 필수 입력 항목입니다.');
    }

    setLoading(true);
    // TODO: 백엔드 회원가입 API 연동 (POST /api/admin/signup)
    setTimeout(() => {
      setLoading(false);
      alert('관리자 가입 신청이 완료되었습니다.\n(실제 기능은 백엔드 API 연동 후 작동합니다.)');
      onBack(); // 가입 후 로그인 화면으로 이동
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 flex flex-col items-center justify-center relative font-sans">
      <div className="w-full max-w-lg px-6 z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">관리자 신규 등록</h1>
          <p className="text-sm font-medium text-slate-500">버스탐스 백오피스 관리자 계정을 생성합니다.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="space-y-5">
            {/* 필수 정보 영역 */}
            <div className="border-b border-slate-100 pb-5 space-y-5">
              <h3 className="text-sm font-black text-primary flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
                 필수 정보
              </h3>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">아이디 (ADMIN_ID)</label>
                <input 
                  type="text" name="adminId"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-medium" 
                  placeholder="사용할 아이디를 영문/숫자로 입력하세요" 
                  value={formData.adminId} onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">비밀번호 (PASSWORD)</label>
                <input 
                  type="password" name="password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-medium" 
                  placeholder="비밀번호를 입력하세요" 
                  value={formData.password} onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">이름 (ADMIN_NM)</label>
                <input 
                  type="text" name="adminNm"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-medium" 
                  placeholder="실명을 입력하세요" 
                  value={formData.adminNm} onChange={handleChange}
                />
              </div>
            </div>

            {/* 부가 정보 영역 */}
            <div className="pt-2 space-y-5">
              <h3 className="text-sm font-black text-slate-500 flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block"></span>
                 추가 정보
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">소속 부서 (DEPT_NM)</label>
                  <input 
                    type="text" name="deptNm"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-medium" 
                    placeholder="예: 운영팀, CS팀" 
                    value={formData.deptNm} onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">휴대폰 번호 (HP_NO)</label>
                  <input 
                    type="text" name="hpNo"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-medium" 
                    placeholder="- 없이 입력" 
                    value={formData.hpNo} onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">업무용 이메일 (EMAIL)</label>
                <input 
                  type="email" name="email"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-medium" 
                  placeholder="admin@bustaams.com" 
                  value={formData.email} onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-10">
            <button 
              type="button" 
              onClick={onBack}
              className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 rounded-xl hover:bg-slate-200 transition-all"
            >
              취소 및 돌아가기
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 bg-primary text-white font-bold py-4 rounded-xl hover:bg-emerald-800 transition-all shadow-md flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                '계정 생성하기'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminSignup;
