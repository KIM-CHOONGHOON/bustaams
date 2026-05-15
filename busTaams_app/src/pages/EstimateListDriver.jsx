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
                    <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
                        <span className="material-symbols-outlined text-slate-600">arrow_back</span>
                    </button>
                    <h1 className="text-lg font-bold text-slate-800">청약 목록</h1>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#eceef0] overflow-hidden border-2 border-white shadow-sm flex items-center justify-center">
                    {userProfileImg ? (
                        <img alt="User Profile" src={userProfileImg} className="w-full h-full object-cover" />
                    ) : (
                        <span className="material-symbols-outlined text-[#bec9c6]">person</span>
                    )}
                </div>
            </header>

            <main className="pt-32 px-6 max-w-7xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom duration-700 text-left">
                {/* Header Section */}
                <section className="space-y-6 text-left">
                        <span className="text-secondary font-black tracking-[0.4em] uppercase text-[10px] block px-1 italic">실시간 청약 관리</span>
                        <h2 className="font-headline text-6xl md:text-8xl font-black text-[#191c1e] leading-[0.85] tracking-tighter italic uppercase text-left">
                            이용 가능한 <br/><span className="text-secondary">청약 목록.</span>
                        </h2>
                    <p className="text-slate-500 text-lg font-medium tracking-tight leading-relaxed max-w-xl text-left">
                        엄선된 운송 기회. 기사님을 기다리는 새로운 여행들을 확인하고 최고의 서비스를 제안해 보세요.
                    </p>
                </section>

                {/* Auction Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
                    {auctions.length > 0 ? (
                        auctions.map((auction, i) => (
                            <div key={auction.id} className="group relative bg-white rounded-[2.5rem] p-8 shadow-xl shadow-teal-900/5 transition-all hover:-translate-y-2 duration-500 text-left border border-slate-100 flex flex-col justify-between h-full min-h-[380px]">
                                <div className="absolute left-0 top-12 bottom-12 w-1.5 bg-secondary rounded-r-full opacity-80"></div>
                                
                                    <div className="text-left space-y-2">
                                        <div className="text-left">
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary mb-1 block italic">여행 정보</span>
                                            <h3 className="font-headline text-2xl font-black text-[#191c1e] leading-tight text-left">{auction.title || '여행 제목 없음'}</h3>
                                            <p className="font-headline text-3xl font-black text-[#004e47] italic mt-3">₩{Number(auction.price).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-slate-50 space-y-3">
                                        <div className="flex items-center gap-3 text-slate-600">
                                            <span className="material-symbols-outlined text-xl">route</span>
                                            <div className="text-sm font-bold tracking-tight flex items-center gap-1">
                                                <span>{auction.startAddr.split(' ')[1] || auction.startAddr.split(' ')[0]}</span>
                                                {auction.roundTrip && (
                                                    <>
                                                        <span className="text-secondary">→</span>
                                                        <span>{auction.roundTrip.split(' ')[1] || auction.roundTrip.split(' ')[0]}</span>
                                                    </>
                                                )}
                                                <span className="text-secondary">→</span>
                                                <span>{auction.endAddr.split(' ')[1] || auction.endAddr.split(' ')[0]}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-400">
                                            <span className="material-symbols-outlined text-xl">calendar_month</span>
                                            <span className="text-xs font-bold uppercase tracking-wider">{auction.startDate} ~ {auction.endDate}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-400">
                                            <span className="material-symbols-outlined text-xl">schedule</span>
                                            <span className="text-xs font-bold uppercase tracking-wider">{auction.timeAgo} 등록됨</span>
                                        </div>
                                    </div>
                                
                                <button onClick={() => navigate(`/estimate-detail-driver/${auction.id}`)} className="mt-8 w-full py-5 rounded-2xl bg-[#004e47] text-white font-black text-[11px] uppercase tracking-[0.3em] hover:bg-secondary transition-all active:scale-95 shadow-xl shadow-teal-900/10 italic">
                                    청약 선택
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="md:col-span-2 lg:col-span-3 py-24 flex flex-col items-center justify-center text-center space-y-6 bg-white rounded-[3rem] shadow-xl shadow-teal-900/5 border border-dashed border-slate-200">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-4xl text-slate-300">search_off</span>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-xl font-bold text-slate-400">등록된 청약 기회가 없습니다.</h4>
                                <p className="text-sm text-slate-400 font-medium opacity-60">기사님의 차량 정보와 일치하는 실시간 요청을 기다려주세요.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Editorial Footer Quote */}
                <div className="pt-24 pb-12 text-left border-t border-slate-100">
                    <div className="h-1.5 w-16 bg-secondary rounded-full mb-10"></div>
                    <p className="font-headline text-3xl md:text-5xl font-black text-[#004e47] leading-[1.1] tracking-tighter max-w-4xl italic text-left uppercase">
                        "단체 여행의 가치는 <span className="text-secondary underline decoration-secondary/20 underline-offset-8">정확한 청약</span>과 <br/>신뢰할 수 있는 기사님으로부터 시작됩니다."
                    </p>
                </div>
            </main>

            {/* Bottom Nav */}
            <BottomNavDriver activeTab="estimate" />
        </div>
    );
};

export default EstimateListDriver;
