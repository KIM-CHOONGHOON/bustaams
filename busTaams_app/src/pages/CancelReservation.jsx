import React from 'react';
import { useNavigate } from 'react-router-dom';

const CancelReservation = () => {
    const navigate = useNavigate();

    return (
        <div className="bg-background text-on-surface min-h-screen pb-32 font-body text-left">
            {/* TopAppBar */}
            <header className="bg-transparent text-teal-800 fixed top-0 w-full z-50 bg-white/60 backdrop-blur-md">
                <div className="flex justify-between items-center w-full px-6 pt-8 pb-4 max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="hover:opacity-80 transition-opacity active:scale-95 duration-200 p-2 rounded-full hover:bg-slate-50">
                            <span className="material-symbols-outlined text-2xl">arrow_back</span>
                        </button>
                        <h1 className="font-headline font-extrabold tracking-tight text-3xl text-teal-900 italic">예약 취소</h1>
                    </div>
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-fixed shadow-sm">
                        <img alt="User profile" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA0Cm2UKpPvpwOnhp1fkrmpzLzlDY0J2Oc6DhidUQ0QOqXH7CPWJ6nP3NzHAJ05t7WQNBYF6uF3_2STA17XVAzLk4J4XiW7LzSEbXm6VZ05ad980tDWgfCxZsyb69PUCnC6HKZX0CPMJp3xSQJDpbxZvPWegLfxaHow9xsdJ2m47xzvEasn2iai1rRXcVNB-YIAl-9__jSFs5QyrJspqYlZ4jrpo7uRdSq-kQpvAOEjh0vMBvYOm8q07RWX98ale_l8kDv1NBsni4M" />
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 mt-32 grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Left Column: Editorial Summary */}
                <div className="lg:col-span-5 space-y-12">
                    <section className="space-y-6">
                        <div className="inline-block px-4 py-1.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-headline font-bold text-[10px] uppercase tracking-[0.2em]">
                            활성 예약
                        </div>
                        <h2 className="font-headline font-extrabold text-5xl leading-tight text-primary tracking-tighter text-[40px] md:text-[50px]">
                            럭셔리 이그제큐티브 <br/>단체 이동 서비스
                        </h2>
                        <p className="text-on-surface-variant text-base max-w-sm leading-relaxed font-medium">
                            확정된 버스 대절 예약 내역입니다. 예약 조정은 차량 수급 현황에 따라 제한될 수 있으며, 프리미엄 운영 정책이 적용됩니다.
                        </p>
                    </section>

                    {/* Status Card */}
                    <div className="relative group lg:ml-0">
                        <div className="absolute -inset-4 bg-slate-50 rounded-[2rem] -z-10 transition-all group-hover:bg-teal-50/30"></div>
                        <div className="bg-white rounded-2xl p-8 border-l-4 border-primary shadow-2xl shadow-teal-900/5">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-1">예약 번호</p>
                                    <p className="font-headline font-bold text-2xl text-on-surface tracking-tight">#BTS-9928-VX</p>
                                </div>
                                <span className="material-symbols-outlined text-primary text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>
                            </div>
                            <div className="space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined">calendar_today</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-on-surface">이용 기간</p>
                                        <p className="text-sm text-on-surface-variant font-medium">2024년 5월 24일 ~ 5월 26일</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">내역 상세</p>
                                    {/* Bus items */}
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl group/item">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-primary">directions_bus</span>
                                            <span className="font-bold text-sm text-on-surface">45인승 일반 1대</span>
                                        </div>
                                        <button className="px-3 py-1.5 rounded-lg bg-white text-orange-600 text-[10px] font-black border border-orange-100 hover:bg-orange-50 transition-colors uppercase">취소</button>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl group/item">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-primary">airport_shuttle</span>
                                            <span className="font-bold text-sm text-on-surface">21인승 프리미엄 1대</span>
                                        </div>
                                        <button className="px-3 py-1.5 rounded-lg bg-white text-orange-600 text-[10px] font-black border border-orange-100 hover:bg-orange-50 transition-colors uppercase">취소</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Actions & Policy */}
                <div className="lg:col-span-7 space-y-8">
                    {/* Information Panel */}
                    <div className="bg-slate-100/50 rounded-3xl p-10 space-y-10 border border-slate-50">
                        <div className="flex gap-6 items-start">
                            <div className="w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-xl shadow-orange-200">
                                <span className="material-symbols-outlined text-white text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>info</span>
                            </div>
                            <div className="space-y-4">
                                <h3 className="font-headline font-black text-2xl text-on-surface tracking-tight">취소 및 환불 규정</h3>
                                <p className="text-on-surface-variant leading-relaxed font-medium">
                                    경매 기반 시스템 보존을 위해, 예약 확정 후 취소 시 <span className="text-orange-600 font-black text-xl underline decoration-2 underline-offset-4">결제 금액의 50% 위약금</span>이 발생합니다.
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-slate-200">
                            <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">기존 가격</p>
                                <p className="font-headline font-black text-3xl text-on-surface tracking-tighter">₩420,000</p>
                            </div>
                            <div className="p-6 bg-white rounded-2xl border-2 border-orange-100 shadow-xl shadow-orange-900/5">
                                <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">예상 환불 (50%)</p>
                                <p className="font-headline font-black text-3xl text-orange-600 tracking-tighter">₩210,000</p>
                            </div>
                        </div>
                    </div>

                    {/* Action button */}
                    <div className="space-y-6 pt-4">
                        <button className="w-full h-18 py-6 rounded-full bg-transparent border-2 border-orange-600 text-orange-600 font-headline font-black text-xl flex items-center justify-center gap-3 hover:bg-orange-600 hover:text-white transition-all active:scale-[0.98] shadow-lg shadow-orange-900/5 outline-none">
                            <span className="material-symbols-outlined font-black">delete_forever</span>
                            전체 예약 취소하기
                        </button>
                        <p className="text-center text-[11px] text-slate-400/80 font-medium max-w-sm mx-auto leading-relaxed">
                            취소 버튼을 클릭하면 서비스 <span className="underline font-bold text-slate-500">이용 약관</span>에 따라 취소가 진행되며, 위약금이 즉시 공제됩니다.
                        </p>
                    </div>

                    {/* Image Context */}
                    <div className="relative h-64 rounded-[2rem] overflow-hidden mt-12 shadow-2xl shadow-teal-900/10">
                        <img alt="Interior" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBxHmZscCtXuIT5-8sfoHpIedD7Mb1F-50tBouk8CZH7t0bz9w21BQWNipXX0BD2eTvTrtEoisllcrAdsOFKaGxBtIcwKIhXpkp2HDQmRvHOLG4r4n53rO8ELuZoy9bpSM7SUjojmH17GrLVK4tgdwhGuTWr3fWR6IOS7sSxbM6SgcfTDExXKbU9T--K71CO0n8zN6Yw5CjrSfQlvXftivoL6TVDtShymEdapLQ3v-Pm5dkDNNoKVW6tBW9UIjyC2yRogFSsIJJdS4" />
                        <div className="absolute inset-0 bg-gradient-to-t from-teal-900/80 via-teal-900/20 to-transparent flex items-end p-8">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                                <p className="text-white font-headline font-bold text-[11px] tracking-widest uppercase">Premium Fleet Status: Verified</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default CancelReservation;
