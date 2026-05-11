import React, { useState, useEffect } from 'react';

const TripHistoryModal = ({ user, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, COMPLETED, CANCELED

  useEffect(() => {
    // 모달이 열려있을 때 뒤 배경 스크롤 방지
    document.body.style.overflow = 'hidden';
    
    if (user && user.custId) {
      fetchHistory();
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [user]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8080/api/auction/total-history/${user.custId}`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Fetch trip history error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    } catch (e) {
      return dateStr;
    }
  };

  const formatPrice = (price) => {
    if (!price && price !== 0) return '-';
    return `₩${Number(price).toLocaleString()}`;
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'CONFIRM': { label: '예약 확정', class: 'bg-teal-100 text-teal-700' },
      'COMPLETED': { label: '이용 완료', class: 'bg-blue-100 text-blue-700' },
      'TRAVELER_CANCEL': { label: '취소됨 (고객)', class: 'bg-rose-100 text-rose-700' },
      'DRIVER_CANCEL': { label: '취소됨 (기사)', class: 'bg-rose-100 text-rose-700' },
      'AUCTION': { label: '견적중', class: 'bg-amber-100 text-amber-700' },
      'DONE': { label: '완료된 건', class: 'bg-slate-100 text-slate-700 font-black' }
    };
    const s = statusMap[status] || { label: status, class: 'bg-slate-100 text-slate-700' };
    return (
      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${s.class}`}>
        {s.label}
      </span>
    );
  };

  const getVehicleLabel = (type) => {
    const map = {
      'STANDARD_28': '일반 고속 (45인승)',
      'STANDARD_45': '일반 고속 (45인승)',
      'PREMIUM_28': '우등 고속 (28인승)',
      'PREMIUM_45': '우등 고속 (28인승)',
      'GOLD_21': '프리미엄 골드 (21인승)',
      'VVIP_16': 'V-VIP (16인승)',
      'MINI_25': '중형/미니 (25인승)',
      'VAN_11': '대형 밴 (11인승)'
    };
    return map[type] || type;
  };

  const filteredHistory = Object.values(history.reduce((acc, curr) => {
    if (!acc[curr.REQ_ID]) {
      acc[curr.REQ_ID] = { ...curr, buses: [] };
    }
    acc[curr.REQ_ID].buses.push(curr);
    return acc;
  }, {})).filter(item => {
    if (filter === 'ALL') return true;
    if (filter === 'COMPLETED') return item.DATA_STAT === 'DONE';
    if (filter === 'CANCELED') return ['TRAVELER_CANCEL', 'DRIVER_CANCEL', 'BUS_CHANGE', 'BUS_CANCEL'].includes(item.DATA_STAT);
    return true;
  });

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        className="bg-[#f7f9fb] rounded-[2.5rem] w-full max-w-5xl h-[85vh] relative shadow-2xl overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <header className="px-12 py-10 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-4xl font-headline font-extrabold tracking-tighter text-teal-900 mb-2">내 여정 기록</h2>
            <p className="text-slate-400 font-medium">지금까지 함께하신 특별한 여정들을 확인하세요.</p>
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-all duration-300 group"
          >
            <span className="material-symbols-outlined text-2xl group-hover:rotate-90 transition-transform duration-300">close</span>
          </button>
        </header>

        {/* Filter Bar */}
        <div className="px-12 py-6 flex space-x-3 shrink-0">
          {[
            { id: 'ALL', label: '전체 내역' },
            { id: 'COMPLETED', label: '완료내역' },
            { id: 'CANCELED', label: '취소내역' }
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setFilter(btn.id)}
              className={`px-8 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                filter === btn.id 
                ? 'bg-teal-800 text-white shadow-lg shadow-teal-900/20' 
                : 'bg-white text-slate-400 hover:bg-teal-50 hover:text-teal-700'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-12 pb-12 custom-scrollbar">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
              <div className="w-12 h-12 border-4 border-teal-800 border-t-transparent rounded-full animate-spin"></div>
              <p className="font-bold">기록을 불러오는 중입니다...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
              <span className="material-symbols-outlined text-8xl mb-6 opacity-20">history</span>
              <p className="text-xl font-bold">표시할 여정 기록이 없습니다.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {filteredHistory.map((item) => (
                <div 
                  key={item.REQ_ID}
                  className="bg-white rounded-3xl p-8 border border-slate-100 flex flex-col md:flex-row items-center gap-8 hover:shadow-xl hover:shadow-teal-900/5 transition-all duration-500 group relative overflow-hidden"
                >
                  {/* Status Bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${item.DATA_STAT.includes('CANCEL') ? 'bg-rose-400' : 'bg-teal-600'}`}></div>
                  
                  {/* Date & Icon */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-500">
                      <span className="material-symbols-outlined text-3xl">directions_bus</span>
                    </div>
                    <span className="text-xs font-bold text-slate-500 mb-1">{getVehicleLabel(item.BUS_TYPE_CD)}</span>
                    <span className="text-[10px] font-bold text-slate-300">{formatDate(item.REG_DT)}</span>
                  </div>

                  {/* Trip Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      {getStatusBadge(item.DATA_STAT)}
                    </div>
                    <h3 className="text-2xl font-headline font-extrabold text-teal-900 mb-2 truncate">
                      {item.TRIP_TITLE || '일반 여정 예약'}
                    </h3>
                    <div className="flex items-center text-slate-500 font-medium">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] mr-2">출발</span>
                      <span className="text-sm">{item.START_ADDR}</span>
                      <span className="material-symbols-outlined mx-3 text-slate-300">trending_flat</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] mr-2">도착</span>
                      <span className="text-sm">{item.END_ADDR}</span>
                    </div>
                  </div>

                  {/* Price & Actions */}
                  <div className="flex flex-col items-end shrink-0 gap-4">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">여행 금액</p>
                      <p className="text-3xl font-headline font-black text-teal-900 tracking-tighter">
                        {formatPrice(item.REQ_AMT ?? item.req_amt ?? 0)}
                      </p>
                    </div>
                    <button className="px-6 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-500 hover:bg-teal-800 hover:border-teal-800 hover:text-white transition-all duration-300">
                      상세 보기
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripHistoryModal;
