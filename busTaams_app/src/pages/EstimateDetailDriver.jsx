import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { request, getDriverProfile } from '../api';
import Swal from 'sweetalert2';
import BottomNavDriver from '../components/BottomNavDriver';

const EstimateDetailDriver = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [auction, setAuction] = useState(null);
    const [loading, setLoading] = useState(true);
    const [agreed, setAgreed] = useState(false);
    const [userProfileImg, setUserProfileImg] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const profRes = await getDriverProfile();
                if (profRes.success && profRes.data) {
                    setUserProfileImg(profRes.data.driver?.profileImg || '');
                }

                const res = await request(`/app/driver/auctions/${id}`);
                if (res.success) {
                    // [추가] 해당 건이 차량 변경 요청 상태인 경우, 청약 상세 진입 차단 (한글 주석)
                    if (res.data.driverReservationStatus === 'BUS_CHANGE') {
                        Swal.fire({
                            icon: 'warning',
                            title: '청약 진행 불가',
                            text: '해당 여정은 차량 변경이 요청된 건으로, 다시 청약 승인을 진행하실 수 없습니다.',
                            confirmButtonColor: '#004e47'
                        }).then(() => {
                            navigate('/driver-dashboard');
                        });
                        return;
                    }
                    setAuction(res.data);
                }
            } catch (err) {
                console.error('Fetch auction detail error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!agreed) {
            Swal.fire({
                icon: 'warning',
                title: '확인 필요',
                text: '디지털 서명 동의가 필요합니다.',
                confirmButtonColor: '#004e47'
            });
            return;
        }

        try {
            const res = await request(`/app/driver/auctions/${id}/bid`, {
                method: 'POST'
            });

            if (res.success) {
                Swal.fire({
                    icon: 'success',
                    title: '성공',
                    text: '청약이 정상적으로 제출되었습니다!',
                    confirmButtonColor: '#004e47'
                }).then(() => {
                    navigate('/driver-dashboard');
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: '청약 실패',
                    text: res.error || '청약 제출 중 오류가 발생했습니다.',
                    confirmButtonColor: '#004e47'
                });
            }
        } catch (err) {
            console.error('Bid submit error details:', err);
            const serverMessage = err.message || '서버와 통신 중 오류가 발생했습니다.';
            
            Swal.fire({
                icon: 'error',
                title: '청약 실패',
                text: serverMessage,
                confirmButtonColor: '#004e47'
            });
        }
    };

    if (loading || !auction) return (
        <div className="min-h-screen flex items-center justify-center bg-[#f7f9fb]">
            <div className="w-12 h-12 border-4 border-[#004e47] border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="bg-[#f7f9fb] text-[#191c1e] min-h-screen pb-48 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-sm border-b border-slate-100 py-4">
                <div className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors active:scale-95 duration-200">
                            <span className="material-symbols-outlined text-2xl text-slate-600">arrow_back</span>
                        </button>
                        <h1 className="font-headline font-extrabold tracking-tighter text-2xl text-[#004e47] italic">청약 상세 내역</h1>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden border-2 border-white shadow-sm flex items-center justify-center">
                        {userProfileImg ? (
                            <img alt="User profile" src={userProfileImg} className="w-full h-full object-cover" />
                        ) : (
                            <span className="material-symbols-outlined text-slate-300">person</span>
                        )}
                    </div>
                </div>
            </header>

            <main className="pt-28 px-6 max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom duration-700 text-left">
                {/* Header Section */}
                <div className="space-y-2 text-left">
                    {/* 한글 주석: 청약 ID 숨김 처리 */}
                    <h2 className="font-headline text-2xl font-black text-[#004e47] tracking-tight italic uppercase">
                        {auction.title}
                    </h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 text-left">
                    {/* Left: Trip Info (Matching Design) */}
                    <aside className="lg:col-span-5 text-left">
                        <div className="bg-white rounded-2xl p-10 space-y-10 shadow-xl shadow-teal-900/5 text-left border border-slate-100">
                            {/* 한글 주석: 여행 경로 타이틀 추가 */}
                            <h2 className="text-2xl font-black mb-10 flex items-center gap-3 italic text-teal-800 border-b border-slate-50 pb-6">
                                <span className="material-symbols-outlined text-primary" style={{fontVariationSettings: "'FILL' 1"}}>route</span>
                                여행 경로
                            </h2>
                            
                            <div className="space-y-10 text-left">
                                {/* Route sequence in strict order */}
                                <div className="mt-8 space-y-10 relative">
                                    <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-100"></div>
                                    {auction.fullPath.map((item, idx) => {
                                        const isStart = item.label === '출발지';
                                        const isEnd = item.label === '최종 도착지';
                                        const isDest = item.label === '목적지';
                                        const pointType = isStart ? 'START' : isEnd ? 'END' : isDest ? 'DEST' : 'WAYPOINT';

                                        return (
                                            <div key={idx} className="relative pl-12">
                                                <div className={`absolute left-0 top-1.5 w-8 h-8 rounded-full border-4 border-white shadow-md z-10 flex items-center justify-center ${
                                                    pointType === 'START' ? 'bg-teal-600 text-white shadow-teal-200' : 
                                                    pointType === 'END' ? 'bg-rose-500 text-white shadow-rose-200' : 
                                                    pointType === 'DEST' ? 'bg-indigo-600 text-white shadow-indigo-100' :
                                                    'bg-amber-400 text-white shadow-amber-100'
                                                }`}>
                                                    <span className="material-symbols-outlined text-[16px] font-black">
                                                        {pointType === 'START' ? 'location_on' : 
                                                         pointType === 'END' ? 'flag' : 
                                                         pointType === 'DEST' ? 'near_me' : 'more_horiz'}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col text-left">
                                                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                                                        pointType === 'START' ? 'text-teal-600' : 
                                                        pointType === 'END' ? 'text-rose-500' : 
                                                        pointType === 'DEST' ? 'text-indigo-500' : 'text-amber-500'
                                                    }`}>
                                                        {item.label}
                                                    </p>
                                                    <h4 className="text-lg font-black tracking-tight text-[#191c1e] text-left">
                                                        {item.addr}
                                                    </h4>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="pt-8 border-t border-slate-50 space-y-8">
                                    <div className="flex items-start gap-6 text-left">
                                        <div className="min-w-[40px] h-10 rounded-xl bg-slate-50 text-slate-400 border border-slate-100 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-xl">calendar_month</span>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-1 italic">출발 일시</p>
                                            <p className="font-black text-[#191c1e] text-lg leading-tight">{auction.startDate}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-6 text-left">
                                        <div className="min-w-[40px] h-10 rounded-xl bg-slate-50 text-slate-400 border border-slate-100 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-xl">calendar_month</span>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-1 italic">도착 일시</p>
                                            <p className="font-black text-[#191c1e] text-lg leading-tight">{auction.endDate}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Right: Bidding Form */}
                    <section className="lg:col-span-7 text-left">
                        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-xl shadow-teal-900/5 border border-slate-50 text-left h-full">
                            <form onSubmit={handleSubmit} className="space-y-12 text-left">
                                <div className="space-y-4 text-left group">
                                    <div className="flex justify-between items-center px-2 text-left">
                                        <label className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 italic">확정 청약 금액</label>
                                        <span className="text-[10px] font-black text-secondary uppercase tracking-[0.3em]">KRW</span>
                                    </div>
                                    <div className="relative text-left">
                                        {/* 한글 주석: 원화 기호 색상을 진한 파란색(text-blue-900)으로 조율 */}
                                        <span className="absolute left-8 top-1/2 -translate-y-1/2 font-black text-blue-900 text-3xl italic">₩</span>
                                        {/* 한글 주석: 금액 텍스트 색상을 진한 파란색(text-blue-900)으로 조율 */}
                                        <input 
                                            className="w-full bg-slate-50 border-4 border-slate-100 rounded-xl py-8 pl-16 pr-8 font-headline text-4xl font-black text-blue-900 focus:outline-none transition-all shadow-inner italic cursor-not-allowed" 
                                            value={Number(auction.price).toLocaleString()} 
                                            readOnly 
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-4 mb-4">
                                        고객이 제시한 고정 금액으로 청약이 진행됩니다.
                                    </p>
                                    
                                    {/* 한글 주석: 청약 금액 섹션 내부로 통합된 디지털 서명 영역 */}
                                    <div className="p-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-6 text-left cursor-pointer hover:bg-white transition-colors group" onClick={() => setAgreed(!agreed)}>
                                        <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all ${agreed ? 'bg-secondary border-secondary' : 'bg-white border-slate-200'}`}>
                                            {agreed && <span className="material-symbols-outlined text-white text-2xl">check</span>}
                                        </div>
                                        <label className="flex-1 text-[13px] font-bold text-slate-500 italic leading-snug text-left uppercase tracking-tight">
                                            선택한 차량이 모든 안전 요구 사항을 충족하며 이 노선에 대한 보험이 최신 상태임을 <span className="text-secondary underline underline-offset-4">디지털 서명</span>으로 인증합니다.
                                        </label>
                                    </div>
                                </div>

                                <div className="pt-8 flex justify-center">
                                    <button className="w-full sm:w-auto min-w-[180px] px-10 py-4 bg-[#004e47] text-white font-black font-headline text-base italic uppercase tracking-[0.18em] rounded-xl shadow-xl shadow-teal-900/15 hover:shadow-secondary/30 hover:bg-secondary active:scale-95 transition-all duration-300" type="submit">
                                        청약승인
                                    </button>
                                </div>
                            </form>
                        </div>
                    </section>
                </div>
            </main>

            {/* Bottom Nav */}
            <BottomNavDriver activeTab="estimate" />
        </div>
    );
};

export default EstimateDetailDriver;
