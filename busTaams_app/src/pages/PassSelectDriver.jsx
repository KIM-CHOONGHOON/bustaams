import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Swal from 'sweetalert2';
import BottomNavDriver from '../components/BottomNavDriver';

const PassSelectDriver = () => {
    const navigate = useNavigate();
    const [currentPolicy, setCurrentPolicy] = useState('');
    const [loading, setLoading] = useState(true);

    const plans = [
        {
            id: 'DRIVER_GENNERAL',
            name: '일반',
            price: '300,000',
            desc: '안정적인 시작을 위한 선택',
            features: [
                { text: '월 10회 입찰 참여권', active: true, icon: 'check_circle' },
                { text: '환불: 잔여일수 × ₩10,000', active: true, icon: 'history' },
                { text: '표준 고객 지원', active: false, icon: 'support_agent' }
            ],
            btnText: '요금제 선택하기'
        },
        {
            id: 'DRIVER_MIDDLE',
            name: '중급',
            price: '500,000',
            desc: '본격적인 비즈니스 확장',
            features: [
                { text: '월 20회 입찰 참여권', active: true, bold: true, icon: 'check_circle', filled: true },
                { text: '환불: 잔여일수 × ₩17,000', active: true, icon: 'history' },
                { text: '경매 알림 우선순위 배정', active: true, icon: 'bolt' }
            ],
            btnText: '요금제 선택하기'
        },
        {
            id: 'DRIVER_HIGH',
            name: '고급',
            price: '800,000',
            desc: '베스트 밸류 (BEST VALUE)',
            features: [
                { text: '월 30회 입찰 참여권', active: true, icon: 'check_circle' },
                { text: '환불: 잔여일수 × ₩27,000', active: true, icon: 'history' },
                { text: 'VIP 전담 매니저 배정', active: true, bold: true, icon: 'verified' },
                { text: '수수료 5% 추가 할인', active: true, bold: true, icon: 'trending_up' }
            ],
            btnText: '고급 요금제로 업그레이드',
            isPremium: true
        }
    ];

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await api.get('/app/driver/profile');
            if (response.success) {
                // 백엔드에서 준 feePolicy 사용 (없을 경우 빈 값)
                setCurrentPolicy(response.data.driver.feePolicy || '');
            }
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePlanSelect = async (planId) => {
        if (planId === currentPolicy) return;

        const planName = plans.find(p => p.id === planId)?.name;

        const result = await Swal.fire({
            title: `${planName} 요금제로 변경하시겠습니까?`,
            text: "변경 시 즉시 새로운 혜택이 적용됩니다.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#00695C',
            cancelButtonColor: '#aaa',
            confirmButtonText: '변경하기',
            cancelButtonText: '취소',
            background: '#ffffff',
            customClass: {
                popup: 'rounded-[2rem] font-body',
                title: 'text-primary font-black italic uppercase tracking-tight',
                confirmButton: 'rounded-full px-10 py-4 uppercase font-black text-[10px] tracking-widest',
                cancelButton: 'rounded-full px-10 py-4 uppercase font-black text-[10px] tracking-widest'
            }
        });

        if (result.isConfirmed) {
            try {
                const response = await api.post('/app/driver/membership/update', { feePolicy: planId });
                if (response.success) {
                    await Swal.fire({
                        title: '변경 완료!',
                        text: `${planName} 요금제로 변경되었습니다.`,
                        icon: 'success',
                        confirmButtonColor: '#00695C',
                        customClass: {
                            popup: 'rounded-[2rem] font-body',
                            title: 'text-primary font-black italic uppercase tracking-tight'
                        }
                    });
                    setCurrentPolicy(planId);
                } else {
                    throw new Error(response.error || '변경에 실패했습니다.');
                }
            } catch (error) {
                Swal.fire('오류 발생', error.message, 'error');
            }
        }
    };

    const handleTerminate = async () => {
        const result = await Swal.fire({
            title: '멤버십을 해지하시겠습니까?',
            text: "해지 시 다음 결제일부터 요금이 청구되지 않으며, 잔여 입찰권은 당월 말일까지 사용 가능합니다.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ba1a1a',
            cancelButtonColor: '#aaa',
            confirmButtonText: '해지하기',
            cancelButtonText: '취소',
            customClass: {
                popup: 'rounded-[2rem] font-body',
                confirmButton: 'rounded-full px-8 py-3 uppercase font-bold text-[11px]',
                cancelButton: 'rounded-full px-8 py-3 uppercase font-bold text-[11px]'
            }
        });

        if (result.isConfirmed) {
            try {
                const response = await api.post('/app/driver/membership/terminate');
                if (response.success) {
                    Swal.fire({
                        title: '해지 신청 완료',
                        text: '멤버십 해지가 예약되었습니다. 다음 결제일부터는 요금이 청구되지 않습니다.',
                        icon: 'success',
                        confirmButtonColor: '#00695C',
                        customClass: {
                            popup: 'rounded-[2rem] font-body',
                            title: 'text-primary font-black italic uppercase tracking-tight'
                        }
                    });
                    // 해지 후 상태 업데이트 (필요 시 다시 fetchProfile 하거나 로컬 상태 변경)
                    fetchProfile();
                } else {
                    throw new Error(response.error || '해지 처리 중 오류가 발생했습니다.');
                }
            } catch (error) {
                Swal.fire('오류 발생', error.message, 'error');
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="bg-background text-on-surface min-h-[100dvh] pb-48 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-white/20 py-4">
                <div className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto h-12">
                    <div className="flex items-center gap-6 text-left">
                        <button onClick={() => navigate(-1)} className="text-teal-800 dark:text-teal-400 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-2xl">arrow_back</span>
                        </button>
                        <h1 className="font-headline font-bold tracking-tight text-xl text-teal-900 dark:text-teal-100">Membership</h1>
                    </div>
                </div>
            </header>

            <main className="pt-24 px-6 max-w-md mx-auto space-y-12 animate-in fade-in slide-in-from-bottom duration-1000 text-left">
                {/* Hero Header */}
                <header className="space-y-2 text-left">
                    <span className="text-secondary font-bold text-sm tracking-widest uppercase mb-2 block">Premium Membership</span>
                    <h2 className="text-3xl font-extrabold text-primary tracking-tight leading-tight mb-4">
                        버스탐스 멤버십으로<br/>수익을 극대화하세요.
                    </h2>
                    <p className="text-on-surface-variant text-sm leading-relaxed">
                        회원님의 운행 스타일에 맞는 요금제를 선택하고 더 많은 낙찰 기회를 잡으세요.
                    </p>
                </header>

                {/* Plans List */}
                <div className="space-y-8 text-left">
                    {plans.map(plan => {
                        const isCurrent = plan.id === currentPolicy;
                        return (
                            <section 
                                key={plan.id} 
                                className={`relative bg-white rounded-2xl p-6 shadow-[0_40px_60px_-15px_rgba(0,104,95,0.08)] transition-all duration-300 text-left border border-white group ${isCurrent ? 'border-l-4 border-secondary shadow-[0_40px_60px_-15px_rgba(0,104,95,0.12)]' : 'hover:translate-y-[-4px]'}`}
                            >
                                {isCurrent && (
                                    <div className="absolute -top-3 right-6 bg-secondary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter italic shadow-lg z-10">
                                        현재 이용 중
                                    </div>
                                )}
                                {plan.isPremium && (
                                    <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-700"></div>
                                    </div>
                                )}

                                <div className="flex justify-between items-start mb-6 text-left">
                                    <div className="text-left space-y-1">
                                        <h3 className="text-xl font-bold text-on-surface mb-1">{plan.name}</h3>
                                        {plan.isPremium ? (
                                            <p className="text-secondary font-semibold text-[10px] flex items-center gap-1">
                                                <span className="material-symbols-outlined text-xs" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                                                베스트 밸류
                                            </p>
                                        ) : (
                                            <p className="text-on-surface-variant text-xs">{plan.desc}</p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <span className="text-2xl font-extrabold text-primary italic tracking-tighter">₩{plan.price}</span>
                                        <span className="text-on-surface-variant text-xs block">/ 월</span>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-8 text-left">
                                    {plan.features.map((feat, i) => (
                                        <div key={i} className="flex items-center gap-3 text-left">
                                            <span 
                                                className={`material-symbols-outlined text-lg ${feat.active ? (isCurrent ? 'text-secondary' : 'text-primary-container') : 'text-outline-variant'}`} 
                                                style={feat.filled ? {fontVariationSettings: "'FILL' 1"} : {}}
                                            >
                                                {feat.icon}
                                            </span>
                                            <span className={`text-sm ${feat.active ? (feat.bold ? 'font-bold text-on-surface' : 'font-medium text-on-surface') : 'text-on-surface-variant'}`}>
                                                {feat.text}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <button 
                                    onClick={() => handlePlanSelect(plan.id)}
                                    disabled={isCurrent}
                                    className={`w-full py-4 rounded-full font-bold text-sm transition-all active:scale-95 ${
                                        isCurrent 
                                        ? 'bg-gradient-to-br from-primary to-primary-container text-white shadow-lg shadow-primary/20 cursor-default' 
                                        : 'bg-surface-container-high text-on-surface-variant hover:bg-primary hover:text-white'
                                    }`}
                                >
                                    {isCurrent ? '현재 멤버십 유지' : plan.btnText}
                                </button>
                            </section>
                        );
                    })}
                </div>

                {/* Cancellation & Info Section - Only visible if there is an active plan */}
                {currentPolicy && (
                    <footer className="mt-16 mb-24 text-center">
                        <button 
                            onClick={handleTerminate}
                            className="text-on-surface-variant text-sm font-medium underline underline-offset-4 decoration-outline-variant hover:text-error transition-colors"
                        >
                            요금제 취소하기
                        </button>
                        <p className="mt-6 text-[11px] text-outline leading-relaxed px-4">
                            멤버십 해지 시 다음 결제일부터 요금이 청구되지 않으며,<br/>
                            잔여 입찰권은 당월 말일까지 사용 가능합니다.
                        </p>
                    </footer>
                )}
            </main>

            {/* Bottom Nav */}
            <BottomNavDriver activeTab="profile" />
        </div>
    );
};

export default PassSelectDriver;


