import React, { useState } from 'react';

const AdjustBusPriceModal = ({ bus, onClose, onSuccess }) => {
  const [newPrice, setNewPrice] = useState(bus.UNIT_REQ_AMT || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatComma = (num) => {
    if (!num && num !== 0) return '';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const parseComma = (str) => {
    if (!str) return 0;
    return parseInt(str.toString().replace(/,/g, '')) || 0;
  };

  const handlePriceChange = (e) => {
    const value = e.target.value.replace(/[^0-9,]/g, '');
    setNewPrice(parseComma(value));
  };

  const handleSubmit = async () => {
    if (newPrice <= 0) {
      alert('가격을 0원보다 크게 입력해 주세요.');
      return;
    }

    if (!window.confirm(`차량 가격을 ${formatComma(newPrice)}원으로 변경하시겠습니까?`)) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auction/update-bus-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reqId: bus.REQ_ID,
          reqBusSeq: bus.REQ_BUS_SEQ,
          newPrice: newPrice,
          custId: JSON.parse(localStorage.getItem('user'))?.custId || 'SYSTEM'
        }),
      });

      if (response.ok) {
        alert('가격이 성공적으로 변경되었습니다.');
        onSuccess();
      } else {
        const result = await response.json();
        alert(result.error || '가격 변경 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Update Price Error:', error);
      alert('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden p-8 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-black text-slate-800">차량 가격 변경</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">차종</label>
            <p className="text-lg font-bold text-slate-700">{bus.BUS_TYPE_NM || '일반 버스 (45석)'}</p>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">현재 가격</label>
            <p className="text-lg font-bold text-slate-400 line-through">{formatComma(bus.UNIT_REQ_AMT)}원</p>
          </div>

          <div>
            <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-2">변경할 가격</label>
            <div className="relative">
              <input
                type="text"
                value={formatComma(newPrice)}
                onChange={handlePriceChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-2xl font-black text-primary text-right pr-12 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                autoFocus
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">원</span>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? '처리 중...' : '가격 변경 완료'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdjustBusPriceModal;
