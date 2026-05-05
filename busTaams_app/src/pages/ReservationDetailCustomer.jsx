import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';

const ReservationDetailCustomer = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [reservation, setReservation] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetail = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/app/customer/reservation/${id}`);
                if (res.success) {
                    setReservation(res.data);
                }
            } catch (err) {
                console.error('Failed to fetch reservation detail:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="font-black text-primary animate-pulse tracking-widest uppercase text-xs">Loading Details</p>
                </div>
            </div>
        );
    }

    if (!reservation) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <p className="text-slate-400 font-bold">예약 정보를 찾을 수 없습니다.</p>
            </div>
        );
    }

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
                            <img alt="User" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAoeVWTLVpGnkWIyZicMecety9-CGdpLwphd882r5bR7LGEFApzaB-h75AbUKFv7Z2dXtx1cK0v1kHNhLGb4f72VRsKJ7CVygOEoLxikAN4igS9CwKYHmnRKRcbyZEw2KOO4nLvN-hRvfRji39TRg6EhEI4vCiDn8P_V3H7VvBpacjSba137bq3sC0SUIWG6zjFXUKoWm-W14wbuiEduIRPUnpYuUwFYtWNCj5VLcpcQ7SIpcrpO3P8OM4OOk-BrAPiRmLzIJcMFmQ" />
                        </div>
                    </div>
                </div>
            </header>

            <main className="pt-32 px-6 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                    {/* Left Column: Route Summary & Vehicles */}
                    <div className="lg:col-span-8 space-y-16">
                        {/* Editorial Header Section */}
                        <section className="animate-in fade-in slide-in-from-top duration-700 text-left">
                            <div className="flex items-end justify-between gap-6 mb-12">
                                <div className="text-left">
                                    <p className="text-secondary font-black tracking-0.4em text-[10px] mb-4 uppercase">Reservation Details</p>
                                    <h2 className="text-6xl md:text-7xl font-black tracking-tighter text-on-surface leading-none">
                                        <span className="text-primary italic">{reservation.tripName}</span> 여정
                                    </h2>
                                </div>
                                <span className={`inline-flex items-center gap-3 px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest border shadow-sm ${getBusStatusDisplay(reservation.status).color}`}>
                                    <span className={`w-2 h-2 rounded-full animate-pulse ${reservation.status === 'CONFIRM' ? 'bg-teal-500' : 'bg-current'}`}></span>
                                    {reservation.statusText}
                                </span>
                            </div>
                        </section>

                        {/* Route Summary */}
                        <div className="bg-white rounded-[3.5rem] p-12 shadow-2xl shadow-teal-900/[0.03] relative overflow-hidden border border-slate-50 text-left">
                            <div className="absolute top-0 left-0 w-2 h-full bg-primary opacity-20"></div>
                            <h2 className="text-2xl font-black mb-12 flex items-center gap-4 text-on-surface tracking-tighter italic">
                                <span className="material-symbols-outlined text-primary text-3xl">route</span>
                                Route Overview
                            </h2>
                            <div className="space-y-12 relative text-left">
                                <div className="absolute left-4 top-2 bottom-2 w-1 bg-slate-50"></div>
                                
                                {reservation.route.map((point, idx) => (
                                    <div key={idx} className="relative pl-16 text-left">
                                        <div className={`absolute left-[7px] top-2 w-4 h-4 rounded-full border-4 border-white shadow-lg z-10 ${
                                            point.type === 'START' ? 'bg-primary' : point.type === 'END' ? 'bg-secondary' : 'bg-slate-200'
                                        }`}></div>
                                        <p className="text-slate-300 text-[9px] font-black uppercase tracking-widest mb-2">{point.title}</p>
                                        <h3 className={`text-2xl font-black tracking-tighter ${point.type === 'END' ? 'text-secondary' : ''}`}>{point.addr}</h3>
                                        {point.time && <p className="text-sm text-slate-400 font-bold mt-2 italic">{point.time}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Vehicle & Driver Section */}
                        <div className="space-y-10 text-left">
                            <div className="flex justify-between items-end px-4">
                                <h2 className="text-3xl font-black tracking-tighter text-on-surface">요청 차량 현황</h2>
                                <span className="text-xs text-primary font-black uppercase tracking-widest bg-primary/5 px-4 py-2 rounded-full">
                                    {reservation.requestedBuses.length} Units Requested
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                {reservation.requestedBuses.map((bus, idx) => (
                                    <div key={idx} className={`bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-teal-900/[0.04] border-l-8 flex flex-col justify-between hover:scale-[1.02] transition-all group ${
                                        bus.status === 'CONFIRM' ? 'border-teal-500' : 'border-slate-200'
                                    }`}>
                                        <div className="text-left">
                                            <div className="flex justify-between items-start mb-8 text-left">
                                                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all ${
                                                    bus.status === 'CONFIRM' ? 'bg-teal-50 text-teal-600' : 'bg-slate-50 text-slate-400'
                                                }`}>
                                                    <span className="material-symbols-outlined text-4xl">directions_bus</span>
                                                </div>
                                                <span className={`text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border ${getBusStatusDisplay(bus.status).color}`}>
                                                    {getBusStatusDisplay(bus.status).label}
                                                </span>
                                            </div>
                                            <h4 className="font-black text-2xl tracking-tighter mb-1">{bus.busType}</h4>
                                            <p className="text-xs text-slate-300 font-bold uppercase tracking-widest mb-6">Vehicle Unit {idx + 1}</p>
                                            
                                            <div className="space-y-3 py-6 border-t border-slate-50">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-400 font-bold">응찰 수</span>
                                                    <span className="font-black text-primary">{bus.bidCount}건</span>
                                                </div>
                                                {bus.status === 'CONFIRM' ? (
                                                    <>
                                                        <div className="flex justify-between text-xs">
                                                            <span className="text-slate-400 font-bold">확정 기사</span>
                                                            <span className="font-black text-teal-600">{bus.driverName} 기사님</span>
                                                        </div>
                                                        <div className="flex justify-between text-xs">
                                                            <span className="text-slate-400 font-bold">차량 번호</span>
                                                            <span className="font-black text-on-surface">{bus.busNo} ({bus.busModel})</span>
                                                        </div>
                                                        <div className="flex justify-between text-xs">
                                                            <span className="text-slate-400 font-bold">확정 금액</span>
                                                            <span className="font-black text-primary">₩{bus.confirmedPrice?.toLocaleString()}</span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-slate-400 font-bold">예상 금액</span>
                                                        <span className="font-black text-on-surface">₩{bus.price?.toLocaleString()}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {bus.status === 'CONFIRM' ? (
                                            <button onClick={() => navigate('/chat-room')} className="w-full mt-6 bg-teal-50 text-teal-700 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-teal-100 hover:bg-teal-500 hover:text-white transition-all flex items-center justify-center gap-3">
                                                <span className="material-symbols-outlined text-lg">chat_bubble</span>
                                                Contact Captain
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => navigate(`/estimate-list/${id}`)}
                                                className="w-full mt-6 bg-primary/5 text-primary py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-primary/10 hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-3"
                                            >
                                                <span className="material-symbols-outlined text-lg">list_alt</span>
                                                View All Bids
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Payment & Actions */}
                    <div className="lg:col-span-4 space-y-12">
                        <div className="bg-slate-900 rounded-[3rem] p-10 sticky top-32 shadow-2xl shadow-slate-900/40 border border-white/5 text-left">
                            <h2 className="text-2xl font-black mb-10 text-white tracking-tighter italic">Payment Details</h2>
                            <div className="space-y-8 mb-12">
                                <div className="pt-8 border-t border-white/10 text-left">
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.6em] mb-3">Total Estimated Amount</p>
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-5xl font-black tracking-tighter text-white">₩{reservation.total_price?.toLocaleString()}</span>
                                        <span className="material-symbols-outlined text-primary text-3xl">verified</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-4 text-left">
                                <button onClick={() => navigate('/chat-room')} className="w-full bg-primary text-white py-6 rounded-full font-black text-xs uppercase tracking-[0.4em] shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4">
                                    <span className="material-symbols-outlined text-lg">support_agent</span>
                                    Concierge Talk
                                </button>
                                {reservation.status !== 'DONE' && reservation.status !== 'TRAVELER_CANCEL' && (
                                    <button onClick={() => {
                                        if(window.confirm('정말 전체 예약을 취소하시겠습니까?')) {
                                            api.post('/app/customer/cancel-request', { reqId: id }).then(res => {
                                                if(res.success) {
                                                    alert('취소되었습니다.');
                                                    window.location.reload();
                                                }
                                            });
                                        }
                                    }} className="w-full bg-white/5 text-red-400 border border-white/10 py-6 rounded-full font-black text-xs uppercase tracking-[0.4em] hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-4">
                                        <span className="material-symbols-outlined text-lg">cancel</span>
                                        Cancel Journey
                                    </button>
                                )}
                            </div>
                            
                            <div className="mt-10 p-6 bg-white/[0.02] rounded-3xl border border-white/[0.05]">
                                <p className="text-[10px] leading-relaxed text-slate-500 font-bold italic text-left">
                                    * 실제 이동 거리 및 대기 시간에 따라 최종 금액이 변동될 수 있습니다. 출발 24시간 이내 취소 시 위약금이 발생할 수 있습니다.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Premium Bottom Nav */}
            <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex justify-around items-center px-4 py-2 bg-slate-900 text-white w-[90%] max-w-md mx-auto rounded-full shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] border border-white/10">
                <button onClick={() => navigate('/customer-dashboard')} className="flex flex-col items-center justify-center text-slate-500 px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">gavel</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Auction</span>
                </button>
                <button onClick={() => navigate('/reservation-list')} className="flex flex-col items-center justify-center px-5 py-2 text-white relative">
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

export default ReservationDetailCustomer;
