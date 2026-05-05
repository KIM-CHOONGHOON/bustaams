import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Swal from 'sweetalert2';
import BottomNavDriver from '../components/BottomNavDriver';

const CardRegisterDriver = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        cardNickname: '',
        cardNumber: '',
        expiryDate: '',
        birthDate: '',
        cardPwFront: ''
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        // 카드번호 자동 하이픈 및 숫자 제한 로직 (예시)
        if (name === 'cardNumber') {
            const val = value.replace(/[^0-9]/g, '').slice(0, 16);
            setFormData({ ...formData, [name]: val.replace(/(\d{4})(?=\d)/g, '$1-') });
            return;
        }

        if (name === 'expiryDate') {
            const val = value.replace(/[^0-9]/g, '').slice(0, 4);
            if (val.length >= 2) {
                setFormData({ ...formData, [name]: val.slice(0, 2) + '/' + val.slice(2) });
            } else {
                setFormData({ ...formData, [name]: val });
            }
            return;
        }

        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // 간단한 유효성 검사
        if (!formData.cardNumber || formData.cardNumber.length < 15) {
            return Swal.fire('알림', '올바른 카드 번호를 입력해주세요.', 'warning');
        }

        setLoading(true);
        try {
            const response = await api.post('/app/driver/save-card-info', formData);
            if (response.success) {
                await Swal.fire({
                    title: '성공',
                    text: '카드 정보가 안전하게 저장되었습니다.',
                    icon: 'success',
                    confirmButtonColor: '#006a6a'
                });
                navigate('/membership-card-mgmt');
            }
        } catch (error) {
            console.error('Save card error:', error);
            Swal.fire('오류', '카드 저장 중 오류가 발생했습니다.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-background text-on-background min-h-screen font-body pb-12">
            {/* Top AppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-white/10 py-4">
                <div className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto h-12">
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate(-1)} className="text-teal-800 dark:text-teal-400 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-2xl">arrow_back</span>
                        </button>
                        <h1 className="font-headline font-bold tracking-tight text-xl text-teal-900 dark:text-teal-100 italic uppercase text-left">카드 등록</h1>
                    </div>
                </div>
            </header>

            <main className="pt-24 px-6 max-w-lg mx-auto space-y-12 animate-in fade-in slide-in-from-bottom duration-1000 text-left">
                <header className="space-y-4">
                    <span className="text-secondary font-headline font-bold tracking-widest uppercase text-[10px] mb-2 block">Secure Payment</span>
                    <h2 className="font-headline font-extrabold text-4xl text-primary leading-tight tracking-tight">
                        결제 카드 등록
                    </h2>
                    <p className="text-on-surface-variant text-sm leading-relaxed">
                        매월 멤버십 이용료가 자동으로 결제될 카드를 등록합니다. <br/>입력하신 정보는 안전하게 보호됩니다.
                    </p>
                </header>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Card Nickname */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-primary uppercase tracking-widest px-1">카드 별칭 (예: 법인카드, 개인현대)</label>
                        <input 
                            type="text"
                            name="cardNickname"
                            value={formData.cardNickname}
                            onChange={handleChange}
                            placeholder="카드를 구분할 이름을 입력하세요"
                            className="w-full bg-white rounded-3xl p-5 border border-slate-100 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all outline-none text-sm font-bold shadow-sm"
                            required
                        />
                    </div>

                    {/* Card Number */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-primary uppercase tracking-widest px-1">카드 번호</label>
                        <div className="relative">
                            <input 
                                type="text"
                                name="cardNumber"
                                value={formData.cardNumber}
                                onChange={handleChange}
                                placeholder="0000-0000-0000-0000"
                                className="w-full bg-white rounded-3xl p-5 border border-slate-100 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all outline-none text-sm font-bold tracking-[0.2em] shadow-sm"
                                required
                            />
                            <span className="absolute right-5 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-300">credit_card</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Expiry */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-primary uppercase tracking-widest px-1">유효기간 (MM/YY)</label>
                            <input 
                                type="text"
                                name="expiryDate"
                                value={formData.expiryDate}
                                onChange={handleChange}
                                placeholder="MM/YY"
                                className="w-full bg-white rounded-3xl p-5 border border-slate-100 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all outline-none text-sm font-bold shadow-sm"
                                required
                            />
                        </div>
                        {/* Password Front */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-primary uppercase tracking-widest px-1">비밀번호 앞 2자리</label>
                            <input 
                                type="password"
                                name="cardPwFront"
                                value={formData.cardPwFront}
                                onChange={handleChange}
                                placeholder="**"
                                maxLength={2}
                                className="w-full bg-white rounded-3xl p-5 border border-slate-100 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all outline-none text-sm font-bold shadow-sm"
                                required
                            />
                        </div>
                    </div>

                    {/* Birth Date / Business ID */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-primary uppercase tracking-widest px-1">생년월일 6자리 (또는 사업자번호)</label>
                        <input 
                            type="text"
                            name="birthDate"
                            value={formData.birthDate}
                            onChange={handleChange}
                            placeholder="YYMMDD"
                            maxLength={10}
                            className="w-full bg-white rounded-3xl p-5 border border-slate-100 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all outline-none text-sm font-bold shadow-sm"
                            required
                        />
                        <p className="text-[9px] text-on-surface-variant px-1">* 개인카드는 생년월일, 법인카드는 사업자등록번호를 입력해주세요.</p>
                    </div>

                    <div className="pt-6">
                        <button 
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-white py-5 rounded-full font-bold text-sm uppercase tracking-[0.2em] shadow-xl shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-lg">verified_user</span>
                                    정보 저장 및 카드 등록
                                </>
                            )}
                        </button>
                    </div>
                </form>

                <div className="bg-surface-container-low rounded-3xl p-6 border border-primary/5">
                    <p className="text-[10px] text-on-surface-variant leading-relaxed">
                        • 등록된 카드는 다음 정기 결제일부터 자동으로 사용됩니다. <br/>
                        • 카드 정보는 보안 표준을 준수하여 안전하게 관리됩니다.
                    </p>
                </div>
            </main>
            <BottomNavDriver activeTab="profile" />
        </div>
    );
};

export default CardRegisterDriver;
