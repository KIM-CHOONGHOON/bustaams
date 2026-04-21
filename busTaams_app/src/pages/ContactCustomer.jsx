import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ContactCustomer = () => {
    const navigate = useNavigate();
    const [selectedCategory, setSelectedCategory] = useState('입찰 및 예약 문의');

    const categories = [
        '입찰 및 예약 문의', '결제 및 계약금 관련', '취소 및 환불 정책',
        '이용 제한 및 페널티', '기사님 및 운행 서비스', '계정 및 본인인증', '서비스 제안 및 기타'
    ];

    return (
        <div className="bg-background text-on-surface min-h-[100dvh] pb-40 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/40 backdrop-blur-3xl border-b border-white/20 py-8">
                <div className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto">
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl text-teal-800 shadow-xl shadow-teal-900/5 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                        </button>
                        <h1 className="font-headline font-black tracking-tighter text-3xl text-teal-900 italic">busTaams Concierge</h1>
                    </div>
                    <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-2xl rotate-3 transition-transform hover:rotate-0">
                        <img alt="User profile" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBbilHKArzdJj_G25x4qOhx12eTJUqK9HAmOzYKOXaYub1md1NuGpzoBtAjFM2KN7KU2dmbLn4bHnfkPpAIl2JTO6wsiUBUvin55yaGYByvEEhZoBvtq2fhKxP5c_qz3lfBqfS4xWDbsbvh9GrPDeP2We229zm-L-cuMFLgP_jKd22-CbIf99ILsbvb3LP3A7ZA4iZCHr-1AEnCqXTgQ31A1L9ImT1MvND_8zeG_fqvzqIobGpt-BAVu7OoaLBcavNgNoahRsZHChU" />
                    </div>
                </div>
            </header>

            <main className="pt-40 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-20 animate-in fade-in slide-in-from-bottom duration-1000">
                {/* Left: Editorial Intro */}
                <div className="lg:col-span-5 space-y-12 text-left">
                    <div className="space-y-4">
                        <span className="text-secondary font-black tracking-[0.4em] uppercase text-[10px] block px-2">Premium Experience</span>
                        <h2 className="font-headline text-6xl md:text-8xl font-black text-primary tracking-tighter leading-[0.9] italic">
                            Evolve The <br/><span className="text-secondary">Service.</span>
                        </h2>
                    </div>
                    <p className="text-slate-400 text-xl font-bold tracking-tight italic leading-relaxed max-w-md">
                        사용자님의 피드백은 busTaams의 프리미엄 가치를 진화시키는 핵심 자산입니다. 큐레이터에게 직접 고견을 전해 주세요.
                    </p>

                    {/* Support Feature Card */}
                    <div className="bg-white p-10 rounded-[4rem] shadow-2xl shadow-teal-900/5 border border-white relative overflow-hidden group hover:scale-[1.02] transition-all">
                        <div className="absolute top-0 left-0 w-3 h-full bg-secondary"></div>
                        <h3 className="font-headline font-black text-2xl tracking-tighter italic uppercase mb-4 text-secondary">Concierge Grid</h3>
                        <p className="text-sm font-bold text-on-surface-variant mb-8 opacity-60">평균 응답 시간: 4시간 미만 (VIP 전용 채널)</p>
                        <div className="flex items-center gap-4 text-primary bg-primary/5 p-4 rounded-3xl w-fit">
                            <span className="material-symbols-outlined text-xl" style={{fontVariationSettings: "'FILL' 1"}}>verified_user</span>
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Priority Status Active</span>
                        </div>
                    </div>
                </div>

                {/* Right: Inquiry Form */}
                <div className="lg:col-span-7 bg-white/40 backdrop-blur-2xl p-12 lg:p-16 rounded-[4.5rem] shadow-2xl shadow-teal-900/5 border border-white space-y-12">
                    <form className="space-y-10 text-left">
                        {/* Category Grid */}
                        <div className="space-y-6">
                            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 ml-2">Topic Selection</label>
                            <div className="flex flex-wrap gap-3">
                                {categories.map(cat => (
                                    <button 
                                        key={cat}
                                        type="button"
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-6 py-4 rounded-full font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg ${selectedCategory === cat ? 'bg-primary text-white shadow-primary/20 p-shadow-xl' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Title Input */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 ml-2">Headline</label>
                            <input 
                                className="w-full bg-slate-50 border-4 border-transparent rounded-[2.5rem] px-8 py-6 text-on-surface font-black text-lg placeholder:text-slate-200 focus:border-primary focus:bg-white transition-all outline-none shadow-inner" 
                                placeholder="문의 내용을 한 줄로 요약해 주세요" 
                                type="text"
                            />
                        </div>

                        {/* Content Area */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 ml-2">Detailed Narrative</label>
                            <textarea 
                                className="w-full bg-slate-50 border-4 border-transparent rounded-[3rem] px-8 py-8 text-on-surface font-bold text-lg placeholder:text-slate-200 focus:border-primary focus:bg-white transition-all outline-none shadow-inner resize-none h-60" 
                                placeholder="큐레이터가 명확히 파악할 수 있도록 상세히 적어주세요..." 
                            />
                        </div>

                        {/* Attachments */}
                        <div className="bg-slate-50/50 border-4 border-dashed border-slate-100 rounded-[3.5rem] p-12 flex flex-col items-center justify-center gap-6 group cursor-pointer hover:bg-slate-100/50 transition-all">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-slate-200 group-hover:text-primary group-hover:scale-110 transition-all shadow-xl">
                                <span className="material-symbols-outlined text-4xl">cloud_upload</span>
                            </div>
                            <div className="text-center space-y-2">
                                <p className="text-sm font-black text-on-surface-variant italic">Manifesto & Visual Evidence</p>
                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em]">Drop files here of <span className="text-primary underline">Browse Library</span></p>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-8 flex justify-end">
                            <button className="flex items-center gap-6 px-14 py-7 bg-gradient-to-br from-primary to-primary-container text-white rounded-full font-black text-xs uppercase tracking-[0.4em] shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all duration-500 active:scale-95 group">
                                Dispatch Message
                                <span className="material-symbols-outlined group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform italic" style={{fontVariationSettings: "'wght' 700"}}>send</span>
                            </button>
                        </div>
                    </form>
                </div>
            </main>

            {/* Shared Bottom Nav */}
            <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex justify-around items-center px-4 py-2 bg-slate-900 text-slate-500 w-[90%] max-w-md mx-auto rounded-full shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] border border-white/10">
                <button onClick={() => navigate('/customer-dashboard')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">gavel</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Auction</span>
                </button>
                <button onClick={() => navigate('/reservation-list')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">confirmation_number</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Trips</span>
                </button>
                <button onClick={() => navigate('/chat-room')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">chat_bubble</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Talk</span>
                </button>
                <button onClick={() => navigate('/profile-customer')} className="flex flex-col items-center justify-center bg-white/20 text-white rounded-full w-12 h-12 shadow-lg active:scale-90 transition-all">
                    <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>person</span>
                </button>
            </nav>
        </div>
    );
};

export default ContactCustomer;
