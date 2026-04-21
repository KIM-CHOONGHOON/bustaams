import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { notify } from '../utils/toast';

const InquiryForm = () => {
    const navigate = useNavigate();
    const [selectedCategory, setSelectedCategory] = useState('입찰 및 예약 문의');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const categories = [
        { name: '입찰 및 예약 문의', code: 'BID_RES' },
        { name: '결제 및 계약금 관련', code: 'PAY_REFUND' },
        { name: '취소 및 환불 정책', code: 'CANCEL_RULE' },
        { name: '기사님 및 운행 서비스', code: 'BUS_STAT' },
        { name: '서비스 제안 및 기타', code: 'SUGGESTION' }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            notify.warn('입력 확인', '제목과 내용을 모두 입력해주세요.');
            return;
        }

        setSubmitting(true);
        try {
            const categoryCode = categories.find(c => c.name === selectedCategory)?.code || 'SUGGESTION';
            const response = await api.post('/app/customer/inquiries', {
                title,
                content,
                category: categoryCode
            });

            if (response.success) {
                notify.success('문의 접수 완료', '문의가 성공적으로 접수되었습니다.');
                navigate('/inquiry-list');
            }
        } catch (error) {
            console.error('Submit inquiry error:', error);
            notify.error('오류 발생', error.message || '서버 오류가 발생했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-background text-on-surface min-h-screen pb-40 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm shadow-teal-900/5 h-16 flex items-center">
                <div className="flex items-center justify-between px-6 w-full max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 transition-colors active:scale-90">
                            <span className="material-symbols-outlined text-teal-800 dark:text-teal-400">arrow_back</span>
                        </button>
                        <h1 className="font-headline font-bold text-lg text-teal-800 dark:text-teal-400 tracking-tight">1:1 문의하기</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 pt-24 pb-32">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                    {/* Editorial Intro Section */}
                    <div className="lg:col-span-5 flex flex-col justify-start">
                        <span className="text-teal-600 font-bold tracking-[0.2em] uppercase text-xs mb-6">컨시어지 서비스</span>
                        <h2 className="font-headline text-5xl lg:text-7xl font-extrabold text-teal-900 leading-[1.1] mb-8 tracking-tighter">
                            더 나은 <br/> <span className="text-teal-600 italic">서비스를 위해.</span>
                        </h2>
                        <p className="text-on-surface-variant text-lg leading-relaxed max-w-md mb-12 opacity-80">
                            사용자님의 피드백은 럭셔리 플릿 구매 경험을 진화시키는 원동력입니다. 건의 사항이나 궁금한 점을 큐레이터에게 직접 전달해 주세요.
                        </p>
                        
                        {/* Info Card */}
                        <div className="bg-slate-50 p-8 rounded-2xl relative overflow-hidden group border border-slate-100 shadow-sm">
                            <div className="absolute top-0 left-0 w-1 h-full bg-teal-600"></div>
                            <h3 className="font-headline font-bold text-xl mb-4 text-slate-800">1:1 맞춤형 문의</h3>
                            <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">경매 주기 동안 1:1 문의에 대한 평균 응답 시간은 <span className="text-teal-700 font-bold">4시간 미만</span>입니다.</p>
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-teal-600" style={{fontVariationSettings: "'FILL' 1"}}>verified_user</span>
                                <span className="text-xs font-bold uppercase tracking-wider text-teal-600">우선 처리 활성화됨</span>
                            </div>
                        </div>
                    </div>

                    {/* Inquiry Form */}
                    <div className="lg:col-span-7">
                        <form className="space-y-8" onSubmit={handleSubmit}>
                            {/* Category Selection */}
                            <div className="space-y-4">
                                <label className="font-headline font-bold text-sm tracking-widest uppercase text-on-surface-variant">문의 카테고리</label>
                                <div className="flex flex-wrap gap-3">
                                    {categories.map((cat) => (
                                        <button 
                                            key={cat.name}
                                            type="button"
                                            onClick={() => setSelectedCategory(cat.name)}
                                            className={`px-6 py-3 rounded-full font-bold text-sm transition-all active:scale-95 shadow-sm ${selectedCategory === cat.name ? 'bg-teal-700 text-white shadow-lg shadow-teal-900/20' : 'bg-surface-container-high text-on-surface hover:bg-slate-200'}`}
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Inputs */}
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <label className="font-headline font-bold text-sm tracking-widest uppercase text-on-surface-variant" htmlFor="inquiry-title">제목</label>
                                    <input 
                                        className="w-full bg-slate-50 border-none rounded-xl p-5 text-on-surface placeholder:text-slate-400 focus:ring-2 focus:ring-teal-700/20 focus:bg-white transition-all outline-none" 
                                        id="inquiry-title" 
                                        placeholder="문의 내용을 간략하게 요약해 주세요" 
                                        type="text" 
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-4">
                                    <label className="font-headline font-bold text-sm tracking-widest uppercase text-on-surface-variant" htmlFor="inquiry-content">상세 내용</label>
                                    <textarea 
                                        className="w-full bg-slate-50 border-none rounded-xl p-5 text-on-surface placeholder:text-slate-400 focus:ring-2 focus:ring-teal-700/20 focus:bg-white transition-all outline-none resize-none" 
                                        id="inquiry-content" 
                                        placeholder="제안이나 궁금한 점을 자세히 적어주세요..." 
                                        rows="8"
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                    ></textarea>
                                </div>
                            </div>

                            {/* Attachments Placeholder */}
                            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center gap-4 group cursor-pointer hover:bg-white hover:border-teal-600/30 transition-all">
                                <span className="material-symbols-outlined text-4xl text-slate-300 group-hover:text-teal-600 transition-colors">cloud_upload</span>
                                <p className="text-sm font-bold text-on-surface-variant">지원 문서를 드래그하거나 <span className="text-teal-700 underline">파일 찾아보기</span></p>
                            </div>

                            {/* Submit */}
                            <div className="flex justify-end pt-6">
                                <button 
                                    disabled={submitting}
                                    className="flex items-center gap-3 px-10 py-5 bg-gradient-to-br from-teal-700 to-teal-900 text-white rounded-full font-headline font-extrabold text-lg shadow-2xl shadow-teal-900/30 hover:shadow-teal-900/50 transition-all active:scale-95 disabled:opacity-50" 
                                    type="submit"
                                >
                                    <span>{submitting ? '보내는 중...' : '문의 보내기'}</span>
                                    {!submitting && <span className="material-symbols-outlined">send</span>}
                                </button>
                            </div>
                        </form>
                    </div>
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

export default InquiryForm;
