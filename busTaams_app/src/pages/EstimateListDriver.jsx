import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDriverProfile, request } from '../api';
import BottomNavDriver from '../components/BottomNavDriver';
import Swal from 'sweetalert2';

const EstimateListDriver = () => {
    const navigate = useNavigate();
    const [auctions, setAuctions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userProfileImg, setUserProfileImg] = useState('');

    useEffect(() => {
        const checkRestriction = async () => {
            try {
                const res = await request('/app/driver/check-restriction');
                if (res.restricted) {
                    await Swal.fire({
                        icon: 'warning',
                        title: '이용 제한 안내',
                        text: res.message,
                        confirmButtonText: '확인',
                        confirmButtonColor: '#004e47'
                    });
                    navigate('/dashboard-driver');
                    return true;
                }
            } catch (err) {
                console.error('Check restriction error:', err);
            }
            return false;
        };

        const fetchData = async () => {
            const isRestricted = await checkRestriction();
            if (isRestricted) return;

            setLoading(true);
            try {
                // 1. 기사 프로필 정보 조회 (헤더용)
                const profRes = await getDriverProfile();
                if (profRes.success && profRes.data) {
                    setUserProfileImg(profRes.data.driver?.profileImg || '');
                }

                // 2. 청약 목록 조회
                const res = await request('/app/driver/auctions');
                if (res.success) {
                    setAuctions(res.data || []);
                }
            } catch (err) {
                console.error('Fetch auctions error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [navigate]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#f7f9fb]">
            <div className="w-12 h-12 border-4 border-[#004e47] border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="bg-[#f7f9fb] text-[#191c1e] min-h-screen pb-40 font-body text-left">
            {/* TopAppBar - 표준화된 헤더 스타일 */}
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-white/20 px-4 h-16 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
                        <span className="material-symbols-outlined text-slate-600">arrow_back</span>
                    </button>
                    <h1 className="text-lg font-bold text-slate-800">청약 요청 목록</h1>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#eceef0] overflow-hidden border-2 border-white shadow-sm flex items-center justify-center">
                    {userProfileImg ? (
                        <img alt="User Profile" src={userProfileImg} className="w-full h-full object-cover" />
                    ) : (
                        <span className="material-symbols-outlined text-[#bec9c6]">person</span>
                    )}
                </div>
            </header>

            <main className="pt-24 px-6 max-w-7xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom duration-700 text-left">

                {/* Auction Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
                    {auctions.length > 0 ? (
                        auctions.map((auction, i) => (
                            <div key={auction.id} className="group relative bg-white rounded-2xl p-8 shadow-xl shadow-teal-900/5 transition-all hover:-translate-y-2 duration-500 text-left border border-slate-100 flex flex-col justify-between h-full min-h-[380px]">
                                <div className="absolute left-0 top-12 bottom-12 w-1.5 bg-secondary rounded-r-xl opacity-80"></div>
                                
                                    <div className="text-left space-y-2">
                                        <div className="text-left">
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary mb-1 block italic">여행 정보</span>
                                            <h3 className="font-headline text-2xl font-black text-[#191c1e] leading-tight text-left">{auction.title || '여행 제목 없음'}</h3>
                                            <p className="font-headline text-3xl font-black text-[#004e47] italic mt-3">₩{Number(auction.price).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-slate-50 space-y-4">
                                        {/* 운행 일정 */}
                                        <div className="flex items-center gap-2 mt-4 mb-6 text-left">
                                            <span className="material-symbols-outlined text-teal-600 text-base">event</span>
                                            <p className="text-sm font-semibold text-slate-500 tracking-wide">
                                                {auction.startDate ? auction.startDate.split(' ')[0].replace(/\./g, '-') : ''} ~ {auction.endDate ? auction.endDate.split(' ')[0].replace(/\./g, '-') : ''}
                                            </p>
                                        </div>

                                        {/* 운행 경로 세로 Bento 스타일 */}
                                        <div className="space-y-5 text-left py-2 mb-6">
                                            <div className="flex flex-col text-left">
                                                <p className="text-xs font-bold text-slate-400 mb-1">출발</p>
                                                <p className="font-black text-base text-slate-800">{auction.startAddr}</p>
                                            </div>
                                            {auction.roundTrip && (
                                                <div className="flex flex-col text-left">
                                                    <p className="text-xs font-bold text-teal-600 mb-1">목적지</p>
                                                    <p className="font-black text-base text-slate-800">{auction.roundTrip}</p>
                                                </div>
                                            )}
                                            <div className="flex flex-col text-left">
                                                <p className="text-xs font-bold text-slate-400 mb-1">도착</p>
                                                <p className="font-black text-base text-slate-800">{auction.endAddr}</p>
                                            </div>
                                        </div>

                                        {/* 등록 경과 시간 */}
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <span className="material-symbols-outlined text-sm">schedule</span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider">{auction.timeAgo} 등록됨</span>
                                        </div>
                                    </div>
                                
                                <button onClick={() => navigate(`/estimate-detail-driver/${auction.id}`)} className="mt-8 w-full py-4 rounded-xl bg-[#004e47] text-white font-black text-[11px] uppercase tracking-[0.3em] hover:bg-secondary transition-all active:scale-95 shadow-xl shadow-teal-900/10 italic">
                                    청약 선택
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="md:col-span-2 lg:col-span-3 py-24 flex flex-col items-center justify-center text-center space-y-6 bg-white rounded-2xl shadow-xl shadow-teal-900/5 border border-dashed border-slate-200">
                            <div className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center">
                                <span className="material-symbols-outlined text-4xl text-slate-300">search_off</span>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-xl font-bold text-slate-400">등록된 청약 기회가 없습니다.</h4>
                                <p className="text-sm text-slate-400 font-medium opacity-60">기사님의 차량 정보와 일치하는 실시간 요청을 기다려주세요.</p>
                            </div>
                        </div>
                    )}
                </div>


            </main>

            {/* Bottom Nav */}
            <BottomNavDriver activeTab="estimate" />
        </div>
    );
};

export default EstimateListDriver;
