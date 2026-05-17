import React, { useState, useEffect, useRef } from 'react';

/**
 * BusInfoForm - 버스 정보 등록 및 수정 컴포넌트 (최종 완성본)
 * 1. Ref 기반 클릭 로직으로 파일 팝업창 문제 완벽 해결
 * 2. 상세정보(ADAS, 편의시설) 인터페이스 복구
 * 3. 기사 정보 유지 및 업데이트(UPSERT) 연동
 */
const BusInfoForm = ({ onNext }) => {
  const [formData, setFormData] = useState({
    vehicleNo: '',
    modelNm: '',
    manufactureYear: '',
    serviceClass: 'PRESTIGE_28',
    capacity: '28',
    mileage: '',
    hasAdas: 'N',
    lastInspectDt: '',
    insuranceExpDt: '',
    amenities: [],
    bizRegFile: '',
    transLicFile: '',
    insCertFile: '',
    vehiclePhotos: []
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [uploadingField, setUploadingField] = useState(null);

  // 파일 선택을 위한 Ref 선언
  const bizRegRef = useRef(null);
  const transLicRef = useRef(null);
  const insCertRef = useRef(null);
  const photoRef = useRef(null);

  useEffect(() => {
    const fetchBusDetail = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8080/api/app/driver/bus/detail', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });
        const result = await response.json();
        if (result.success && result.data) {
          setFormData({
            ...result.data,
            capacity: result.data.capacity || '28',
            amenities: Array.isArray(result.data.amenities) ? result.data.amenities : [],
            vehiclePhotos: Array.isArray(result.data.vehiclePhotos) ? result.data.vehiclePhotos : []
          });
        }
      } catch (error) {
        console.error('Fetch error:', error);
      } finally {
        setFetching(false);
      }
    };
    fetchBusDetail();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox' && name === 'amenities') {
      const current = formData.amenities || [];
      const updated = checked ? [...current, value] : current.filter(i => i !== value);
      setFormData({ ...formData, amenities: updated });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const uploadFile = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('http://127.0.0.1:8080/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
        body: fd
      });
      const data = await res.json();
      return data.success ? data.fileUrl : null;
    } catch (err) {
      return null;
    }
  };

  const handleFileChange = async (e) => {
    const { name, files } = e.target;
    if (!files || files.length === 0) return;

    setUploadingField(name);
    try {
      if (name === 'vehiclePhotos') {
        const urls = [];
        for (let i = 0; i < files.length; i++) {
          const url = await uploadFile(files[i]);
          if (url) urls.push(url);
        }
        setFormData(prev => ({ ...prev, vehiclePhotos: [...(prev.vehiclePhotos || []), ...urls] }));
      } else {
        const url = await uploadFile(files[0]);
        if (url) setFormData(prev => ({ ...prev, [name]: url }));
      }
    } finally {
      setUploadingField(null);
      e.target.value = ''; // 선택 리셋
    }
  };

  const handleSubmit = async () => {
    if (!formData.vehicleNo || !formData.modelNm) {
      alert('차량 번호와 모델은 반드시 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8080/api/app/driver/bus/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        alert('🎉 버스 정보가 안전하게 저장되었습니다!');
        if (onNext) onNext();
      } else {
        alert('저장 실패: ' + data.error);
      }
    } catch (e) {
      alert('서버 응답 없음');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return (
    <div className="flex flex-col justify-center items-center h-96">
      <div className="w-12 h-12 border-4 border-[#004e47] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto pb-20 px-4 font-body animate-in fade-in duration-500">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-extrabold text-[#191c1e] mb-2 tracking-tight">차량 정보 관리</h2>
        <p className="text-gray-500 font-medium">상세한 버스 정보를 등록하거나 수정하세요.</p>
      </div>

      <div className="space-y-8">
        {/* 기본 섹션 */}
        <Section title="기본 차량 정보" icon="directions_bus">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField label="차량 번호" name="vehicleNo" value={formData.vehicleNo} onChange={handleChange} placeholder="12가 3456" />
            <InputField label="차량 모델/이름" name="modelNm" value={formData.modelNm} onChange={handleChange} placeholder="유니버스, 그랜버드 등" />
            <InputField label="제작/연식" name="manufactureYear" value={formData.manufactureYear} onChange={handleChange} placeholder="2024" />
            <SelectField label="버스 등급" name="serviceClass" value={formData.serviceClass} onChange={handleChange} 
              options={[
                { value: 'NORMAL_45', label: '일반 (45석)' },
                { value: 'PRESTIGE_28', label: '우등 (28석)' },
                { value: 'PREMIUM_21', label: '프리미엄 (21석)' }
              ]} 
            />
          </div>
        </Section>

        {/* 상세 섹션 */}
        <Section title="상세 정보 및 편의시설" icon="speed" borderColor="border-orange-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <InputField label="총 주행 거리 (km)" name="mileage" type="number" value={formData.mileage} onChange={handleChange} />
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-500 ml-1">첨단 안전장치(ADAS) 장착 여부</label>
              <div className="flex gap-6 h-[56px] items-center">
                {['Y', 'N'].map(v => (
                  <label key={v} className="flex items-center gap-2.5 cursor-pointer group">
                    <input type="radio" name="hasAdas" value={v} checked={formData.hasAdas === v} onChange={handleChange} className="w-5 h-5 accent-[#004e47]" />
                    <span className="text-base font-semibold text-gray-700">{v === 'Y' ? '장착됨' : '미장착'}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-gray-50">
            <label className="text-sm font-bold text-gray-500 mb-4 block">제공 가능한 편의시설</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {['와이파이', 'USB포트', '냉장고', '모니터', '커튼', '공기청정기', '마이크', '정수기'].map(item => (
                <label key={item} className={`flex items-center justify-center gap-2 p-3.5 rounded-2xl border-2 transition-all cursor-pointer font-bold text-sm ${formData.amenities?.includes(item) ? 'bg-[#004e47] border-[#004e47] text-white' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                  <input type="checkbox" name="amenities" value={item} checked={formData.amenities?.includes(item)} onChange={handleChange} className="hidden" />
                  {item}
                </label>
              ))}
            </div>
          </div>
        </Section>

        {/* 서류 섹션 */}
        <Section title="필수 인증 서류" icon="verified_user" bgColor="bg-[#f0f7f5]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <InputField label="최근 정기 검사일" name="lastInspectDt" type="date" value={formData.lastInspectDt} onChange={handleChange} />
            <InputField label="보험 만료 예정일" name="insuranceExpDt" type="date" value={formData.insuranceExpDt} onChange={handleChange} />
          </div>
          
          <div className="space-y-3">
            <input type="file" ref={bizRegRef} name="bizRegFile" onChange={handleFileChange} className="hidden" />
            <input type="file" ref={transLicRef} name="transLicFile" onChange={handleFileChange} className="hidden" />
            <input type="file" ref={insCertRef} name="insCertFile" onChange={handleFileChange} className="hidden" />

            <FileRow label="사업자 등록증" value={formData.bizRegFile} isUploading={uploadingField === 'bizRegFile'} onSelect={() => bizRegRef.current.click()} />
            <FileRow label="운송 사업 면허" value={formData.transLicFile} isUploading={uploadingField === 'transLicFile'} onSelect={() => transLicRef.current.click()} />
            <FileRow label="보험 가입 증명서" value={formData.insCertFile} isUploading={uploadingField === 'insCertFile'} onSelect={() => insCertRef.current.click()} />
          </div>
        </Section>

        {/* 차량 사진 섹션 */}
        <Section title="차량 내/외부 사진" icon="add_a_photo">
          <input type="file" ref={photoRef} name="vehiclePhotos" multiple onChange={handleFileChange} className="hidden" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {formData.vehiclePhotos?.map((url, idx) => (
              <div key={idx} className="aspect-video rounded-2xl bg-gray-100 relative group overflow-hidden border border-gray-100 shadow-sm">
                <img src={url.startsWith('http') ? url : `http://127.0.0.1:8080${url}`} className="w-full h-full object-cover" alt="" />
                <button 
                  onClick={() => setFormData(p => ({ ...p, vehiclePhotos: p.vehiclePhotos.filter((_, i) => i !== idx) }))}
                  className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            ))}
            <button 
              onClick={() => photoRef.current.click()}
              className="aspect-video rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:bg-gray-50 hover:border-[#004e47]/30 transition-all"
            >
              <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
              <span className="text-[11px] font-bold">사진 추가</span>
            </button>
          </div>
        </Section>

        <button 
          onClick={handleSubmit} 
          disabled={loading}
          className="w-full h-16 bg-[#004e47] text-white rounded-[24px] font-extrabold text-xl shadow-2xl active:scale-[0.97] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {loading ? <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" /> : '모든 정보 저장하기'}
        </button>
      </div>
    </div>
  );
};

// --- 서브 컴포넌트 ---

const Section = ({ title, icon, children, bgColor = "bg-white", borderColor = "border-gray-100" }) => (
  <div className={`${bgColor} p-8 rounded-[36px] shadow-sm border ${borderColor}`}>
    <div className="flex items-center gap-3 mb-8 text-[#191c1e]">
      <div className="w-10 h-10 bg-white rounded-2xl shadow-sm flex items-center justify-center">
        <span className="material-symbols-outlined text-[#004e47]">{icon}</span>
      </div>
      <h3 className="text-xl font-bold">{title}</h3>
    </div>
    {children}
  </div>
);

const InputField = ({ label, ...props }) => (
  <div className="flex flex-col gap-2">
    <label className="text-sm font-bold text-gray-500 ml-1">{label}</label>
    <input {...props} className="h-14 px-5 rounded-2xl bg-gray-50 border border-gray-100 focus:border-[#004e47] focus:ring-4 focus:ring-[#004e47]/5 outline-none transition-all text-base" />
  </div>
);

const SelectField = ({ label, options, ...props }) => (
  <div className="flex flex-col gap-2">
    <label className="text-sm font-bold text-gray-500 ml-1">{label}</label>
    <select {...props} className="h-14 px-5 rounded-2xl bg-gray-50 border border-gray-100 focus:border-[#004e47] outline-none text-base">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const FileRow = ({ label, value, isUploading, onSelect }) => (
  <div className="flex items-center justify-between p-5 bg-white rounded-[24px] border border-gray-50 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${value ? 'bg-[#004e47] text-white' : 'bg-gray-100 text-gray-400'}`}>
        <span className="material-symbols-outlined">{value ? 'done' : 'upload'}</span>
      </div>
      <div>
        <p className="font-bold text-[#191c1e]">{label}</p>
        <p className={`text-xs font-semibold ${value ? 'text-[#004e47]' : 'text-gray-400'}`}>{value ? '제출 완료' : '미등록'}</p>
      </div>
    </div>
    <div className="flex items-center gap-3">
      {value && !isUploading && (
        <a href={value.startsWith('http') ? value : `http://127.0.0.1:8080${value}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-gray-400 hover:text-[#004e47] underline underline-offset-4">확인</a>
      )}
      <button 
        type="button"
        onClick={onSelect}
        disabled={isUploading}
        className={`px-6 py-2.5 rounded-xl font-extrabold text-sm transition-all shadow-sm ${isUploading ? 'bg-gray-100 text-gray-300' : 'bg-[#004e47] text-white hover:bg-[#003a35] active:scale-95'}`}
      >
        {isUploading ? '업로드 중' : (value ? '교체' : '등록')}
      </button>
    </div>
  </div>
);

export default BusInfoForm;
