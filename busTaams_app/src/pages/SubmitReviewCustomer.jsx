import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const SubmitReviewCustomer = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [rating, setRating] = useState(4);
    const [comment, setComment] = useState('');

    return (
        <div className="bg-background text-on-surface min-h-screen flex flex-col font-body text-left">
            {/* TopAppBar */}
            <header className="bg-white/40 backdrop-blur-3xl sticky top-0 z-50 border-b border-white/50">
                <div className="flex justify-between items-center w-full px-6 h-20 max-w-7xl mx-auto py-4">
                    <div className="flex items-center gap-5">
                        <button onClick={() => navigate(-1)} className="material-symbols-outlined text-teal-800 hover:bg-white p-2 rounded-full transition-all">menu</button>
                        <h1 className="text-teal-900 font-black tracking-tighter text-3xl italic">busTaams</h1>
                    </div>
                    <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-2xl rotate-3">
                        <img alt="User" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCmVGguzeCmqN5_TvtXwIsPk2LC4yjPnZrpSdbOsMd5q4lWPfVwMIYcXHi-Jz74a-7MR9IMS3PiCRDC_juGoq6QOrXcvWLNt3WRDDKk_HowM0bXhVxhNXgCohxGoEeRT0ydoxRqqNZjV18UmTtcRHqOyJS7BsmSsuZMjASterJh64Lu5TKraKZhAu4pqeivgldvRCivxM9MS8a86m-7mFdgV1VnMZiZJyt7L5NWKFTZFSk3Gxd7Mh-JF3Ya31_zcQTTHDbA5ZE9lQM" />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow flex flex-col items-center px-6 py-20 md:py-32 max-w-7xl mx-auto w-full">
                {/* Hero Section Asymmetric */}
                <section className="w-full mb-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-end animate-in fade-in slide-in-from-top duration-1000">
                    <div className="lg:col-span-8 space-y-6">
                        <span className="inline-block px-5 py-2 bg-primary/10 text-primary font-black uppercase tracking-[0.4em] text-[10px] rounded-full border border-primary/20">
                            Service Feedback
                        </span>
                        <h2 className="text-6xl md:text-[100px] font-black tracking-tighter text-primary leading-[0.8] mb-10">
                            운행은 <br/>
                            <span className="text-secondary italic">어떠셨나요?</span>
                        </h2>
                    </div>
                    <div className="lg:col-span-4 pb-4">
                        <p className="text-slate-400 font-bold leading-relaxed text-lg tracking-tight border-l-4 border-slate-100 pl-8">
                            여러분의 소중한 의견은 busTaams의 프리미엄 파트너십을 더욱 공고히 하고, 최상의 서비스 품질을 유지하는 데 절대적인 도움이 됩니다.
                        </p>
                    </div>
                </section>

                {/* Rating Card */}
                <div className="w-full bg-slate-50/50 rounded-[4rem] p-4 mb-32 border border-white/50 shadow-2xl shadow-teal-900/[0.02]">
                    <div className="bg-white rounded-[3.5rem] p-12 md:p-20 shadow-2xl shadow-teal-900/[0.05] relative overflow-hidden border border-slate-50">
                        {/* Decorative Accent */}
                        <div className="absolute left-0 top-1/4 bottom-1/4 w-2 bg-secondary rounded-r-full shadow-lg shadow-secondary/50"></div>
                        
                        <div className="flex flex-col items-center text-center">
                            <p className="text-slate-300 font-black uppercase tracking-[0.6em] text-[10px] mb-12">Global Satisfaction Rating</p>
                            
                            {/* Rating Stars */}
                            <div className="flex gap-4 md:gap-8 mb-20">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button 
                                        key={star}
                                        onClick={() => setRating(star)}
                                        className="group active:scale-75 transition-all duration-300"
                                    >
                                        <span className={`material-symbols-outlined text-6xl md:text-[120px] transition-all duration-500 ${rating >= star ? 'text-primary scale-110 drop-shadow-[0_20px_40px_rgba(0,104,95,0.2)]' : 'text-slate-100 hover:text-primary/30'}`} style={{fontVariationSettings: rating >= star ? "'FILL' 1" : "'FILL' 0"}}>
                                            star
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Comment Area */}
                            <div className="w-full max-w-3xl text-left space-y-6">
                                <label className="block text-slate-300 font-black uppercase tracking-[0.3em] text-[10px] ml-4">Detailed Comments</label>
                                <textarea 
                                    className="w-full bg-slate-50 border-2 border-transparent rounded-[2.5rem] p-10 text-on-surface text-lg font-bold placeholder:text-slate-200 focus:ring-0 focus:border-primary/20 focus:bg-white transition-all resize-none shadow-inner"
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="입찰 과정, 차량 상태 또는 캡틴의 서비스에 대한 소중한 생각을 공유해 주세요..."
                                    rows="6"
                                />
                            </div>

                            {/* Submit Button */}
                            <div className="mt-16 w-full flex justify-center">
                                <button 
                                    onClick={() => navigate('/review-list')}
                                    className="bg-slate-900 text-white px-16 py-8 rounded-full font-black tracking-[0.4em] text-xs uppercase shadow-2xl shadow-slate-900/30 hover:bg-primary transition-all duration-500 flex items-center gap-6 group"
                                >
                                    후기 제출하기
                                    <span className="material-symbols-outlined group-hover:translate-x-3 transition-transform">arrow_forward</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Thank You Note Section */}
                <section className="w-full grid grid-cols-1 lg:grid-cols-2 gap-20 items-start pb-32">
                    <div className="space-y-8 border-l-2 border-slate-100 pl-12 text-left">
                        <h3 className="text-3xl font-black tracking-tighter text-primary">진심으로 감사드립니다<span className="text-secondary">.</span></h3>
                        <p className="text-lg font-bold leading-relaxed text-slate-400 max-w-lg tracking-tight">
                            고액의 프리미엄 여정을 이용해 주시는 여러분의 신뢰는 busTaams의 가장 큰 자산입니다. 여러분의 피드백은 전 세계 파트너 기사님들에게 새로운 동기부여가 됩니다.
                        </p>
                    </div>
                    <div className="flex flex-col lg:items-end text-right">
                        <div className="space-y-2">
                            <p className="text-secondary font-black text-[120px] leading-none tracking-tighter">98.4<span className="text-6xl text-slate-200">%</span></p>
                            <p className="text-[10px] uppercase font-black tracking-[0.5em] text-slate-300">Global Community Trust Rate</p>
                        </div>
                        <div className="mt-16 flex gap-6">
                            <div className="w-16 h-16 bg-white border border-slate-50 rounded-2xl flex items-center justify-center shadow-xl shadow-teal-900/5 rotate-3 hover:rotate-0 transition-transform">
                                <span className="material-symbols-outlined text-primary text-3xl">shield</span>
                            </div>
                            <div className="w-16 h-16 bg-white border border-slate-50 rounded-2xl flex items-center justify-center shadow-xl shadow-teal-900/5 -rotate-3 hover:rotate-0 transition-transform">
                                <span className="material-symbols-outlined text-primary text-3xl">verified_user</span>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Desktop Navigation Shell */}
            <div className="hidden lg:flex fixed top-10 right-20 z-50 gap-10 items-center bg-white/40 backdrop-blur-3xl px-10 py-5 rounded-full border border-white/50 shadow-2xl">
                <a className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em] hover:text-primary transition-all cursor-pointer">Auction</a>
                <a className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em] hover:text-primary transition-all cursor-pointer">Wishlist</a>
                <a className="text-primary font-black uppercase text-[10px] tracking-[0.3em] border-b-2 border-primary pb-1">Profile</a>
            </div>
        </div>
    );
};

export default SubmitReviewCustomer;
