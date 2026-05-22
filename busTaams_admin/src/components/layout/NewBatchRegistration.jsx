import React, { useState, useEffect } from 'react';
import { ChevronRight, Info, PlayCircle, Gavel, Save, FolderOpen } from 'lucide-react';

const NewBatchRegistration = ({ onBack }) => {
  const [formData, setFormData] = useState({
    jobId: '',
    jobName: '',
    description: '',
    useYn: 'Y',
    execPath: '',
    execCycle: 'DAILY',
    businessType: 'PARTNER',
    retryPolicy: 'RETRYABLE',
    maxRetry: 3,
    execTime: '00:00:00',
    execMonth: '*',
    execDay: '*',
    execDow: '*',
    calcRule: 'T',
    holidayRule: 'RUN',
  });

  // Fetch the next Batch ID when cycle or businessType changes
  useEffect(() => {
    const fetchNextId = async () => {
      try {
        const res = await fetch(`/api/admin/nextBatchId?cycle=${formData.execCycle}&businessType=${formData.businessType}`);
        if (res.ok) {
          const data = await res.json();
          if (data.nextId) {
            setFormData(prev => ({ 
              ...prev, 
              jobId: data.nextId,
              execPath: `/app/bus-taams/busTaams_server/batch/shell/${data.nextId}.sh`
            }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch next batch ID', error);
      }
    };
    fetchNextId();
  }, [formData.execCycle, formData.businessType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/newBatchRegistration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      const result = await response.json();
      if (response.ok) {
        alert('배치 작업이 성공적으로 등록되었습니다.');
        onBack();
      } else {
        alert(`배치 작업 등록 실패:\n${result.message || '알 수 없는 오류가 발생했습니다.'}`);
      }
    } catch (error) {
      console.error(error);
      alert('서버와의 통신 오류가 발생했습니다.');
    }
  };

  const handlePolicyChange = (policy) => {
    setFormData({ ...formData, retryPolicy: policy });
  };

  return (
    <div className="w-full h-full flex flex-col p-8 bg-slate-50 overflow-y-auto">
      <div className="max-w-[1000px] mx-auto w-full">
        {/* Breadcrumbs/Heading */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <span className="text-sm cursor-pointer hover:text-slate-800" onClick={onBack}>관리</span>
            <ChevronRight size={16} />
            <span className="text-sm text-blue-800 font-semibold cursor-pointer" onClick={onBack}>작업 목록</span>
            <ChevronRight size={16} />
            <span className="text-sm text-blue-800 font-semibold">작업 등록</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900">배치작업 등록</h2>
          <p className="text-base text-slate-500 mt-1">시스템에서 실행될 새로운 자동화 배치 작업을 구성하고 등록합니다.</p>
        </div>

        {/* Registration Form */}
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Section 1: Basic Information */}
          <section className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
              <Info className="text-blue-800" size={20} />
              <h3 className="text-lg font-bold">기본 정보</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">배치작업 ID <span className="text-red-600">*</span></label>
                <input 
                  className="w-full bg-slate-100 border border-slate-200 rounded px-4 py-2 text-sm text-slate-500 cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition-shadow" 
                  maxLength={20} 
                  placeholder="자동 생성됨" 
                  disabled 
                  type="text" 
                  value={formData.jobId}
                  onChange={e => setFormData({...formData, jobId: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">배치작업명 <span className="text-red-600">*</span></label>
                <input 
                  className="w-full bg-white border border-slate-200 rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition-shadow" 
                  maxLength={100} 
                  placeholder="사용자 데이터 동기화 서비스" 
                  required 
                  type="text"
                  value={formData.jobName}
                  onChange={e => setFormData({...formData, jobName: e.target.value})}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="block text-xs font-bold text-slate-700">작업설명</label>
                <textarea 
                  className="w-full bg-white border border-slate-200 rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition-shadow resize-y" 
                  maxLength={500} 
                  placeholder="작업 목적 및 기대 결과에 대한 상세 설명을 입력하세요..." 
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">사용여부</label>
                <div className="flex items-center gap-6 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      checked={formData.useYn === 'Y'} 
                      onChange={() => setFormData({...formData, useYn: 'Y'})}
                      className="w-4 h-4 text-blue-800 focus:ring-blue-800 border-slate-300" 
                      name="use_yn" 
                      type="radio" 
                      value="Y" 
                    />
                    <span className="text-sm">Yes (사용)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      checked={formData.useYn === 'N'} 
                      onChange={() => setFormData({...formData, useYn: 'N'})}
                      className="w-4 h-4 text-blue-800 focus:ring-blue-800 border-slate-300" 
                      name="use_yn" 
                      type="radio" 
                      value="N" 
                    />
                    <span className="text-sm">No (미사용)</span>
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Execution Details */}
          <section className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
              <PlayCircle className="text-blue-800" size={20} />
              <h3 className="text-lg font-bold">실행 상세</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-2">
                <label className="block text-xs font-bold text-slate-700">실행파일경로 <span className="text-red-600">*</span></label>
                <div className="relative">
                  <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    className="w-full bg-slate-100 border border-slate-200 rounded pl-10 pr-4 py-2 text-sm font-mono text-slate-500 cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition-shadow" 
                    maxLength={200} 
                    placeholder="자동 생성됨" 
                    disabled 
                    type="text" 
                    value={formData.execPath}
                    onChange={e => setFormData({...formData, execPath: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">실행주기</label>
                <select 
                  className="w-full bg-white border border-slate-200 rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition-shadow appearance-none cursor-pointer"
                  value={formData.execCycle}
                  onChange={e => setFormData({...formData, execCycle: e.target.value})}
                >
                  <option value="DAILY">매일 (DAILY)</option>
                  <option value="MONTHLY">매월 (MONTHLY)</option>
                  <option value="YEARLY">매년 (YEARLY)</option>
                  <option value="ON_DEMAND">수시 (ON_DEMAND)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">업무구분</label>
                <select 
                  className="w-full bg-white border border-slate-200 rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition-shadow appearance-none cursor-pointer"
                  value={formData.businessType}
                  onChange={e => setFormData({...formData, businessType: e.target.value})}
                >
                  <option value="PARTNER">영업회원 (PARTNER)</option>
                  <option value="CARD">카드정산 (CARD)</option>
                  <option value="TAX_INVOICE">세금계산서 (TAX_INVOICE)</option>
                  <option value="FREELANCE">프리랜서 (FREELANCE)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Section 3: Schedule Details */}
          <section className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
              <PlayCircle className="text-blue-800" size={20} />
              <h3 className="text-lg font-bold">스케줄 정보</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">수행시간 <span className="text-red-600">*</span></label>
                <input 
                  className="w-full bg-white border border-slate-200 rounded px-4 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition-shadow" 
                  type="time" 
                  required
                  step="1"
                  value={formData.execTime}
                  onChange={e => setFormData({...formData, execTime: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">수행월</label>
                <input 
                  className="w-full bg-white border border-slate-200 rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition-shadow" 
                  type="text"
                  maxLength={2}
                  placeholder="* 또는 1~12"
                  value={formData.execMonth}
                  onChange={e => setFormData({...formData, execMonth: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">수행일</label>
                <input 
                  className="w-full bg-white border border-slate-200 rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition-shadow" 
                  type="text"
                  maxLength={2}
                  placeholder="* 또는 1~31"
                  value={formData.execDay}
                  onChange={e => setFormData({...formData, execDay: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">수행요일</label>
                <input 
                  className="w-full bg-white border border-slate-200 rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition-shadow" 
                  type="text"
                  maxLength={7}
                  placeholder="* (1:일~7:토)"
                  value={formData.execDow}
                  onChange={e => setFormData({...formData, execDow: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">기준일 계산 규칙</label>
                <select 
                  className="w-full bg-white border border-slate-200 rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition-shadow appearance-none cursor-pointer"
                  value={formData.calcRule}
                  onChange={e => setFormData({...formData, calcRule: e.target.value})}
                >
                  <option value="T">당일 (T)</option>
                  <option value="T-1">전일 (T-1)</option>
                  <option value="M-1">전월 (M-1)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">휴일 처리 방식</label>
                <select 
                  className="w-full bg-white border border-slate-200 rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition-shadow appearance-none cursor-pointer"
                  value={formData.holidayRule}
                  onChange={e => setFormData({...formData, holidayRule: e.target.value})}
                >
                  <option value="RUN">휴일실행 (RUN)</option>
                  <option value="PREV_BIZ">전영업일 (PREV_BIZ)</option>
                  <option value="NEXT_BIZ">다음영업일 (NEXT_BIZ)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Section 4: Policy & Error Handling */}
          <section className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
              <Gavel className="text-blue-800" size={20} />
              <h3 className="text-lg font-bold">정책 및 오류 관리</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">재실행 정책</label>
                <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200">
                  <button 
                    type="button"
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${formData.retryPolicy === 'RETRYABLE' ? 'bg-blue-800 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                    onClick={() => handlePolicyChange('RETRYABLE')}
                  >재시도 가능</button>
                  <button 
                    type="button"
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${formData.retryPolicy === 'MANUAL' ? 'bg-blue-800 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                    onClick={() => handlePolicyChange('MANUAL')}
                  >수동 확인</button>
                  <button 
                    type="button"
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${formData.retryPolicy === 'NOT_RETRYABLE' ? 'bg-blue-800 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                    onClick={() => handlePolicyChange('NOT_RETRYABLE')}
                  >재시도 불가</button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">최대 재시도 횟수</label>
                <div className="flex items-center gap-2 max-w-[150px]">
                  <input 
                    className="w-full bg-white border border-slate-200 rounded px-4 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition-shadow" 
                    min={0} 
                    type="number" 
                    value={formData.maxRetry}
                    onChange={e => setFormData({...formData, maxRetry: parseInt(e.target.value) || 0})}
                  />
                  <span className="text-sm text-slate-600">회</span>
                </div>
              </div>
            </div>
          </section>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-200">
            <button 
              type="button"
              onClick={onBack}
              className="px-8 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-100 transition-all active:scale-95"
            >
              취소
            </button>
            <button 
              type="submit"
              className="px-10 py-2.5 rounded-lg bg-blue-800 text-white font-bold text-sm shadow-md hover:bg-blue-900 transition-all active:scale-95 flex items-center gap-2"
            >
              <Save size={18} />
              배치 등록
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewBatchRegistration;
