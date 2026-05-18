import React, { useState, useEffect, useRef } from 'react';

const CancelReservationModal = ({ reqData, onClose, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [reasonCode, setReasonCode] = useState('CHANGE_OF_MIND');
  const [reasonText, setReasonText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileBase64, setFileBase64] = useState(null);
  const fileInputRef = useRef(null);

  // 취소 사유 옵션 (DB 공통코드 기준)
  const cancelReasons = [
    { code: 'CHANGE_OF_MIND', label: '단순 변심' },
    { code: 'HOSPITALIZATION', label: '질병 또는 사고에 의한 입원' },
    { code: 'DEATH_KIN_SPOUSE', label: '직계가족 및 배우자 사망' },
    { code: 'LEGAL_CUSTODY', label: '법정 구속' },
    { code: 'OUTPATIENT_SAME_DAY', label: '사고에 의한 당일 통원치료' },
    { code: 'OTHER', label: '기타 사유' }
  ];

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  if (!reqData) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}`;
    } catch (e) { return dateStr; }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        window.alert('파일 크기는 5MB 이하여야 합니다.');
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFileBase64(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFullCancel = async () => {
    if (!window.confirm('여정 전체를 취소하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

    setLoading(true);
    try {
      const payload = {
        reqId: reqData.REQ_ID,
        custId: reqData.TRAVELER_ID || reqData.custId,
        reasonCode: reasonCode,
        reasonText: reasonText || '고객 직접 취소 (전체 취소)',
        fileData: fileBase64,
        fileName: selectedFile ? selectedFile.name : null
      };

      const response = await fetch('http://localhost:8080/api/auction/complex-cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        window.alert('전체 예약이 성공적으로 취소되었습니다.');
        if (onRefresh) onRefresh();
        onClose();
      } else {
        const errorData = await response.json();
        window.alert(errorData.error || '전체 취소 도중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('[ERROR] Full cancel error:', err);
      window.alert('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelIndividualBus = async (reqBusSeq) => {
    if (!window.confirm('이 차량만 취소하시겠습니까?')) return;

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8080/api/auction/cancel-bus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reqId: reqData.REQ_ID,
          reqBusSeq: reqBusSeq 
        })
      });

      if (response.ok) {
        window.alert('해당 차량이 취소되었습니다.');
        if (onRefresh) onRefresh();
      } else {
        const errorData = await response.json();
        window.alert(errorData.error || '취소 도중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('[ERROR] Individual cancel error:', err);
      window.alert('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getVehicleLabel = (type) => {
    const map = {
      'STANDARD_28': '일반 고속 (45인승)', 'STANDARD_45': '일반 고속 (45인승)',
      'PREMIUM_45': '우등 고속 (28인승)', 'PREMIUM_28': '우등 고속 (28인승)',
      'GOLD_21': '프리미엄 골드 (21인승)', 'VVIP_16': 'V-VIP (16인승)',
      'MINI_25': '중형/미니 (25인승)', 'VAN_11': '대형 밴 (11인승)'
    };
    return map[type] || '일반 버스';
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-[2.5rem] w-full max-w-6xl my-8 relative shadow-2xl overflow-hidden flex flex-col transform transition-all animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Action Required</span>
              <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Reservation ID: {reqData.REQ_ID}</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">예약 취소 신청</h2>
          </div>
          <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[75vh] p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* Left Section: Inputs */}
            <div className="lg:col-span-5 space-y-8">
              <section className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  취소 사유 입력
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 ml-1">사유 선택</label>
                    <select 
                      value={reasonCode}
                      onChange={(e) => setReasonCode(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    >
                      {cancelReasons.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 ml-1">상세 내용 (선택)</label>
                    <textarea 
                      value={reasonText}
                      onChange={(e) => setReasonText(e.target.value)}
                      placeholder="구체적인 사유를 입력해 주시면 처리에 도움이 됩니다."
                      className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none h-32 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 ml-1">증빙 서류 첨부 (선택)</label>
                    <div 
                      onClick={() => fileInputRef.current.click()}
                      className="group cursor-pointer border-2 border-dashed border-slate-200 hover:border-primary/40 hover:bg-primary/5 rounded-2xl p-6 transition-all flex flex-col items-center justify-center text-center"
                    >
                      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,.pdf" />
                      {selectedFile ? (
                        <div className="flex flex-col items-center">
                          <span className="material-symbols-outlined text-3xl text-primary mb-2">task</span>
                          <span className="text-sm font-bold text-slate-700 truncate max-w-[200px]">{selectedFile.name}</span>
                          <span className="text-[10px] text-slate-400 mt-1">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                        </div>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-3xl text-slate-300 group-hover:text-primary transition-colors mb-2">upload_file</span>
                          <span className="text-xs font-bold text-slate-400 group-hover:text-slate-600 transition-colors">클릭하여 파일 선택 (최대 5MB)</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-rose-50 p-8 rounded-[2rem] border border-rose-100">
                <div className="flex items-center gap-2 mb-4 text-rose-700">
                  <span className="material-symbols-outlined text-xl">gavel</span>
                  <h4 className="font-black text-sm uppercase tracking-widest">취소 및 환불 규정</h4>
                </div>
                <ul className="space-y-3 text-[13px] font-bold text-rose-900/60 leading-snug">
                  <li>• 이용 7일 전: 100% 환불 (수수료 없음)</li>
                  <li>• 이용 3~6일 전: 결제 금액의 20% 수수료 발생</li>
                  <li>• 이용 1~2일 전: 결제 금액의 50% 수수료 발생</li>
                  <li className="text-rose-700">• 이용 당일: 환불 불가 (100% 수수료)</li>
                </ul>
              </section>
            </div>

            {/* Right Section: Vehicle List */}
            <div className="lg:col-span-7 space-y-6">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                예약된 차량 목록
              </h3>
              
              <div className="space-y-4">
                {reqData.vehicles && reqData.vehicles.length > 0 ? (
                  reqData.vehicles.map((v, idx) => (
                    <div key={v.REQ_BUS_SEQ || idx} className={`bg-white border border-slate-100 p-6 rounded-[2rem] flex items-center gap-6 shadow-sm group relative overflow-hidden transition-all ${v.RES_STAT === 'TRAVELER_CANCEL' ? 'opacity-50 grayscale' : 'hover:shadow-lg hover:border-primary/10'}`}>
                      {v.RES_STAT === 'TRAVELER_CANCEL' && (
                        <div className="absolute inset-0 bg-slate-50/40 backdrop-blur-[2px] z-10 flex items-center justify-center">
                           <span className="bg-slate-900 text-white px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg">CANCELLED</span>
                        </div>
                      )}
                      <div className="w-24 h-24 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300">
                        <span className="material-symbols-outlined text-4xl">directions_bus</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-lg font-black text-slate-900 tracking-tight">{getVehicleLabel(v.BUS_TYPE_CD)}</p>
                            <p className="text-xs font-bold text-slate-400">{v.BUS_NO || '차량번호 준비중'}</p>
                          </div>
                          <p className="text-lg font-black text-primary tracking-tight">{v.FINAL_AMT ? Number(v.FINAL_AMT).toLocaleString() : '0'}원</p>
                        </div>
                        <div className="flex justify-end">
                          <button 
                            disabled={v.RES_STAT === 'TRAVELER_CANCEL' || loading}
                            onClick={() => handleCancelIndividualBus(v.REQ_BUS_SEQ)}
                            className="px-5 py-2 rounded-xl border border-rose-100 text-rose-600 text-[11px] font-black hover:bg-rose-50 transition-all disabled:opacity-0"
                          >
                            이 차량만 취소
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center text-slate-300 font-bold border-2 border-dashed border-slate-100 rounded-[2.5rem]">등록된 차량 정보가 없습니다.</div>
                )}
              </div>

              {/* Total Action */}
              <div className="mt-10 pt-10 border-t border-slate-100 text-center">
                <p className="text-xs font-bold text-slate-400 mb-6">여정 전체를 취소하시려면 아래 버튼을 눌러주세요.</p>
                <button 
                   disabled={loading}
                   className="w-full bg-slate-900 text-white py-6 rounded-full font-black text-xl shadow-2xl shadow-slate-900/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                   onClick={handleFullCancel}
                >
                  {loading && <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                  {loading ? '처리 중...' : '전체 예약 취소하기'}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default CancelReservationModal;
