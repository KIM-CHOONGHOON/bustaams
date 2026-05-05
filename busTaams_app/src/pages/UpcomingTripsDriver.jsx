import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import BottomNavDriver from '../components/BottomNavDriver';

const UpcomingTripsDriver = () => {
    const navigate = useNavigate();
    const [upcomingTrips, setUpcomingTrips] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTrips = async () => {
            setLoading(true);
            try {
                const res = await api.get('/app/driver/upcoming-trips');
                if (res.success) {
                    setUpcomingTrips(res.data);
                }
            } catch (err) {
                console.error('Fetch upcoming trips error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchTrips();
    }, []);

    return (
        <div className="bg-background text-on-surface min-h-[100dvh] pb-48 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/40 backdrop-blur-3xl border-b border-white/20 py-6">
                <div className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto">
                    <div className="flex items-center gap-6 text-left">
                        <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl text-teal-800 shadow-xl shadow-teal-900/5 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                        </button>
                        <h1 className="font-headline font-black tracking-tighter text-3xl text-teal-900 italic uppercase">busTaams</h1>
                    </div>
                    <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-2xl rotate-3">
                        <img alt="User profile" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCsf1fTFUXZEBkAapjlINnKsBJh4aLCVH588hSiZiY38jIs7xt060L40FPWV_8W9s0nyFSYUgEDeUgfTBkNsQH4LaXw0yyZRXGoqbkuvj4whXqLdwIrotpKKjUml3-_jqjhyWXJDlpYBIIwT2IlqA3oQwxvsm4VA0BMtDuh4FPEgEhmv137JUrMBRthn0z4kfT2DnWW4Ukc4o_cqKte86848uR9jxB0mOdx42GBE-F0zikuQU7AZRT91g7cMoAkaPWiB-UroEeBb9A" />
                    </div>
                </div>
            </header>

            <main className="pt-48 px-6 max-w-7xl mx-auto space-y-20 animate-in fade-in slide-in-from-bottom duration-1000 text-left">
                {/* Editorial Header Section */}
                <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end text-left">
                    <div className="md:col-span-7 space-y-6 text-left">
                        <span className="text-secondary font-black tracking-[0.4em] uppercase text-[10px] block px-2 italic">운행 정보 관리</span>
                        <h2 className="font-headline text-6xl md:text-8xl font-black text-primary leading-[0.85] tracking-tighter italic uppercase text-left">
                            예정된 <br/><span className="text-secondary">운행 일정</span>
                        </h2>
                    </div>
                    <div className="md:col-span-5 md:pl-12 text-left border-l-4 border-slate-50">
                        <p className="text-slate-400 text-lg font-bold italic tracking-tight leading-relaxed text-left">
                            확정된 향후 운행 일정을 확인하고 관리하세요. 각 계약의 상세 정보와 배차팀 프로토콜을 제공합니다.
                        </p>
                    </div>
                </section>

                <nav className="flex gap-10 border-b-4 border-slate-50 pb-4 text-left">
                    <button className="text-primary font-black text-sm uppercase tracking-[0.3em] italic border-b-8 border-primary pb-4">
                        확정된 배차 ({upcomingTrips.length})
                    </button>
                </nav>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <span className="material-symbols-outlined text-4xl text-primary animate-spin mb-4">progress_activity</span>
                        <p className="text-gray-400 font-medium">운행 일정을 불러오는 중입니다...</p>
                    </div>
                ) : upcomingTrips.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 text-left">
                        {upcomingTrips.map((trip, idx) => {
                            const isFeatured = idx === 0;
                            return (
                                <div key={trip.id} className={`${isFeatured ? 'lg:col-span-2' : 'col-span-1'} group bg-white rounded-[3.5rem] p-10 relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-teal-900/5 hover:-translate-y-2 text-left`}>
                                    {isFeatured && <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-secondary"></div>}
                                    
                                    <div className="flex flex-col md:flex-row gap-10 text-left">
                                        <div className="flex-1 space-y-8 text-left">
                                            <div className="flex items-center justify-between text-left">
                                                <div className="flex items-center gap-4 text-left">
                                                    {isFeatured && <span className="flex h-3 w-3 rounded-full bg-secondary animate-pulse"></span>}
                                                    <span className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest ${isFeatured ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'}`}>
                                                        {isFeatured ? '다음 운행 예정' : '확정됨'}
                                                    </span>
                                                </div>
                                                {!isFeatured && <span className="material-symbols-outlined text-slate-200">more_vert</span>}
                                            </div>

                                            <div className="space-y-2 text-left">
                                                <h3 className="font-headline text-3xl font-black text-primary italic uppercase tracking-tighter text-left line-clamp-1">{trip.title || '여정 제목 없음'}</h3>
                                                <p className="text-slate-400 font-bold italic text-lg leading-tight uppercase tracking-widest line-clamp-1">{trip.route || '정보 없음'}</p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-6 text-left">
                                                <div className="bg-slate-50 p-6 rounded-[2rem] text-left">
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-300 mb-2 italic">운행 일정</p>
                                                    <p className="font-black text-primary text-sm italic">{trip.period || trip.startDate + ' ~ ' + trip.endDate}</p>
                                                </div>
                                                <div className="bg-slate-50 p-6 rounded-[2rem] text-left">
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-300 mb-2 italic">계약 금액</p>
                                                    <p className="font-black text-primary text-sm italic">₩{Number(trip.price).toLocaleString()}</p>
                                                </div>
                                            </div>

                                            <div className="text-left py-2">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-300 mb-2 italic">차량 모델</p>
                                                <p className="font-black text-primary text-lg italic leading-none underline decoration-primary/10 underline-offset-4">{trip.model || '기본 차량'}</p>
                                            </div>

                                            <button 
                                                onClick={() => navigate(`/upcoming-trip-detail-driver/${trip.id}`)} 
                                                className="w-full py-6 rounded-[2rem] bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.3em] hover:bg-primary transition-all active:scale-95 shadow-2xl shadow-slate-900/30 italic"
                                            >
                                                상세 내역 보기
                                            </button>
                                        </div>

                                        {isFeatured && (
                                            <div className="w-full md:w-80 h-auto min-h-[300px] rounded-[3rem] overflow-hidden shadow-2xl relative group-hover:scale-[1.02] transition-transform duration-700">
                                                <img alt={trip.title} className="w-full h-full object-cover" src={trip.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDZmRZL_HsaOszSmVrtuGwUBYyk6tx-rD4Vk4Dasgb37vYAbbZuWacuLUPqrpB9BVhKLuUw-tF2Etkrkt-rZ4xwhT9ZgE3DjgEoksHVJIAaAcDdV-b-rsVtEvcVtKK2EmfqAmsfSSz-jkrLECuP2Pl1W98npMSrPEjigDVHPy5EauRaAGFpUNKJwbmlxIhbJXkrmDZf4k95TECEDbq8ljjlCzWMxf9L9qkUPJwW0evuxafMlIu1mxVH0QFXZ0fXd6sgXKIvpbZIdOo'} />
                                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white rounded-[3.5rem] p-24 text-center border-2 border-dashed border-slate-100 shadow-inner">
                        <div className="w-24 h-24 bg-slate-50 rounded-full mx-auto flex items-center justify-center mb-8">
                            <span className="material-symbols-outlined text-5xl text-slate-200">event_busy</span>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-3xl font-black text-primary italic uppercase tracking-tighter">예정된 운행이 없습니다.</h3>
                            <p className="text-slate-400 font-bold italic text-lg">새로운 운행 계약을 맺어보세요.</p>
                            <button 
                                onClick={() => navigate('/estimate-list-driver')}
                                className="mt-8 bg-primary text-white px-12 py-5 rounded-full font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                            >
                                경매 보러가기
                            </button>
                        </div>
                    </div>
                )}
            </main>

            <BottomNavDriver activeTab="trips" />
        </div>
    );
};

export default UpcomingTripsDriver;

