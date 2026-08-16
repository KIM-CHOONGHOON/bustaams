import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import BottomNavCustomer from '../components/BottomNavCustomer';

const PastTripDetailCustomer = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profileImage, setProfileImage] = useState(null);
    const [imageVersion, setImageVersion] = useState(Date.now());

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await api.get('/app/customer/profile');
                if (response.success && response.data) {
                    setProfileImage(response.data.profileImage);
                }
            } catch (error) {
                console.error('Fetch profile error:', error);
            }
        };
        fetchProfile();
    }, []);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const response = await api.get(`/app/customer/completed-mission-detail/${id}`);
                if (response.success) {
                    setDetail(response.data);
                }
            } catch (error) {
                console.error('Fetch mission detail error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDetail();
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background opacity-30">
                <span className="material-symbols-outlined text-6xl animate-spin text-primary">progress_activity</span>
                <p className="mt-4 font-bold text-teal-900">상세 내역을 불러오고 있습니다...</p>
            </div>
        );
    }

    if (!detail) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
                <span className="material-symbols-outlined text-primary text-6xl mb-4">error</span>
                <h1 className="text-2xl font-black text-teal-900 mb-2">상세 내역을 찾을 수 없습니다.</h1>
                <button onClick={() => navigate(-1)} className="mt-8 bg-primary text-white font-black py-4 px-10 rounded-full shadow-lg">돌아가기</button>
            </div>
        );
    }

    // 여행 필터링 로직 (출발 -> 출발경유지 -> 목적지 -> 도착경유지 -> 도착지)
    const startNode = { type: 'START', addr: detail.startAddr, time: detail.startDt };
    
    // 경유지들을 순서대로 분류 (한글 주석)
    const waypoints = detail.waypoints || [];
    
    // 갈 때 경유지 (START_WAY)
    const viaBeforeRound = waypoints.filter(w => w.type === 'START_WAY');
    // 목적지 (ROUND_TRIP)
    const roundNode = waypoints.find(w => w.type === 'ROUND_TRIP');
    // 올 때 경유지 (END_WAY)
    const viaAfterRound = waypoints.filter(w => w.type === 'END_WAY');
    
    // 도착지 (END_NODE)
    const endNode = { type: 'END', addr: waypoints.find(w => w.type === 'END_NODE')?.addr || detail.endAddrMaster, time: detail.endDt };

    // 한글 주석: 각 노드 데이터를 통합하여 순차적으로 렌더링하기 위한 routeData 배열 구성
    const routeData = [];
    routeData.push({
        type: 'START',
        title: '출발지',
        addr: detail.startAddr,
        time: `출발일시 ${detail.startDt}`
    });

    viaBeforeRound.forEach((via) => {
        routeData.push({
            type: 'WAYPOINT',
            title: '경유지 (갈 때)',
            addr: via.addr,
            time: via.time
        });
    });

    if (roundNode) {
        routeData.push({
            type: 'DEST',
            title: '목적지',
            addr: roundNode.addr,
            time: roundNode.time
        });
    }

    viaAfterRound.forEach((via) => {
        routeData.push({
            type: 'WAYPOINT',
            title: '경유지 (올 때)',
            addr: via.addr,
            time: via.time
        });
    });

    routeData.push({
        type: 'END',
        title: '도착지',
        addr: endNode.addr,
        time: `도착일시 ${detail.endDt}`
    });

    // 결제 총액 (데이터가 없을 경우 0으로 처리)
    const totalPrice = Number(detail.price || 0);

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-32">
            <header className="fixed top-0 w-full z-50 bg-white border-b border-slate-100 shadow-sm">
                <div className="flex items-center justify-between px-6 h-16 w-full max-w-4xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="material-symbols-outlined text-teal-700 hover:bg-slate-50 p-2 rounded-xl transition-all">arrow_back</button>
                        <h1 className="font-bold text-[17px] text-[#1E293B]">여행 상세</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div 
                            className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100 cursor-pointer transition-transform active:scale-95"
                            onClick={() => navigate('/profile-customer')}
                        >
                            {profileImage ? (
                                <img 
                                    alt="Customer Profile" 
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
                                <span className="material-symbols-outlined text-slate-400 text-2xl">account_circle</span>
                            )}
                            {profileImage && (
                                <span className="material-symbols-outlined text-slate-400 text-2xl hidden items-center justify-center w-full h-full">account_circle</span>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 pt-24 space-y-12">
                {/* 제목 표시 */}
                <section className="px-2 space-y-2">
                    <h2 className="text-[24px] font-black text-[#1E293B] tracking-tight leading-tight">
                        {detail.title}
                    </h2>
                </section>

                {/* Section 1: 요청정보 요약 */}
                <section className="space-y-6">
                    <div className="flex justify-end items-center px-2">
                        <span className="px-4 py-1.5 rounded-xl bg-[#E2E8F0] text-[#64748B] text-[11px] font-black uppercase tracking-wider">여행 완료</span>
                    </div>
                    
                    {/* 한글 주석: ReservationDetailCustomer 스타일을 적용한 타임라인 카드 */}
                    <div className="bg-white rounded-[3.5rem] p-12 shadow-2xl shadow-teal-900/[0.03] border border-slate-50 text-left space-y-10">
                        {/* 운행 일정 */}
                        <div className="flex items-center gap-4 border-b border-slate-100 pb-8 text-left">
                            <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shadow-sm">
                                <span className="material-symbols-outlined text-orange-600 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_today</span>
                            </div>
                            <div className="flex flex-col text-left">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic mb-1">
                                    운행 일정
                                </p>
                                <p className="text-lg font-black text-[#1E293B] leading-snug">
                                    {detail.startDt ? `${detail.startDt.split(' ')[0].replace(/[-/]/g, '.')} ${detail.startDt.split(' ')[1] || ''} -` : ''}
                                </p>
                                <p className="text-lg font-black text-[#1E293B] leading-snug">
                                    {detail.endDt ? `${detail.endDt.split(' ')[0].replace(/[-/]/g, '.')} ${detail.endDt.split(' ')[1] || ''}` : ''}
                                </p>
                            </div>
                        </div>

                        {/* 전체 운행 경로 */}
                        <div className="space-y-8">
                            <h2 className="text-2xl font-black pb-4 border-b border-slate-50 flex items-center gap-3 italic text-teal-700">
                                <span className="material-symbols-outlined text-primary" style={{fontVariationSettings: "'FILL' 1"}}>route</span>
                                여행 경로
                            </h2>
                            <div className="mt-8 space-y-10 relative">
                            <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-100"></div>
                            {routeData.map((point, idx) => {
                                const isRoundTrip = point.type === 'ROUND_TRIP' || point.type === 'DEST';
                                return (
                                    <div key={idx} className="relative pl-12">
                                        <div className={`absolute left-0 top-1.5 w-8 h-8 rounded-full border-4 border-white shadow-md z-10 flex items-center justify-center ${
                                            point.type === 'START' ? 'bg-teal-600 text-white shadow-teal-200' : 
                                            point.type === 'END' ? 'bg-rose-500 text-white shadow-rose-200' : 
                                            isRoundTrip ? 'bg-indigo-600 text-white shadow-indigo-100' :
                                            'bg-amber-400 text-white shadow-amber-100'
                                        }`}>
                                            <span className="material-symbols-outlined text-[16px] font-black">
                                                {point.type === 'START' ? 'location_on' : 
                                                 point.type === 'END' ? 'flag' : 
                                                 isRoundTrip ? 'near_me' : 'more_horiz'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col text-left">
                                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                                                point.type === 'START' ? 'text-teal-600' : 
                                                point.type === 'END' ? 'text-rose-500' : 
                                                isRoundTrip ? 'text-indigo-500' : 'text-amber-500'
                                            }`}>
                                                {point.title}
                                            </p>
                                            <h4 className="text-lg font-black tracking-tight text-on-surface text-left">
                                                {point.addr}
                                            </h4>
                                            {point.time && (
                                                <p className="text-xs text-slate-400 font-bold mt-1 opacity-70 italic text-left">
                                                    {point.time}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

                {/* Section 2: 배차 및 운전자 정보 */}
                <section className="space-y-6">
                    <h2 className="text-xl font-black text-[#1E293B] tracking-tight px-2">배차 및 운전자 정보</h2>
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-5">
                                <div className="relative">
                                    {detail.driverImage ? (
                                        <img alt="Captain" className="w-20 h-20 rounded-xl object-cover" src={`${import.meta.env.VITE_API_BASE_URL || ''}${detail.driverImage}`} />
                                    ) : (
                                        <div className="w-20 h-20 rounded-xl bg-[#F1F5F9] flex items-center justify-center text-[#94A3B8]">
                                            <span className="material-symbols-outlined text-[40px]">person</span>
                                        </div>
                                    )}
                                    <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-lg shadow-sm border border-slate-50">
                                        <span className="material-symbols-outlined text-[#0F766E] text-[16px]" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-[#0F766E] mb-0.5">{detail.busModel}</p>
                                    <h3 className="text-[20px] font-black text-[#1E293B] tracking-tight">{detail.driverName} 기사님</h3>
                                    <p className="text-[13px] text-[#94A3B8] font-bold">{detail.busNo}</p>
                                </div>
                            </div>
                            <span className="px-3 py-1 bg-[#F8FAFB] text-[#94A3B8] text-[9px] font-black rounded-xl uppercase tracking-widest border border-slate-50">Vehicle 01</span>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <button onClick={() => navigate(`/chat-room/${detail.id}`)} className="w-full py-4 rounded-xl bg-slate-100 text-slate-700 font-black text-[14px] flex items-center justify-center gap-3 transition-all hover:bg-slate-200 active:scale-[0.98]">
                                <span className="material-symbols-outlined text-[20px]">chat_bubble</span>
                                실시간 채팅 조회
                            </button>
                            {detail.isReviewed > 0 ? (
                                <button onClick={() => navigate(`/review-detail/${detail.id}`)} className="w-full py-4 rounded-xl border border-slate-200 text-slate-700 font-black text-[14px] flex items-center justify-center gap-3 transition-all hover:bg-slate-50 active:scale-[0.98]">
                                    <span className="material-symbols-outlined text-[18px] text-[#F97316]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                                    평점 조회 ({detail.rating || '4.9'})
                                </button>
                            ) : (
                                <button onClick={() => navigate(`/add-review/${detail.id}`)} className="w-full py-4 rounded-xl bg-[#0D6B5E] text-white font-black text-[14px] flex items-center justify-center gap-3 shadow-lg shadow-teal-900/10 transition-all hover:bg-teal-800 active:scale-[0.98]">
                                    <span className="material-symbols-outlined text-[18px]">edit_note</span>
                                    평점/감사글 작성
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                {/* Section 3: 결제 내역 상세 */}
                <section className="space-y-6">
                    <h2 className="text-xl font-black text-[#1E293B] tracking-tight px-2">결제 내역 상세</h2>
                    <div className="bg-white rounded-2xl p-10 shadow-sm border border-slate-100 space-y-8">
                        <div className="flex justify-between items-center py-2">
                            <span className="text-[16px] font-black text-[#1E293B]">청약 요청 금액</span>
                            <span className="text-[20px] font-black text-[#1E293B]">₩ {totalPrice.toLocaleString()}</span>
                        </div>

                        <div className="bg-[#0D6B5E] p-8 rounded-2xl shadow-xl shadow-teal-900/10 flex items-center justify-between text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                            <div className="flex items-baseline gap-3">
                                <span className="text-[16px] font-black opacity-90">결제 완료</span>
                                <span className="text-[24px] font-black tracking-tighter">
                                    ₩ {totalPrice.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>

                </section>
            </main>

            <BottomNavCustomer />
        </div>
    );
};

export default PastTripDetailCustomer;
