import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';

const BusInformationSetup = ({ close, currentUser }) => {
    const [formData, setFormData] = useState({
        vehicleNo: '',
        modelNm: '',
        manufactureYear: '2024년형',
        mileage: '',
        serviceClass: 'PREMIUM_GOLD',
        amenities: {
            wifi: false,
            usb: true,
            screen: false,
            fridge: true,
            table: false,
        },
        lastInspectDt: '',
        insuranceExpDt: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({
                ...prev,
                amenities: { ...prev.amenities, [name]: checked }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleClassChange = (val) => {
        setFormData(prev => ({ ...prev, serviceClass: val }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const bodyData = {
                userUuid: currentUser?.uuid,
                vehicleNo: formData.vehicleNo,
                modelNm: formData.modelNm,
                manufactureYear: formData.manufactureYear,
                mileage: Number(formData.mileage) || 0,
                serviceClass: formData.serviceClass,
                amenities: formData.amenities,
                lastInspectDt: formData.lastInspectDt || null,
                insuranceExpDt: formData.insuranceExpDt || null,
            };

            const res = await fetch(`${API_BASE}/api/driver/bus`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to register bus');
            
            alert('차량 정보 등록이 완료되었습니다.');
            close();
        } catch (err) {
            console.error(err);
            alert('차량 등록 중 오류가 발생했습니다: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" style={{ fontFamily: "'Manrope', 'Plus Jakarta Sans', sans-serif" }}>
            <div className="absolute inset-0 cursor-pointer" onClick={close}></div>
            
            <div className="relative w-full max-w-6xl max-h-[95vh] bg-surface-lowest rounded-3xl shadow-ambient flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 bg-background text-on-background">
                {/* Header Actions */}
                <header className="flex items-center justify-between px-8 py-6 sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-surface-container-low">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold tracking-widest text-secondary uppercase mb-1">신규 자산 등록</span>
                        <h1 className="font-extrabold text-2xl text-primary tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>차량 정보 등록</h1>
                        <p className="text-sm text-outline-variant mt-1">프리미엄 옥션 플랫폼 busTaams에 귀하의 최신 차량을 등록하고 최고의 낙찰 기회를 잡으세요.</p>
                    </div>
                    <button onClick={close} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors duration-200 text-gray-500">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </header>

                {/* Main Scrollable Form */}
                <div className="flex-1 overflow-y-auto px-12 py-8 no-scrollbar">
                    <form className="space-y-24" onSubmit={handleSubmit}>
                        
                        {/* Section 01: Basic Info */}
                        <section className="grid grid-cols-12 gap-8 items-start">
                            <div className="col-span-12 md:col-span-4 sticky top-0 md:top-8 bg-background/90 z-10 py-4">
                                <h2 className="text-3xl font-bold text-on-surface mb-2" style={{ fontFamily: "'Plus Jakarta Sans'" }}>01. 기본 정보</h2>
                                <p className="text-sm text-outline">차량의 핵심 식별 정보를 입력해 주세요.</p>
                            </div>
                            <div className="col-span-12 md:col-span-8 bg-surface-container-low p-8 rounded-3xl space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-primary px-1">차량 번호</label>
                                        <input 
                                            name="vehicleNo" value={formData.vehicleNo} onChange={handleChange} required
                                            className="w-full bg-surface-container-high border-none outline-none rounded-xl p-4 focus:ring-2 focus:ring-primary/20 transition-all font-bold text-gray-900" 
                                            placeholder="예: 70아 1234" type="text" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-primary px-1">모델명</label>
                                        <input 
                                            name="modelNm" value={formData.modelNm} onChange={handleChange} required
                                            className="w-full bg-surface-container-high border-none outline-none rounded-xl p-4 focus:ring-2 focus:ring-primary/20 transition-all font-bold text-gray-900" 
                                            placeholder="예: 유니버스 노블 EX" type="text" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-primary px-1">제작 연도</label>
                                        <select 
                                            name="manufactureYear" value={formData.manufactureYear} onChange={handleChange}
                                            className="w-full bg-surface-container-high border-none outline-none rounded-xl p-4 focus:ring-2 focus:ring-primary/20 transition-all font-bold text-gray-900">
                                            <option>2026년형</option>
                                            <option>2025년형</option>
                                            <option>2024년형</option>
                                            <option>2023년형</option>
                                            <option>2022년형</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-primary px-1">주행 거리 (km)</label>
                                        <input 
                                            name="mileage" value={formData.mileage} onChange={handleChange}
                                            className="w-full bg-surface-container-high border-none outline-none rounded-xl p-4 focus:ring-2 focus:ring-primary/20 transition-all font-bold text-gray-900" 
                                            placeholder="0" type="number" />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Section 02: Service Class */}
                        <section className="grid grid-cols-12 gap-8 items-start">
                            <div className="col-span-12 md:col-span-4 sticky top-0 md:top-8 bg-background/90 z-10 py-4">
                                <h2 className="text-3xl font-bold text-on-surface mb-2" style={{ fontFamily: "'Plus Jakarta Sans'" }}>02. 서비스 등급</h2>
                                <p className="text-sm text-outline">고객에게 제공될 시트 구성과 서비스 등급을 선택하세요.</p>
                            </div>
                            <div className="col-span-12 md:col-span-8 grid grid-cols-2 gap-4">
                                {/* Premium Option */}
                                <div onClick={() => handleClassChange('PREMIUM_GOLD')} className={`relative group cursor-pointer p-4 rounded-3xl transition-all overflow-hidden ${formData.serviceClass === 'PREMIUM_GOLD' ? 'bg-surface-container-lowest shadow-[0_20px_40px_-15px_rgba(0,104,95,0.08)] border-l-4 border-secondary' : 'bg-surface-container-low hover:bg-white'} `}>
                                    <div className="h-40 rounded-2xl mb-4 overflow-hidden">
                                        <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Luxury bus" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCk2LuxSbMaoMxKrcFFRIaezdrgCq701SwMRA8HI6bwrOTokwq1Z6J9o5_u-vrYsgNVxqoE2QcBLGkywsMqjAyDL4zgN8YlwtqCEH_SPRs9O0gMCj8JWNE4O84zIAO-1bXap7w44Byib9N_UnJLgcH8qrf-4VfQxtdlxlxQ8e8zv1pieZ_2d_QRI0wxIWQ9TLtxNEDKLWk9kN8WwhwFGSwbhANuyFmF6lku4SIBTyQn2rOZCmuhmnigIGhTfz2jFCWwNltjVJLDqHI" />
                                    </div>
                                    <h3 className="font-bold text-lg mb-1" style={{ fontFamily: "'Plus Jakarta Sans'" }}>프리미엄 골드</h3>
                                    <p className="text-xs text-outline mb-4">21석 최상급 프라이빗 독립 시트</p>
                                    <input checked={formData.serviceClass === 'PREMIUM_GOLD'} readOnly className="absolute top-6 right-6 text-secondary focus:ring-secondary w-5 h-5" type="radio" />
                                </div>
                                {/* Prestige Option */}
                                <div onClick={() => handleClassChange('PRESTIGE')} className={`relative group cursor-pointer p-4 rounded-3xl transition-all overflow-hidden ${formData.serviceClass === 'PRESTIGE' ? 'bg-surface-container-lowest shadow-[0_20px_40px_-15px_rgba(0,104,95,0.08)] border-l-4 border-primary' : 'bg-surface-container-low hover:bg-white'} `}>
                                    <div className="h-40 rounded-2xl mb-4 overflow-hidden">
                                        <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Modern bus" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVkDzcl9fw9XAadlR1xiKV3h2zSXQ24Ou_h-sPbCshabITNTV9ngL6MGWoLwDhXWLx1tmUtnM5Gyz9kFLALLZckHUjrBu8g4SxLw6EqO9p2UkK0I_ZbnL_KMnQ6lbSLtIFeB1v3mcZ_kGKFriNMBFWVmsJuX7hBVtjQXNy0A3l3980cwhVWdxv2OsbH7elgb-2OTuio_Ph1p47mgQktswHGjd0scOlaAYJmCSqpnwUiCWGkaoCQbLbqO-vxMOSe8ptSKksrVSoszk" />
                                    </div>
                                    <h3 className="font-bold text-lg mb-1" style={{ fontFamily: "'Plus Jakarta Sans'" }}>우등 버스</h3>
                                    <p className="text-xs text-outline mb-4">28석 넓은 레그룸 전용 시트</p>
                                    <input checked={formData.serviceClass === 'PRESTIGE'} readOnly className="absolute top-6 right-6 text-primary focus:ring-primary w-5 h-5" type="radio" />
                                </div>
                                {/* Other types */}
                                <div className="col-span-2 grid grid-cols-3 gap-4 mt-2">
                                    <div onClick={() => handleClassChange('NORMAL')} className={`p-4 rounded-2xl text-center cursor-pointer transition-colors ${formData.serviceClass === 'NORMAL' ? 'bg-primary text-white' : 'bg-surface-container-low hover:bg-white'}`}>
                                        <span className="font-bold text-sm block">일반 버스</span>
                                        <span className={`text-[10px] ${formData.serviceClass === 'NORMAL' ? 'text-white/80' : 'text-outline'}`}>45석 표준 시트</span>
                                    </div>
                                    <div onClick={() => handleClassChange('NIGHT_PREMIUM')} className={`p-4 rounded-2xl text-center cursor-pointer transition-colors ${formData.serviceClass === 'NIGHT_PREMIUM' ? 'bg-primary text-white' : 'bg-surface-container-low hover:bg-white'}`}>
                                        <span className="font-bold text-sm block">심야 우등</span>
                                        <span className={`text-[10px] ${formData.serviceClass === 'NIGHT_PREMIUM' ? 'text-white/80' : 'text-outline'}`}>야간 특화 시트</span>
                                    </div>
                                    <div onClick={() => handleClassChange('V_VIP')} className={`p-4 rounded-2xl text-center cursor-pointer transition-colors ${formData.serviceClass === 'V_VIP' ? 'bg-primary text-white' : 'bg-surface-container-low hover:bg-white'}`}>
                                        <span className="font-bold text-sm block">V-VIP</span>
                                        <span className={`text-[10px] ${formData.serviceClass === 'V_VIP' ? 'text-white/80' : 'text-outline'}`}>16석 리무진</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Section 03: Tech & Amenities */}
                        <section className="grid grid-cols-12 gap-8 items-start">
                            <div className="col-span-12 md:col-span-4 sticky top-0 md:top-8 bg-background/90 z-10 py-4">
                                <h2 className="text-3xl font-bold text-on-surface mb-2" style={{ fontFamily: "'Plus Jakarta Sans'" }}>03. 편의 및 사양</h2>
                                <p className="text-sm text-outline">차량의 기술적 명세와 편의 시설을 한눈에 보여주세요.</p>
                            </div>
                            <div className="col-span-12 md:col-span-8 grid grid-cols-3 gap-4">
                                <div className="col-span-2 bg-surface-container-low p-6 rounded-3xl">
                                    <h4 className="text-xs font-bold text-primary mb-4">주요 기술 사양</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white p-4 rounded-2xl">
                                            <span className="text-[10px] text-outline block">엔진 출력</span>
                                            <span className="font-bold">540 HP / 250kg.m</span>
                                        </div>
                                        <div className="bg-white p-4 rounded-2xl">
                                            <span className="text-[10px] text-outline block">변속기</span>
                                            <span className="font-bold">ZF 자동 12단</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-surface-container-low p-6 rounded-3xl flex flex-col justify-center items-center text-center">
                                    <span className="material-symbols-outlined text-secondary text-4xl mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
                                    <h4 className="text-sm font-bold">최신 ADAS</h4>
                                    <p className="text-[10px] text-outline">긴급제동, 차선이탈방지 포함</p>
                                </div>
                                <div className="col-span-3 bg-surface-container-lowest p-8 rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,104,95,0.08)]">
                                    <h4 className="text-xs font-bold text-primary mb-6">제공 가능한 어메니티</h4>
                                    <div className="flex flex-wrap gap-4">
                                        <label className={`flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer transition-colors ${formData.amenities.wifi ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-surface-container hover:bg-surface-container-high'}`}>
                                            <input name="wifi" checked={formData.amenities.wifi} onChange={handleChange} className="rounded text-teal-600 focus:ring-teal-500 border-none" type="checkbox" />
                                            <span className="text-sm font-bold">와이파이</span>
                                        </label>
                                        <label className={`flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer transition-colors ${formData.amenities.usb ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-surface-container hover:bg-surface-container-high'}`}>
                                            <input name="usb" checked={formData.amenities.usb} onChange={handleChange} className="rounded text-teal-600 focus:ring-teal-500 border-none" type="checkbox" />
                                            <span className="text-sm font-bold">USB 충전</span>
                                        </label>
                                        <label className={`flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer transition-colors ${formData.amenities.screen ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-surface-container hover:bg-surface-container-high'}`}>
                                            <input name="screen" checked={formData.amenities.screen} onChange={handleChange} className="rounded text-teal-600 focus:ring-teal-500 border-none" type="checkbox" />
                                            <span className="text-sm font-bold">개별 스크린</span>
                                        </label>
                                        <label className={`flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer transition-colors ${formData.amenities.fridge ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-surface-container hover:bg-surface-container-high'}`}>
                                            <input name="fridge" checked={formData.amenities.fridge} onChange={handleChange} className="rounded text-teal-600 focus:ring-teal-500 border-none" type="checkbox" />
                                            <span className="text-sm font-bold">냉장고</span>
                                        </label>
                                        <label className={`flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer transition-colors ${formData.amenities.table ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-surface-container hover:bg-surface-container-high'}`}>
                                            <input name="table" checked={formData.amenities.table} onChange={handleChange} className="rounded text-teal-600 focus:ring-teal-500 border-none" type="checkbox" />
                                            <span className="text-sm font-bold">테이블</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Section 04: Compliance & Documents */}
                        <section className="grid grid-cols-12 gap-8 items-start mb-12">
                            <div className="col-span-12 md:col-span-4 sticky top-0 md:top-8 bg-background/90 z-10 py-4">
                                <h2 className="text-3xl font-bold text-on-surface mb-2" style={{ fontFamily: "'Plus Jakarta Sans'" }}>04. 검사 및 서류</h2>
                                <p className="text-sm text-outline">정기 검사 일정과 필수 운영 서류를 안전하게 업로드해 주세요.</p>
                            </div>
                            <div className="col-span-12 md:col-span-8 space-y-6">
                                <div className="bg-surface-container-low p-8 rounded-3xl grid grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-primary px-1">최근 정기점검일</label>
                                        <input 
                                            name="lastInspectDt" value={formData.lastInspectDt} onChange={handleChange}
                                            className="w-full bg-white border-none outline-none rounded-xl p-4 focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer text-gray-800 font-bold tracking-wider" 
                                            type="date" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-primary px-1">보험 만료 예정일</label>
                                        <input 
                                            name="insuranceExpDt" value={formData.insuranceExpDt} onChange={handleChange}
                                            className="w-full bg-white border-none outline-none rounded-xl p-4 focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer text-gray-800 font-bold tracking-wider" 
                                            type="date" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    {/* File Upload Slots (UI Only as requested) */}
                                    <div className="bg-surface-container-high p-6 rounded-3xl border-2 border-dashed border-outline-variant flex flex-col items-center justify-center text-center gap-2 hover:bg-surface-container-lowest hover:border-primary transition-all cursor-pointer group">
                                        <span className="material-symbols-outlined text-outline group-hover:text-primary">upload_file</span>
                                        <span className="text-xs font-bold">사업자 등록증</span>
                                        <span className="text-[10px] text-outline">PDF/JPG (최대 5MB)</span>
                                    </div>
                                    <div className="bg-surface-container-high p-6 rounded-3xl border-2 border-dashed border-outline-variant flex flex-col items-center justify-center text-center gap-2 hover:bg-surface-container-lowest hover:border-primary transition-all cursor-pointer group">
                                        <span className="material-symbols-outlined text-outline group-hover:text-primary">assignment_turned_in</span>
                                        <span className="text-xs font-bold">운송사업 허가증</span>
                                        <span className="text-[10px] text-outline">인증 완료 시 필수</span>
                                    </div>
                                    <div className="bg-surface-container-high p-6 rounded-3xl border-2 border-dashed border-outline-variant flex flex-col items-center justify-center text-center gap-2 hover:bg-surface-container-lowest hover:border-primary transition-all cursor-pointer group">
                                        <span className="material-symbols-outlined text-outline group-hover:text-primary">verified</span>
                                        <span className="text-xs font-bold">보험증권</span>
                                        <span className="text-[10px] text-outline">대인/대물 배상 확인</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Form Actions (Sticky at bottom for usability inside modal) */}
                        <footer className="sticky bottom-0 bg-background/95 backdrop-blur-md pt-6 pb-6 border-t border-surface-container flex items-center justify-between z-20">
                            <div className="flex items-center gap-4 px-4">
                                <span className="w-3 h-3 rounded-full bg-secondary animate-pulse"></span>
                                <p className="text-sm font-bold text-on-surface-variant">모든 정보는 관리자 승인 후 플랫폼에 게시됩니다.</p>
                            </div>
                            <div className="flex gap-4">
                                <button className="px-8 py-4 rounded-full font-bold text-outline hover:bg-surface-container-high transition-colors" type="button" onClick={close}>취소</button>
                                <button 
                                    className="bg-gradient-to-r from-[#004e47] to-[#00685f] px-12 py-4 rounded-full font-bold text-white shadow-xl shadow-teal-900/20 hover:scale-[1.02] transition-transform active:scale-[0.98] disabled:opacity-75" 
                                    type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? '진행 중...' : '차량 등록 완료'}
                                </button>
                            </div>
                        </footer>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default BusInformationSetup;
