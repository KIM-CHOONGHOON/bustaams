import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import { notify } from '../utils/toast';
import BottomNavCustomer from '../components/BottomNavCustomer';


const EstimateRequestListCustomer = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const typeParam = queryParams.get('type') || 'progress';

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [profileImage, setProfileImage] = useState(null);
    const [imageVersion, setImageVersion] = useState(Date.now());

    const getStatusInfo = (type) => {
        switch(type) {
            case 'progress':
                return { 
                    title: '청약진행중', 
                    subtitle: '기사님의 청약 제안을 기다리는 중입니다',
                    icon: 'near_me',
                    color: 'text-teal-600',
                    bgColor: 'bg-teal-50',
                    chip: 'Estimating'
                };
            case 'customer_pay':
            case 'waiting':
                return { 
                    title: '이용대금 결제대기중', 
                    subtitle: '기사님의 청약을 승인하고 결제를 완료해주세요',
                    icon: 'payment',
                    color: 'text-amber-600',
                    bgColor: 'bg-amber-50',
                    chip: 'PayWaiting'
                };
            case 'driver_pay':
                return { 
                    title: '배차 확정 중 (기사 결제대기)', 
                    subtitle: '고객 결제 완료! 기사님이 플랫폼 이용대금을 결제하는 중입니다',
                    icon: 'directions_bus',
                    color: 'text-blue-600',
                    bgColor: 'bg-blue-50',
                    chip: 'DriverPay'
                };
            case 'final_approval':
                return { 
                    title: '고객 최종 승인대기', 
                    subtitle: '기사 결제가 완료되었습니다. 아래에서 최종 승인하여 예약을 확정해주세요!',
                    icon: 'verified',
                    color: 'text-emerald-600',
                    bgColor: 'bg-emerald-50',
                    chip: 'FinalApproval'
                };
            default:
                return { 
                    title: '청약 요청 관리', 
                    subtitle: '전체 청약 요청 내역입니다',
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
            'AUCTION': { label: '청약 진행중', color: 'bg-blue-50 text-blue-600 border-blue-100' },
            'CUSTOMER_PAY_WAIT': { label: '이용대금 결제대기', color: 'bg-amber-50 text-amber-700 border-amber-100' },
            'DRIVER_PAY_WAIT': { label: '배차 확정 중 (기사 결제대기)', color: 'bg-blue-50 text-blue-700 border-blue-100' },
            'FINAL_APPROVAL_WAIT': { label: '최종 승인대기', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
            'CONFIRM': { label: '예약 확정 완료', color: 'bg-teal-50 text-teal-600 border-teal-100' },
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

        const fetchProfile = async () => {
            try {
                const profileRes = await api.get('/app/customer/profile');
                if (profileRes.success && profileRes.data) {
                    setProfileImage(profileRes.data.profileImage || '');
                    setImageVersion(Date.now());
                }
            } catch (err) {
                console.error('Fetch profile error:', err);
            }
        };

        fetchRequests();
        fetchProfile();
    }, [typeParam]);

    const handleFinalApprove = async (reqUuid, title) => {
        const confirmed = await notify.confirm('최종 승인 확정', `'${title}' 청약 건의 기사 결제가 완료되었습니다. 최종 승인하고 예약을 확정하시겠습니까?`);
        if (!confirmed) return;

        try {
            const res = await api.post('/app/customer/final-approve', { reqId: reqUuid });
            if (res.success) {
                notify.success('최종 승인 완료', '예약이 성공적으로 확정되었습니다!');
                navigate('/reservation-list');
            } else {
                notify.error('오류', res.error || '승인 처리 중 오류가 발생했습니다.');
            }
        } catch (err) {
            console.error('Final approve error:', err);
            notify.error('오류 발생', '승인 처리 중 오류가 발생했습니다.');
        }
    };

    return (
        <div className="bg-[#F8FAFC] text-slate-800 min-h-screen pb-32 font-body">
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,104,95,0.04)] py-4">
                <div className="flex items-center justify-between px-6 max-w-7xl mx-auto w-full">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="text-teal-700 hover:bg-slate-100 transition-colors p-2 rounded-xl scale-95 active:scale-90 duration-200">
                            <span className="material-symbols-outlined text-2xl">arrow_back</span>
                        </button>
                        <h1 className="text-xl font-bold text-teal-900 tracking-tight">{typeParam === 'progress' ? '' : info.title}</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div 
                            className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors shadow-sm"
                            onClick={() => navigate('/profile-customer')}
                        >
                            {profileImage ? (
                                <img 
                                    alt="Profile" 
                                    src={profileImage.startsWith('http') ? 
                                        `${profileImage}${profileImage.includes('?') ? '&' : '?'}t=${imageVersion}` : 
                                        `${import.meta.env.VITE_API_BASE_URL || ''}${profileImage.startsWith('/') ? '' : '/'}${profileImage}${profileImage.includes('?') ? '&' : '?'}t=${imageVersion}`} 
                                    className="w-full h-full object-cover" 
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.style.display = 'none';
                                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                            ) : (
                                <span className="material-symbols-outlined text-slate-500 text-2xl">account_circle</span>
                            )}
                            {profileImage && (
                                <span className="material-symbols-outlined text-slate-500 text-2xl hidden items-center justify-center w-full h-full">account_circle</span>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 pt-16 pb-32">

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
                                className="group bg-white rounded-2xl p-8 shadow-[0_10px_40px_rgba(30,41,59,0.04)] border border-slate-100 hover:shadow-2xl hover:translate-y-[-4px] transition-all relative overflow-hidden"
                            >
                                <div className="space-y-4 mb-6">
                                    <div className="flex items-center justify-between gap-4">
                                        <h3 className="text-2xl font-black text-slate-800 line-clamp-1">{req.tripTitle}</h3>
                                        <div className={`px-3 py-1 rounded-xl text-[10px] font-black border shrink-0 ${getRequestStatus(req.status).color}`}>
                                            {getRequestStatus(req.status).label}
                                        </div>
                                    </div>
                                    
                                    {/* 운행 일정 */}
                                    <div className="flex items-start gap-2 mt-4 mb-6 text-left">
                                        <span className="material-symbols-outlined text-teal-600 text-base mt-0.5">event</span>
                                        <div className="text-sm font-semibold text-slate-500 tracking-wide space-y-1">
                                            <p>{req.startDt ? `${req.startDt.split(' ')[0].replace(/\./g, '-')} ${req.startDt.split(' ')[1] || ''}` : ''} ~</p>
                                            <p>{req.endDt ? `${req.endDt.split(' ')[0].replace(/\./g, '-')} ${req.endDt.split(' ')[1] || ''}` : ''}</p>
                                        </div>
                                    </div>

                                    {/* 운행 경로 세로 Bento 스타일 */}
                                    <div className="space-y-5 text-left py-2 mb-6">
                                        <div className="flex flex-col text-left">
                                            <p className="text-xs font-bold text-slate-400 mb-1">출발</p>
                                            <p className="font-black text-base text-slate-800">{req.startAddr}</p>
                                        </div>
                                        {req.roundAddr && (
                                            <div className="flex flex-col text-left">
                                                <p className="text-xs font-bold text-teal-600 mb-1">목적지</p>
                                                <p className="font-black text-base text-slate-800">{req.roundAddr}</p>
                                            </div>
                                        )}
                                        <div className="flex flex-col text-left">
                                            <p className="text-xs font-bold text-slate-400 mb-1">도착</p>
                                            <p className="font-black text-base text-slate-800">{req.endAddr}</p>
                                        </div>
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
                                                        'AUCTION': { label: '입찰 대기중', color: 'bg-slate-100 text-slate-400' },
                                                        'CUSTOMER_PAY_WAIT': { label: '고객 결제 대기', color: 'bg-orange-100 text-orange-700' },
                                                        'DRIVER_PAY_WAIT': { label: '기사 결제 대기', color: 'bg-purple-100 text-purple-700' },
                                                        'FINAL_APPROVAL_WAIT': { label: '최종 승인 대기', color: 'bg-amber-100 text-amber-700' },
                                                        'CANCEL_UNPENDING': { label: '미결제 자동취소', color: 'bg-rose-100 text-rose-700' },
                                                        'CONFIRM': { label: '예약 확정', color: 'bg-teal-100 text-teal-700' },
                                                        'DONE': { label: '운행 종료', color: 'bg-slate-100 text-slate-500' },
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
                                                            <div className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${statusInfo.color}`}>
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
                                    {typeParam === 'final_approval' ? (
                                        <button 
                                            onClick={() => handleFinalApprove(req.reqUuid, req.tripTitle)}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-black text-sm active:scale-95 transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-lg">verified</span>
                                            <span>최종 승인하기 (예약 확정)</span>
                                        </button>
                                    ) : typeParam === 'customer_pay' || typeParam === 'waiting' ? (
                                        <button 
                                            onClick={() => navigate(`/approval-list?reqId=${req.reqUuid}`)}
                                            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-4 rounded-xl font-black text-sm active:scale-95 transition-all shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-lg">payment</span>
                                            <span>이용대금 결제하기</span>
                                        </button>
                                    ) : typeParam === 'driver_pay' ? (
                                        <button 
                                            onClick={() => navigate(`/estimate-driver-pay-detail?reqId=${req.reqUuid}`)}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black text-sm active:scale-95 transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-lg">directions_bus</span>
                                            <span>배차 진행상황 확인</span>
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => navigate(`/estimate-list?reqId=${req.reqUuid}`)}
                                            className="flex-1 bg-teal-700 hover:bg-teal-800 text-white py-4 rounded-xl font-black text-sm active:scale-95 transition-all shadow-lg shadow-teal-900/20"
                                        >
                                            상세 청약 확인
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-6 shadow-sm border border-slate-100">
                        <div className={`w-20 h-20 ${info.bgColor} rounded-2xl flex items-center justify-center ${info.color}`}>
                            <span className="material-symbols-outlined text-4xl">{info.icon}</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800">해당 내역이 없습니다</h3>
                            <p className="text-slate-400 font-medium mt-1">새로운 청약을 요청하거나 다른 리스트를 확인해보세요.</p>
                        </div>
                        <button 
                            onClick={() => navigate('/request-bus')}
                            className="bg-teal-700 text-white px-8 py-3 rounded-xl font-black text-sm shadow-lg shadow-teal-900/20 btn-primary"
                        >
                            첫 청약 요청 등록하기
                        </button>
                    </div>
                )}
            </main>
            <BottomNavCustomer />
        </div>
    );
};

export default EstimateRequestListCustomer;
