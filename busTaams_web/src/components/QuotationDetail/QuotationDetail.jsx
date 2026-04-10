import React, { useState, useEffect } from 'react';
import axios from 'axios';

const QuotationDetail = ({ bidUuid, onBack }) => {
    const [bid, setBid] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const API_BASE = 'http://localhost:8080';

    const handleConfirmBooking = async () => {
        if (!window.confirm('이 견적으로 예약을 확정하시겠습니까?')) return;

        try {
            const response = await axios.post(`${API_BASE}/api/auction/confirm`, {
                bidUuid: bid.bidUuid
            });

            if (response.status === 200) {
                alert('예약이 성공적으로 확정되었습니다!');
                if (onBack) onBack(); // Close modal or go back
            }
        } catch (err) {
            console.error('Booking confirmation error:', err);
            alert(err.response?.data?.error || '예약 처리 중 오류가 발생했습니다.');
        }
    };

    useEffect(() => {
        if (!bidUuid) return;
        const fetchDetail = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`${API_BASE}/api/auction/bid-detail/${bidUuid}`);
                setBid(response.data);
            } catch (err) {
                console.error('Fetch detail error:', err);
                setError('견적 정보를 불러오는 중 오류가 발생했습니다.');
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [bidUuid]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#f7f9fb]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004e47]"></div>
        </div>
    );

    if (error || !bid) return (
        <div className="min-h-screen flex items-center justify-center bg-[#f7f9fb]">
            <div className="text-center p-8 bg-white rounded-2xl shadow-xl">
                <p className="text-xl text-slate-600 mb-6">{error || '정보를 찾을 수 없습니다.'}</p>
                <button 
                    onClick={onBack}
                    className="px-8 py-3 bg-[#004e47] text-white rounded-full font-bold hover:shadow-lg transition-all"
                >
                    뒤로 가기
                </button>
            </div>
        </div>
    );

    // Helper to format currency
    const formatPrice = (price) => new Intl.NumberFormat('ko-KR').format(price || 0);

    // Helper for amenities icons mapping
    const getAmenityIcon = (key) => {
        const icons = {
            hasWifi: 'wifi',
            hasRefrigerator: 'ac_unit',
            hasUsbPort: 'usb',
            hasMonitor: 'personal_video',
            adas: 'shutter_speed',
            hasMic: 'mic',
            hasKitchen: 'kitchen',
            hasWater: 'water_drop'
        };
        return icons[key] || 'check_circle';
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? '' : d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    return (
        <div className="relative w-full">
            {/* Main Content Area */}
            <main className="px-6 lg:px-16 py-16 max-w-7xl mx-auto">
                {/* Header Section */}
                <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200/50 pb-8">
                    <div className="animate-in fade-in slide-in-from-left duration-700">
                        <div className="inline-block px-4 py-1.5 bg-secondary-container text-on-secondary-container rounded-full text-[11px] font-black mb-4 uppercase tracking-widest shadow-sm">실시간 견적 상세</div>
                        <h1 className="text-4xl lg:text-5xl font-black text-primary tracking-tighter mb-4 italic">
                            {bid.serviceClass === 'PREMIUM_28' || bid.busTypeReq === '우등 28인승' ? '프리미엄 우등 버스' : '대형 수송 버스'} 상세 견적
                        </h1>
                        <p className="text-slate-500 max-w-lg text-sm lg:text-base leading-relaxed">
                            <span className="font-bold text-primary underline underline-offset-4 decoration-primary/30">{bid.driverNm}</span> 기사님의 베테랑 경력과 차량 옵션을 확인하세요. 모든 입찰가는 부가세 및 부대비용이 포함된 가격입니다.
                        </p>
                    </div>

                </header>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
                    {/* Left Column: Media & Details */}
                    <div className="xl:col-span-8 space-y-12">
                        {/* Gallery Section */}
                        <section className="bg-white rounded-[2rem] overflow-hidden shadow-2xl shadow-primary/10 group transition-all duration-500 hover:shadow-primary/20">
                            <div className="grid grid-cols-4 grid-rows-2 gap-3 h-[480px]">
                                <div className="col-span-3 row-span-2 overflow-hidden relative">
                                    <img 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s] ease-out" 
                                        src={bid.vehiclePhotos?.[0] ? (bid.vehiclePhotos[0].startsWith('http') ? bid.vehiclePhotos[0] : `${API_BASE}${bid.vehiclePhotos[0]}`) : "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=1200"} 
                                        alt="Bus Main" 
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                                        <div className="absolute bottom-8 left-8 text-white">
                                            <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Vehicle Outside</p>
                                            <p className="text-2xl font-black italic">{bid.modelNm || 'New Premium Universe'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-span-1 row-span-1 overflow-hidden">
                                     <img 
                                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-700" 
                                        src={bid.vehiclePhotos?.[1] ? (bid.vehiclePhotos[1].startsWith('http') ? bid.vehiclePhotos[1] : `${API_BASE}${bid.vehiclePhotos[1]}`) : "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&q=80&w=600"} 
                                        alt="Bus Interior" 
                                    />
                                </div>
                                <div className="col-span-1 row-span-1 overflow-hidden relative group/thumb">
                                    <img 
                                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-700" 
                                        src={bid.vehiclePhotos?.[2] ? (bid.vehiclePhotos[2].startsWith('http') ? bid.vehiclePhotos[2] : `${API_BASE}${bid.vehiclePhotos[2]}`) : "https://images.unsplash.com/photo-1494515843206-f3117d3f51b7?auto=format&fit=crop&q=80&w=600"} 
                                        alt="Bus Detail" 
                                    />
                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white font-bold cursor-pointer backdrop-blur-[4px] transition-all group-hover/thumb:backdrop-blur-0 group-hover/thumb:bg-black/30">
                                        <span className="text-3xl font-black italic tracking-tighter">+{bid.vehiclePhotos?.length > 3 ? bid.vehiclePhotos.length - 2 : 12}</span>
                                        <span className="text-[10px] font-black uppercase tracking-tighter opacity-80">Photos</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Driver Profile */}
                        <section className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-primary/5 border border-slate-50 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-secondary to-orange-400"></div>
                            <div className="flex flex-col md:flex-row gap-10 items-start">
                                <div className="relative flex-shrink-0">
                                    <div className="w-44 h-44 rounded-3xl overflow-hidden shadow-2xl border-4 border-white rotate-1 group-hover:rotate-0 transition-transform duration-500">
                                        <img 
                                            className="w-full h-full object-cover" 
                                            src={bid.driverImage ? (bid.driverImage.startsWith('http') ? bid.driverImage : `${API_BASE}${bid.driverImage}`) : "https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&q=80&w=400"} 
                                            alt={bid.driverNm} 
                                        />
                                    </div>
                                    <div className="absolute -bottom-3 -right-3 bg-secondary text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg border-2 border-white">
                                        <span className="material-symbols-outlined text-[24px]">verified</span>
                                    </div>
                                </div>
                                <div className="flex-1 w-full">
                                    <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-6">
                                        <div>
                                            <h2 className="text-4xl font-black text-on-surface mb-3 tracking-tighter italic">{bid.driverNm} 기사님</h2>
                                            <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-2xl w-fit">
                                                <div className="flex text-amber-400">
                                                    {[1,2,3,4,5].map(s => (
                                                        <span key={s} className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                                    ))}
                                                </div>
                                                <span className="font-black text-xl text-primary">5.0</span>
                                                <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                                                <span className="text-slate-400 text-sm font-bold">128 Review</span>
                                            </div>
                                        </div>
                                        <div className="bg-primary/5 px-8 py-4 rounded-3xl text-right border border-primary/10 w-full sm:w-auto backdrop-blur-sm">
                                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] block mb-2">Direct Contact</span>
                                            <span className="font-mono font-black text-xl text-primary tracking-widest">
                                                {bid.driverHp ? bid.driverHp.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3') : '010-****-5582'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-8 border-t border-slate-100 pt-10 mt-2">
                                        <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50 border border-slate-100/50">
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.1em]">Experience</p>
                                            <p className="font-black text-xl text-primary italic">무사고 15년+</p>
                                        </div>
                                        <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50 border border-slate-100/50">
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.1em]">Credentials</p>
                                            <p className="font-black text-xl text-primary">{bid.licenseType || '1종 대형'}</p>
                                        </div>
                                        <div className="col-span-2 lg:col-span-1 space-y-1.5 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.1em]">Bio</p>
                                            <p className="text-sm text-slate-600 font-medium leading-relaxed italic line-clamp-2">"{bid.bioText || '항상 안전하고 쾌적한 여행이 되도록 최선을 다하겠습니다.'}"</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Bus Specifications Redesign */}
                        <section className="bg-white p-12 rounded-[2.5rem] shadow-2xl shadow-primary/5 border border-slate-100 relative overflow-hidden group">
                            <div className="flex items-center gap-4 mb-16">
                                <span className="material-symbols-outlined text-[32px] text-primary bg-primary/10 p-2.5 rounded-2xl">directions_bus</span>
                                <h3 className="text-3xl font-black text-primary tracking-tighter">차량 상세 정보</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-12 gap-x-20 mb-20">
                                {[
                                    { label: '모델명', value: bid.modelNm || '2023 현대 유니버스 노블', highlight: true },
                                    { label: '연식', value: `${bid.manufactureYear}년형 (신차급)` },
                                    { label: '연료', value: '친환경 디젤' },
                                    { label: '승차 정원', value: `${bid.totalSeats}인승 ${bid.serviceClass === 'PREMIUM_28' || bid.busTypeReq === '우등 28인승' ? '우등' : '일반'}`, highlight: true },
                                    { label: '안전 장치', value: bid.hasAdas === 'Y' ? 'ADAS / 차선이탈방지' : '전 표준 안전 사양 적용', highlight: true },
                                    { label: '보험 여부', value: '전액 책임 보험 가입', highlight: true },
                                ].map((spec, i) => (
                                    <div key={i} className="flex items-baseline gap-6 border-b border-slate-50 pb-6 transition-all hover:border-primary/20 group/spec">
                                        <span className="text-slate-400 font-bold text-lg min-w-[80px] group-hover/spec:text-slate-500 transition-colors">{spec.label}</span>
                                        <span className={`text-[1.35rem] font-black tracking-tight ${spec.highlight ? 'text-primary' : 'text-slate-800'}`}>
                                            {spec.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Amenities Icons filtered by status */}
                            <div>
                                <p className="text-sm font-bold text-slate-400 mb-8 flex items-center gap-3">
                                    편의 시설
                                </p>
                                <div className="flex flex-wrap gap-4">
                                    {[
                                        { key: 'hasWifi', label: '와이파이', icon: 'wifi' },
                                        { key: 'hasRefrigerator', label: '냉장고', icon: 'ac_unit' },
                                        { key: 'hasUsbPort', label: '충전포트', icon: 'usb' },
                                        { key: 'hasMonitor', label: 'TV/영화', icon: 'tv' },
                                        { key: 'hasElectricSeat', label: '전동 시트', icon: 'airline_seat_recline_extra' },
                                        { key: 'hasTable', label: '음료홀더', icon: 'coffee' },
                                        { key: 'hasMic', label: '앰프/마이크', icon: 'mic' },
                                        { key: 'hasKitchen', label: '주방시설', icon: 'kitchen' },
                                        { key: 'hasWater', label: '생수/커피', icon: 'water_drop' }
                                    ]
                                    .filter(item => bid.amenities?.[item.key] === 'Y')
                                    .map((item) => (
                                        <div 
                                            key={item.key} 
                                            className="flex flex-col items-center justify-center gap-3 w-32 h-36 bg-white rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.04)] border border-slate-100 hover:border-primary/30 hover:-translate-y-1 transition-all duration-500"
                                        >
                                            <span className="material-symbols-outlined text-[34px] text-primary" style={{ fontVariationSettings: "'FILL' 0" }}>{item.icon}</span>
                                            <span className="text-[13px] font-bold text-slate-800">{item.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Cost & Booking */}
                    <div className="xl:col-span-4">
                        <div className="sticky top-28 space-y-10">
                            {/* NEW: Payment & Booking Card */}
                            <div className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-primary/5 border border-slate-100 animate-in fade-in slide-in-from-right duration-700">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-black text-slate-800 leading-tight">총 결제</span>
                                        <span className="text-[15px] font-black text-slate-800 leading-tight">금액</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[11px] font-bold text-slate-400 mb-1">VAT 포함</p>
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="text-3xl font-black text-[#004e47]">₩</span>
                                            <span className="text-5xl font-black text-[#004e47] tracking-tighter">
                                                {formatPrice(bid.bidAmt)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleConfirmBooking}
                                    disabled={bid.bidStat === 'CONFIRM'}
                                    className={`w-full py-6 rounded-full font-black text-xl shadow-xl transition-all duration-300 flex items-center justify-center gap-3 active:scale-[0.98] ${
                                        bid.bidStat === 'CONFIRM' 
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                                        : 'bg-[#004e47] text-white hover:bg-[#003833] hover:shadow-2xl hover:shadow-[#004e47]/20 group/btn'
                                    }`}
                                >
                                    {bid.bidStat === 'CONFIRM' ? (
                                        '예약 완료된 견적'
                                    ) : (
                                        <>
                                            지금 예약하기
                                            <span className="material-symbols-outlined group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                                        </>
                                    )}
                                </button>
                                
                                <p className="mt-6 text-center text-xs text-slate-400 font-medium tracking-tight">
                                    * 예약 확정 후 기사님께 직접 연락이 가능합니다.
                                </p>
                            </div>

                            {/* Schedule Details Card */}
                            <div className="bg-primary text-white p-12 rounded-[3.5rem] shadow-2xl shadow-primary/30 relative overflow-hidden group/route">
                                 <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 blur-3xl group-hover/route:bg-white/10 transition-colors duration-1000"></div>
                                <div className="absolute bottom-8 right-8 opacity-5 group-hover:opacity-20 transition-opacity duration-700">
                                    <span className="material-symbols-outlined text-[150px]">explore</span>
                                </div>
                                <p className="text-[11px] uppercase tracking-[0.4em] text-primary-fixed mb-12 font-black opacity-40">Kinetic Flight Path</p>
                                <div className="space-y-12 relative z-10">
                                    <div className="flex gap-6">
                                        <div className="flex flex-col items-center pt-1">
                                            <div className="w-4 h-4 rounded-full bg-secondary ring-4 ring-secondary/20 shadow-[0_0_20px_rgba(255,182,144,0.8)]"></div>
                                            <div className="w-1 flex-1 bg-gradient-to-b from-secondary to-transparent my-2 rounded-full opacity-30"></div>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[10px] text-primary-fixed font-black uppercase tracking-widest mb-2 opacity-60">Departure Hub</p>
                                            <p className="font-black text-2xl leading-tight mb-2 italic tracking-tighter">
                                                {formatDate(bid.startDt)}
                                            </p>
                                            <p className="text-3xl font-black mb-3 text-secondary-fixed">
                                                {formatTime(bid.startDt)}
                                            </p>
                                            <p className="text-sm bg-black/20 p-4 rounded-2xl border border-white/5 font-bold leading-relaxed">{bid.startAddr} {bid.startDetailAddr}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-6">
                                        <div className="flex flex-col items-center">
                                            <div className="w-4 h-4 rounded-full bg-white ring-4 ring-white/10 shadow-[0_0_20px_rgba(255,255,255,0.4)]"></div>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[10px] text-primary-fixed font-black uppercase tracking-widest mb-2 opacity-60">Final Destination</p>
                                            <p className="font-black text-2xl leading-tight mb-2 italic tracking-tighter">
                                                {formatDate(bid.endDt)}
                                            </p>
                                            <p className="text-3xl font-black mb-3">
                                                {formatTime(bid.endDt)}
                                            </p>
                                            <p className="text-sm bg-black/20 p-4 rounded-2xl border border-white/5 font-bold leading-relaxed">{bid.endAddr} {bid.endDetailAddr}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default QuotationDetail;
