import React, { useState, useEffect } from 'react';

const CancelTripReasonModal = ({ tripData, currentCustId, onClose, onSuccess }) => {
  const [reasonCodes, setReasonCodes] = useState([]);
  const [reasonCode, setReasonCode] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCodes, setIsLoadingCodes] = useState(true);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    // 공통 코드 서버에서 불러오기
    fetch('http://localhost:8080/api/common/codes/TRAVELER_CANCEL_REASON')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setReasonCodes(data);
          if (data.length > 0) setReasonCode(data[0].DTL_CD);
        }
        setIsLoadingCodes(false);
      })
      .catch(err => {
        console.error('Error fetching codes:', err);
        setIsLoadingCodes(false);
      });

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (reasonCode === 'C99' && !reasonText.trim()) {
      alert('기타 사유를 상세히 입력해 주세요.');
      return;
    }

    if (!window.confirm('입력하신 사유로 여행 예약을 취소하시겠습니까?\n취소 후에는 복구가 불가능합니다.')) return;

    setIsSubmitting(true);

    try {
      let fileData = null;
      if (selectedFile) {
        // 파일을 Base64로 변환 (기존 서버 처리 패턴 대응)
        fileData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });
      }

      // 데이터 누락 방지를 위한 강건한 추출 로직
      const finalReqUuid = tripData.REQ_UUID_STR || tripData.REQ_ID || tripData.reqId;
      const finalCustId = currentCustId || tripData.TRAVELER_ID || tripData.custId || tripData.travelerId;

      console.log('[DEBUG] Cancellation Payload Source Data:', tripData);
      console.log('[DEBUG] Final Extracted IDs:', { finalReqUuid, finalCustId });

      const payload = {
        reqUuid: finalReqUuid,
        custId: finalCustId,
        reasonCode,
        reasonText,
        fileData: fileData,
        fileName: selectedFile ? selectedFile.name : null
      };

      const response = await fetch('http://localhost:8080/api/auction/complex-cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert('예약이 취소되었습니다.');
        if (onSuccess) onSuccess();
        onClose();
        window.location.reload(); // 확실한 상태 반영을 위해 페이지 새로고침
      } else {
        const errorData = await response.json();
        alert(errorData.error || '취소 처리 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('Complex cancel error:', err);
      alert('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="bg-slate-50 p-8 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black font-headline text-slate-900 tracking-tight">예약 취소 사유 입력</h2>
            <p className="text-sm text-slate-400 mt-1">취소 관리를 위해 상세 사유를 입력해 주세요.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
            <span className="material-symbols-outlined text-slate-400">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-10 space-y-8">
          
          {/* Reason Selection - Dynamic Listbox */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1">취소 사유 선택</label>
            <div className="relative">
              {isLoadingCodes ? (
                <div className="w-full h-16 bg-slate-50 rounded-2xl animate-pulse flex items-center px-5 text-slate-300 text-xs font-bold">
                  사유 목록을 불러오는 중...
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={reasonCode}
                    onChange={(e) => setReasonCode(e.target.value)}
                    className="w-full h-16 pl-6 pr-12 bg-slate-50 border-2 border-slate-50 rounded-2xl text-sm font-bold text-slate-700 appearance-none focus:bg-white focus:border-primary/20 outline-none transition-all cursor-pointer"
                  >
                    {reasonCodes.map((item) => (
                      <option key={item.DTL_CD} value={item.DTL_CD}>
                        {item.DTL_NM}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Reason */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1">상세 사유 (선택사항)</label>
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="구체적인 취소 사유를 입력하시면 원활한 처리에 도움이 됩니다."
              className="w-full h-32 p-5 bg-slate-50 border-2 border-slate-50 rounded-2xl text-sm focus:bg-white focus:border-primary/20 outline-none transition-all resize-none font-medium text-slate-700"
            />
          </div>

          {/* File Attachment */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1">증빙 서류 첨부 (선택사항)</label>
            <div className="relative group">
              <input
                type="file"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className={`p-6 border-2 border-dashed rounded-3xl flex items-center gap-4 transition-all ${
                selectedFile 
                ? 'border-primary/30 bg-primary/5' 
                : 'border-slate-100 bg-slate-50 group-hover:border-slate-300'
              }`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                  selectedFile ? 'bg-primary text-white' : 'bg-white text-slate-300'
                }`}>
                  <span className="material-symbols-outlined">
                    {selectedFile ? 'check_circle' : 'upload_file'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${selectedFile ? 'text-primary' : 'text-slate-400'}`}>
                    {selectedFile ? selectedFile.name : '증빙용 파일을 선택해 주세요'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">PDF, 이미지 파일 지원 (최대 10MB)</p>
                </div>
                {selectedFile && (
                  <button 
                    onClick={(e) => { e.preventDefault(); setSelectedFile(null); }}
                    className="z-20 p-2 hover:bg-white rounded-full text-slate-400 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-5 rounded-full text-sm font-black text-slate-400 hover:text-slate-600 transition-all"
          >
            취소하지 않고 돌아가기
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-[1.5] py-5 rounded-full bg-slate-900 text-white text-sm font-black shadow-xl shadow-slate-900/20 hover:bg-rose-600 hover:shadow-rose-600/20 active:scale-[0.98] transition-all disabled:bg-slate-200 disabled:shadow-none flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                처리 중...
              </>
            ) : '예약 취소 확정'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelTripReasonModal;
