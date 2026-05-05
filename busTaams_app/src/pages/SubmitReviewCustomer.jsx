import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { notify } from '../utils/toast';

const SubmitReviewCustomer = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const response = await api.get(`/app/customer/completed-mission-detail/${id}`);
                if (response.success) {
                    setDetail(response.data);
                }
            } catch (error) {
                console.error('Fetch mission detail error:', error);
                Swal.fire({
                    icon: 'error',
                    title: '데이터 로드 실패',
                    text: '운행 정보를 불러올 수 없습니다.',
                    confirmButtonColor: '#0F766E'
                });
            } finally {
                setLoading(false);
            }
        };

        fetchDetail();
    }, [id]);

    const handleSubmit = async () => {
        if (!comment.trim()) {
            notify.warn('입력 확인', '기사님께 전달할 감사 인사를 작성해주세요.');
            return;
        }

        setSubmitting(true);
        try {
            const response = await api.post('/submit-review', {
                resUuid: id,
                rating,
                comment
            });

            if (response.success) {
                await notify.success('등록 완료', '소중한 후기가 등록되었습니다. 감사합니다!');
                navigate('/review-pending-list');
            } else {
                notify.error('등록 실패', response.error || '후기 등록에 실패했습니다.');
            }
        } catch (error) {
            console.error('Submit review error:', error);
            notify.error('오류 발생', error.message || '리뷰 등록 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFB]">
                <span className="material-symbols-outlined text-6xl animate-spin text-[#0F766E]">progress_activity</span>
            </div>
        );
    }

    return (
        <div className="bg-[#F8FAFB] min-h-screen pb-20 text-left font-body">
            {/* Header */}
            <header className="fixed top-0 w-full z-50 bg-white border-b border-slate-100 px-6 h-16 flex items-center justify-between">
                <button onClick={() => navigate(-1)} className="material-symbols-outlined text-[#1E293B] p-2 hover:bg-slate-50 rounded-full transition-all">close</button>
                <h1 className="font-bold text-[17px] text-[#1E293B]">평점 및 감사글 작성</h1>
                <div className="w-10"></div>
            </header>

            <main className="max-w-xl mx-auto px-6 pt-24 space-y-10">
                {/* Trip Info Summary */}
                <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-[10px] font-black uppercase tracking-wider">Reviewing Trip</span>
                        <span className="text-[12px] text-slate-400 font-bold">{detail?.date}</span>
                    </div>
                    <h2 className="text-[20px] font-black text-slate-800 tracking-tight">{detail?.title || '나의 버스 여정'}</h2>
                    <div className="flex items-center gap-2 text-slate-500">
                        <span className="material-symbols-outlined text-[18px]">distance</span>
                        <p className="text-[14px] font-bold">
                            {detail?.startAddr} 
                            {detail?.viaAddr ? ` → ${detail?.viaAddr}` : ''} 
                            → {detail?.endAddrVia || detail?.endAddrMaster}
                        </p>
                    </div>
                </section>

                {/* Driver Summary */}
                <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex items-center gap-6 animate-in fade-in slide-in-from-top duration-700">
                    <div className="w-20 h-20 rounded-3xl bg-[#F1F5F9] overflow-hidden shadow-inner border border-slate-50">
                        {detail?.driverImage ? (
                            <img src={`${import.meta.env.VITE_API_BASE_URL || ''}${detail.driverImage}`} className="w-full h-full object-cover" alt="Driver" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#94A3B8]">
                                <span className="material-symbols-outlined text-4xl">person</span>
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="text-[12px] font-black text-[#0F766E] uppercase tracking-wider mb-1">{detail?.busModel || '45인승 일반'}</p>
                        <h3 className="text-[20px] font-black text-[#1E293B] tracking-tight">{detail?.driverName} 기사님</h3>
                        <p className="text-[13px] text-[#94A3B8] font-bold mt-1">{detail?.busNo}</p>
                    </div>
                </section>

                {/* Rating Section */}
                <section className="text-center space-y-8 animate-in fade-in slide-in-from-bottom duration-700 delay-200">
                    <div className="space-y-2">
                        <h2 className="text-[24px] font-black text-[#1E293B] tracking-tight">여정은 어떠셨나요?</h2>
                        <p className="text-[14px] text-[#64748B] font-medium">기사님께 별점을 남겨주세요.</p>
                    </div>

                    <div className="flex justify-center gap-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button 
                                key={star} 
                                onClick={() => setRating(star)}
                                className="group transition-all active:scale-75"
                            >
                                <span 
                                    className={`material-symbols-outlined text-[48px] transition-all ${rating >= star ? 'text-[#F97316] drop-shadow-sm' : 'text-[#E2E8F0]'}`}
                                    style={{ fontVariationSettings: rating >= star ? "'FILL' 1" : "'FILL' 0" }}
                                >
                                    star
                                </span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Comment Section */}
                <section className="space-y-4 animate-in fade-in slide-in-from-bottom duration-700 delay-400">
                    <div className="flex items-center justify-between px-2">
                        <label className="text-[15px] font-black text-[#1E293B]">감사글 작성</label>
                        <span className="text-[12px] text-[#94A3B8] font-bold">{comment.length} / 500</span>
                    </div>
                    <textarea 
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="기사님께 따뜻한 감사 인사를 전해주세요. 작성해주신 내용은 기사님께 큰 힘이 됩니다."
                        className="w-full bg-white border border-slate-200 rounded-[2rem] p-8 text-[16px] font-bold text-[#1E293B] placeholder:text-[#CBD5E1] focus:ring-4 focus:ring-[#0F766E]/5 focus:border-[#0F766E] transition-all min-h-[240px] resize-none"
                    />
                </section>

                {/* Submit Button */}
                <section className="pt-6 animate-in fade-in slide-in-from-bottom duration-700 delay-600">
                    <button 
                        onClick={handleSubmit}
                        disabled={submitting}
                        className={`w-full py-6 rounded-full font-black text-[16px] flex items-center justify-center gap-3 shadow-xl transition-all active:scale-[0.98] ${submitting ? 'bg-slate-200 text-slate-400' : 'bg-[#0F766E] text-white shadow-teal-900/20 hover:bg-[#0D6B5E]'}`}
                    >
                        {submitting ? (
                            <>
                                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                <span>처리 중...</span>
                            </>
                        ) : (
                            <>
                                <span>후기 제출하기</span>
                                <span className="material-symbols-outlined">send</span>
                            </>
                        )}
                    </button>
                    <p className="text-center mt-6 text-[12px] text-[#94A3B8] font-medium leading-relaxed">
                        부적절한 내용이나 개인정보 포함 시<br />관리자에 의해 제재를 받을 수 있습니다.
                    </p>
                </section>
            </main>
        </div>
    );
};

export default SubmitReviewCustomer;
