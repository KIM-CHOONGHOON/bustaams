import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import BottomNavCustomer from '../components/BottomNavCustomer';


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
                    title: '견적진행중', 
                    subtitle: '기사님의 견적 제안을 기다리는 중입니다',
                    icon: 'near_me',
                    color: 'text-teal-600',
                    bgColor: 'bg-teal-50',
                    chip: 'Estimating'
                };
            case 'waiting':
                return { 
                    title: '승인대기중', 
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

    const getRequestStatus = (status) => {
        const config = {
            'AUCTION': { label: '견적대기중..', color: 'bg-blue-50 text-blue-600 border-blue-100' },
            'BIDDING': { label: '승인대기중..', color: 'bg-orange-50 text-orange-600 border-orange-100' },
            'CONFIRM': { label: '예약 확정..', color: 'bg-teal-50 text-teal-600 border-teal-100' },
            'DONE': { label: '운행 종료..', color: 'bg-slate-50 text-slate-500 border-slate-100' },
            'TRAVELER_CANCEL': { label: '여행자 버스 예약 전체 취소', color: 'bg-red-50 text-red-600 border-red-100' },
            'DRIVER_CANCEL': { label: '버스 기사 응찰 취소', color: 'bg-red-50 text-red-600 border-red-100' },
            'BUS_CHANGE': { label: '여행자 버스 변경 요청', color: 'bg-purple-50 text-purple-600 border-purple-100' },
            'BUS_CANCEL': { label: '여행자 버스 취소(버스 대수 감소)', color: 'bg-gray-50 text-gray-500 border-gray-100' },
            'OTHER': { label: '기타', color: 'bg-slate-50 text-slate-500 border-slate-100' }
        };
        return config[status] || { label: status, color: 'bg-slate-50 text-slate-500 border-slate-100' };
    };

    useEffect(() => {
        const fetchRequests = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/app/customer/pending-requests?type=${typeParam}`);
                if (res.success) {
                    setRequests(res.data);
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
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-teal-600 text-sm">event</span>
                                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{req.startDt}</p>
                                                </div>
                                                <div className={`px-3 py-1 rounded-full text-[10px] font-black border ${getRequestStatus(req.status).color}`}>
                                                    {getRequestStatus(req.status).label}
                                                </div>
                                            </div>
                                            <h3 className="text-2xl font-black text-slate-800 line-clamp-1 mt-1">{req.tripTitle}</h3>
                                        </div>
                                        
                                        {/* Helper for address formatting */}
                                        {(() => {
                                            const formatAddr = (addr) => {
                                                if (!addr) return '';
                                                const parts = addr.split(' ');
                                                // '서울시 강남구' (2단어)
                                                // '경기도 성남시 분당구' (3단어)
                                                // 3번째 단어가 '구'나 '군'으로 끝나면 3단어까지 표시, 아니면 2단어 표시
                                                if (parts.length >= 3 && (parts[2].endsWith('구') || parts[2].endsWith('군'))) {
                                                    return parts.slice(0, 3).join(' ');
                                                }
                                                return parts.slice(0, 2).join(' ');
                                            };

                                            return (
                                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100/50 space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">출발</p>
                                                            <p className="font-bold text-xs text-slate-700">{formatAddr(req.startAddr)}</p>
                                                        </div>
                                                        <div className="px-4 text-slate-200">
                                                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                                        </div>
                                                        {req.roundAddr ? (
                                                            <>
                                                                <div className="flex-1 text-center">
                                                                    <p className="text-[8px] font-black text-teal-500 uppercase tracking-tighter mb-0.5">회차</p>
                                                                    <p className="font-bold text-xs text-slate-700">{formatAddr(req.roundAddr)}</p>
                                                                </div>
                                                                <div className="px-4 text-slate-200">
                                                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                                                </div>
                                                            </>
                                                        ) : null}
                                                        <div className="flex-1 text-right">
                                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">도착</p>
                                                            <p className="font-bold text-xs text-slate-700">{formatAddr(req.endAddr)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* Vehicle & Matching Section */}
                                <div className="space-y-3 mt-8">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="h-px flex-1 bg-slate-100"></div>
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">요청 차량 현황</span>
                                        <div className="h-px flex-1 bg-slate-100"></div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 gap-3">
                                        {req.buses && req.buses.length > 0 ? (
                                            req.buses.map((bus, idx) => {
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
                                                const statusInfo = getBusStatusDisplay(bus.busStatus);

                                                return (
                                                    <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-slate-100 group-hover:bg-white transition-all">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bus.driverName ? 'bg-orange-50 text-orange-600' : 'bg-teal-50 text-teal-600'}`}>
                                                                <span className="material-symbols-outlined">directions_bus</span>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black text-slate-800">{bus.busType}</p>
                                                                <div className="flex flex-col gap-0.5 mt-0.5">
                                                                    {bus.driverName && (
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="text-[11px] font-bold text-slate-500">기사: {bus.driverName}</span>
                                                                            {bus.busNo && (
                                                                                <>
                                                                                    <span className="text-[10px] text-slate-300">|</span>
                                                                                    <span className="text-[11px] font-bold text-slate-400">{bus.busNo}</span>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    <p className={`text-[10px] font-bold ${bus.busStatus === 'AUCTION' ? 'text-teal-600/70' : 'text-slate-400'}`}>
                                                                        {statusInfo.label}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1">
                                                            <p className="text-sm font-black text-slate-900">
                                                                {bus.reqAmt ? `${Number(bus.reqAmt).toLocaleString()}원` : '금액 미정'}
                                                            </p>
                                                            <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${statusInfo.color}`}>
                                                                {statusInfo.label.replace(/\./g, '')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <p className="text-center text-xs text-slate-400 py-2">등록된 차량 정보가 없습니다.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-8 flex gap-3">
                                    <button 
                                        onClick={() => navigate(`/${typeParam === 'waiting' ? 'approval-list' : 'estimate-list'}?reqId=${req.reqUuid}`)}
                                        className={`flex-1 ${typeParam === 'waiting' ? 'bg-orange-600' : 'bg-teal-700'} text-white py-4 rounded-2xl font-black text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg`}
                                    >
                                        {typeParam === 'waiting' ? '승인 처리하기' : '상세 견적 확인'}
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
            <BottomNavCustomer />
        </div>
    );
};

export default EstimateRequestListCustomer;
