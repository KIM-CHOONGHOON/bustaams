import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const RequestBus = () => {
    const navigate = useNavigate();
    const [stops, setStops] = useState(['']);

    const addStop = () => {
        if (stops.length < 3) {
            setStops([...stops, '']);
        }
    };

    const removeStop = (index) => {
        const newStops = stops.filter((_, i) => i !== index);
        setStops(newStops);
    };

    return (
        <div className="bg-background font-body text-on-background min-h-screen pb-32">
            <header className="bg-transparent text-teal-800 docked full-width top-0 z-40">
                <div className="flex justify-between items-center w-full px-6 pt-8 pb-4 max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="hover:opacity-80 transition-opacity active:scale-95 duration-200">
                            <span className="material-symbols-outlined text-3xl">menu</span>
                        </button>
                        <h1 className="font-headline font-extrabold tracking-tight text-3xl text-teal-900 text-[24px]">busTaams</h1>
                    </div>
                    <div className="hidden md:flex items-center gap-8 font-label text-sm font-bold uppercase tracking-widest text-slate-500">
                        <span className="cursor-pointer hover:opacity-80">차량 안내</span>
                        <span className="cursor-pointer hover:opacity-80">노선 안내</span>
                        <span className="cursor-pointer hover:opacity-80">문의하기</span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                        <img alt="User" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQzkQCigA0n-5mLu9zcJ6mZmYz_ng1J_W08Zvek9NPTIxEqZxRc4MLOvOihZe3kNm2W2-YfUaP-IHCuTpOkSiQsGdSsA98KFD_nkqktHAGbF9WMi9twaHCw5VdqJDuqMVKnFD1RRtDIDgHIbJP3VtpbVpL5XFtUxIt7gE9qO1eG3Mqh8N67d5URDgYA9P3tvuitIcUB3FXVKobbiG0aL8v7FByNw99puw_IMGpqZZMEYR5zEtHYNa2CiRJbWfDJC7eRAGgbR4NPA8" />
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 pt-12 pb-32">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Side */}
                    <div className="col-span-12 lg:col-span-5 flex flex-col justify-center mb-12 lg:mb-0">
                        <span className="text-secondary font-headline font-bold uppercase tracking-[0.3em] mb-4 block text-[12px]">전세 서비스</span>
                        <h2 className="font-headline font-extrabold text-5xl lg:text-7xl leading-[1.1] text-primary mb-8 tracking-tight text-[48px]">
                            당신만을 위한<br/>전용 버스.
                        </h2>
                        <p className="text-on-surface-variant text-lg lg:text-xl leading-relaxed max-w-md opacity-80 text-[18px]">
                            일생에 단 한 번뿐인 특별한 여정을 정의하세요. 럭셔리 비즈니스 코치부터 지속 가능한 운송 솔루션까지, 귀하의 단체에 꼭 필요한 사양을 요청하실 수 있습니다.
                        </p>
                        <div className="mt-12 relative rounded-2xl overflow-hidden h-64 w-full shadow-xl">
                            <img alt="Bus" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCz878BnQd8uirQZS16lTczMSsapv5qs4qZPfOQxFRYi3OW0p-2zDSuiwWyAD_HIV9ilP6hEIC5JSbP3laJx9zkoMeQLMfC7G1UQxZD58i_ZpXCTUCTvamqt_-ap-545hcLovNaBPkNJGYRpfTyzltMPomzBwTuKptb_I1wquU_GdmO0CMeWjdgsmvlzyZisBNylO15Gztlwd1yoZWLIeWpv54WA3SO5V--fxRyp6Dt8dlmB3tE01oDz_XWHFW2onY5E9x8_ZpPr3o" />
                            <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent"></div>
                            <div className="absolute bottom-6 left-6 text-white text-left">
                                <p className="font-headline font-bold text-lg">VIP 경험</p>
                                <p className="text-sm opacity-90">맞춤형 노선 계획 포함</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: The Form Canvas */}
                    <div className="col-span-12 lg:col-span-7">
                        <div className="bg-white rounded-[2rem] p-8 lg:p-12 shadow-2xl relative">
                            <div className="absolute top-12 left-0 w-1 h-16 bg-secondary rounded-r-full"></div>
                            <form className="space-y-10 text-left">
                                <section>
                                    <h3 className="font-headline font-bold text-2xl text-primary mb-6 text-[22px]">어디로 가시나요?</h3>
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="font-label text-xs font-bold uppercase tracking-wider text-slate-500 ml-2">여행 명칭</label>
                                            <div className="relative group">
                                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-primary">edit_note</span>
                                                <input className="w-full pl-12 pr-4 py-4 bg-background border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all font-medium" placeholder="예: 2024년 추계 워크숍" type="text" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="font-label text-xs font-bold uppercase tracking-wider text-slate-500 ml-2">출발지</label>
                                            <div className="relative group cursor-pointer">
                                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant">search</span>
                                                <input className="w-full pl-12 pr-4 py-4 bg-background border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all font-medium cursor-pointer" placeholder="출발 주소 검색" readOnly type="text" />
                                                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant text-sm">open_in_new</span>
                                            </div>
                                        </div>
                                        {stops.map((stop, index) => (
                                            <div key={index} className="space-y-2">
                                                <div className="relative group">
                                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant">more_vert</span>
                                                    <input className="w-full pl-12 pr-12 py-3 bg-background border-none rounded-xl text-sm font-medium" placeholder={`경유지 ${index + 1} (선택)`} readOnly type="text" />
                                                    <button onClick={() => removeStop(index)} type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant hover:text-error transition-colors">
                                                        <span className="material-symbols-outlined text-sm">close</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        <button onClick={addStop} type="button" className="flex items-center gap-2 text-secondary font-bold text-sm ml-2 hover:opacity-70 transition-opacity">
                                            <span className="material-symbols-outlined text-lg">add_circle</span>
                                            <span>경유지 추가 (최대 3개)</span>
                                        </button>
                                        <div className="space-y-2">
                                            <label className="font-label text-xs font-bold uppercase tracking-wider text-slate-500 ml-2">도착지</label>
                                            <div className="relative group cursor-pointer">
                                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant">flag</span>
                                                <input className="w-full pl-12 pr-4 py-4 bg-background border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all font-medium cursor-pointer" placeholder="도착 주소 검색" readOnly type="text" />
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <h3 className="font-headline font-bold text-2xl text-primary mb-6 text-[22px]">필수 정보</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div className="space-y-2">
                                            <label className="font-label text-xs font-bold uppercase tracking-wider text-slate-500 ml-2">출발일시</label>
                                            <div className="relative group">
                                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant">calendar_month</span>
                                                <input className="w-full pl-12 pr-4 py-4 bg-background border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all font-medium" type="text" defaultValue="2023/11/20, 09:00 AM" readOnly />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="font-label text-xs font-bold uppercase tracking-wider text-slate-500 ml-2">도착일시</label>
                                            <div className="relative group">
                                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant">event_available</span>
                                                <input className="w-full pl-12 pr-4 py-4 bg-background border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all font-medium" type="text" defaultValue="2023/11/22, 06:00 PM" readOnly />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2 mb-8">
                                        <label className="font-label text-xs font-bold uppercase tracking-wider text-slate-500 ml-2">총 탑승 인원</label>
                                        <div className="relative group">
                                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant">group</span>
                                            <input className="w-full pl-12 pr-4 py-4 bg-background border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all font-medium" placeholder="인원 수 입력" type="number" defaultValue="45" />
                                        </div>
                                    </div>
                                </section>

                                <section className="bg-primary/5 rounded-[2.5rem] p-8 lg:p-10 space-y-8 border border-primary/10">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <h3 className="font-headline font-extrabold text-2xl text-primary text-[20px]">계산된 예상 견적 상세</h3>
                                            <p className="text-xs text-on-surface-variant font-medium">운행 기간: 3일 (2박)</p>
                                        </div>
                                        <span className="px-4 py-2 rounded-full bg-primary/10 text-primary text-[10px] font-extrabold uppercase tracking-widest border border-primary/10">실시간 자동 업데이트</span>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-primary/5 space-y-5">
                                            <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">01</span>
                                                    <p className="font-headline font-bold text-lg text-primary text-[16px]">45인승 일반 <span className="text-sm font-medium text-slate-400 ml-1">x 1대</span></p>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-on-surface-variant font-medium opacity-70">기사 숙박/식대</span>
                                                    <span className="font-bold text-on-surface tracking-tight">₩ 200,000</span>
                                                </div>
                                                <div className="flex justify-between items-center pt-3 border-t border-dashed border-slate-100">
                                                    <span className="text-sm font-bold text-primary">총 예상 경비</span>
                                                    <span className="font-bold text-primary">₩ 450,000</span>
                                                </div>
                                                <div className="flex justify-between items-center pt-4 bg-primary/[0.03] p-4 rounded-2xl">
                                                    <span className="text-sm font-extrabold text-primary">견적 요청 금액</span>
                                                    <span className="font-headline font-extrabold text-xl text-primary text-[18px]">₩ 1,650,000</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-8 border-t-2 border-primary/10">
                                        <div className="bg-gradient-to-br from-primary to-primary-container rounded-[2rem] p-8 text-white shadow-xl">
                                            <div className="flex justify-between items-end">
                                                <div className="space-y-1">
                                                    <p className="font-label text-xs font-extrabold uppercase tracking-[0.2em] opacity-80">전체 견적 합계</p>
                                                    <h4 className="font-headline font-black text-4xl text-[32px]">₩ 4,750,000</h4>
                                                </div>
                                                <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">부가가치세 포함</p>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <div className="pt-4">
                                    <button onClick={() => navigate('/customer-dashboard')} className="w-full py-5 px-8 rounded-full bg-gradient-to-r from-secondary to-secondary-container text-white font-headline font-extrabold text-xl shadow-lg active:scale-95 transition-all duration-300 flex items-center justify-center gap-3">
                                        <span>여정 요청하기</span>
                                        <span className="material-symbols-outlined">arrow_forward</span>
                                    </button>
                                    <p className="text-center text-[10px] text-on-surface-variant mt-4 font-medium opacity-60">
                                        예약 확정이 아닙니다. 담당 컨시어지가 요청 내용을 검토한 후 2시간 이내에 연락드리겠습니다.
                                    </p>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default RequestBus;
