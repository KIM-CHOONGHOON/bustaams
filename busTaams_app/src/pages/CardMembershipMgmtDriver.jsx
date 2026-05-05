import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Swal from 'sweetalert2';
import BottomNavDriver from '../components/BottomNavDriver';

const CardMembershipMgmtDriver = () => {
    const navigate = useNavigate();
    const [data, setData] = useState({ cards: [], history: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const response = await api.get('/app/driver/membership-card-info');
            if (response.success) {
                setData(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch membership data:', error);
            Swal.fire('오류', '정보를 불러오는 중 오류가 발생했습니다.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const maskCardNo = (cardNoEnc) => {
        if (!cardNoEnc) return '**** **** **** ****';
        // 실제 암호화된 번호라면 백엔드에서 복호화 후 일부만 줘야 하지만, 
        // 여기선 간단히 마지막 4자리만 보여주는 예시로 작성
        return `**** **** **** ${cardNoEnc.slice(-4)}`;
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('ko-KR').format(price);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    const primaryCard = data.cards.find(c => c.IS_PRIMARY === 'Y') || data.cards[0];

    return (
        <div className="bg-background text-on-background min-h-screen font-body pb-32">
            {/* Top AppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-white/10 py-4">
                <div className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto h-12">
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate(-1)} className="text-teal-800 dark:text-teal-400 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-2xl">arrow_back</span>
                        </button>
                        <h1 className="font-headline font-bold tracking-tight text-xl text-teal-900 dark:text-teal-100 italic uppercase">멤버십 및 카드 관리</h1>
                    </div>
                </div>
            </header>

            <main className="pt-24 px-6 max-w-lg mx-auto space-y-12 animate-in fade-in slide-in-from-bottom duration-1000 text-left">
                {/* Hero Header */}
                <header className="space-y-4">
                    <span className="text-secondary font-headline font-bold tracking-widest uppercase text-[10px] mb-2 block">Account Usage & Billing</span>
                    <h2 className="font-headline font-extrabold text-4xl text-primary leading-tight tracking-tight">
                        결제 내역 및 <br/>멤버십 관리
                    </h2>
                    <p className="text-on-surface-variant text-sm leading-relaxed max-w-[80%]">
                        월간 운영비를 검토하고 관리하세요. 등록된 카드로 매월 자동 결제가 진행됩니다.
                    </p>
                </header>

                {/* Main Card Section */}
                <section className="relative group overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary to-primary-container p-8 shadow-2xl shadow-primary/20 text-white">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/10 rounded-full -ml-8 -mb-8 blur-xl"></div>
                    
                    <div className="relative z-10 flex flex-col h-full justify-between gap-12">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1 block">Primary Card</span>
                                <h3 className="text-2xl font-black italic tracking-tighter uppercase">{primaryCard?.CARD_NICKNAME || '기본 카드'}</h3>
                            </div>
                            <span className="material-symbols-outlined text-4xl text-white/40">contactless</span>
                        </div>

                        <div className="space-y-6">
                            <div className="text-2xl font-bold tracking-[0.2em] font-headline">
                                {maskCardNo(primaryCard?.CARD_NO_ENC)}
                            </div>
                            <div className="flex justify-between items-end">
                                <div className="space-y-1">
                                    <span className="text-white/40 text-[9px] font-bold uppercase tracking-widest block">Expires</span>
                                    <span className="text-sm font-bold tracking-widest">{primaryCard?.EXP_MONTH}/{primaryCard?.EXP_YEAR}</span>
                                </div>
                                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png" alt="Card Logo" className="h-6 opacity-80" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Quick Stats / Next Payment */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col gap-2">
                        <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">다음 결제일</span>
                        <span className="text-lg font-black text-on-surface">
                            {data.nextPaymentDate ? data.nextPaymentDate : '예정 없음'}
                        </span>
                    </div>
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col gap-2">
                        <span className="text-secondary text-[10px] font-bold uppercase tracking-wider">예정 금액</span>
                        <span className="text-lg font-black text-secondary">
                            {data.nextPaymentAmount > 0 ? `₩${formatPrice(data.nextPaymentAmount)}` : '-'}
                        </span>
                    </div>
                </div>

                {/* Payment History List */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h4 className="font-headline font-bold text-lg text-primary italic uppercase tracking-tight">멤버십 결제 내역</h4>
                        <button className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">filter_list</span> 필터
                        </button>
                    </div>

                    <div className="space-y-4">
                        {data.history.length === 0 ? (
                            <div className="text-center py-12 bg-surface-container-low rounded-3xl text-on-surface-variant text-sm">
                                결제 내역이 없습니다.
                            </div>
                        ) : (
                            data.history.map((item, index) => (
                                <div key={index} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-50 flex items-center justify-between group hover:shadow-xl hover:translate-y-[-2px] transition-all duration-300">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                                            <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>
                                        </div>
                                        <div>
                                            <span className="block font-black text-on-surface tracking-tight uppercase text-sm">
                                                {item.YYYYMM.slice(0, 4)}년 {item.YYYYMM.slice(4)}월
                                            </span>
                                            <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">
                                                Membership Fee • {item.FEE_POLICY.split('_')[1]}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="block font-black text-primary text-lg italic tracking-tighter">₩{formatPrice(item.amount)}</span>
                                        <button className="text-[10px] font-bold text-secondary uppercase tracking-widest hover:underline mt-1">Receipt</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Add Card / Support Section */}
                <div className="bg-surface-container-low rounded-[2.5rem] p-10 space-y-6 relative overflow-hidden">
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-2xl"></div>
                    <div className="relative z-10">
                        <h3 className="font-headline font-black text-2xl text-primary leading-tight italic uppercase tracking-tight mb-4">
                            설정 및 고객지원
                        </h3>
                        <p className="text-on-surface-variant text-xs leading-relaxed mb-8">
                            결제 수단을 변경하거나 결제 내역에 대해 궁금한 점이 있으시면 언제든 문의해 주세요.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={() => navigate('/card-register')}
                                className="w-full bg-primary text-white py-4 rounded-full font-bold text-xs uppercase tracking-[0.2em] shadow-lg shadow-primary/20 active:scale-95 transition-all"
                            >
                                카드 정보 변경하기
                            </button>
                            <button className="w-full bg-white text-primary border-2 border-primary/10 py-4 rounded-full font-bold text-xs uppercase tracking-[0.2em] active:scale-95 transition-all hover:bg-primary/5">
                                고객센터 연결
                            </button>
                        </div>
                    </div>
                </div>
            </main>
            <BottomNavDriver activeTab="profile" />
        </div>
    );
};

export default CardMembershipMgmtDriver;
