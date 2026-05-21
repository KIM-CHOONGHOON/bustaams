import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BottomNavDriver from '../components/BottomNavDriver';
import { request } from '../api';
import { notify } from '../utils/toast';

const BidDetailDriver = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [bidData, setBidData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchBidDetail = async () => {
            try {
                const token = localStorage.getItem('accessToken');
                if (!token) {
                    navigate('/login');
                    return;
                }

                const result = await request(`/app/driver/mission-detail/${id}`);
                if (result.success) {
                    setBidData(result.data);
                } else {
                    setError(result.error || '데이터를 불러오는데 실패했습니다.');
                }
            } catch (err) {
                console.error('Fetch bid detail error:', err);
                setError(err.message || '서버 통신 오류가 발생했습니다.');
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchBidDetail();
    }, [id, navigate]);

    // 입찰 취소 처리 함수
    const handleCancelBid = async () => {
        const confirmed = await notify.confirm(
            '입찰을 취소하시겠습니까?',
            '취소된 입찰은 되돌릴 수 없으며 다시 경매 입찰에 참여할 수 있게 됩니다.',
            '입찰 취소',
            '뒤로가기'
        );

        if (!confirmed) return;

        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                navigate('/login');
                return;
            }

            const result = await request(`/app/driver/cancel-bid/${id}`, {
                method: 'POST'
            });

            if (result.success) {
                await notify.success('입찰 취소 완료', '입찰이 성공적으로 취소되었습니다.');
                navigate('/driver-dashboard');
            } else {
                await notify.error('입찰 취소 실패', result.error || '오류가 발생했습니다.');
            }
        } catch (err) {
            console.error('Cancel bid error:', err);
            await notify.error('입찰 취소 실패', err.message || '서버 통신 오류가 발생했습니다.');
        }
    };

    if (loading) {
        return (
            <div className="bg-background min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div>
            </div>
        );
    }

    if (error || !bidData) {
        return (
            <div className="bg-background min-h-screen flex flex-col items-center justify-center p-6 text-center">
                <span className="material-symbols-outlined text-6xl text-red-400 mb-4">error</span>
                <p className="text-lg font-bold text-slate-600 mb-6">{error || '데이터가 없습니다.'}</p>
                <button onClick={() => navigate(-1)} className="bg-primary text-white px-8 py-3 rounded-2xl font-bold">뒤로 가기</button>
            </div>
        );
    }

    return (
        <div className="bg-background text-on-surface min-h-[100dvh] pb-32 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/40 backdrop-blur-3xl border-b border-white/20 py-6">
                <div className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto">
                    <div className="flex items-center gap-6 text-left">
                        <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl text-teal-800 shadow-xl shadow-teal-900/5 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                        </button>
                        <h1 className="font-headline font-black tracking-tighter text-2xl text-teal-900 italic uppercase">입찰 상세 정보 및 수정</h1>
                    </div>
                </div>
            </header>

            <main className="pt-32 px-6 max-w-3xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom duration-1000 text-left">
                {/* Customer Request Summary */}
                <section className="space-y-8 text-left">
                    <div className="flex items-baseline justify-between text-left">
                        <h2 className="font-headline font-black text-3xl text-primary italic uppercase tracking-tighter text-left">고객 요청 요약</h2>
                        <span className="text-[10px] font-black text-secondary bg-secondary/10 px-4 py-1.5 rounded-full uppercase tracking-widest italic">
                            {bidData.DATA_STAT === 'BIDDING' ? '승인 대기 중' : '운행 예정'}
                        </span>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-teal-900/5 relative overflow-hidden text-left border border-white">
                        <div className="absolute left-0 top-0 bottom-0 w-2 bg-secondary"></div>
                        <div className="space-y-8 text-left">
                            <div>
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-2 italic">운행 제목</p>
                                <h3 className="font-headline font-black text-2xl text-primary italic leading-tight text-left">{bidData.title}</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                                <div className="space-y-6 text-left">
                                    <div className="flex items-start gap-4 text-left">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-secondary text-xl">route</span>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-black uppercase text-slate-300 mb-1 italic">운행 경로</p>
                                            <div className="flex flex-wrap items-center gap-2 font-black text-on-surface text-sm italic">
                                                <span>{bidData.startAddr.split(' ').slice(0, 2).join(' ')}</span>
                                                <span className="material-symbols-outlined text-xs text-slate-200">arrow_forward</span>
                                                <span>{bidData.endAddr.split(' ').slice(0, 2).join(' ')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 text-left">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-secondary text-xl">event</span>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-black uppercase text-slate-300 mb-1 italic">운행 일정</p>
                                            <p className="font-black text-on-surface text-sm italic">{bidData.startDate} — {bidData.endDate}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6 text-left">
                                    <div className="flex items-start gap-4 text-left">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-secondary text-xl">bus_alert</span>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-black uppercase text-slate-300 mb-1 italic">차량 정보</p>
                                            <p className="font-black text-on-surface text-sm italic">{bidData.busTypeNm || '차종 정보 없음'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 text-left">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-secondary text-xl">payments</span>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-black uppercase text-slate-300 mb-1 italic">고객 희망 예산</p>
                                            <p className="font-black text-on-surface text-sm italic">₩{Number(bidData.targetPrice || 0).toLocaleString()} (Target)</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* My Bid Adjustment */}
                <section className="space-y-8 text-left">
                    <h2 className="font-headline font-black text-3xl text-primary italic uppercase tracking-tighter text-left">내 입찰 정보</h2>
                    
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-teal-900/5 space-y-8 border border-white text-left">
                        <div className="space-y-4 text-left group">
                            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 px-4 block italic">현재 입찰 금액</label>
                            <div className="relative text-left">
                                <span className="absolute left-8 top-1/2 -translate-y-1/2 font-black text-slate-200 text-3xl italic">₩</span>
                                <input 
                                    className="w-full bg-slate-50 border-4 border-transparent rounded-3xl py-6 pl-16 pr-8 font-headline text-4xl font-black text-primary focus:outline-none transition-all italic tracking-tighter" 
                                    value={Number(bidData.price || 0).toLocaleString()} 
                                    readOnly
                                    type="text" 
                                />
                            </div>
                        </div>

                        <div className="bg-primary/5 rounded-[2rem] p-6 flex gap-6 items-start border-2 border-primary/5 text-left">
                            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shrink-0 shadow-lg shadow-primary/20">
                                <span className="material-symbols-outlined text-2xl">lightbulb</span>
                            </div>
                            <div className="space-y-2 text-left">
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary italic">AI 입찰 전략 분석</p>
                                <p className="text-sm font-bold text-slate-500 italic leading-relaxed text-left">
                                    현재 입찰가는 <span className="text-primary font-black">₩{Number(bidData.price * 0.95 || 0).toLocaleString()} ~ ₩{Number(bidData.price * 1.05 || 0).toLocaleString()}</span> 구간에서 경쟁력을 유지하고 있습니다.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Action Grid */}
                <section className="pt-6 text-left pb-12">
                    <button 
                        onClick={handleCancelBid}
                        className="w-full bg-red-50 text-red-600 py-6 rounded-3xl font-black text-lg italic uppercase tracking-[0.1em] shadow-xl shadow-red-900/5 hover:bg-red-100 hover:text-red-700 transition-all active:scale-[0.98] flex items-center justify-center gap-4 border border-red-100"
                    >
                        <span className="material-symbols-outlined text-xl">cancel</span>
                        입찰 취소
                    </button>
                </section>
            </main>

            {/* Bottom Nav */}
            <BottomNavDriver />
        </div>
    );
};

export default BidDetailDriver;
