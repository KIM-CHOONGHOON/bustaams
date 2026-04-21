import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';

const EstimateRequestListCustomer = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const typeParam = queryParams.get('type') || 'progress';

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    const getStatusInfo = (type) => {
        switch(type) {
            case 'progress':
                return { 
                    title: '견적진행중 리스트', 
                    subtitle: '기사님의 견적 제안을 기다리는 중입니다',
                    icon: 'near_me',
                    color: 'text-teal-600',
                    bgColor: 'bg-teal-50',
                    chip: 'Estimating'
                };
            case 'waiting':
                return { 
                    title: '승인대기중 리스트', 
                    subtitle: '도착한 견적 중 마음에 드는 차량을 선택해주세요',
                    icon: 'pending_actions',
                    color: 'text-orange-600',
                    bgColor: 'bg-orange-50',
                    chip: 'Waiting'
                };
            default:
                return { 
                    title: '견적 요청 관리', 
                    subtitle: '전체 요청 내역입니다',
                    icon: 'list_alt',
                    color: 'text-slate-600',
                    bgColor: 'bg-slate-50',
                    chip: 'All'
                };
        }
    };

    const info = getStatusInfo(typeParam);

    useEffect(() => {
        const fetchRequests = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/app/customer/pending-requests?type=${typeParam}`);
                if (res.data.success) {
                    setRequests(res.data.data);
                }
            } catch (err) {
                console.error('Failed to fetch requests:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchRequests();
    }, [typeParam]);

    return (
        <div className="bg-[#F8FAFC] text-slate-800 min-h-screen pb-32 font-body">
            {/* Top Bar */}
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 h-16 flex items-center px-6">
                <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-100 transition-colors mr-3">
                    <span className="material-symbols-outlined text-slate-600">arrow_back</span>
                </button>
                <h1 className="text-lg font-black tracking-tight">{info.title}</h1>
            </header>

            <main className="pt-24 px-6 max-w-4xl mx-auto">
                {/* Header Section */}
                <section className="mb-8 space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white shadow-sm border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span className={`w-2 h-2 rounded-full ${typeParam === 'progress' ? 'bg-teal-500' : 'bg-orange-500'}`}></span>
                        {info.chip}
                    </div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900">{info.title}</h2>
                    <p className="text-slate-500 font-medium">{info.subtitle}</p>
                </section>

                {/* List Section */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-slate-400 font-bold">목록을 불러오는 중...</p>
                    </div>
                ) : requests.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6">
                        {requests.map((req) => (
                            <div 
                                key={req.reqUuid}
                                className="group bg-white rounded-[2.5rem] p-8 shadow-[0_10px_40px_rgba(30,41,59,0.04)] border border-slate-100 hover:shadow-2xl hover:translate-y-[-4px] transition-all relative overflow-hidden"
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className="space-y-4 flex-1">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-teal-600 text-sm">event</span>
                                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{req.startDt}</p>
                                            </div>
                                            <h3 className="text-2xl font-black text-slate-800 line-clamp-1 mt-1">{req.TRIP_TITLE}</h3>
                                        </div>
                                        
                                        <div className="flex items-center gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                                            <div className="flex-1 space-y-1">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">출발지</p>
                                                <p className="font-bold text-sm text-slate-700 line-clamp-1">{req.START_ADDR}</p>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                                                <span className="material-symbols-outlined text-slate-300 text-lg">arrow_forward</span>
                                            </div>
                                            <div className="flex-1 space-y-1 text-right">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">도착지</p>
                                                <p className="font-bold text-sm text-slate-700 line-clamp-1">{req.END_ADDR}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Vehicle & Matching Section (User Request Focus) */}
                                <div className="space-y-3 mt-8">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="h-px flex-1 bg-slate-100"></div>
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Vehicle Status</span>
                                        <div className="h-px flex-1 bg-slate-100"></div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 gap-3">
                                        {req.buses && req.buses.map((bus, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-slate-100 group-hover:bg-white transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bus.driverName ? 'bg-orange-50 text-orange-600' : 'bg-teal-50 text-teal-600'}`}>
                                                        <span className="material-symbols-outlined">directions_bus</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-slate-800">{bus.busType}</p>
                                                        {bus.driverName ? (
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <span className="text-[11px] font-bold text-slate-500">기사: {bus.driverName}</span>
                                                                <span className="text-[10px] text-slate-300">|</span>
                                                                <span className="text-[11px] font-bold text-slate-400">{bus.busNo}</span>
                                                            </div>
                                                        ) : (
                                                            <p className="text-[11px] font-bold text-teal-600/70 mt-0.5">견적 대기중...</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${bus.driverName ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-400'}`}>
                                                    {bus.driverName ? 'MATCHED' : 'WAITING'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-8 flex gap-3">
                                    <button 
                                        onClick={() => navigate(`/estimate-list?reqId=${req.reqUuid}`)}
                                        className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-sm hover:bg-slate-800 active:scale-95 transition-all shadow-lg shadow-slate-200"
                                    >
                                        상세 견적 확인
                                    </button>
                                    <button 
                                        className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all"
                                    >
                                        <span className="material-symbols-outlined">more_horiz</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center space-y-6 shadow-sm border border-slate-100">
                        <div className={`w-20 h-20 ${info.bgColor} rounded-full flex items-center justify-center ${info.color}`}>
                            <span className="material-symbols-outlined text-4xl">{info.icon}</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800">해당 내역이 없습니다</h3>
                            <p className="text-slate-400 font-medium mt-1">새로운 견적을 요청하거나 다른 리스트를 확인해보세요.</p>
                        </div>
                        <button 
                            onClick={() => navigate('/request-bus')}
                            className="bg-teal-700 text-white px-8 py-3 rounded-xl font-black text-sm shadow-lg shadow-teal-900/20"
                        >
                            첫 견적 요청 등록하기
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default EstimateRequestListCustomer;
