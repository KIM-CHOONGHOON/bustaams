import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';

const QuotationRequests = ({ close, currentUser }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        fetchData();
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/driver/quotation-requests?uuid=${currentUser?.uuid || ''}`);
            if (!res.ok) throw new Error('Network response was not ok');
            const result = await res.json();
            setData(result);
        } catch (error) {
            console.error('Failed to fetch quotation requests:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !data) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
                <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-background text-on-background antialiased overflow-y-auto w-full h-full animate-in fade-in duration-300" style={{ fontFamily: "'Manrope', 'Plus Jakarta Sans', sans-serif" }}>
            {/* TopNavBar */}
            <header className="sticky top-0 w-full z-50 bg-white/80 backdrop-blur-md shadow-[0_20px_40px_-15px_rgba(0,104,95,0.08)]">
                <div className="flex justify-between items-center px-8 h-20 w-full max-w-none">
                    <div className="flex items-center gap-12">
                        <span className="text-2xl font-bold italic text-teal-800 font-headline tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>busTaams</span>
                        <nav className="hidden md:flex gap-8 items-center">
                            <button onClick={close} className="flex items-center gap-1 text-slate-500 hover:text-teal-600 transition-colors font-bold tracking-tight">
                                <span className="material-symbols-outlined text-sm">arrow_back</span>
                                대시보드 돌아가기
                            </button>
                            <span className="text-teal-700 border-b-2 border-teal-600 pb-1 font-bold tracking-tight cursor-default">견적 관리</span>
                        </nav>
                    </div>
                    <div className="flex items-center gap-6">
                        <button className="material-symbols-outlined text-on-surface-variant hover:bg-teal-50/50 p-2 rounded-full transition-all duration-300 active:scale-95">notifications</button>
                        <div className="flex items-center gap-3 pl-4">
                            <span className="text-sm font-semibold text-on-surface">{currentUser?.userName || '기사님'} 님</span>
                            <span className="material-symbols-outlined text-teal-700" style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="pt-12 pb-20 px-8 max-w-7xl mx-auto flex gap-12">
                {/* SideNavBar */}
                <aside className="hidden lg:flex flex-col w-72 sticky top-32 h-fit gap-8">
                    <div className="space-y-6">
                        <h2 className="text-3xl font-extrabold tracking-tighter text-primary leading-none" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            실시간 견적<br/>현황
                        </h2>
                        <p className="text-on-surface-variant leading-relaxed">
                            {data.summary.notice}
                        </p>
                    </div>
                    <nav className="flex flex-col gap-2">
                        <div className="flex items-center gap-3 p-4 bg-white text-teal-700 rounded-xl shadow-sm font-semibold transition-all duration-200">
                            <span className="material-symbols-outlined">directions_bus</span>
                            <span>예약 요청 관리</span>
                        </div>
                        <div className="flex items-center gap-3 p-4 text-slate-500 hover:translate-x-1 transition-transform font-semibold cursor-pointer">
                            <span className="material-symbols-outlined">gavel</span>
                            <span>입찰 현황</span>
                        </div>
                        <div className="flex items-center gap-3 p-4 text-slate-500 hover:translate-x-1 transition-transform font-semibold cursor-pointer">
                            <span className="material-symbols-outlined">payments</span>
                            <span>결제 내역</span>
                        </div>
                    </nav>
                    <div className="bg-surface-container-high rounded-xl p-6 mt-4">
                        <div className="text-xs font-bold text-secondary uppercase tracking-widest mb-2">공지사항</div>
                        <p className="text-sm text-on-surface-variant font-medium">고객의 요청 사항을 자세히 확인 후 견적을 제출해주세요.</p>
                    </div>
                </aside>

                {/* Content Canvas */}
                <section className="flex-1 space-y-12">
                    {/* Summary Bar */}
                    <div className="bg-surface-container-low rounded-2xl p-8 flex justify-between items-center">
                        <div>
                            <div className="text-sm font-bold text-teal-700 mb-1">{data.summary.subTitle}</div>
                            <div className="text-xl font-bold">{data.summary.title}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-on-surface-variant">남은 입찰 시간</div>
                            <div className="text-2xl font-bold text-secondary" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{data.summary.timeLeft}</div>
                        </div>
                    </div>

                    {/* Kinetic Gallery List */}
                    <div className="grid grid-cols-1 gap-10">
                        {data.bids.map((bid) => (
                            <div key={bid.id} className="group relative bg-surface-container-lowest rounded-2xl p-8 shadow-[0_40px_60px_-20px_rgba(0,104,95,0.06)] transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                                {bid.badge === '최신형' && <div className="absolute top-0 left-0 w-1 h-full bg-secondary"></div>}
                                <div className="flex flex-col md:flex-row gap-8">
                                    {/* Bus Image */}
                                    <div className="w-full md:w-80 h-48 rounded-xl overflow-hidden bg-surface-container-high">
                                        <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src={bid.image} alt={bid.busType} />
                                    </div>
                                    
                                    {/* Info */}
                                    <div className="flex-1 flex flex-col justify-between">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    {bid.badge && (
                                                        <span className={`text-xs font-bold px-2 py-1 rounded ${bid.badge === '최신형' ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-600'}`}>{bid.badge}</span>
                                                    )}
                                                    <span className="text-sm font-semibold text-on-surface-variant">{bid.busType}</span>
                                                </div>
                                                <h3 className="text-2xl font-bold mb-1">{bid.driverName}</h3>
                                                <div className="flex items-center gap-1 text-secondary">
                                                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                                    <span className="font-bold">{bid.rating}</span>
                                                    <span className="text-on-surface-variant text-sm font-medium ml-1">(리뷰 {bid.reviews}개)</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-bold text-on-surface-variant mb-1">최종 견적가</div>
                                                <div className="text-3xl font-extrabold text-primary tracking-tighter" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>₩ {bid.price.toLocaleString()}</div>
                                            </div>
                                        </div>

                                        <div className="flex items-end justify-between mt-6">
                                            <div className="flex gap-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase font-bold text-slate-400">편의시설</span>
                                                    <div className="flex gap-2 mt-1">
                                                        {bid.amenities.map((amenity, i) => (
                                                            <span key={i} className="material-symbols-outlined text-slate-500 text-xl" title={amenity}>{amenity}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="w-px h-10 bg-surface-container-high mx-2"></div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase font-bold text-slate-400">경험</span>
                                                    <span className="text-sm font-bold text-on-surface">{bid.experience}</span>
                                                </div>
                                            </div>
                                            <button className="h-12 px-10 rounded-full bg-gradient-to-r from-primary to-primary-container text-white font-bold hover:shadow-lg hover:shadow-teal-900/20 active:scale-95 transition-all">
                                                견적 선택하기
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Empty State / Load More */}
                    <div className="py-12 border-t border-slate-100 flex flex-col items-center gap-6">
                        <p className="text-on-surface-variant font-medium">더 많은 요청을 확인하시겠습니까?</p>
                        <button className="flex items-center gap-2 text-primary font-bold hover:gap-4 transition-all">
                            <span>이전 요청 더 보기</span>
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                    </div>
                </section>
            </main>

            {/* Floating Filter Menu */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-white/80 backdrop-blur-md rounded-full shadow-[0_40px_60px_-20px_rgba(0,104,95,0.06)] z-50">
                <button className="px-6 py-3 rounded-full bg-primary text-white font-bold flex items-center gap-2 transition-all active:scale-95">
                    <span className="material-symbols-outlined text-lg">filter_list</span>
                    <span>필터</span>
                </button>
                <button className="px-6 py-3 rounded-full bg-white text-on-surface font-bold flex items-center gap-2 hover:bg-slate-50 transition-all active:scale-95">
                    <span className="material-symbols-outlined text-lg">sort</span>
                    <span>낮은 가격순</span>
                </button>
            </div>
        </div>
    );
};

export default QuotationRequests;
