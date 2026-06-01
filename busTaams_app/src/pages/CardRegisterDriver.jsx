import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Swal from 'sweetalert2';
import BottomNavDriver from '../components/BottomNavDriver';

const CardRegisterDriver = () => {
    const navigate = useNavigate();
    const [cardNickname, setCardNickname] = useState('');
    const [loading, setLoading] = useState(false);
    const [payParams, setPayParams] = useState(null);
    const [userImage, setUserImage] = useState(null);
    const [imageVersion] = useState(Date.now());

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            Swal.fire('로그인 필요', '로그인 후 이용 가능합니다.', 'warning').then(() => {
                navigate('/login', { replace: true });
            });
            return;
        }

        const fetchProfile = async () => {
            try {
                // 기사 프로필 이미지를 가져오기 위해 멤버십 정보 API를 활용합니다.
                const response = await api.get('/app/driver/membership-card-info');
                if (response.success && response.data.userImage) {
                    setUserImage(response.data.userImage);
                }
            } catch (error) {
                console.error('Failed to fetch profile image:', error);
            }
        };
        fetchProfile();
    }, [navigate]);

    // payParams 가 설정되면 결제창 실행
    useEffect(() => {
        if (payParams) {
            // setTimeout을 주어 React가 DOM에 input들을 완전히 반영한 후에 이니시스 SDK를 실행하도록 합니다.
            const timer = setTimeout(() => {
                try {
                    const form = document.getElementById('SendPayForm');
                    console.log('>>> [Payment] Launching Inicis Mobile Payment Page');
                    form.submit();
                } catch (e) {
                    console.error('Failed to launch Inicis Pay:', e);
                    Swal.fire('오류', '결제창을 실행하는 중 오류가 발생했습니다.', 'error');
                    setPayParams(null);
                    setLoading(false);
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [payParams]);

    const handleStartInicis = async (e) => {
        e.preventDefault();
        if (!cardNickname.trim()) {
            return Swal.fire('알림', '카드 식별을 위해 카드 별명을 입력해주세요.', 'warning');
        }

        setLoading(true);
        try {
            // 백엔드로부터 빌링 서명 및 파라미터 획득
            const response = await api.get('/app/driver/inicis-bill-signature');
            if (response.success) {
                setPayParams(response.data);
            } else {
                Swal.fire('오류', response.error || '서명 생성에 실패했습니다.', 'error');
                setLoading(false);
            }
        } catch (err) {
            console.error('Signature fetch error:', err);
            Swal.fire('오류', '서버와 통신하는 중 오류가 발생했습니다.', 'error');
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

                    <div className="flex items-center gap-3">
                        <div 
                            className="w-10 h-10 rounded-xl bg-[#eceef0] overflow-hidden border-2 border-white shadow-sm flex items-center justify-center cursor-pointer hover:shadow-md transition-all"
                            onClick={() => navigate('/driver-dashboard')}
                        >
                            {userImage ? (
                                <img 
                                    alt="User Profile" 
                                    src={userImage.startsWith('http') ? 
                                        `${userImage}${userImage.includes('?') ? '&' : '?'}t=${imageVersion}` : 
                                        `${import.meta.env.VITE_API_BASE_URL || ''}${userImage.startsWith('/') ? '' : '/'}${userImage}${userImage.includes('?') ? '&' : '?'}t=${imageVersion}`} 
                                    className="w-full h-full object-cover" 
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.style.display = 'none';
                                        if (e.target.nextSibling) {
                                            e.target.nextSibling.style.display = 'flex';
                                        }
                                    }}
                                />
                            ) : (
                                <span className="material-symbols-outlined text-[#bec9c6]">person</span>
                            )}
                            {userImage && (
                                <span className="material-symbols-outlined text-[#bec9c6] hidden items-center justify-center w-full h-full">person</span>
                            )}
                        </div>
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
                        매월 멤버십 이용료 결제 카드를 등록합니다. <br/>
                        인증 완료된 카드는 KG이니시스와 약속된 암호화된 정보로 관리되며, 카드번호, 유효일자, CVC정보는 보관하지 않습니다.
                    </p>
                </header>

                {/* 이니시스 모바일 빌라이트(INILite) 정기결제 등록 폼 */}
                <form id="SendPayForm" action="https://inilite.inicis.com/inibill/inibill_card.jsp" method="POST" target="_self" style={{ display: 'none' }}>
                    <input type="hidden" name="mid" value={payParams?.mid || ''} />
                    <input type="hidden" name="authtype" value="D" />
                    <input type="hidden" name="orderid" value={payParams?.oid || ''} />
                    <input type="hidden" name="price" value={payParams?.price || '0'} />
                    <input type="hidden" name="timestamp" value={payParams?.timestamp || ''} />
                    <input type="hidden" name="returnurl" value="https://bustaams.cafe24.com/api/app/driver/inicis-bill-return" />
                    <input type="hidden" name="hashdata" value={payParams?.hashdata || ''} />
                    <input type="hidden" name="merchantReserved" value={payParams ? `${payParams.custId}:${cardNickname}` : ''} />
                </form>

                <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700 shadow-xl space-y-6">
                    {/* Visual Card Mockup */}
                    <div className="relative h-48 w-full rounded-2xl bg-gradient-to-tr from-teal-800 to-emerald-600 text-white p-6 shadow-lg flex flex-col justify-between overflow-hidden">
                        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                        <div className="flex justify-between items-start">
                            <span className="material-symbols-outlined text-3xl opacity-80">wifi_tethering</span>
                            <span className="font-headline font-bold text-lg tracking-wider italic">TAAMS CARD</span>
                        </div>
                        <div className="space-y-4">
                            <div className="text-xl tracking-[0.25em] font-mono opacity-60">•••• •••• •••• ••••</div>
                            <div className="flex justify-between items-end">
                                <div className="space-y-1">
                                    <span className="text-[9px] uppercase tracking-wider opacity-60">Card Nickname</span>
                                    <div className="text-sm font-bold truncate max-w-[200px] h-5">
                                        {cardNickname || '별칭을 입력해주세요'}
                                    </div>
                                </div>
                                <span className="material-symbols-outlined text-4xl opacity-80">credit_card</span>
                            </div>
                        </div>
                    </div>

                    {/* Nickname Input */}
                    <div className="space-y-2">
                        <input 
                            type="text"
                            value={cardNickname}
                            onChange={(e) => setCardNickname(e.target.value)}
                            placeholder="카드 별명 (예 : 개인 현대카드, 회사 국민카드)"
                            className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-100 dark:border-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all outline-none text-sm font-bold shadow-sm dark:text-white placeholder:text-rose-600 dark:placeholder:text-rose-400"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="pt-4">
                        <button 
                            onClick={handleStartInicis}
                            disabled={loading}
                            className="w-full bg-primary text-white py-5 rounded-xl font-bold text-xs uppercase tracking-[0.08em] shadow-xl shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-base">lock</span>
                                    안전한 이니시스 카드 등록 시작
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="bg-surface-container-low rounded-2xl p-6 border border-primary/5">
                    <p className="text-[10px] text-on-surface-variant leading-relaxed">
                        • 등록된 카드는 다음 멤버십 정기 결제일에 자동으로 사용됩니다. <br/>
                        • 카드 정보는 이니시스 보안 결제창을 통해 암호화되며, 가맹점에는 카드 번호가 직접 저장되지 않고 안전한 빌링키 형태로만 보관됩니다.
                    </p>
                </div>
            </main>
            <BottomNavDriver activeTab="profile" />
        </div>
    );
};

export default CardRegisterDriver;
