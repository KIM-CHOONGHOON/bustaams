import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { getDriverProfile } from '../api';
import { notify } from '../utils/toast';
import BottomNavDriver from '../components/BottomNavDriver';

const ContractCancelDriver = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [trip, setTrip] = useState(null);
    const [reasons, setReasons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userProfileImg, setUserProfileImg] = useState('');
    
    // Form state
    const [selectedReason, setSelectedReason] = useState('');
    const [reasonDetail, setReasonDetail] = useState('');
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState('증빙 서류 선택하기');

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. 기사 프로필 정보 조회 (헤더용)
                const profRes = await getDriverProfile();
                if (profRes.success && profRes.data) {
                    setUserProfileImg(profRes.data.driver?.profileImg || '');
                }

                // 2. 상세 정보 조회
                const tripRes = await api.get(`/app/driver/mission-detail/${id}`);
                if (tripRes.success) {
                    setTrip(tripRes.data);
                }

                // 3. 취소 사유 코드 조회
                const codeRes = await api.get('/common/codes/DRIVER_CANCEL_REASON');
                if (codeRes.success) {
                    setReasons(codeRes.data);
                    if (codeRes.data && codeRes.data.length > 0) {
                        setSelectedReason(codeRes.data[0].code);
                    }
                }
            } catch (err) {
                console.error('Fetch data error:', err);
                notify.error('오류', '데이터를 불러오는데 실패했습니다.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setFileName(selectedFile.name);
        }
    };

    const handleSubmit = async () => {
        if (!selectedReason) {
            notify.error('알림', '취소 사유를 선택해주세요.');
            return;
        }

        const confirmed = await notify.confirm('계약 취소 확정', '정말로 이 계약을 취소하시겠습니까? 취소 시 패널티가 발생할 수 있습니다.');
        if (!confirmed) return;

        try {
            const formData = new FormData();
            formData.append('cancelCode', selectedReason);
            formData.append('cancelReasonText', reasonDetail);
            if (file) {
                formData.append('reasonDoc', file);
            }

            const res = await api.post(`/app/driver/cancel-mission/${id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.success) {
                notify.success('취소 완료', '계약 취소 요청이 성공적으로 처리되었습니다.');
                navigate('/driver-dashboard');
            } else {
                notify.error('오류', res.error || '취소 처리 중 오류가 발생했습니다.');
            }
        } catch (err) {
            console.error('Submit error:', err);
            notify.error('오류', '서버와의 통신 중 오류가 발생했습니다.');
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
            <header className="fixed top-0 w-full z-50 bg-white/40 backdrop-blur-3xl border-b border-white/20 py-6">
                <div className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto">
                    <div className="flex items-center gap-6 text-left">
                        <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-xl text-teal-800 shadow-xl shadow-teal-900/5 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                        </button>
                        <h1 className="font-headline font-black tracking-tighter text-3xl text-teal-900 italic uppercase font-bold">배차 취소</h1>
                    </div>
                    <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow-2xl">
                        <img alt="User profile" src={userProfileImg || "https://lh3.googleusercontent.com/aida-public/AB6AXuBkXnRby57bMmx-82a0JjIO8LPiCDeaQ0U_GCsku9ZS2PpZ5EyCVJDmarP2ZybvsC8AXal0-p0hSX5KjlFmsZQUIq3xpc9GFOvnsu28beTJKUWb_zbKq2Aaj2eYVimhMegEAlH3tiJM6V5VOYIzieqo6bNrX3Gykb4w3K4JS62E-FF1Y2Gc_EGaGP6tNe9dMVLwT1eEtLl-iLKFw3jLkaFckb-FQzEOufgWPvws2brzSwqCuBnEXVH_XVDA5Eyc3TobTDo6vojY0VU"} />
                    </div>
                </div>
            </header>

            <main className="pt-48 px-6 max-w-5xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom duration-1000 text-left">
                {/* Editorial Header Section */}
                <section className="space-y-6 text-left border-l-8 border-secondary pl-8">
                    <div className="inline-flex items-center gap-3 px-5 py-2 rounded-xl bg-secondary/10 text-secondary font-black text-[10px] tracking-widest uppercase italic">
                        <span className="material-symbols-outlined text-sm" style={{fontVariationSettings: "'FILL' 1"}}>warning</span>
                        위기 관리 프로토콜: 배차 관리
                    </div>
                    <h2 className="font-headline font-black text-6xl md:text-8xl text-primary leading-[0.85] tracking-tighter italic uppercase text-left">
                        취소 사유 <br/><span className="text-secondary underline decoration-secondary/20 underline-offset-[12px]">검토하기.</span>
                    </h2>
                    <p className="text-slate-400 text-xl font-bold italic tracking-tight leading-relaxed max-w-xl text-left">
                        배차 취소를 진행하기 전, 취소에 따른 정책과 페널티를 신중히 검토해 주시기 바랍니다.
                    </p>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-12 text-left">
                    {/* Left Column: Context Carrier */}
                    <div className="md:col-span-7 space-y-10 text-left">
                        {/* Auction Context Card */}
                        <div className="bg-white rounded-2xl p-10 shadow-2xl shadow-teal-900/5 relative overflow-hidden text-left border border-white group">
                            <div className="absolute top-0 left-0 w-2 h-full bg-primary"></div>
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em] mb-4 italic">운행 상세 정보</p>
                            
                            <div className="flex items-start gap-10 text-left">
                                <div className="w-32 h-32 rounded-xl overflow-hidden bg-slate-50 shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-500">
                                    <img alt="Mission Fleet" className="w-full h-full object-cover" src={trip?.busImg || "https://lh3.googleusercontent.com/aida-public/AB6AXuBNKj3N5hx9OndQicfEVhE4Ked2edaPMEFLI5afQoo20mhsqyYEeM32PHAKFHsAwH_tE0vqV4IAAf1CWvxyWTClUeE7WectMyClZ3SlzGfXJk15-yWVKl-LhTDEguNTzmMqxINJoRBsI1pu6iF4ASkVXp14mEuIWzppjEenJphzRlHb7p93cmdAybzFD6bSKnFqeBIrTFpvVzT3WdCXhhr19s8X6tqWxrO2hOD3Ki-JZKkmnoAHycX2L5E2bSUJTbaQO-FmuC_nbKo"} />
                                </div>
                                <div className="space-y-4 text-left">
                                    <h3 className="text-3xl font-black text-primary italic uppercase tracking-tighter leading-none text-left">{trip?.busModel || '버스 모델 정보'}</h3>
                                    <p className="text-slate-400 font-bold italic text-sm leading-none uppercase tracking-widest underline decoration-slate-100 underline-offset-4">배차 번호: #{trip?.resId || 'N/A'}</p>
                                    
                                    <div className="grid grid-cols-1 gap-4 pt-4 text-left">
                                        <div className="bg-slate-50 px-6 py-4 rounded-xl flex justify-between items-center text-left">
                                            <span className="text-[8px] font-black uppercase text-slate-300 italic">최종 낙찰가</span>
                                            <span className="font-black text-primary italic text-lg tracking-tighter">₩{(trip?.price || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="bg-slate-50 px-6 py-4 rounded-xl flex justify-between items-center text-left">
                                            <span className="text-[8px] font-black uppercase text-slate-300 italic">운행 예정일</span>
                                            <span className="font-black text-primary italic text-sm tracking-tight text-left italic">{trip?.startDate || '일정 정보 없음'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Input Form Card */}
                        <div className="bg-white rounded-2xl p-10 shadow-2xl shadow-teal-900/5 space-y-8 text-left border border-white">
                            <h3 className="text-2xl font-black text-primary italic uppercase tracking-tighter leading-none text-left">취소 상세 정보 입력</h3>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">취소 사유 선택</label>
                                    <select 
                                        value={selectedReason}
                                        onChange={(e) => setSelectedReason(e.target.value)}
                                        className="w-full p-6 rounded-xl bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white transition-all outline-none font-bold text-sm italic"
                                    >
                                        <option value="" disabled>취소 사유를 선택하세요</option>
                                        {reasons.map(reason => (
                                            <option key={reason.code} value={reason.code}>{reason.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">상세 사유 (선택)</label>
                                    <textarea 
                                        value={reasonDetail}
                                        onChange={(e) => setReasonDetail(e.target.value)}
                                        placeholder="구체적인 취소 사유를 입력해주세요."
                                        className="w-full p-6 h-40 rounded-xl bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white transition-all outline-none font-bold text-sm italic resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">증빙 서류 첨부 (선택)</label>
                                    <div className="relative group">
                                        <input 
                                            type="file" 
                                            id="reasonDoc" 
                                            className="hidden" 
                                            onChange={handleFileChange}
                                        />
                                        <button 
                                            onClick={() => document.getElementById('reasonDoc').click()}
                                            className="w-full p-6 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 font-black text-xs uppercase tracking-widest hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-3 italic"
                                        >
                                            <span className="material-symbols-outlined">attach_file</span>
                                            {fileName}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Consequences Bento Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-left">
                            <div className="bg-slate-50 p-8 rounded-xl border-2 border-white space-y-4 text-left">
                                <span className="material-symbols-outlined text-secondary text-4xl" style={{fontVariationSettings: "'FILL' 1"}}>account_balance_wallet</span>
                                <h4 className="font-black text-on-surface italic uppercase tracking-tighter text-xl text-left leading-none">패널티 정책</h4>
                                <p className="text-sm font-bold text-slate-400 italic leading-relaxed text-left">기사님의 귀책으로 인한 취소 시, 회차에 따라 서비스 이용이 제한될 수 있습니다.</p>
                            </div>
                            <div className="bg-secondary/5 p-8 rounded-xl border-2 border-secondary/5 space-y-4 text-left">
                                <span className="material-symbols-outlined text-error text-4xl">block</span>
                                <h4 className="font-black text-on-surface italic uppercase tracking-tighter text-xl text-left leading-none">이용 제한 단계</h4>
                                <p className="text-sm font-bold text-slate-400 italic leading-relaxed text-left">1회: 1주일, 2회: 2주일, 3회 이상: 무기한 이용 제한이 적용됩니다.</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Execution Core */}
                    <aside className="md:col-span-5 space-y-8 text-left">
                        <div className="bg-slate-900 rounded-2xl p-12 relative overflow-hidden text-left shadow-2xl shadow-slate-900/40 sticky top-48">
                            <div className="absolute top-6 right-8 opacity-5">
                                <span className="material-symbols-outlined text-9xl text-white" style={{fontVariationSettings: "'FILL' 1"}}>priority_high</span>
                            </div>
                            
                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-8 text-left leading-none border-l-8 border-secondary pl-6">최종 확인</h3>
                            <p className="text-sm font-bold text-slate-400 italic leading-relaxed mb-10 text-left">
                                지금 취소를 확정하면 예약자에게 즉시 알림이 전송되며, 기사님의 프로필에 <span className="text-secondary underline underline-offset-4 decoration-2">운행 취소</span> 기록이 남게 됩니다.
                            </p>

                            <ul className="space-y-6 mb-12 text-left">
                                <li className="flex gap-4 items-center text-left">
                                    <span className="material-symbols-outlined text-primary">check_circle</span>
                                    <span className="text-sm font-black text-white italic uppercase tracking-widest text-left">취소 정책 숙지 동의</span>
                                </li>
                                <li className="flex gap-4 items-center text-left">
                                    <span className="material-symbols-outlined text-secondary">history</span>
                                    <span className="text-sm font-black text-white italic uppercase tracking-widest text-left">취소 카운트 반영</span>
                                </li>
                            </ul>

                            <button 
                                onClick={handleSubmit}
                                className="w-full py-4 rounded-xl bg-gradient-to-br from-secondary to-orange-600 text-white font-black text-xl italic uppercase tracking-[0.2em] shadow-2xl shadow-secondary/30 hover:scale-[1.02] active:scale-95 transition-all mb-6"
                            >
                                배차 취소 확정
                            </button>
                            <button onClick={() => navigate(-1)} className="w-full py-4 rounded-xl bg-white/5 text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] hover:bg-white/10 transition-all italic">
                                배차 상태 유지
                            </button>
                        </div>

                        <div className="px-6 text-left">
                            <p className="text-[9px] text-slate-300 font-black uppercase tracking-[0.3em] leading-loose italic text-left">
                                *취소를 확정함으로써 귀하는 서비스 약관 제4.2조(배차 무결성 및 신뢰성)를 숙지하고 이에 동의하는 것으로 간주됩니다.
                            </p>
                        </div>
                    </aside>
                </div>
            </main>

            <BottomNavDriver />
        </div>
    );
};

export default ContractCancelDriver;
