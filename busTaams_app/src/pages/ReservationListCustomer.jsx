import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const ReservationListCustomer = () => {
    const navigate = useNavigate();
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReservations = async () => {
            setLoading(true);
            try {
                const res = await api.get('/app/customer/reservations');
                if (res.success) {
                    setReservations(res.data);
                }
            } catch (err) {
                console.error('Failed to fetch reservations:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchReservations();
    }, []);

    const getBusStatusDisplay = (status) => {
        const config = {
            'AUCTION': { label: '견적대기중..', color: 'bg-slate-100 text-slate-400' },
            'BIDDING': { label: '승인대기중...', color: 'bg-orange-100 text-orange-700' },
            'CONFIRM': { label: '예약 확정...', color: 'bg-teal-100 text-teal-700' },
            'DONE': { label: '운행 종료...', color: 'bg-slate-100 text-slate-500' },
            'TRAVELER_CANCEL': { label: '전체 취소', color: 'bg-red-100 text-red-700' },
            'DRIVER_CANCEL': { label: '기사 취소', color: 'bg-red-100 text-red-700' },
            'BUS_CHANGE': { label: '변경 요청', color: 'bg-purple-100 text-purple-700' },
            'BUS_CANCEL': { label: '대수 취소', color: 'bg-gray-100 text-gray-600' }
        };
        return config[status] || { label: status || '상태 대기', color: 'bg-slate-100 text-slate-400' };
    };

    return (
        <div className="bg-background text-on-surface min-h-screen pb-40 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-3xl border-b border-white py-4 shadow-sm">
                <div className="flex items-center justify-between px-6 h-18 w-full max-w-7xl mx-auto">
                    <div className="flex items-center gap-5">
                        <button onClick={() => navigate(-1)} className="text-teal-800 hover:bg-slate-50 p-2 rounded-full transition-all">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <h1 className="text-3xl font-black text-teal-900 tracking-tighter font-headline italic">busTaams</h1>
                    </div>
                    <div className="flex items-center gap-8">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-2xl rotate-3">
                            <img alt="User" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDAuydGKeWcVXnNwZDRc1I8NFS_BI9gq969584jVmM5maopYZ63srZ7FvlrWEb_EAlmkWIjBb5BPNcP1t7cxeVW66HWUlO53iZcSpZ7qSCpZdrQUXwvp8X5ibBv6Xx57pJrCmFA8WY8f1W6QCEC0wt2VbiePnFQ6Dco1T3vF-Vkzh0wL5vNyHOTwR2RKCQJ0QLxejtltR8UYIvSuocurIgQmtVJa8pHYHzWuHFe8N8rJRH34uYOlkJtQMcv8C1c99d4lMC41r-mrI" />
                        </div>
                    </div>
                </div>
            </header>

            <main className="pt-32 px-6 max-w-6xl mx-auto space-y-16">
                {/* Editorial Header Section */}
                <section className="animate-in fade-in slide-in-from-top duration-1000 text-left">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="max-w-2xl space-y-4 text-left">
                            <span className="text-secondary font-black tracking-[0.5em] uppercase text-[10px] block mb-2">Luxury Concierge</span>
                            <h2 className="text-6xl md:text-8xl font-black font-headline text-on-surface tracking-tighter leading-none">내 예약 내역</h2>
                            <div className="mt-6 h-1.5 w-32 bg-primary rounded-full shadow-lg shadow-primary/20"></div>
                        </div>
                    </div>
                </section>

                {/* Reservations List */}
                <div className="grid grid-cols-1 gap-12">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-slate-400 font-bold">내역을 불러오는 중...</p>
                        </div>
                    ) : reservations.length > 0 ? (
                        reservations.map((res, idx) => (
                            <div 
                                key={res.id}
                                onClick={() => res.statusCode !== 'DONE' && navigate(`/reservation-detail/${res.id}`)}
                                className={`group relative bg-white rounded-[3.5rem] shadow-2xl shadow-teal-900/[0.03] overflow-hidden transition-all duration-700 hover:shadow-teal-900/10 cursor-pointer animate-in fade-in slide-in-from-bottom border border-slate-50 ${res.statusCode === 'DONE' ? 'opacity-60 border-dashed bg-slate-50/50' : ''}`}
                                style={{ animationDelay: `${idx * 200}ms` }}
                            >
                                {/* Vertical Status Accent */}
                                <div className={`absolute left-0 top-0 bottom-0 w-2 transition-all ${res.statusCode === 'CONFIRM' ? 'bg-primary' : 'bg-slate-200'}`}></div>
                                
                                <div className="p-10 flex flex-col lg:flex-row gap-12">
                                    {/* Image Section */}
                                    <div className="w-full lg:w-96 lg:min-w-[24rem] h-64 rounded-[2.5rem] overflow-hidden relative shadow-2xl bg-slate-100 flex items-center justify-center">
                                        {res.img ? (
                                            <img className={`w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 ${res.statusCode === 'DONE' ? 'grayscale' : 'grayscale group-hover:grayscale-0'}`} alt="Trip" src={res.img}/>
                                        ) : (
                                            <span className="material-symbols-outlined text-slate-300 text-6xl">directions_bus</span>
                                        )}
                                        <div className={`absolute top-6 left-6 text-white text-[9px] font-black px-5 py-2 rounded-full uppercase tracking-widest shadow-xl ${getBusStatusDisplay(res.statusCode).color}`}>
                                            {getBusStatusDisplay(res.statusCode).label}
                                        </div>
                                    </div>
                                    
                                    {/* Content Section */}
                                    <div className="flex-1 flex flex-col justify-between py-2 text-left">
                                        <div className="space-y-10 text-left">
                                            <div className="flex flex-col md:flex-row justify-between items-start gap-6 text-left">
                                                <div className="text-left">
                                                    <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.3em] mb-3">Service Route</p>
                                                    {(() => {
                                                        const formatAddr = (addr) => {
                                                            if (!addr) return '';
                                                            const parts = addr.split(' ');
                                                            return parts.slice(0, 2).join(' ');
                                                        };

                                                        return (
                                                            <h3 className="text-2xl md:text-3xl font-headline font-black text-on-surface flex items-center gap-3 tracking-tighter flex-wrap">
                                                                <span>{formatAddr(res.from)}</span>
                                                                <span className={`material-symbols-outlined text-xl ${res.statusCode === 'DONE' ? 'text-slate-200' : 'text-primary'}`}>east</span>
                                                                {res.roundAddr && (
                                                                    <>
                                                                        <span className="text-teal-600">{formatAddr(res.roundAddr)}</span>
                                                                        <span className={`material-symbols-outlined text-xl ${res.statusCode === 'DONE' ? 'text-slate-200' : 'text-primary'}`}>east</span>
                                                                    </>
                                                                )}
                                                                <span>{formatAddr(res.to)}</span>
                                                            </h3>
                                                        );
                                                    })()}
                                                </div>
                                                <div className="text-left md:text-right">
                                                    <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.3em] mb-3">Status Result</p>
                                                    <span className={`${res.statusCode === 'DONE' ? 'text-slate-400' : 'text-primary'} font-black text-xs uppercase tracking-widest flex items-center gap-3`}>
                                                        <span className="material-symbols-outlined text-lg" style={{fontVariationSettings: "'FILL' 1"}}>{res.statusCode === 'DONE' ? 'history' : 'verified'}</span>
                                                        {getBusStatusDisplay(res.statusCode).label}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-10 pt-10 border-t border-slate-50 text-left">
                                                <div className="text-left">
                                                    <p className="text-slate-300 text-[9px] font-black uppercase tracking-widest mb-2">Depart Date</p>
                                                    <p className="text-on-surface font-black tracking-tight text-lg">{res.date}</p>
                                                </div>
                                                <div className="text-left col-span-2">
                                                    <p className="text-slate-300 text-[9px] font-black uppercase tracking-widest mb-2">Vehicle Specification</p>
                                                    <p className="text-on-surface font-black tracking-tight text-lg">{res.busType}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-12 flex flex-wrap gap-4 text-left">
                                            {res.statusCode !== 'DONE' ? (
                                                <>
                                                    <button className="bg-slate-900 text-white px-10 py-5 rounded-full font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all">
                                                        View Ticket
                                                    </button>
                                                    <button className="border-2 border-slate-100 text-slate-400 px-10 py-5 rounded-full font-black text-[10px] uppercase tracking-[0.3em] hover:bg-slate-50 hover:text-primary transition-all">
                                                        Contact Driver
                                                    </button>
                                                </>
                                            ) : (
                                                <button className="text-primary font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-3 hover:underline">
                                                    <span className="material-symbols-outlined text-lg">receipt_long</span>
                                                    Download Receipt
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-white rounded-[3.5rem] p-20 flex flex-col items-center justify-center text-center space-y-6 border border-slate-50 shadow-sm">
                            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                                <span className="material-symbols-outlined text-5xl">event_busy</span>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-slate-800">예약 내역이 없습니다</h3>
                                <p className="text-slate-400 font-medium">새로운 여정을 계획하고 예약을 시작해보세요.</p>
                            </div>
                            <button onClick={() => navigate('/customer-dashboard')} className="bg-primary text-white px-10 py-4 rounded-full font-black text-sm shadow-xl shadow-primary/20 active:scale-95 transition-all">
                                대시보드로 돌아가기
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Premium Bottom Nav */}
            <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex justify-around items-center px-4 py-2 bg-slate-900 text-white w-[90%] max-w-md mx-auto rounded-full shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] border border-white/10">
                <button onClick={() => navigate('/customer-dashboard')} className="flex flex-col items-center justify-center text-slate-500 px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">gavel</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Auction</span>
                </button>
                <button className="flex flex-col items-center justify-center px-5 py-2 text-white relative">
                    <div className="absolute inset-0 bg-white/10 rounded-2xl blur-lg"></div>
                    <span className="material-symbols-outlined relative z-10" style={{fontVariationSettings: "'FILL' 1"}}>confirmation_number</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1 relative z-10 underline decoration-2 underline-offset-4">Reservations</span>
                </button>
                <button onClick={() => navigate('/chat-room')} className="flex flex-col items-center justify-center text-slate-500 px-5 py-2 hover:text-white transition-all">
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

export default ReservationListCustomer;
