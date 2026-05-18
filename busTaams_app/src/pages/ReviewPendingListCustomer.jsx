import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import BottomNavCustomer from '../components/BottomNavCustomer';

const ReviewPendingListCustomer = () => {
    const navigate = useNavigate();
    const [missions, setMissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [profileImage, setProfileImage] = useState(null);
    const [imageVersion, setImageVersion] = useState(Date.now());

    useEffect(() => {
        const fetchMissions = async () => {
            try {
                const response = await api.get('/app/customer/review-pending-missions');
                if (response.success) {
                    setMissions(response.data);
                }
            } catch (error) {
                console.error('Fetch review pending missions error:', error);
            } finally {
                setLoading(false);
            }
        };

        const fetchProfile = async () => {
            try {
                const res = await api.get('/app/customer/profile');
                if (res.success && res.data.profileImage) {
                    setProfileImage(res.data.profileImage);
                    setImageVersion(Date.now());
                }
            } catch (err) {
                console.error('Fetch profile error:', err);
            }
        };

        fetchMissions();
        fetchProfile();
    }, []);

    const getShort = (addr) => {
        if (!addr) return '';
        return addr.split(' ').slice(0, 2).join(' ');
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFB]">
                <span className="material-symbols-outlined text-6xl animate-spin text-[#0F766E]">progress_activity</span>
                <p className="mt-4 font-bold text-[#1E293B]">목록을 불러오고 있습니다...</p>
            </div>
        );
    }

    return (
        <div className="bg-[#F8FAFB] min-h-screen pb-32 text-left">
            {/* Header */}
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100/50 py-4">
                <div className="flex justify-between items-center w-full px-6 max-w-4xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate(-1)} 
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-teal-700 hover:bg-teal-50 transition-all duration-300 group"
                        >
                            <span className="material-symbols-outlined text-2xl group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
                        </button>
                        <div>
                            <h1 className="font-headline font-black tracking-tight text-xl text-teal-900">
                                평점 작성 대기
                            </h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest -mt-1">Review Pending</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div 
                            className="w-11 h-11 rounded-2xl bg-white p-0.5 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:border-teal-600/20 transition-all duration-300 overflow-hidden"
                            onClick={() => navigate('/profile-customer')}
                        >
                            <div className="w-full h-full rounded-[14px] overflow-hidden bg-slate-50 flex items-center justify-center relative group">
                                {profileImage ? (
                                    <img 
                                        alt="Customer Profile" 
                                        src={profileImage.startsWith('http') ? 
                                            `${profileImage}${profileImage.includes('?') ? '&' : '?'}t=${imageVersion}` : 
                                            `${import.meta.env.VITE_API_BASE_URL || ''}${profileImage.startsWith('/') ? '' : '/'}${profileImage}${profileImage.includes('?') ? '&' : '?'}t=${imageVersion}`} 
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.style.display = 'none';
                                            if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                        }}
                                    />
                                ) : (
                                    <span className="material-symbols-outlined text-teal-600 text-2xl">account_circle</span>
                                )}
                                {profileImage && (
                                    <span className="material-symbols-outlined text-teal-600 text-2xl hidden items-center justify-center w-full h-full">account_circle</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 pt-24 space-y-10">
                {/* Hero Section */}
                <div className="space-y-3 px-2">
                    <h2 className="text-[32px] font-black text-[#1E293B] leading-tight tracking-tight">
                        당신의 여행은<br />어떠셨나요?
                    </h2>
                    <p className="text-[15px] text-[#64748B] font-medium">
                        소중한 후기는 버스 파트너들에게 큰 힘이 됩니다.
                    </p>
                </div>

                {/* List Section */}
                <div className="space-y-6">
                    {missions.length === 0 ? (
                        <div className="bg-white rounded-[2rem] p-12 text-center border border-dashed border-slate-200">
                            <span className="material-symbols-outlined text-slate-200 text-6xl mb-4">rate_review</span>
                            <p className="text-slate-400 font-bold">작성 대기 중인 평점이 없습니다.</p>
                        </div>
                    ) : (
                        missions.map((mission) => (
                            <div key={mission.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 space-y-6 relative overflow-hidden group hover:shadow-xl hover:shadow-teal-900/5 transition-all duration-500">
                                {/* Accent Line */}
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#92400E]"></div>
                                
                                <div className="flex justify-between items-center px-1">
                                    <span className="px-4 py-1.5 rounded-full bg-[#F1F5F9] text-[#64748B] text-[11px] font-black uppercase tracking-wider">여행 완료</span>
                                </div>

                                <div className="space-y-4 px-1">
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-[12px] font-black text-[#0F766E] uppercase tracking-wider">{mission.busModel} · {mission.busCnt}대</p>
                                        <span className="text-[12px] text-[#94A3B8] font-bold">{mission.date}</span>
                                    </div>
                                    <h3 className="text-[18px] font-black text-[#1E293B] mb-2 truncate">{mission.title || '나의 버스 여행'}</h3>
                                    <div className="flex items-center gap-2 text-[#64748B] mb-6">
                                        <span className="material-symbols-outlined text-[18px] text-[#94A3B8]">distance</span>
                                        <p className="text-[14px] font-bold truncate">
                                            {mission.startAddr} 
                                            {mission.viaAddr ? ` → ${mission.viaAddr}` : ''} 
                                             → {mission.endAddrVia || mission.endAddrMaster}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-[#F8FAFB] p-5 rounded-3xl flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-white shadow-sm overflow-hidden flex items-center justify-center">
                                        {mission.driverImage ? (
                                            <img 
                                                src={`${import.meta.env.VITE_API_BASE_URL || ''}${mission.driverImage}`} 
                                                className="w-full h-full object-cover" 
                                                alt="Driver" 
                                            />
                                        ) : (
                                            <span className="material-symbols-outlined text-slate-300 text-3xl">person</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-black text-[#1E293B] truncate">{mission.companyName || mission.driverName}</p>
                                        <p className="text-[12px] text-[#64748B] font-medium italic truncate mt-0.5">
                                            "안전하고 편안한 이동을 약속드립니다."
                                        </p>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => navigate(`/add-review/${mission.id}`)}
                                    className="w-full py-5 rounded-full bg-[#0D6B5E] text-white font-black text-[15px] flex items-center justify-center gap-3 shadow-lg shadow-teal-900/10 active:scale-[0.98] transition-all"
                                >
                                    <span>평점 작성하기</span>
                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Quote */}
                <div className="pt-10 pb-20 text-center space-y-6">
                    <span className="material-symbols-outlined text-[#CBD5E1] text-[40px]" style={{fontVariationSettings: "'FILL' 1"}}>format_quote</span>
                    <p className="text-[13px] text-[#94A3B8] font-bold italic leading-relaxed max-w-[280px] mx-auto">
                        "우리는 단순한 이동이 아닌, 당신의 소중한 시간을 연결합니다."
                    </p>
                </div>
            </main>

            {/* Bottom Nav */}
            <BottomNavCustomer />
        </div>
    );
};

export default ReviewPendingListCustomer;
