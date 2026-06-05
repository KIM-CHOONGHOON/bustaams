import React, { useState } from 'react';

// 국내 주요 은행 및 금융기관 목록
const BANK_LIST = [
  { code: '004', name: 'KB국민은행' },
  { code: '088', name: '신한은행' },
  { code: '020', name: '우리은행' },
  { code: '081', name: '하나은행' },
  { code: '011', name: 'NH농협은행' },
  { code: '003', name: 'IBK기업은행' },
  { code: '090', name: '카카오뱅크' },
  { code: '092', name: '토스뱅크' },
  { code: '089', name: '케이뱅크' },
  { code: '023', name: 'SC제일은행' },
  { code: '002', name: 'KDB산업은행' },
  { code: '007', name: 'Sh수협은행' },
  { code: '071', name: '우체국' },
  { code: '031', name: '대구은행 (iM뱅크)' },
  { code: '032', name: '부산은행' },
  { code: '034', name: '광주은행' },
  { code: '035', name: '제주은행' },
  { code: '037', name: '전북은행' },
  { code: '039', name: '경남은행' },
  { code: '045', name: '새마을금고' },
  { code: '048', name: '신협' },
  { code: '050', name: '상호저축은행' },
  { code: '012', name: '지역농·축협' },
  { code: '027', name: '한국씨티은행' },
  { code: '064', name: '산림조합' }
];

const AdminSignup = ({ onBack }) => {
  const [formData, setFormData] = useState({
    adminId: '',
    adminNm: '',
    deptNm: '',
    hpNo: '',
    email: '',
    role: 'SUPER', // 기본값 SUPER
    bankNm: '',
    acctNo: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 필수값 검증
    if (!formData.adminId || !formData.adminNm || !formData.hpNo) {
      return alert('아이디, 이름, 휴대폰 번호는 필수 입력 항목입니다.');
    }

    // 영업사원인 경우 은행명, 계좌번호 필수 검증
    if (formData.role === 'SALES' && (!formData.bankNm || !formData.acctNo)) {
      return alert('영업사원 가입 시 환급받을 은행명과 계좌번호는 필수 입력 항목입니다.');
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: formData.adminId,
          adminNm: formData.adminNm,
          deptNm: formData.deptNm,
          hpNo: formData.hpNo,
          email: formData.email,
          role: formData.role,
          registeredBy: formData.adminId,
          bankNm: formData.role === 'SALES' ? formData.bankNm : null,
          acctNo: formData.role === 'SALES' ? formData.acctNo : null
        }),
      });

      const data = await response.json();
      if (response.ok) {
        if (formData.role === 'SALES') {
          alert(`영업사원 가입 신청이 성공적으로 완료되었습니다.\n\n초기 비밀번호는 휴대폰 번호 뒷 4자리인 [ ${data.tempPassword} ] 입니다.`);
        } else {
          alert(`관리자 가입 신청이 성공적으로 완료되었습니다.\n\n초기 비밀번호는 휴대폰 번호 뒷 4자리인 [ ${data.tempPassword} ] 입니다.\n최초 로그인 시 비밀번호를 변경해 주세요.`);
        }
        onBack(); // 가입 후 로그인 화면으로 이동
      } else {
        alert(data.error || '가입에 실패했습니다.');
      }
    } catch (error) {
      console.error('Signup error:', error);
      alert('서버와 통신하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
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
                <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">계정 구분 <span className="text-rose-500">*</span></label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-slate-800"
                  required
                >
                  <option value="SUPER">SUPER (최고 관리자)</option>
                  <option value="MANAGER">MANAGER (일반 관리자)</option>
                  <option value="SALES">SALES (영업사원)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">아이디 (ADMIN_ID) <span className="text-rose-500">*</span></label>
                <input 
                  type="text" name="adminId"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-medium" 
                  placeholder="사용할 아이디를 영문/숫자로 입력하세요" 
                  value={formData.adminId} onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">이름 (ADMIN_NM) <span className="text-rose-500">*</span></label>
                <input 
                  type="text" name="adminNm"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-medium" 
                  placeholder="실명을 입력하세요" 
                  value={formData.adminNm} onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">휴대폰 번호 (HP_NO) <span className="text-rose-500">*</span></label>
                <input 
                  type="text" name="hpNo"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-medium" 
                  placeholder="- 없이 숫자만 입력" 
                  value={formData.hpNo} onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* 영업사원 전용 환급 계좌 정보 입력창 (동적 렌더링) */}
            {formData.role === 'SALES' && (
              <div className="border-b border-slate-100 pb-5 space-y-5 animate-fadeIn">
                <h3 className="text-sm font-black text-emerald-600 flex items-center gap-2">
                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                   환급 계좌 정보 (영업사원 필수)
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">은행명 <span className="text-rose-500">*</span></label>
                    <select
                      name="bankNm"
                      value={formData.bankNm}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
                      required
                    >
                      <option value="">은행 선택</option>
                      {BANK_LIST.map((bank) => (
                        <option key={bank.code} value={bank.name}>{bank.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">계좌번호 <span className="text-rose-500">*</span></label>
                    <input 
                      type="text" name="acctNo"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium" 
                      placeholder="- 없이 계좌번호 입력" 
                      value={formData.acctNo} onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 부가 정보 영역 */}
            <div className="pt-2 space-y-5">
              <h3 className="text-sm font-black text-slate-500 flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block"></span>
                 추가 정보
              </h3>

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
