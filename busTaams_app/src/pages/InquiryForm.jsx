import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const InquiryForm = () => {
    const navigate = useNavigate();
    const [selectedCategory, setSelectedCategory] = useState('입찰 및 예약 문의');

    const categories = [
        '입찰 및 예약 문의', '결제 및 계약금 관련', '취소 및 환불 정책',
        '이용 제한 및 페널티', '기사님 및 운행 서비스', '계정 및 본인인증',
        '서비스 제안 및 기타'
    ];

    return (
        <div className="bg-background text-on-surface min-h-screen pb-32 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/60 backdrop-blur-xl border-b border-white">
                <div className="flex justify-between items-center w-full px-6 pt-8 pb-4 max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="hover:opacity-80 transition-opacity active:scale-95 duration-200 p-2 rounded-full hover:bg-slate-50">
                            <span className="material-symbols-outlined text-teal-800">menu</span>
                        </button>
                        <h1 className="font-headline font-black tracking-tighter text-3xl text-teal-900 italic">busTaams</h1>
                    </div>
                    <div className="flex items-center gap-6">
                        <nav className="hidden md:flex items-center gap-8">
                            <button className="text-slate-500 font-black hover:opacity-80 transition-opacity text-sm">경매</button>
                            <button className="text-slate-500 font-black hover:opacity-80 transition-opacity text-sm">관심목록</button>
                            <button className="text-slate-500 font-black hover:opacity-80 transition-opacity text-sm">입찰내역</button>
                            <button onClick={() => navigate('/profile-customer')} className="text-teal-600 font-black hover:opacity-80 transition-opacity text-sm">프로필</button>
                        </nav>
                        <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shadow-sm">
                            <img alt="User" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBbilHKArzdJj_G25x4qOhx12eTJUqK9HAmOzYKOXaYub1md1NuGpzoBtAjFM2KN7KU2dmbLn4bHnfkPpAIl2JTO6wsiUBUvin55yaGYByvEEhZoBvtq2fhKxP5c_qz3lfBqfS4xWDbsbvh9GrPDeP2We229zm-L-cuMFLgP_jKd22-CbIf99ILsbvb3LP3A7ZA4iZCHr-1AEnCqXTgQ31A1L9ImT1MvND_8zeG_fqvzqIobGpt-BAVu7OoaLBcavNgNoahRsZHChU" />
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 pt-32 pb-32">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                    {/* Editorial Intro Section */}
                    <div className="lg:col-span-5 flex flex-col justify-start">
                        <span className="text-secondary font-black tracking-[0.3em] uppercase text-[10px] mb-8">컨시어지 서비스</span>
                        <h2 className="font-headline text-[50px] lg:text-[70px] font-black text-primary leading-[1.05] mb-10 tracking-tighter">
                            더 나은 <br/> <span className="text-secondary italic">서비스를 위해.</span>
                        </h2>
                        <p className="text-on-surface-variant text-lg leading-relaxed max-w-sm mb-14 font-medium opacity-70">
                            사용자님의 피드백은 럭셔리 플릿 구매 경험을 진화시키는 원동력입니다. 건의 사항이나 궁금한 점을 큐레이터에게 직접 전달해 주세요.
                        </p>
                        
                        {/* Info Card */}
                        <div className="bg-white p-10 rounded-[2.5rem] relative overflow-hidden group shadow-2xl shadow-teal-900/[0.03] border border-slate-50">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-secondary"></div>
                            <h3 className="font-headline font-black text-xl mb-4 tracking-tight">1:1 맞춤형 문의</h3>
                            <p className="text-sm text-on-surface-variant mb-8 font-medium leading-relaxed">경매 주기 동안 1:1 문의에 대한 평균 응답 시간은 <span className="text-secondary font-black">4시간 이내</span>입니다.</p>
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary" style={{fontVariationSettings: "'FILL' 1"}}>verified_user</span>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">우선 답변 모드 활성화됨</span>
                            </div>
                        </div>
                    </div>

                    {/* Inquiry Form */}
                    <div className="lg:col-span-7">
                        <form className="space-y-10" onSubmit={(e) => e.preventDefault()}>
                            {/* Category Selection */}
                            <div className="space-y-6">
                                <label className="font-headline font-black text-[11px] tracking-widest uppercase text-slate-400 ml-1">문의 유형 선택</label>
                                <div className="flex flex-wrap gap-3">
                                    {categories.map((cat) => (
                                        <button 
                                            key={cat}
                                            type="button"
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`px-6 py-4 rounded-full font-black text-xs transition-all active:scale-95 shadow-sm ${selectedCategory === cat ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Inputs */}
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <label className="font-headline font-black text-[11px] tracking-widest uppercase text-slate-400 ml-1">제목</label>
                                    <input className="w-full bg-slate-50 border-none rounded-2xl p-6 text-on-surface placeholder:text-slate-300 focus:bg-white focus:shadow-xl focus:ring-1 focus:ring-primary/10 transition-all font-bold" placeholder="문의 내용을 간략하게 요약해 주세요" type="text" />
                                </div>
                                <div className="space-y-4">
                                    <label className="font-headline font-black text-[11px] tracking-widest uppercase text-slate-400 ml-1">상세 내용 기술</label>
                                    <textarea className="w-full bg-slate-50 border-none rounded-[2rem] p-8 text-on-surface placeholder:text-slate-300 focus:bg-white focus:shadow-xl focus:ring-1 focus:ring-primary/10 transition-all font-bold resize-none" placeholder="제안이나 궁금한 점을 자세히 적어주세요..." rows="10"></textarea>
                                </div>
                            </div>

                            {/* Attachments */}
                            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-12 flex flex-col items-center justify-center gap-5 group cursor-pointer hover:bg-white hover:border-primary/30 transition-all duration-500">
                                <span className="material-symbols-outlined text-5xl text-slate-300 group-hover:text-primary transition-colors">cloud_upload</span>
                                <div className="text-center">
                                    <p className="text-sm font-black text-on-surface-variant mb-1 group-hover:text-primary transition-colors">파일을 드래그하거나 클릭하여 로드</p>
                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Images, Documents (Max 10MB)</p>
                                </div>
                            </div>

                            {/* Submit */}
                            <div className="flex justify-end pt-6">
                                <button className="flex items-center gap-4 px-12 py-6 bg-gradient-to-br from-primary to-teal-800 text-white rounded-full font-headline font-black text-lg shadow-2xl shadow-primary/30 hover:scale-[1.03] transition-all active:scale-95 group">
                                    <span>문의 요청 완료</span>
                                    <span className="material-symbols-outlined group-hover:translate-x-2 transition-transform" style={{fontVariationSettings: "'FILL' 1"}}>send</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default InquiryForm;
