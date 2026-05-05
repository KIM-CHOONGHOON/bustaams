import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNavCustomer from '../components/BottomNavCustomer';
import api from '../api';

const PastTripListCustomer = () => {
    const navigate = useNavigate();
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTrips = async () => {
            try {
                const response = await api.get('/app/customer/completed-missions');
                if (response.success) {
                    setTrips(response.data);
                }
            } catch (error) {
                console.error('Fetch completed missions error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTrips();
    }, []);

    return (
        <div className="bg-background text-on-surface min-h-screen font-body text-left">
            {/* TopAppBar */}
            <header className="bg-white/60 backdrop-blur-3xl sticky top-0 z-40 border-b border-white/50">
                <div className="flex justify-between items-center w-full px-6 py-5 max-w-7xl mx-auto">
                    <div className="flex items-center gap-5">
                        <button onClick={() => navigate(-1)} className="material-symbols-outlined text-teal-800 hover:bg-teal-50 p-2 rounded-full transition-all">arrow_back</button>
                        <h1 className="font-headline font-black tracking-tighter text-3xl text-teal-900 border-l-4 border-primary pl-4 leading-none italic">busTaams</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-10 pb-40">
                {/* Editorial Header */}
                <div className="mb-16 animate-in fade-in slide-in-from-bottom duration-1000">
                    <p className="font-headline font-black text-secondary uppercase tracking-[0.5em] text-[10px] mb-6">Contract History</p>
                    <h2 className="font-headline font-black text-5xl md:text-[70px] text-primary leading-[0.9] tracking-tighter max-w-4xl">
                        나의 과거 운행 이력<span className="text-secondary">.</span>
                    </h2>
                    <div className="h-2 w-32 bg-gradient-to-r from-secondary to-orange-200 mt-10 rounded-full shadow-lg shadow-secondary/20"></div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-30">
                        <span className="material-symbols-outlined text-6xl animate-spin">progress_activity</span>
                        <p className="mt-4 font-bold">이력을 불러오고 있습니다...</p>
                    </div>
                ) : trips.length === 0 ? (
                    <div className="bg-white rounded-[3rem] p-20 text-center shadow-xl border border-white">
                        <span className="material-symbols-outlined text-8xl text-slate-100 mb-6">history</span>
                        <h3 className="text-2xl font-black text-slate-300">완료된 운행 이력이 없습니다.</h3>
                        <p className="text-slate-400 mt-2">새로운 여정을 시작해보세요!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-8">
                        {trips.map((trip, idx) => (
                            <div 
                                key={trip.id} 
                                onClick={() => navigate(`/order-detail/${trip.id}`)}
                                className={`group grid grid-cols-1 lg:grid-cols-12 bg-white rounded-[3rem] shadow-2xl shadow-teal-900/[0.03] overflow-hidden transition-all duration-700 hover:translate-y-[-12px] hover:shadow-teal-900/10 cursor-pointer border border-white relative ${idx % 2 === 1 ? 'bg-slate-50/50' : ''}`}
                            >
                                <div className={`lg:col-span-1 w-2 bg-primary opacity-20 group-hover:opacity-100 transition-opacity`}></div>
                                <div className="lg:col-span-11 p-8 md:p-12 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[11px] font-black text-secondary bg-secondary/10 px-3 py-1 rounded-full uppercase tracking-wider">{trip.date}</span>
                                            <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">ID: {trip.id}</span>
                                        </div>
                                        <h3 className="font-headline font-black text-3xl text-primary tracking-tight group-hover:text-secondary transition-colors">{trip.title}</h3>
                                        <div className="flex items-start gap-3 text-on-surface-variant font-bold opacity-60">
                                            <span className="material-symbols-outlined text-xl mt-1">route</span>
                                            <span className="text-lg tracking-tight leading-tight">{trip.route}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-10">
                                        <div className="flex items-center gap-4 bg-slate-50 px-6 py-3 rounded-3xl border border-slate-100">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-200 overflow-hidden flex items-center justify-center text-slate-400">
                                                {trip.driverImage ? (
                                                    <img 
                                                        alt="Captain" 
                                                        src={`${import.meta.env.VITE_API_BASE_URL || ''}${trip.driverImage}`} 
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="material-symbols-outlined">person</span>
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Captain</span>
                                                <span className="font-black text-on-surface tracking-tight">{trip.driverName}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Final Price</span>
                                            <span className="text-3xl font-black text-primary tracking-tighter">₩{Number(trip.price || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="bg-primary text-white w-14 h-14 rounded-full flex items-center justify-center shadow-2xl shadow-primary/40 group-hover:rotate-45 transition-transform duration-500">
                                            <span className="material-symbols-outlined text-2xl">arrow_forward_ios</span>
                                        </div>
                                    </div>
                                </div>
                                {/* Decorative Background Element */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50 rounded-full -mr-32 -mt-32 opacity-0 group-hover:opacity-40 transition-opacity blur-3xl"></div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer Insight */}
                <div className="mt-20 pt-12 border-t border-slate-50 flex flex-col items-center text-center space-y-4 opacity-40">
                    <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[10px]">End of History</p>
                    <div className="w-1 h-12 bg-gradient-to-b from-slate-200 to-transparent"></div>
                </div>
            </main>

            {/* Premium Bottom Nav */}
            <BottomNavCustomer />
        </div>
    );
};

export default PastTripListCustomer;
