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
                    title: '입찰 성공',
                    text: '입찰이 정상적으로 제출되었습니다!',
                    confirmButtonColor: '#004e47'
                }).then(() => {
                    navigate('/estimate-list-driver');
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: '입찰 실패',
                    text: res.error || '입찰 제출 중 오류가 발생했습니다.',
                    confirmButtonColor: '#004e47'
                });
            }
        } catch (err) {
            console.error('Bid submit error:', err);
            Swal.fire({
                icon: 'error',
                title: '통신 오류',
                text: '서버와 통신 중 오류가 발생했습니다.',
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
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors active:scale-95 duration-200">
                            <span className="material-symbols-outlined text-2xl text-slate-600">arrow_back</span>
                        </button>
                        <h1 className="font-headline font-extrabold tracking-tighter text-2xl text-[#004e47] italic">견적 상세 내역</h1>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border-2 border-white shadow-sm flex items-center justify-center">
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
                    <span className="text-secondary font-black tracking-[0.4em] uppercase text-[11px] block px-1 italic">견적 ID: #BT-{auction.id}</span>
                    <h2 className="font-headline text-5xl md:text-7xl font-black text-[#004e47] tracking-tighter italic uppercase">
                        견적 상세 확인
                    </h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 text-left">
                    {/* Left: Trip Info (Matching Design) */}
                    <aside className="lg:col-span-5 text-left">
                        <div className="bg-white rounded-[2.5rem] p-10 space-y-10 shadow-xl shadow-teal-900/5 text-left border border-slate-100">
                            <h3 className="font-headline font-black text-2xl text-[#004e47] italic border-l-4 border-secondary pl-4 text-left uppercase">운행 정보</h3>
                            
                            <div className="space-y-10 text-left">
                                {/* Route sequence in strict order */}
                                <div className="space-y-8">
                                    {auction.fullPath.map((item, idx) => (
                                        <div key={idx} className="flex items-start gap-6 text-left relative">
                                            {/* Vertical line between icons */}
                                            {idx < auction.fullPath.length - 1 && (
                                                <div className="absolute left-[19px] top-10 bottom-[-32px] w-0.5 bg-slate-100 dashed"></div>
                                            )}
                                            <div className={`min-w-[40px] h-10 rounded-xl flex items-center justify-center border ${
                                                item.label === '출발지' ? 'bg-primary/10 text-primary border-primary/20' : 
                                                item.label === '최종 도착지' ? 'bg-secondary/10 text-secondary border-secondary/20' : 
                                                item.label === '회차지' ? 'bg-orange-100 text-orange-600 border-orange-200 shadow-sm shadow-orange-200' :
                                                'bg-slate-50 text-slate-400 border-slate-100'
                                            }`}>
                                                <span className="material-symbols-outlined text-xl">
                                                    {item.label === '출발지' ? 'location_on' : 
                                                     item.label === '최종 도착지' ? 'flag' : 
                                                     item.label === '회차지' ? 'sync_alt' : 'route'}
                                                </span>
                                            </div>
                                            <div className="text-left">
                                                <p className={`text-[10px] font-black uppercase tracking-[0.3em] mb-1 italic ${item.label === '회차지' ? 'text-orange-500' : 'text-slate-300'}`}>
                                                    {item.label} {item.label === '회차지' && '★'}
                                                </p>
                                                <p className={`font-black text-xl leading-tight tracking-tight ${item.label === '회차지' ? 'text-orange-700' : 'text-[#191c1e]'}`}>{item.addr}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-8 border-t border-slate-50 space-y-8">
                                    <div className="flex items-start gap-6 text-left">
                                        <div className="min-w-[40px] h-10 rounded-xl bg-slate-50 text-slate-400 border border-slate-100 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-xl">calendar_month</span>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-1 italic">출발 일시</p>
                                            <p className="font-black text-[#191c1e] text-xl leading-tight">{auction.startDate}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-6 text-left">
                                        <div className="min-w-[40px] h-10 rounded-xl bg-slate-50 text-slate-400 border border-slate-100 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-xl">calendar_month</span>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-1 italic">도착 일시</p>
                                            <p className="font-black text-[#191c1e] text-xl leading-tight">{auction.endDate}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Right: Bidding Form */}
                    <section className="lg:col-span-7 text-left">
                        <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-xl shadow-teal-900/5 border border-slate-50 text-left h-full">
                            <form onSubmit={handleSubmit} className="space-y-12 text-left">
                                <div className="space-y-4 text-left group">
                                    <div className="flex justify-between items-center px-2 text-left">
                                        <label className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 italic">확정 입찰 금액</label>
                                        <span className="text-[10px] font-black text-secondary uppercase tracking-[0.3em]">KRW</span>
                                    </div>
                                    <div className="relative text-left">
                                        <span className="absolute left-8 top-1/2 -translate-y-1/2 font-black text-slate-300 text-3xl italic">₩</span>
                                        <input 
                                            className="w-full bg-slate-50 border-4 border-slate-100 rounded-[2rem] py-8 pl-16 pr-8 font-headline text-4xl font-black text-slate-500 focus:outline-none transition-all shadow-inner italic cursor-not-allowed" 
                                            value={Number(auction.price).toLocaleString()} 
                                            readOnly 
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-4">
                                        고객이 제시한 고정 금액으로 입찰이 진행됩니다.
                                    </p>
                                </div>

                                <div className="p-10 rounded-[2.5rem] bg-slate-50 border border-slate-100 flex items-center gap-6 text-left cursor-pointer hover:bg-white transition-colors group" onClick={() => setAgreed(!agreed)}>
                                    <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all ${agreed ? 'bg-secondary border-secondary' : 'bg-white border-slate-200'}`}>
                                        {agreed && <span className="material-symbols-outlined text-white text-2xl">check</span>}
                                    </div>
                                    <label className="flex-1 text-[13px] font-bold text-slate-500 italic leading-snug text-left uppercase tracking-tight">
                                        선택한 차량이 모든 안전 요구 사항을 충족하며 이 노선에 대한 보험이 최신 상태임을 <span className="text-secondary underline underline-offset-4">디지털 서명</span>으로 인증합니다.
                                    </label>
                                </div>

                                <div className="pt-8 text-left">
                                    <button className="w-full py-8 bg-[#004e47] text-white font-black font-headline text-2xl italic uppercase tracking-[0.3em] rounded-full shadow-2xl shadow-teal-900/20 hover:shadow-secondary/40 hover:bg-secondary active:scale-95 transition-all duration-500" type="submit">
                                        견적 제출하기
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
