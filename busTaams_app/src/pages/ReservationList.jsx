import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import BottomNavCustomer from '../components/BottomNavCustomer';

const ReservationList = () => {
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

    const getStatusLabel = (code) => {
        switch(code) {
            case 'CONFIRM': return '예약 확정';
            case 'DONE': return '운행 완료';
            case 'UPCOMING': return '운행 예정';
            default: return code;
        }
    };

    return (
        <div className="bg-background text-on-surface font-body min-h-screen pb-32">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,104,95,0.04)]">
                <div className="flex items-center justify-between px-6 py-4 w-full">
                    <div className="flex items-center gap-4 text-left">
                        <button onClick={() => navigate(-1)} className="text-teal-700 hover:bg-slate-100 transition-colors p-2 rounded-full scale-95 active:scale-90 duration-200">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <h1 className="text-2xl font-black text-teal-800 tracking-tighter font-headline text-[24px]">Velocity</h1>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-teal-100 shadow-sm transition-transform hover:scale-110">
                            <img alt="User" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDAuydGKeWcVXnNwZDRc1I8NFS_BI9gq969584jVmM5maopYZ63srZ7FvlrWEb_EAlmkWIjBb5BPNcP1t7cxeVW66HWUlO53iZcSpZ7qSCpZdrQUXwvp8X5ibBv6Xx57pJrCmFA8WY8f1W6QCEC0wt2VbiePnFQ6Dco1T3vF-Vkzh0wL5vNyHOTwR2RKCQJ0QLxejtltR8UYIvSuocurIgQmtVJa8pHYHzWuHFe8N8rJRH34uYOlkJtQMcv8C1c99d4lMC41r-mrI" />
                        </div>
                    </div>
                </div>
            </header>

            <main className="pt-28 pb-32 px-6 max-w-5xl mx-auto text-left">
                {/* Editorial Header Section */}
                <section className="mb-12">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 text-left">
                        <div className="max-w-xl text-left">
                            <span className="text-secondary font-bold tracking-widest uppercase text-[10px] mb-2 block">여행 컨시어지</span>
                            <h2 className="text-5xl md:text-6xl font-extrabold font-headline text-on-surface tracking-tighter text-[40px]">내 예약 내역</h2>
                        </div>
                    </div>
                    <div className="mt-6 h-1 w-24 bg-primary rounded-full"></div>
                </section>

                <div className="grid grid-cols-1 gap-8">
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
                                className={`group relative bg-white rounded-2xl shadow-sm border border-slate-50 overflow-hidden transition-all duration-300 hover:shadow-xl hover:translate-y-[-4px] cursor-pointer ${res.statusCode === 'DONE' ? 'opacity-60 bg-slate-50/50' : ''}`}
                            >
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${res.statusCode === 'CONFIRM' ? 'bg-primary' : 'bg-slate-200'}`}></div>
                                <div className="p-8 flex flex-col md:flex-row gap-8">
                                    <div className="w-full md:w-1/3 h-48 rounded-xl overflow-hidden relative shadow-sm bg-slate-100 flex items-center justify-center">
                                        {res.img ? (
                                            <img className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${res.statusCode === 'DONE' ? 'grayscale' : ''}`} src={res.img} alt="Bus" />
                                        ) : (
                                            <span className="material-symbols-outlined text-slate-300 text-6xl">directions_bus</span>
                                        )}
                                        <div className={`absolute top-4 left-4 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-md ${res.statusCode === 'CONFIRM' ? 'bg-primary' : 'bg-slate-400'}`}>
                                            {getStatusLabel(res.statusCode)}
                                        </div>
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between text-left">
                                        <div>
                                            <div className="flex justify-between items-start mb-4 text-left">
                                                <div className="text-left">
                                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1 text-left">운행 노선</p>
                                                    <h3 className="text-2xl font-headline font-bold text-on-surface flex items-center gap-3 text-[22px]">
                                                        {res.from} 
                                                        <span className={`material-symbols-outlined ${res.statusCode === 'DONE' ? 'text-slate-300' : 'text-primary'}`}>arrow_right_alt</span> 
                                                        {res.to}
                                                    </h3>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">상태</p>
                                                    <span className={`${res.statusCode === 'DONE' ? 'text-slate-400' : 'text-primary'} font-bold flex items-center gap-1 text-sm`}>
                                                        <span className="material-symbols-outlined text-sm" style={{fontVariationSettings: "'FILL' 1"}}>{res.statusCode === 'DONE' ? 'history' : 'check_circle'}</span>
                                                        {res.statusCode === 'DONE' ? '운행 완료' : '예약 확정'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-6 border-t border-slate-50 text-left">
                                                <div className="text-left">
                                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">운행 일자</p>
                                                    <p className="text-on-surface font-semibold text-sm">{res.date}</p>
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">차량 정보</p>
                                                    <p className="text-on-surface font-semibold text-sm">{res.busCount}대 ({res.busType})</p>
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">총 예약 금액</p>
                                                    <p className="text-primary font-black text-sm">₩{Number(res.totalOfferPrice).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-8 flex gap-4 text-left">
                                            {res.statusCode !== 'DONE' ? (
                                                <>
                                                    <button className="bg-primary text-white px-8 py-3 rounded-full font-bold text-sm tracking-wide shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                                                        티켓 확인
                                                    </button>
                                                    <button className="border border-slate-200 text-slate-500 px-8 py-3 rounded-full font-bold text-sm tracking-wide hover:bg-slate-50 transition-all">
                                                        변경하기
                                                    </button>
                                                </>
                                            ) : (
                                                <button className="text-primary font-bold text-sm tracking-wide flex items-center gap-2 hover:underline">
                                                    <span className="material-symbols-outlined">receipt</span>
                                                    영수증 다운로드
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-white rounded-2xl p-16 flex flex-col items-center justify-center text-center space-y-6 border border-slate-100 shadow-sm">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                                <span className="material-symbols-outlined text-4xl">event_busy</span>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-slate-800">예약 내역이 없습니다</h3>
                                <p className="text-slate-400 text-sm font-medium">새로운 여정을 계획하고 예약을 시작해보세요.</p>
                            </div>
                            <button onClick={() => navigate('/customer-dashboard')} className="bg-primary text-white px-10 py-3 rounded-full font-bold text-sm shadow-lg shadow-primary/10 active:scale-95 transition-all">
                                대시보드로 돌아가기
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* BottomNavBar */}
            <BottomNavCustomer />
        </div>
    );
};

export default ReservationList;
