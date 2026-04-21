import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';

const InquiryDetailCustomer = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [inquiry, setInquiry] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInquiry = async () => {
            try {
                const response = await api.get(`/app/customer/inquiries/${id}`);
                if (response.success) {
                    setInquiry(response.data);
                }
            } catch (error) {
                console.error('Fetch inquiry detail error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInquiry();
    }, [id]);

    if (loading) {
        return <div className="min-h-screen bg-background flex items-center justify-center font-body opacity-50">로딩 중...</div>;
    }

    if (!inquiry) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center font-body p-6 text-center">
                <p className="text-on-surface-variant mb-6 font-bold">문의 내역을 찾을 수 없습니다.</p>
                <button onClick={() => navigate(-1)} className="px-8 py-3 bg-teal-700 text-white rounded-full">돌아가기</button>
            </div>
        );
    }

    return (
        <div className="bg-background text-on-surface min-h-screen pb-40 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm shadow-teal-900/5 h-16 flex items-center">
                <div className="flex items-center justify-between px-6 w-full max-w-3xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 transition-colors active:scale-90">
                            <span className="material-symbols-outlined text-teal-800 dark:text-teal-400">arrow_back</span>
                        </button>
                        <h1 className="text-teal-900 dark:text-teal-100 font-extrabold tracking-tight font-headline text-lg">문의 상세</h1>
                    </div>
                </div>
            </header>

            <main className="pt-24 px-6 max-w-3xl mx-auto">
                {/* Page Header & Status */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
                    <div className="space-y-1">
                        <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase ${inquiry.isCompleted ? 'bg-teal-700 text-white shadow-lg shadow-teal-900/20' : 'bg-slate-200 text-slate-500'}`}>
                            {inquiry.statusText}
                        </span>
                        <h2 className="text-4xl font-extrabold text-teal-900 mt-4 tracking-tight leading-tight">문의 상세 내역</h2>
                    </div>
                    <div className="text-on-surface-variant text-sm font-medium opacity-60">
                        Inquiry ID #{inquiry.id}
                    </div>
                </div>

                <div className="space-y-8">
                    {/* User's Question Card */}
                    <section className="bg-white rounded-xl p-8 shadow-sm border border-slate-50 relative overflow-hidden">
                        <div className="flex flex-col gap-6">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <p className="text-teal-600 font-bold text-xs uppercase tracking-widest">{inquiry.category}</p>
                                    <h3 className="text-2xl font-bold text-on-surface tracking-tight leading-snug">{inquiry.title}</h3>
                                </div>
                                <time className="text-on-surface-variant text-xs font-semibold opacity-60">{inquiry.date}</time>
                            </div>
                            <div className="bg-slate-50 w-full h-[2px] rounded-full"></div>
                            <div className="prose prose-slate max-w-none">
                                <p className="text-on-surface-variant leading-relaxed font-medium whitespace-pre-wrap">
                                    {inquiry.content}
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Admin Response Card */}
                    {inquiry.replyContent ? (
                        <section className="bg-slate-50 rounded-xl p-8 relative border border-slate-100">
                            <div className="absolute left-0 top-8 bottom-8 w-1 bg-teal-600 rounded-r-full"></div>
                            <div className="pl-4">
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-teal-700 flex items-center justify-center text-white shadow-md shadow-teal-900/10">
                                            <span className="material-symbols-outlined text-xl" style={{fontVariationSettings: "'FILL' 1"}}>support_agent</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-on-surface tracking-tight">운영진 답변</h4>
                                            <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">Customer Support</p>
                                        </div>
                                    </div>
                                    <time className="text-on-surface-variant text-[10px] font-bold opacity-60">{inquiry.replyDate}</time>
                                </div>
                                <div className="text-on-surface leading-relaxed font-medium bg-white/60 p-6 rounded-lg border border-white whitespace-pre-wrap">
                                    {inquiry.replyContent}
                                </div>
                                <div className="mt-8 flex justify-end">
                                    <button className="bg-gradient-to-br from-teal-700 to-teal-900 text-white px-8 py-3 rounded-full font-bold text-sm shadow-xl shadow-teal-900/20 active:scale-95 transition-all flex items-center gap-2">
                                        <span>도움이 되었습니다</span>
                                        <span className="material-symbols-outlined text-sm">thumb_up</span>
                                    </button>
                                </div>
                            </div>
                        </section>
                    ) : (
                        <div className="bg-slate-50 rounded-xl p-12 text-center border border-dashed border-slate-200">
                            <span className="material-symbols-outlined text-4xl text-slate-300 mb-4 animate-pulse">hourglass_empty</span>
                            <p className="text-sm font-bold text-slate-400">담당자가 문의 내용을 검토하고 있습니다.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* BottomNavBar (Matched with Dashboard) */}
            <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[95%] md:w-[600px] rounded-full z-50 bg-white/80 backdrop-blur-xl shadow-2xl flex justify-around items-center p-2 h-16 border border-white/40">
                <button onClick={() => navigate('/customer-dashboard')} className="flex flex-col items-center justify-center text-slate-500 px-4 py-2 hover:text-teal-700 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">home</span>
                    <span className="font-bold text-[9px] uppercase tracking-widest mt-0.5">홈</span>
                </button>
                <button onClick={() => navigate('/estimate-list')} className="flex flex-col items-center justify-center text-slate-500 px-4 py-2 hover:text-teal-700 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">gavel</span>
                    <span className="font-bold text-[9px] uppercase tracking-widest mt-0.5">경매</span>
                </button>
                <button onClick={() => navigate('/reservation-list')} className="flex flex-col items-center justify-center text-slate-500 px-4 py-2 hover:text-teal-700 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">confirmation_number</span>
                    <span className="font-bold text-[9px] uppercase tracking-widest mt-0.5">예약</span>
                </button>
                <button onClick={() => navigate('/chat-list')} className="flex flex-col items-center justify-center text-slate-500 px-4 py-2 hover:text-teal-700 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">chat_bubble</span>
                    <span className="font-bold text-[9px] uppercase tracking-widest mt-0.5">메시지</span>
                </button>
                <button onClick={() => navigate('/inquiry-list')} className="flex flex-col items-center justify-center bg-teal-700 text-white rounded-full px-5 py-2">
                    <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings: "'FILL' 1"}}>support_agent</span>
                    <span className="font-bold text-[9px] uppercase tracking-widest mt-0.5">문의</span>
                </button>
                <button onClick={() => navigate('/user-profile')} className="flex flex-col items-center justify-center text-slate-500 px-4 py-2 hover:text-teal-700 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">person</span>
                    <span className="font-bold text-[9px] uppercase tracking-widest mt-0.5">내 정보</span>
                </button>
            </nav>
        </div>
    );
};

export default InquiryDetailCustomer;
