import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { notify } from '../utils/toast';

/**
 * 기사용 리뷰 답글 관리 페이지
 * 고객의 평점 및 후기를 확인하고 감사 답글을 작성할 수 있는 프리미엄 UI입니다.
 */
const RatingReplyDriver = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [trip, setTrip] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchTripDetail = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/app/driver/mission-detail/${id}`);
                if (response.success) {
                    setTrip(response.data);
                    // 기존에 작성된 답글이 있다면 상태에 반영
                    setReplyText(response.data.replyText || '');
                }
            } catch (error) {
                console.error('Failed to fetch trip detail:', error);
                notify.error('정보 로드 실패', '정보를 불러오는데 실패했습니다.');
            } finally {
                setLoading(false);
            }
        };

        fetchTripDetail();
    }, [id]);

    const handleSubmit = async () => {
        if (!replyText.trim()) {
            notify.warn('입력 확인', '답글 내용을 입력해주세요.');
            return;
        }

        setSubmitting(true);
        try {
            const response = await api.post(`/app/driver/save-review-reply/${id}`, {
                replyText
            });

            if (response.success) {
                // 앱 전체에서 사용하는 공통 모달 팝업 스타일 적용 (확인 버튼 클릭 시 이동)
                await notify.success('저장 완료', '답글이 성공적으로 저장되었습니다.');
                navigate(-1);
            }
        } catch (error) {
            console.error('Save reply error:', error);
            notify.error('저장 실패', '답글 저장에 실패했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-background min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!trip || !trip.reviewRating) {
        return (
            <div className="bg-background min-h-screen flex flex-col items-center justify-center p-6 text-center">
                <span className="material-symbols-outlined text-6xl text-slate-200 mb-6">rate_review</span>
                <p className="text-slate-400 font-bold italic text-xl mb-8">해당 운행에 대한 고객 후기가 아직 없습니다.</p>
                <button 
                    onClick={() => navigate(-1)} 
                    className="px-12 py-4 bg-primary text-white rounded-2xl font-black italic uppercase tracking-widest shadow-xl shadow-primary/20"
                >
                    뒤로 가기
                </button>
            </div>
        );
    }

    return (
        <div className="bg-background text-on-surface min-h-[100dvh] pb-32 font-body text-left">
            {/* 상단 헤더 */}
            <header className="fixed top-0 w-full z-50 bg-white/40 backdrop-blur-3xl border-b border-white/20 py-6">
                <div className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto">
                    <div className="flex items-center gap-6 text-left">
                        <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl text-primary shadow-xl shadow-teal-900/5 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                        </button>
                        <h1 className="font-headline font-black tracking-tighter text-3xl text-primary italic uppercase">피드백 관리</h1>
                    </div>
                </div>
            </header>

            <main className="pt-40 px-6 max-w-3xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom duration-1000 text-left">
                {/* 헤드라인 섹션 */}
                <section className="text-left space-y-4">
                    <span className="inline-block px-5 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] font-black tracking-[0.3em] uppercase italic">Driver Reply</span>
                    <h2 className="font-headline text-5xl md:text-6xl font-black italic uppercase tracking-tighter text-primary leading-[0.9] text-left">
                        고객님의 소중한 후기에<br />
                        <span className="text-secondary tracking-widest">감사의 마음</span>을 전하세요
                    </h2>
                </section>

                {/* 고객 후기 카드 */}
                <section className="space-y-6 text-left">
                    <div className="bg-white rounded-[3.5rem] p-10 shadow-[0_40px_80px_-20px_rgba(0,104,95,0.08)] relative overflow-hidden text-left border border-white">
                        <div className="absolute top-10 right-10 flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                                <span key={i} className={`material-symbols-outlined text-2xl ${i < trip.reviewRating ? 'text-secondary' : 'text-slate-100'}`} style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                            ))}
                        </div>
                        
                        <div className="flex items-center gap-6 mb-8 text-left">
                            <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-50 border border-slate-100">
                                {trip.customerImage ? (
                                    <img className="w-full h-full object-cover" src={trip.customerImage} alt="customer" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-50">
                                        <span className="material-symbols-outlined text-slate-200 text-3xl">person</span>
                                    </div>
                                )}
                            </div>
                            <div className="text-left space-y-1">
                                <p className="font-black text-primary italic text-xl">{trip.customerName} 고객님</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{trip.reviewDate} 작성</p>
                            </div>
                        </div>
                        
                        <div className="bg-slate-50/50 rounded-3xl p-8 relative italic font-bold text-slate-600 leading-relaxed text-lg text-left">
                            <span className="absolute -top-4 -left-2 text-primary/10 text-7xl font-serif">"</span>
                            {trip.reviewComment}
                            <span className="absolute -bottom-10 -right-2 text-primary/10 text-7xl font-serif">"</span>
                        </div>
                    </div>
                </section>

                {/* 답글 입력 섹션 */}
                <section className="space-y-6 text-left">
                    <div className="bg-white rounded-[3.5rem] p-10 shadow-[0_40px_80px_-20px_rgba(0,104,95,0.08)] text-left border border-white">
                        <label className="block text-primary font-black italic uppercase tracking-widest text-[10px] mb-6 ml-2" htmlFor="reply">답글 작성하기</label>
                        <textarea 
                            id="reply"
                            className="w-full bg-slate-50 border-2 border-transparent rounded-[2.5rem] p-10 text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-primary/20 focus:ring-0 transition-all resize-none font-bold italic text-lg leading-relaxed shadow-inner"
                            placeholder="고객님께 전할 감사의 인사를 입력해주세요..."
                            rows="6"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                        ></textarea>
                        
                        <div className="mt-10 w-full">
                            <button 
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="w-full bg-gradient-to-br from-primary to-teal-800 text-white py-8 rounded-[2.5rem] font-black italic uppercase tracking-[0.4em] text-sm shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all duration-500 flex items-center justify-center gap-6 disabled:opacity-50"
                            >
                                {submitting ? '저장 중...' : '답글 등록하기'}
                                <span className="material-symbols-outlined text-xl">send</span>
                            </button>
                        </div>
                    </div>
                </section>

                <p className="text-center text-slate-300 font-bold italic text-[10px] uppercase tracking-widest">
                    진심이 담긴 답글은 기사님의 신뢰도를 높이는 가장 좋은 방법입니다.
                </p>
            </main>
        </div>
    );
};

export default RatingReplyDriver;
