import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getDriverProfile } from '../api';
import { notify } from '../utils/toast';
import BottomNavDriver from '../components/BottomNavDriver';

const ArchiveListDriver = () => {
    const navigate = useNavigate();
    const [archives, setArchives] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userProfileImg, setUserProfileImg] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. 기사 프로필 정보 조회 (우측 상단 헤더용)
                const profRes = await getDriverProfile();
                if (profRes.success && profRes.data) {
                    setUserProfileImg(profRes.data.driver?.profileImg || '');
                }

                // 2. 보관함 목록 조회 (백엔드 API 호출)
                const res = await api.get('/app/driver/archive-list');
                if (res.success) {
                    setArchives(res.data);
                } else {
                    notify.error('오류', '보관함 목록을 불러올 수 없습니다.');
                }
            } catch (err) {
                console.error('Fetch archive list error:', err);
                notify.error('오류', '데이터를 불러오는 중 문제가 발생했습니다.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="bg-[#F7F9FB] text-[#191C1E] min-h-[100dvh] pb-32 font-body text-left">
            {/* 상단바 - 표준화된 세련된 디자인 */}
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-white/20 px-4 h-16 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
                        <span className="material-symbols-outlined text-slate-600">arrow_back</span>
                    </button>
                    <h1 className="text-lg font-bold text-slate-800">보관함 목록</h1>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#eceef0] overflow-hidden border-2 border-white shadow-sm flex items-center justify-center">
                    {userProfileImg ? (
                        <img alt="User Profile" src={userProfileImg} className="w-full h-full object-cover" />
                    ) : (
                        <span className="material-symbols-outlined text-[#bec9c6]">person</span>
                    )}
                </div>
            </header>

            <main className="pt-24 px-6 max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom duration-1000 text-left">
                {/* 헤더 섹션 */}
                <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end text-left">
                    <div className="md:col-span-7 space-y-4 text-left">
                        <span className="text-[#9D4300] font-black tracking-[0.4em] uppercase text-[10px] block px-2 italic">ARCHIVE RECORDS</span>
                        <h2 className="font-headline text-5xl md:text-7xl font-black text-[#004E47] leading-[1.1] tracking-tighter italic uppercase text-left">
                            운행 보관함 <span className="text-[#9D4300] underline decoration-[#9D4300]/20 underline-offset-[12px]">목록</span>
                        </h2>
                    </div>
                    <div className="md:col-span-5 md:pl-12 text-left border-l-4 border-slate-100">
                        <p className="text-slate-400 text-lg font-bold italic tracking-tight leading-relaxed text-left">
                            예약 확정 및 운행이 완료되어 보관된 기사님별 상세 내역입니다.
                        </p>
                    </div>
                </section>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <span className="material-symbols-outlined text-4xl text-[#004E47] animate-spin mb-4">progress_activity</span>
                        <p className="text-gray-400 font-medium">보관 기록을 안전하게 불러오고 있습니다...</p>
                    </div>
                ) : archives.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {archives.map((item) => (
                            <div key={item.id} className="group bg-white rounded-2xl p-10 relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-teal-900/5 hover:-translate-y-2 text-left border border-slate-50">
                                <div className="space-y-8 text-left">
                                    <div className="flex justify-between items-center text-left">
                                        <span className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest italic ${
                                            item.reservationStat === 'DONE' 
                                            ? 'bg-emerald-50 text-emerald-600' 
                                            : 'bg-amber-50 text-amber-600'
                                        }`}>
                                            {item.reservationStat === 'DONE' ? '운행 완료' : '예약 확정'}
                                        </span>
                                        <span className="material-symbols-outlined text-slate-100 group-hover:text-[#004E47]/20 transition-colors duration-500 text-4xl">folder_open</span>
                                    </div>

                                    <div className="space-y-2 text-left">
                                        <h3 className="font-headline text-2xl font-black text-[#004E47] italic uppercase tracking-tighter text-left group-hover:text-[#9D4300] transition-colors duration-500 leading-tight line-clamp-1">
                                            {item.title}
                                        </h3>
                                        <p className="text-slate-400 font-bold italic text-xs leading-tight uppercase tracking-widest">
                                            예약번호: #{item.id}
                                        </p>
                                    </div>

                                    <div className="space-y-4 text-left">
                                        <div className="flex justify-between items-center text-left border-b border-slate-50 pb-4">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-300 italic">운행 일정</span>
                                            <span className="font-black text-[#004E47] text-xs italic">{item.startDate} ~ {item.endDate}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-left border-b border-slate-50 pb-4">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-300 italic">운행 기사명</span>
                                            <span className="font-black text-[#004E47] text-xs italic">{item.driverName} 기사님</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-32 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100">
                        <span className="material-symbols-outlined text-6xl text-slate-100 mb-6 block">folder_zip</span>
                        <p className="text-slate-400 font-bold italic uppercase tracking-[0.2em]">보관된 운행 내역이 없습니다.</p>
                    </div>
                )}
            </main>

            <BottomNavDriver activeTab="chat" />
        </div>
    );
};

export default ArchiveListDriver;
