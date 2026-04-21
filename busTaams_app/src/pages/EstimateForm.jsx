import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const EstimateForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [price, setPrice] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        alert('견적이 성공적으로 제출되었습니다!');
        navigate('/driver-dashboard');
    };

    return (
        <div className="bg-background text-on-background font-body min-h-screen">
            {/* TopAppBar */}
            <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-40 flex justify-between items-center w-full px-6 py-4 shadow-sm">
                <div className="flex items-center gap-4 text-left">
                    <button onClick={() => navigate('/estimate-list-driver')} className="hover:opacity-80 transition-opacity active:scale-95 duration-200">
                        <span className="material-symbols-outlined text-teal-800">menu</span>
                    </button>
                    <h1 className="font-headline font-extrabold tracking-tighter text-2xl text-teal-900 text-[24px]">busTaams</h1>
                </div>
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20 shadow-sm transition-transform hover:scale-110 cursor-pointer">
                    <img alt="User Profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD4vN2iJhYT28dqF3bXn1UtFElHnQDFzWTM9CdNaAeMcn5Y85HNmY9B2z1Nknl7_0LRROWW6Kp6ePpluuaaJm60f9fheJfiNCV-IjIldyuNn0rqoOsilL34BrGPY00oGI6qIOd2cKXQSsudhdeVbyanrHnuCqiifKuAoRcDX2pk1oO0TDo7Izx1aFfEP7T9ggFWTGdVNwsWWLAAqtiCftrqWM46536UPanJUNNd6GPoEFB-bpkobjeORZueHC5FbV1a-Z71vgICFjo" />
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-12 text-left">
                {/* Editorial Header Section */}
                <div className="mb-16 grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
                    <div className="md:col-span-8">
                        <span className="font-headline text-secondary font-bold tracking-widest uppercase text-[10px] mb-4 block">경매 ID: #BT-88429</span>
                        <h2 className="font-headline font-extrabold text-5xl md:text-7xl text-primary leading-tight tracking-tighter text-[48px] md:text-[64px]">제안서 작성</h2>
                    </div>
                    <div className="md:col-span-4 md:text-right hidden md:block">
                        <p className="text-on-surface-variant font-medium max-w-xs ml-auto text-sm">
                            경쟁력 있는 견적으로 노선을 확보하세요. 프리미엄 물류를 위한 정밀한 가격 책정.
                        </p>
                    </div>
                </div>

                {/* Content Canvas */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Left Column: Trip Details */}
                    <aside className="lg:col-span-4 space-y-8">
                        <div className="bg-slate-50/50 p-8 rounded-2xl space-y-6 border border-slate-100">
                            <h3 className="font-headline font-bold text-xl text-primary border-l-4 border-secondary pl-4 text-[18px]">운행 상세 정보</h3>
                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <span className="material-symbols-outlined text-secondary">location_on</span>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">출발지</p>
                                        <p className="font-headline font-bold text-on-surface text-sm">인천국제공항 (ICN)</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <span className="material-symbols-outlined text-secondary">route</span>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">경유지</p>
                                        <div className="space-y-1">
                                            <p className="font-headline font-bold text-on-surface text-sm">1: 서울역</p>
                                            <p className="font-headline font-bold text-on-surface text-sm">2: 대전복합터미널</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <span className="material-symbols-outlined text-secondary">flag</span>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">목적지</p>
                                        <p className="font-headline font-bold text-on-surface text-sm">부산 낙동강변공원</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <span className="material-symbols-outlined text-secondary">calendar_month</span>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">여정 일정</p>
                                        <p className="font-headline font-bold text-on-surface text-sm">2024.11.24 (목) - 11.26 (토)</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <span className="material-symbols-outlined text-secondary">group</span>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">승객 인원</p>
                                        <p className="font-headline font-bold text-on-surface text-sm">성인 45명 (대형 필요)</p>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-6 border-t border-slate-100">
                                <img alt="Bus" className="w-full h-48 object-cover rounded-xl grayscale hover:grayscale-0 transition-all duration-700 shadow-sm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCaOodsAP51m01nz1oLiqAzYyES4eOWvqqQrE8V6wqagIAx_H34AK3qc96yehTi5-5bcd51oZ7TjvUHKrpqwN65ENfPkkAqFoEVcefs4aYcaszvGEyus4-_At18i1DtlP75Jh9ogSmb0dcWqYMh_mnhEs2cYNKP1Nmjennfdxn6n6GnYpOm_1eyEzJVfKTld_vTOePJoot-UwpuUoDTMi_2NhqxOko2wQy-6P-EnANQTVdVSOU6Z74R79vTbcjX3EXN4xvXQ-gRPoE" />
                            </div>
                        </div>
                    </aside>

                    {/* Right Column: Form */}
                    <section className="lg:col-span-8">
                        <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-2xl shadow-teal-900/5 relative overflow-hidden border border-slate-50">
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
                            <form onSubmit={handleSubmit} className="relative z-10 space-y-10 focus-within:ring-0">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Pricing Input */}
                                    <div className="space-y-3">
                                        <label className="font-headline font-bold text-[13px] text-primary flex justify-between uppercase tracking-widest">
                                            <span>총 제안 금액</span>
                                            <span className="text-secondary opacity-60">KRW</span>
                                        </label>
                                        <div className="relative group">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-300 text-xl">₩</span>
                                            <input value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl py-6 pl-10 pr-4 font-headline text-3xl font-extrabold focus:bg-white focus:shadow-xl transition-all text-on-surface outline-none" placeholder="0" type="number" required />
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">추천 낙찰 범위: ₩1,150,000 - ₩1,450,000</p>
                                    </div>
                                    {/* Vehicle Selection */}
                                    <div className="space-y-3">
                                        <label className="font-headline font-bold text-[13px] text-primary uppercase tracking-widest">배차 차량 선택</label>
                                        <select className="w-full bg-slate-50 border-none rounded-2xl py-6 px-4 font-headline font-bold text-on-surface focus:bg-white focus:shadow-xl transition-all outline-none appearance-none cursor-pointer">
                                            <option>가동 가능한 차량을 선택하세요...</option>
                                            <option>프리미엄 01호 (경북 70바 1234)</option>
                                            <option>우등버스 05호 (경북 70바 5678)</option>
                                            <option>전세버스 12호 (경북 70바 9012)</option>
                                        </select>
                                    </div>
                                </div>
                                {/* Message */}
                                <div className="space-y-3">
                                    <label className="font-headline font-bold text-[13px] text-primary uppercase tracking-widest">고객님께 남기는 메시지</label>
                                    <textarea className="w-full bg-slate-50 border-none rounded-2xl p-6 font-body text-on-surface focus:bg-white focus:shadow-xl transition-all outline-none placeholder:text-slate-300 text-sm" placeholder="Wi-Fi 무료 제공, 차량 내 냉냉설비 완비, 금연 차량 등 기사님만의 장점을 어필해주세요..." rows="5"></textarea>
                                </div>
                                {/* Terms */}
                                <div className="flex items-center gap-3 p-5 bg-teal-50/50 rounded-2xl border border-teal-100/50">
                                    <input className="w-5 h-5 rounded border-teal-200 text-teal-600 focus:ring-teal-500 cursor-pointer" type="checkbox" required />
                                    <label className="text-xs font-semibold text-teal-900 leading-tight">선정된 차량이 모든 안전 기준을 충족하며, 운행 전 점검 및 보험 가입 상태가 최신임을 보증합니다.</label>
                                </div>
                                {/* Buttons */}
                                <div className="pt-4 flex flex-col md:flex-row items-center gap-6">
                                    <button type="submit" className="w-full md:w-auto px-16 py-5 bg-gradient-to-br from-primary to-teal-800 text-white font-headline font-extrabold rounded-full text-lg shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all duration-300 tracking-tighter">
                                        견적 제출하기
                                    </button>
                                    <button type="button" onClick={() => navigate(-1)} className="text-slate-400 font-headline font-bold hover:text-primary transition-colors text-[11px] uppercase tracking-widest">
                                        작성 취소
                                    </button>
                                </div>
                            </form>
                        </div>
                    </section>
                </div>
            </main>

            {/* BottomNavBar */}
            <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md rounded-full bg-white/80 backdrop-blur-xl shadow-2xl flex justify-around items-center p-2 z-50 border border-slate-50 h-16">
                <button onClick={() => navigate('/driver-dashboard')} className="flex flex-col items-center justify-center text-slate-400 px-4">
                    <span className="material-symbols-outlined">dashboard</span>
                    <span className="text-[8px] font-bold uppercase tracking-widest mt-1">홈</span>
                </button>
                <button onClick={() => navigate('/estimate-list-driver')} className="flex flex-col items-center justify-center text-slate-400 px-4">
                    <span className="material-symbols-outlined">gavel</span>
                    <span className="text-[8px] font-bold uppercase tracking-widest mt-1">경매</span>
                </button>
                <button className="flex flex-col items-center justify-center bg-primary text-white rounded-full w-12 h-12 shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined">payments</span>
                </button>
                <button className="flex flex-col items-center justify-center text-slate-400 px-4">
                    <span className="material-symbols-outlined">person</span>
                    <span className="text-[8px] font-bold uppercase tracking-widest mt-1">프로필</span>
                </button>
            </nav>
        </div>
    );
};

export default EstimateForm;
