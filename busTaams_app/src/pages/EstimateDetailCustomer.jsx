import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';

const EstimateDetailCustomer = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [bid, setBid] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchBidDetail = async () => {
            if (!id) {
                setError('ID가 유효하지 않습니다.');
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                console.log('Fetching bid detail for ID:', id);
                const res = await api.get(`/app/customer/bid-detail/${id}`);
                console.log('Bid Detail Response:', res);
                if (res && res.success) {
                    setBid(res.data);
                } else {
                    setError(res?.error || '데이터를 불러오지 못했습니다.');
                }
            } catch (err) {
                console.error('Failed to fetch bid detail:', err);
                setError('서버 통신 중 오류가 발생했습니다.');
            } finally {
                setLoading(false);
            }
        };
        fetchBidDetail();
    }, [id]);

    const getBusStatusDisplay = (status) => {
        const config = {
            'AUCTION': { label: '견적대기중..', color: 'bg-slate-100 text-slate-400' },
            'BIDDING': { label: '승인대기중..', color: 'bg-orange-100 text-orange-700' },
            'CONFIRM': { label: '예약 확정..', color: 'bg-teal-100 text-teal-700' },
            'DONE': { label: '운행 종료..', color: 'bg-slate-100 text-slate-500' },
            'TRAVELER_CANCEL': { label: '여행자 버스 예약 전체 취소', color: 'bg-red-100 text-red-700' },
            'DRIVER_CANCEL': { label: '버스 기사 응찰 취소', color: 'bg-red-100 text-red-700' },
            'BUS_CHANGE': { label: '여행자 버스 변경 요청', color: 'bg-purple-100 text-purple-700' },
            'BUS_CANCEL': { label: '여행자 버스 취소(버스 대수 감소)', color: 'bg-gray-100 text-gray-600' }
        };
        return config[status] || { label: status || '상태 대기', color: 'bg-slate-100 text-slate-400' };
    };

    const handleApproveBid = async () => {
        if (!window.confirm('이 기사님의 견적을 승인하시겠습니까?')) return;
        try {
            const res = await api.post('/app/customer/approve-bid', { resId: id });
            if (res.success) {
                alert('승인이 완료되었습니다.');
                navigate(-1);
            } else {
                alert(res.error || '승인 처리 중 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error('Approve bid error:', error);
            alert('승인 처리 중 오류가 발생했습니다.');
        }
    };

    const handleApproveAll = async () => {
        if (!bid?.reqId) {
            alert('요청 정보를 찾을 수 없습니다.');
            return;
        }
        if (!window.confirm('이 요청에 대한 모든 견적을 승인하시겠습니까?')) return;
        try {
            const res = await api.post('/app/customer/approve-all', { reqId: bid.reqId });
            if (res.success) {
                alert('모든 견적이 승인되었습니다.');
                navigate(-1);
            } else {
                alert(res.error || '전체 승인 처리 중 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error('Approve all error:', error);
            alert('전체 승인 처리 중 오류가 발생했습니다.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="font-black text-primary animate-pulse tracking-widest uppercase text-xs">Loading Bid Detail...</p>
                </div>
            </div>
        );
    }

    if (error || !bid) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
                <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">error</span>
                <h2 className="text-2xl font-black text-teal-900 mb-2">{error || '견적 정보를 찾을 수 없습니다.'}</h2>
                <p className="text-slate-400 mb-6">데이터를 불러오는 중 문제가 발생했습니다.</p>
                <button onClick={() => navigate(-1)} className="px-8 py-3 bg-primary text-white rounded-full font-black">뒤로 가기</button>
            </div>
        );
    }

    return (
        <div className="bg-background text-on-surface min-h-screen pb-32 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-50 shadow-sm">
                <div className="flex items-center justify-between px-6 h-20 w-full max-w-7xl mx-auto py-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="material-symbols-outlined text-slate-400 hover:bg-slate-50 p-2 rounded-full transition-all">arrow_back</button>
                        <h1 className="font-headline text-lg font-black tracking-tighter text-teal-700 italic">busTaams Premier</h1>
                    </div>
                </div>
            </header>

            <main className="pt-28 pb-32 px-6 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
                    <div className="lg:col-span-8 space-y-16">
                        {/* Driver Profile Section */}
                        <section className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
                            <div className="md:col-span-5 aspect-square rounded-[3rem] overflow-hidden shadow-2xl shadow-teal-900/10 bg-white ring-8 ring-white">
                                <img alt="Driver" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000" src={bid.avatar || 'https://via.placeholder.com/300'} />
                            </div>
                            <div className="md:col-span-7 space-y-6 text-left">
                                <div className="flex items-center gap-3">
                                    <span className="bg-primary/5 text-primary text-[10px] font-black px-4 py-1.5 rounded-full flex items-center gap-1.5 uppercase tracking-widest border border-primary/10">
                                        <span className="material-symbols-outlined text-[14px]" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>
                                        Certified Partner
                                    </span>
                                    <span className="text-secondary font-black text-[10px] tracking-[0.2em] uppercase">경력 {bid.experience || 0}년</span>
                                </div>
                                <h2 className="text-[44px] font-black tracking-tighter text-on-surface leading-none italic">{bid.driverName || '이름 정보 없음'} 기사님</h2>
                                <p className="text-on-surface-variant text-lg leading-snug max-w-lg font-medium opacity-70">
                                    {bid.memo || "안전과 정시 도착은 기본입니다. 최상의 서비스로 모시겠습니다."}
                                </p>
                                <div className="grid grid-cols-2 gap-8 py-6 border-y border-slate-100">
                                    <div>
                                        <p className="text-slate-300 text-[10px] font-black uppercase tracking-widest mb-1">상태</p>
                                        <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getBusStatusDisplay(bid.status || 'BIDDING').color}`}>
                                            {getBusStatusDisplay(bid.status || 'BIDDING').label}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-slate-300 text-[10px] font-black uppercase tracking-widest mb-1">연락처</p>
                                        <p className="text-xl font-black">{bid.hpNo || '정보 없음'}</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Vehicle Gallery */}
                        <section className="space-y-8">
                            <div className="flex justify-between items-end">
                                <div className="space-y-1 text-left">
                                    <h3 className="text-[32px] font-black tracking-tighter text-primary leading-tight italic">{bid.busModel || '차량 모델 정보 없음'}</h3>
                                    <p className="text-on-surface-variant font-bold opacity-50 uppercase tracking-widest text-xs">
                                        {bid.busYear || '-'}년형 | {bid.busType || '-'} CLASS | {bid.vehicleNo || '-'}
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-12 gap-4 h-[450px]">
                                <div className="col-span-12 rounded-[3rem] overflow-hidden bg-slate-100 relative group shadow-2xl shadow-teal-900/10">
                                    <img alt="Exterior" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" src={bid.photos?.[0] || 'https://via.placeholder.com/800x450'} />
                                    <div className="absolute top-8 left-8 bg-black/30 backdrop-blur-md px-5 py-2 rounded-full text-white text-[10px] font-black uppercase tracking-widest border border-white/20">Vehicle View</div>
                                </div>
                            </div>
                        </section>

                        {/* Vehicle Specs */}
                        <section className="bg-white rounded-[3rem] p-12 shadow-2xl shadow-teal-900/[0.03] border border-slate-50 space-y-10 text-left">
                            <h4 className="text-xl font-black tracking-tight border-b border-slate-50 pb-6 italic">차량 및 보험 상세 정보</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8">
                                <div className="flex justify-between items-center group">
                                    <span className="text-slate-400 font-bold uppercase text-[11px] tracking-widest">차량 모델</span>
                                    <span className="font-black text-on-surface">{bid.busModel || '-'}</span>
                                </div>
                                <div className="flex justify-between items-center group">
                                    <span className="text-slate-400 font-bold uppercase text-[11px] tracking-widest">차량 번호</span>
                                    <span className="font-black text-on-surface">{bid.vehicleNo || '-'}</span>
                                </div>
                                <div className="flex justify-between items-center group">
                                    <span className="text-slate-400 font-bold uppercase text-[11px] tracking-widest">좌석 수</span>
                                    <span className="font-black text-on-surface">{bid.seats || 0}석</span>
                                </div>
                                <div className="flex justify-between items-center group">
                                    <span className="text-slate-400 font-bold uppercase text-[11px] tracking-widest">보험 만료일</span>
                                    <span className="font-black text-on-surface">{bid.insuranceExpDt || '정보 없음'}</span>
                                </div>
                                <div className="flex justify-between items-center group">
                                    <span className="text-slate-400 font-bold uppercase text-[11px] tracking-widest">정기검사일</span>
                                    <span className="font-black text-on-surface">{bid.lastInspectDt || '정보 없음'}</span>
                                </div>
                                <div className="flex justify-between items-center group">
                                    <span className="text-slate-400 font-bold uppercase text-[11px] tracking-widest">안전 장치</span>
                                    <span className="font-black text-primary flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-sm">security</span>
                                        {bid.hasAdas === 'Y' ? 'ADAS 장착' : '기본 안전장치'}
                                    </span>
                                </div>
                            </div>
                            <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                                {Array.isArray(bid.amenities) && bid.amenities.map((opt, index) => {
                                    const label = typeof opt === 'object' ? (opt.label || opt.name || '편의시설') : opt;
                                    return (
                                        <div key={index} className="p-6 rounded-[1.5rem] bg-slate-50 flex flex-col items-center justify-center text-center space-y-3 border-b-4 border-secondary/20">
                                            <span className="material-symbols-outlined text-primary text-3xl">star</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-on-surface">{label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>

                    {/* Right Sticky Sidebar */}
                    <div className="lg:col-span-4">
                        <aside className="sticky top-28 bg-white p-12 rounded-[3.5rem] shadow-2xl shadow-teal-900/10 border border-slate-50 space-y-10 text-left">
                            <div className="space-y-2">
                                <h4 className="text-xs font-black text-slate-300 uppercase tracking-[0.3em]">Estimated Receipt</h4>
                                <h3 className="text-2xl font-black tracking-tight italic">상세 견적 내역</h3>
                            </div>
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 font-bold text-sm">기본 운행료</span>
                                    <span className="font-black">₩ {(Number(bid.baseFare) || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 font-bold text-sm">부대 비용 합계</span>
                                    <span className="font-black text-slate-400 italic">포함됨</span>
                                </div>
                                <div className="pt-4 border-t border-slate-100 flex justify-between items-baseline">
                                    <span className="text-lg font-black tracking-tighter">TOTAL</span>
                                    <div className="text-right">
                                        <span className="text-[40px] font-black text-primary leading-none tracking-tighter italic">₩ {(Number(bid.totalPrice) || 0).toLocaleString()}</span>
                                        <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest mt-2">VAT Included</p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-center text-[10px] text-slate-300 font-black leading-loose uppercase tracking-widest">
                                * 현재 견적 진행 중인 단계입니다.<br/>기사님의 응찰 내용을 확인해 주세요.
                            </p>
                        </aside>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default EstimateDetailCustomer;
