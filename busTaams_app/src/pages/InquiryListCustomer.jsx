import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { notify } from '../utils/toast';
import Swal from 'sweetalert2';

const InquiryListCustomer = () => {
    const navigate = useNavigate();
    const [inquiries, setInquiries] = useState([]);
    const [loading, setLoading] = useState(true);

    const categories = [
        { name: '입찰 및 예약 문의', code: 'BID_RES' },
        { name: '결제 및 계약금 관련', code: 'PAY_REFUND' },
        { name: '취소 및 환불 정책', code: 'CANCEL_RULE' },
        { name: '기사님 및 운행 서비스', code: 'BUS_STAT' },
        { name: '서비스 제안 및 기타', code: 'SUGGESTION' }
    ];

    useEffect(() => {
        fetchInquiries();
    }, []);

    const fetchInquiries = async () => {
        setLoading(true);
        try {
            const response = await api.get('/app/customer/inquiries');
            if (response.success) {
                setInquiries(response.data);
            }
        } catch (error) {
            console.error('Fetch inquiries error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleShowDetail = async (inquiryId) => {
        try {
            const res = await api.get(`/app/customer/inquiries/${inquiryId}`);
            if (res.success) {
                const data = res.data;
                Swal.fire({
                    title: `<div class="text-left"><p class="text-[10px] text-teal-600 font-bold uppercase tracking-widest mb-1">${data.category}</p><h2 class="text-xl font-black text-teal-900">${data.title}</h2></div>`,
                    html: `
                        <div class="text-left mt-6 space-y-6 font-body">
                            <div class="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                <p class="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">${data.content}</p>
                                <p class="text-[10px] text-outline mt-4 font-bold">${data.date}</p>
                            </div>
                            
                            ${data.replyContent ? `
                            <div class="relative pl-6 py-2">
                                <div class="absolute left-0 top-0 bottom-0 w-1 bg-teal-600 rounded-full"></div>
                                <div class="flex items-center gap-2 mb-3">
                                    <span class="material-symbols-outlined text-teal-700 text-lg">support_agent</span>
                                    <span class="font-bold text-sm text-teal-900">운영진 답변</span>
                                    <span class="text-[10px] text-outline ml-auto">${data.replyDate}</span>
                                </div>
                                <div class="bg-teal-50/50 p-5 rounded-2xl border border-teal-100/50">
                                    <p class="text-sm text-teal-900 leading-relaxed whitespace-pre-wrap font-medium">${data.replyContent}</p>
                                </div>
                            </div>
                            ` : `
                            <div class="bg-slate-50/50 p-8 rounded-2xl border border-dashed border-slate-200 text-center">
                                <span class="material-symbols-outlined text-slate-300 text-3xl mb-2">hourglass_empty</span>
                                <p class="text-xs font-bold text-slate-400">담당자가 답변을 준비 중입니다.</p>
                            </div>
                            `}
                        </div>
                    `,
                    showConfirmButton: true,
                    confirmButtonText: '확인',
                    confirmButtonColor: '#004e47',
                    customClass: {
                        popup: 'rounded-[2.5rem] p-8 border-none shadow-2xl',
                        confirmButton: 'w-full py-4 rounded-2xl font-bold bg-teal-700 text-white mt-4'
                    },
                    buttonsStyling: false
                });
            }
        } catch (err) {
            notify.error('오류', '상세 내용을 불러오지 못했습니다.');
        }
    };

    const handleShowAddInquiry = async () => {
        const { value: formValues } = await Swal.fire({
            title: '<h2 class="text-2xl font-black text-teal-900 text-left">1:1 문의하기</h2>',
            html: `
                <div class="text-left mt-6 font-body space-y-6">
                    <div class="space-y-3">
                        <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">문의 카테고리</label>
                        <select id="swal-category" class="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-bold text-teal-900 outline-none focus:ring-2 focus:ring-teal-700/10">
                            ${categories.map(c => `<option value="${c.code}">${c.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="space-y-3">
                        <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">문의 제목</label>
                        <input id="swal-title" class="w-full bg-slate-50 border-none rounded-xl p-4 text-sm placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-teal-700/10" placeholder="제목을 입력해 주세요">
                    </div>
                    <div class="space-y-3">
                        <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">상세 내용</label>
                        <textarea id="swal-content" class="w-full bg-slate-50 border-none rounded-xl p-4 text-sm placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-teal-700/10 h-32 resize-none" placeholder="내용을 입력해 주세요"></textarea>
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: '문의 접수',
            cancelButtonText: '취소',
            buttonsStyling: false,
            customClass: {
                popup: 'rounded-[2.5rem] p-10 border-none shadow-2xl',
                confirmButton: 'bg-teal-700 text-white px-8 py-4 rounded-2xl font-bold text-sm shadow-xl shadow-teal-900/20 hover:scale-105 transition-all mr-2',
                cancelButton: 'bg-slate-100 text-slate-500 px-8 py-4 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all ml-2',
                actions: 'mt-10'
            },
            preConfirm: () => {
                const category = document.getElementById('swal-category').value;
                const title = document.getElementById('swal-title').value;
                const content = document.getElementById('swal-content').value;
                if (!title || !content) {
                    Swal.showValidationMessage('제목과 내용을 모두 입력해주세요.');
                    return false;
                }
                return { category, title, content };
            }
        });

        if (formValues) {
            try {
                const res = await api.post('/app/customer/inquiries', formValues);
                if (res.success) {
                    notify.success('접수 완료', '문의가 성공적으로 전달되었습니다.');
                    fetchInquiries();
                }
            } catch (err) {
                notify.error('오류', err.message || '접수 중 오류가 발생했습니다.');
            }
        }
    };

    return (
        <div className="bg-background text-on-surface min-h-screen pb-40 font-body">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm shadow-teal-900/5 h-16 flex items-center">
                <div className="flex items-center justify-between px-6 w-full max-w-2xl mx-auto">
                    <button onClick={() => navigate(-1)} className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 transition-colors active:scale-90">
                        <span className="material-symbols-outlined text-teal-800 dark:text-teal-400">arrow_back</span>
                    </button>
                    <h1 className="font-headline font-bold text-lg text-teal-800 dark:text-teal-400 tracking-tight">1:1 문의 내역</h1>
                    <div className="w-10"></div>
                </div>
            </header>

            <main className="pt-24 px-6 max-w-2xl mx-auto space-y-8">
                {/* Welcome Section */}
                <section className="mb-12 text-left">
                    <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight leading-tight">
                        고객님의 소중한<br/>
                        <span className="text-primary-container text-teal-700">문의 기록</span>입니다.
                    </h2>
                    <p className="mt-4 text-on-surface-variant font-body text-sm leading-relaxed max-w-xs opacity-70">
                        남겨주신 문의사항은 담당자가 확인 후 순차적으로 답변해 드리고 있습니다.
                    </p>
                </section>

                {/* List of Inquiries */}
                <div className="space-y-6 text-left">
                    {loading ? (
                        <div className="py-20 text-center opacity-50">로딩 중...</div>
                    ) : inquiries.length > 0 ? (
                        inquiries.map((inquiry) => (
                            <article 
                                key={inquiry.id}
                                onClick={() => handleShowDetail(inquiry.id)}
                                className="group relative bg-white rounded-xl p-6 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
                            >
                                {inquiry.isCompleted && (
                                    <div className="absolute left-0 top-6 bottom-6 w-1 bg-teal-600 rounded-r-full"></div>
                                )}
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-[11px] font-bold tracking-widest text-teal-700 uppercase px-3 py-1 bg-teal-50 rounded-full">
                                        {inquiry.category}
                                    </span>
                                    <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${inquiry.isCompleted ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        {inquiry.status}
                                    </span>
                                </div>
                                <h3 className="font-headline text-lg font-bold text-on-surface mb-2 group-hover:text-teal-700 transition-colors">
                                    {inquiry.title}
                                </h3>
                                <div className="flex items-center gap-4 text-on-surface-variant">
                                    <span className="text-xs font-medium">{inquiry.date}</span>
                                    <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                    <div className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">{inquiry.isCompleted ? 'chat_bubble' : 'hourglass_empty'}</span>
                                        <span className="text-xs font-medium">
                                            {inquiry.isCompleted ? `${inquiry.replyCount}개 답변` : '검토중'}
                                        </span>
                                    </div>
                                </div>
                            </article>
                        ))
                    ) : (
                        <div className="py-20 text-center flex flex-col items-center opacity-40">
                            <span className="material-symbols-outlined text-5xl mb-4">inbox</span>
                            <p className="text-sm font-bold">문의 내역이 없습니다.</p>
                        </div>
                    )}

                    {/* End State Illustration */}
                    <div className="py-12 flex flex-col items-center justify-center opacity-40">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-3xl text-on-surface-variant">help_center</span>
                        </div>
                        <p className="text-xs font-body font-bold text-on-surface-variant">문의 내역의 끝입니다</p>
                    </div>
                </div>
            </main>

            {/* Floating Action Button */}
            <div className="fixed bottom-28 left-0 right-0 px-6 flex justify-center pointer-events-none z-40">
                <button 
                    onClick={handleShowAddInquiry}
                    className="pointer-events-auto flex items-center gap-3 bg-gradient-to-br from-teal-700 to-teal-900 text-white px-8 py-4 rounded-full shadow-2xl shadow-teal-900/40 hover:scale-105 active:scale-95 transition-all duration-300"
                >
                    <span className="material-symbols-outlined font-black">add</span>
                    <span className="font-headline font-bold text-base tracking-tight">새로운 문의하기</span>
                </button>
            </div>

            {/* BottomNavBar (Same as Dashboard) */}
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
                <button className="flex flex-col items-center justify-center bg-teal-700 text-white rounded-full px-5 py-2">
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

export default InquiryListCustomer;
