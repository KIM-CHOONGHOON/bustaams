import React, { useState, useEffect } from 'react';

const ReviewManageModal = ({ user, onClose }) => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [writingReviewId, setWritingReviewId] = useState(null); 
  const [viewingDetailId, setViewingDetailId] = useState(null); 
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    fetchData();
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:8080/api/auction/total-history/${user.custId}`);
      if (res.ok) {
        const data = await res.json();
        // DONE 상태인 여정들만 그룹화하여 목록 구성
        const grouped = Object.values(data.reduce((acc, curr) => {
          if (!acc[curr.REQ_ID] && curr.DATA_STAT === 'DONE') {
            acc[curr.REQ_ID] = curr;
          }
          return acc;
        }, {}));
        setTrips(grouped);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleWrite = (trip) => {
    const id = trip.REQ_ID;
    if (writingReviewId === id) setWritingReviewId(null);
    else {
      setWritingReviewId(id);
      setViewingDetailId(null);
      setRating(5);
      setReviewText('');
    }
  };

  const handleToggleDetail = (id) => {
    if (viewingDetailId === id) setViewingDetailId(null);
    else {
      setViewingDetailId(id);
      setWritingReviewId(null);
    }
  };

  const handleSubmit = async (trip) => {
    if (!reviewText.trim()) {
      alert('평가 내용을 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('http://localhost:8080/api/review/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reqId: trip.REQ_ID,
          resId: trip.RES_ID,
          driverId: trip.DRIVER_ID,
          writerId: user.custId,
          rating: rating,
          content: reviewText,
          writerType: 'TRAVELER'
        })
      });

      if (response.ok) {
        alert('평가가 소중하게 등록되었습니다!');
        setWritingReviewId(null);
        fetchData();
      } else {
        alert('평가 등록 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('Submit review error:', err);
      alert('서버와의 통신 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[110] flex items-center justify-center bg-teal-950/40 backdrop-blur-xl p-4 animate-in fade-in duration-500"
      onClick={onClose}
    >
      <div 
        className="bg-[#f7f9fb] rounded-[2.5rem] w-full max-w-5xl h-[85vh] relative shadow-2xl overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-500"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <header className="px-12 py-10 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-4xl font-headline font-extrabold tracking-tighter text-teal-900 mb-2">리뷰 및 기사 평가</h2>
            <p className="text-slate-400 font-medium text-sm">함께한 기사님에 대한 소중한 평가를 남겨주세요.</p>
          </div>
          <button onClick={onClose} className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-all duration-300 group">
            <span className="material-symbols-outlined text-2xl group-hover:rotate-90 transition-transform duration-300">close</span>
          </button>
        </header>

        {/* List Area */}
        <div className="flex-1 overflow-y-auto px-12 py-10 custom-scrollbar space-y-6">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
              <div className="w-12 h-12 border-4 border-teal-800 border-t-transparent rounded-full animate-spin"></div>
              <p className="font-bold">데이터를 불러오는 중입니다...</p>
            </div>
          ) : trips.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
              <span className="material-symbols-outlined text-8xl mb-6 opacity-20">person_search</span>
              <p className="text-xl font-bold">평가할 여정 이력이 없습니다.</p>
            </div>
          ) : (
            trips.map(trip => (
              <div key={trip.REQ_ID} className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-teal-900/5 transition-all duration-500 group">
                <div className="p-8 flex flex-col md:flex-row items-center gap-8">
                  {/* Left: Trip Info */}
                  <div className="flex items-center gap-6 flex-1 min-w-0">
                    <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-700 shrink-0">
                      <span className="material-symbols-outlined text-3xl">directions_bus</span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xl font-headline font-black text-teal-950 mb-1 truncate">{trip.TRIP_TITLE || '프리미엄 여정'}</h4>
                      <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                        <span>{trip.START_ADDR?.split(' ')[0]} → {trip.END_ADDR?.split(' ')[0]}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                        <span>{new Date(trip.START_DT).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Driver Info */}
                  <div className="flex items-center gap-4 px-8 border-x border-slate-50 shrink-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md bg-slate-100 flex items-center justify-center">
                      {trip.DRIVER_PHOTO ? (
                        <img src={trip.DRIVER_PHOTO} alt="Driver" className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-slate-300">person</span>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-0.5">Driver</p>
                      <p className="text-sm font-black text-teal-900">{trip.DRIVER_NAME || '기사님 성함 미정'}</p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex gap-3 shrink-0">
                    {!trip.MY_COMMENT && (
                      <button 
                        onClick={() => handleToggleWrite(trip)}
                        className={`px-6 py-3 rounded-full text-xs font-black transition-all ${
                          writingReviewId === trip.REQ_ID 
                          ? 'bg-teal-900 text-white' 
                          : 'bg-teal-50 text-teal-900 hover:bg-teal-800 hover:text-white'
                        }`}
                      >
                        평가하기
                      </button>
                    )}
                    <button 
                      onClick={() => handleToggleDetail(trip.REQ_ID)}
                      className={`px-6 py-3 rounded-full text-xs font-black transition-all ${
                        viewingDetailId === trip.REQ_ID 
                        ? 'bg-teal-950 text-white' 
                        : 'bg-white border border-slate-200 text-slate-500 hover:border-teal-900 hover:text-teal-900'
                      }`}
                    >
                      {trip.MY_COMMENT ? '평가상세' : '평가확인'}
                    </button>
                  </div>
                </div>

                {/* Inline Form: 평가하기 */}
                {writingReviewId === trip.REQ_ID && (
                  <div className="px-8 pb-8 pt-2 animate-in slide-in-from-top-4 duration-300">
                    <div className="bg-slate-50 rounded-3xl p-8 space-y-6 border border-teal-900/5">
                      <div className="flex items-center gap-6">
                        <span className="text-sm font-black text-teal-900">만족도 평가</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(s => (
                            <span key={s} onClick={() => setRating(s)} className={`material-symbols-outlined text-3xl cursor-pointer transition-all ${rating >= s ? 'text-amber-400' : 'text-slate-200'}`} style={{ fontVariationSettings: `'FILL' ${rating >= s ? 1 : 0}` }}>star</span>
                          ))}
                        </div>
                      </div>
                      <textarea 
                        className="w-full bg-white border-none rounded-2xl p-6 text-sm text-teal-950 placeholder-slate-300 focus:ring-2 focus:ring-teal-100 transition-all resize-none shadow-inner"
                        placeholder="기사님께 전하고 싶은 감사 인사나 의견을 남겨주세요."
                        rows="3"
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                      />
                      <div className="flex justify-end gap-3">
                        <button onClick={() => setWritingReviewId(null)} className="px-6 py-2.5 rounded-full text-xs font-bold text-slate-400">취소</button>
                        <button onClick={() => handleSubmit(trip)} disabled={submitting} className="px-10 py-2.5 rounded-full bg-teal-900 text-white text-xs font-black shadow-lg shadow-teal-900/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50">
                          {submitting ? '제출 중...' : '평가 제출'}
                          <span className="material-symbols-outlined text-sm">send</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Inline Detail: 평가상세 */}
                {viewingDetailId === trip.REQ_ID && (
                  <div className="px-8 pb-8 pt-2 animate-in slide-in-from-top-4 duration-300">
                    {trip.MY_COMMENT ? (
                      <div className="space-y-4">
                        <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="flex text-amber-400">
                              {[...Array(trip.STAR_RATING || 5)].map((_, i) => <span key={i} className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>)}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">나의 평가 ({new Date(trip.REVIEW_REG_DT).toLocaleDateString()})</span>
                          </div>
                          <p className="text-sm text-slate-600 font-medium leading-relaxed italic">"{trip.MY_COMMENT}"</p>
                        </div>
                        {trip.DRIVER_REPLY && (
                          <div className="bg-teal-900/5 rounded-3xl p-8 border border-teal-900/10 flex gap-5 ml-12 shadow-sm">
                            <div className="w-10 h-10 rounded-full bg-teal-800 text-white flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-xl">person</span>
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-black text-teal-900">{trip.DRIVER_NAME}</span>
                                <span className="text-[10px] font-bold text-slate-400">{new Date(trip.DRIVER_REPLY_DT).toLocaleDateString()}</span>
                              </div>
                              <p className="text-sm text-teal-800 font-medium leading-relaxed">{trip.DRIVER_REPLY}</p>
                            </div>
                          </div>
                        )}
                        {!trip.DRIVER_REPLY && (
                          <div className="ml-12 px-8 py-4 bg-slate-50/50 rounded-2xl flex items-center gap-2 text-slate-300 border border-dashed border-slate-100">
                            <span className="material-symbols-outlined text-sm">schedule</span>
                            <span className="text-[10px] font-bold">기사님의 소중한 답글을 기다리고 있습니다.</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-50 rounded-3xl p-10 text-center text-slate-300 flex flex-col items-center border border-dashed border-slate-100">
                        <span className="material-symbols-outlined text-4xl mb-2 opacity-20">chat_error</span>
                        <p className="text-xs font-bold">아직 작성된 평가가 없습니다. '평가하기'를 먼저 진행해 주세요.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewManageModal;
