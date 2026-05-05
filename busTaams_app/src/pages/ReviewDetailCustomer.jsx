import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import Swal from 'sweetalert2';
import BottomNavCustomer from '../components/BottomNavCustomer';

const ReviewDetailCustomer = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [review, setReview] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReview = async () => {
            try {
                console.log('[ReviewDetail] Fetching for ID:', id);
                // 백엔드 라우트 명시적 확인: /api/app/customer/review-detail/:id
                const response = await api.get(`/app/customer/review-detail/${id}`);
                console.log('[ReviewDetail] Response:', response);
                if (response.success) {
                    setReview(response.data);
                } else {
                    // response.success가 false인 경우에도 메시지 표시
                    Swal.fire({
                        icon: 'info',
                        title: '확인 필요',
                        text: response.error || '리뷰 정보를 찾을 수 없습니다.',
                        confirmButtonColor: '#0F766E'
                    });
                }
            } catch (error) {
                console.error('Fetch review detail error:', error);
                Swal.fire({
                    icon: 'error',
                    title: '조회 실패',
                    text: error.message || '리뷰 정보를 불러올 수 없습니다.',
                    confirmButtonColor: '#0F766E'
                });
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchReview();
    }, [id]);

    const renderStars = (rating) => {
        return (
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <span 
                        key={star} 
                        className={`material-symbols-outlined text-[24px] ${star <= rating ? 'text-[#F97316]' : 'text-[#E2E8F0]'}`}
                        style={{ fontVariationSettings: star <= rating ? "'FILL' 1" : "'FILL' 0" }}
                    >
                        star
                    </span>
                ))}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFB]">
                <span className="material-symbols-outlined text-6xl animate-spin text-[#0F766E]">progress_activity</span>
            </div>
        );
    }

    if (!review) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFB] p-6 text-center">
                <span className="material-symbols-outlined text-slate-300 text-6xl mb-4">rate_review</span>
                <h1 className="text-xl font-bold text-slate-800 mb-4">리뷰 내역이 없습니다.</h1>
                <button onClick={() => navigate(-1)} className="bg-[#0F766E] text-white px-8 py-3 rounded-full font-bold shadow-lg">돌아가기</button>
            </div>
        );
    }

    return (
        <div className="bg-[#F8FAFB] min-h-screen pb-40 text-left font-body">
            {/* Header */}
            <header className="fixed top-0 w-full z-50 bg-white border-b border-slate-100 px-6 h-16 flex items-center justify-between">
                <button onClick={() => navigate(-1)} className="material-symbols-outlined text-[#1E293B] p-2 hover:bg-slate-50 rounded-full transition-all">arrow_back</button>
                <h1 className="font-bold text-[17px] text-[#1E293B]">나의 리뷰 상세</h1>
                <div className="w-10"></div>
            </header>

            <main className="max-w-xl mx-auto px-6 pt-24 space-y-8">
                {/* Trip Info Card */}
                <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 relative overflow-hidden animate-in fade-in slide-in-from-bottom duration-700">
                    <div className="flex items-center justify-between gap-4">
                        <div className="space-y-4 flex-1">
                            <div className="flex items-center gap-3">
                                <span className="px-3 py-1 bg-teal-50 text-[#0F766E] text-[10px] font-black rounded-lg uppercase tracking-widest border border-teal-100">운행 완료</span>
                                <span className="text-[12px] text-slate-400 font-bold">{review.date}</span>
                            </div>
                            <h2 className="text-[20px] font-black text-slate-800 tracking-tight leading-tight">
                                {review.title}
                            </h2>
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-slate-300 text-[18px]">location_on</span>
                                <span className="text-[14px] text-slate-500 font-bold line-clamp-1">{review.startAddr}</span>
                                <span className="material-symbols-outlined text-slate-300 text-[14px]">arrow_forward</span>
                                <span className="text-[14px] text-slate-700 font-black">{review.endAddrMaster?.split(' ')[0]}</span>
                            </div>
                            
                            {/* Driver/Bus Summary in Card */}
                            <div className="flex items-center gap-4 pt-4 mt-4 border-t border-slate-50">
                                <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] overflow-hidden border border-slate-50 shadow-inner">
                                    {review.driverImage ? (
                                        <img src={`${import.meta.env.VITE_API_BASE_URL || ''}${review.driverImage}`} className="w-full h-full object-cover" alt="Driver" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[#94A3B8]">
                                            <span className="material-symbols-outlined text-2xl">person</span>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h4 className="text-[15px] font-black text-slate-800">{review.driverName} 기사님</h4>
                                    <p className="text-[12px] text-slate-400 font-bold">{review.busModel} • {review.busNo}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-orange-50 px-4 py-3 rounded-2xl flex flex-col items-center gap-1 border border-orange-100 shadow-sm min-w-[70px]">
                            <span className="text-[20px] font-black text-[#F97316]">{review.rating?.toFixed(1)}</span>
                            <span className="material-symbols-outlined text-[#F97316] text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        </div>
                    </div>
                </section>

                {/* Review Content */}
                <section className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100 space-y-8 animate-in fade-in slide-in-from-bottom duration-700 delay-200">
                    <div className="flex justify-center gap-1">
                        {renderStars(review.rating)}
                    </div>

                    <div className="relative">
                        <span className="material-symbols-outlined absolute -left-6 -top-4 text-[#F1F5F9] text-6xl rotate-180 opacity-50">format_quote</span>
                        <p className="text-[18px] text-[#334155] font-bold leading-relaxed relative z-10 text-center px-4 italic">
                            {review.comment}
                        </p>
                    </div>

                    <div className="h-px bg-slate-100 w-2/3 mx-auto" />

                    {/* Driver Reply Section */}
                    {review.reply ? (
                        <div className="bg-[#F8FAFB] rounded-[2rem] p-6 space-y-4 border border-slate-50">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-white overflow-hidden shadow-sm border border-slate-100 relative">
                                    {review.driverImage ? (
                                        <img src={`${import.meta.env.VITE_API_BASE_URL || ''}${review.driverImage}`} className="w-full h-full object-cover" alt="Driver" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[#94A3B8]">
                                            <span className="material-symbols-outlined text-3xl">person</span>
                                        </div>
                                    )}
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#0F766E] rounded-full border-2 border-white flex items-center justify-center">
                                        <span className="material-symbols-outlined text-white text-[14px]">verified</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[12px] font-black text-[#0F766E] uppercase tracking-wider">기사님 답변</p>
                                    <h4 className="text-[16px] font-black text-[#1E293B]">{review.driverName} 기사님</h4>
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50 relative">
                                <p className="text-[14px] text-[#475569] font-medium leading-relaxed">
                                    {review.reply}
                                </p>
                                <span className="material-symbols-outlined absolute right-4 bottom-4 text-[#F1F5F9] text-4xl opacity-50">directions_bus</span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-4 text-[#94A3B8] font-bold text-[13px]">
                            아직 기사님의 답변이 없습니다.
                        </div>
                    )}
                </section>
            </main>

            {/* Bottom Navigation */}
            <BottomNavCustomer />
        </div>
    );
};

export default ReviewDetailCustomer;

