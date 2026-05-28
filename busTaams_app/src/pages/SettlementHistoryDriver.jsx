import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import BottomNavDriver from '../components/BottomNavDriver';

const SettlementHistoryDriver = () => {
    const navigate = useNavigate();
    const [userImage, setUserImage] = useState(null);
    const [imageVersion] = useState(Date.now());

    // 💰 정산 데이터 상태 관리 (한글 주석)
    const [selectedYear, setSelectedYear] = useState('2026');
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState({
        year: 2026,
        totalAmount: 0,
        nextSettlementDate: '2026.06.12',
        pendingAmount: 0
    });
    const [monthlyData, setMonthlyData] = useState([]);
    const [allDetails, setAllDetails] = useState([]);
    const [selectedMonthDetails, setSelectedMonthDetails] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentDetailMonth, setCurrentDetailMonth] = useState('');

    // 기사 프로필 이미지 로드
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await api.get('/app/driver/membership-card-info');
                if (response.success && response.data.userImage) {
                    setUserImage(response.data.userImage);
                }
            } catch (error) {
                console.error('Failed to fetch profile image:', error);
            }
        };
        fetchProfile();
    }, []);

    // 💰 정산 데이터 연동 로드 (한글 주석)
    useEffect(() => {
        const fetchSettlementData = async () => {
            setLoading(true);
            try {
                const response = await api.get(`/app/driver/settlement-history?year=${selectedYear}`);
                if (response.success && response.data) {
                    setSummary(response.data.summary);
                    setMonthlyData(response.data.monthlyData);
                    setAllDetails(response.data.details);
                }
            } catch (error) {
                console.error('Failed to fetch settlement history:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettlementData();
    }, [selectedYear]);

    // 연도 필터 버튼 동적 생성 (시작연도 2026년)
    const startYear = 2026;
    const currentYear = new Date().getFullYear();
    const yearButtons = [];
    for (let y = startYear; y <= Math.max(startYear, currentYear); y++) {
        yearButtons.push(String(y));
    }

    // 상세내역 팝업 모달 열기
    const handleOpenDetails = (monthName) => {
        const details = allDetails.filter(d => {
            const mKey = `${d.yyyyyMMdd.substring(0, 4)}년 ${d.yyyyyMMdd.substring(4, 6)}월`;
            return mKey === monthName;
        });
        setSelectedMonthDetails(details);
        setCurrentDetailMonth(monthName);
        setIsModalOpen(true);
    };

    return (
        <div className="bg-background text-on-surface min-h-[100dvh] pb-40 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/40 backdrop-blur-3xl border-b border-white/20 py-6">
                <div className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto">
                    <div className="flex items-center gap-6 text-left">
                        <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-xl text-teal-800 shadow-xl shadow-teal-900/5 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                        </button>
                        <h1 className="font-headline font-black tracking-tighter text-3xl text-teal-900 italic uppercase">정산 내역</h1>
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

            <main className="pt-48 px-6 max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom duration-1000 text-left">
                {/* Header Information Section */}
                <section className="text-left">
                    <div className="max-w-2xl space-y-6 text-left">
                        <span className="text-secondary font-black tracking-[0.4em] uppercase text-[10px] block px-2 italic">수익 및 정산 관리</span>
                        <h2 className="font-headline text-6xl md:text-8xl font-black text-primary leading-[0.85] tracking-tighter italic uppercase text-left">
                            정산 <br/><span className="text-slate-200 underline decoration-slate-200/20 underline-offset-[12px]">내역서.</span>
                        </h2>
                        <p className="text-slate-400 text-lg font-bold italic tracking-tight leading-relaxed text-left border-l-4 border-slate-50 pl-8">
                            {selectedYear}년 총 정산 금액: <span className="text-teal-600 font-black text-3xl not-italic ml-2">₩{summary.totalAmount.toLocaleString()}</span>
                        </p>
                    </div>
                </section>

                {/* Filters */}
                <nav className="flex flex-wrap items-center gap-6 text-left px-4">
                    {yearButtons.map(year => (
                        <button 
                            key={year}
                            onClick={() => setSelectedYear(year)}
                            className={`${selectedYear === year ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'bg-white text-slate-400 border border-slate-50 hover:bg-slate-50'} px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest italic transition-all`}
                        >
                            {year}년 정산 내역
                        </button>
                    ))}
                    <div className="ml-auto flex items-center gap-3 text-slate-300 font-black text-[9px] uppercase tracking-widest italic">
                        <span className="material-symbols-outlined text-sm">filter_list</span>
                        정렬 방식
                    </div>
                </nav>

                {/* Transactions List */}
                {loading ? (
                    <div className="flex justify-center items-center py-24">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div>
                    </div>
                ) : monthlyData.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-2xl shadow-teal-900/5">
                        <span className="material-symbols-outlined text-4xl text-slate-200 mb-2">info</span>
                        <p className="text-slate-400 text-sm font-bold italic">조회된 정산 내역이 없습니다.</p>
                    </div>
                ) : (
                    <div className="space-y-8 text-left uppercase animate-in fade-in duration-500">
                        {monthlyData.map((item, idx) => (
                            <div key={idx} className="grid grid-cols-1 md:grid-cols-12 items-center bg-white p-10 rounded-2xl shadow-xl shadow-teal-900/5 hover:-translate-x-2 transition-all duration-500 border border-slate-50 group text-left">
                                <div className="md:col-span-3 mb-6 md:mb-0 text-left">
                                    <span className="block font-black text-primary italic text-xl tracking-tighter">{item.month}</span>
                                    <span className="text-slate-300 text-[9px] font-black uppercase tracking-widest italic">총 운행/취소 {item.count}건</span>
                                </div>
                                <div className="md:col-span-4 mb-6 md:mb-0 text-left">
                                    <div className="flex items-center gap-6 text-left">
                                        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                                            <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>
                                        </div>
                                        <div className="text-left space-y-1">
                                            <span className="block font-black text-primary text-xs italic tracking-widest">정산 내역서 발행</span>
                                            <span className="text-slate-300 text-[8px] font-bold italic tracking-tighter">SET-{selectedYear}{String(idx + 1).padStart(2, '0')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="md:col-span-3 mb-8 md:mb-0 text-left flex flex-col">
                                    <span className="text-3xl font-black text-primary italic tracking-tighter leading-none">₩{item.amount.toLocaleString()}</span>
                                    <span className="text-[8px] text-secondary font-black tracking-widest italic mt-2">정상 집계 완료</span>
                                </div>
                                <div className="md:col-span-2 flex justify-end gap-4 text-left">
                                    <button 
                                        onClick={() => handleOpenDetails(item.month)}
                                        className="flex items-center gap-3 bg-slate-50 text-slate-400 px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest italic hover:bg-primary hover:text-white transition-all shadow-sm"
                                    >
                                         <span className="material-symbols-outlined text-lg">description</span>
                                         상세내역
                                     </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}



            </main>

            {/* 💰 정산 상세 내역 모달 팝업 (한글 주석) */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 text-left animate-in zoom-in-95 duration-300">
                        {/* 모달 헤더 */}
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-headline font-black text-2xl text-slate-800 italic uppercase">{currentDetailMonth} 정산 상세서</h3>
                                <p className="text-slate-400 text-xs mt-1">해당 월의 정산 금액 계산 산식 및 예약 정보를 확인하세요.</p>
                            </div>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center shadow-inner"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>

                        {/* 모달 바디 */}
                        <div className="p-8 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
                            {selectedMonthDetails.length === 0 ? (
                                <div className="text-center py-20">
                                    <span className="material-symbols-outlined text-4xl text-slate-200 mb-2">info</span>
                                    <p className="text-slate-400 text-sm font-bold italic">조회된 정산 상세 내역이 없습니다.</p>
                                </div>
                            ) : (
                                selectedMonthDetails.map((detail, dIdx) => {
                                    let statusText = '';
                                    let statusColor = '';
                                    if (detail.dataStat === 'DONE') {
                                        statusText = '운행 완료';
                                        statusColor = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                                    } else if (detail.dataStat === 'TRAVELER_CANCEL') {
                                        statusText = '여행자 취소';
                                        statusColor = 'bg-amber-50 text-amber-600 border-amber-100';
                                    } else if (detail.dataStat === 'DRIVER_CANCEL') {
                                        statusText = '기사 취소';
                                        statusColor = 'bg-rose-50 text-rose-600 border-rose-100';
                                    }

                                    // 계산 공식 설명 텍스트
                                    let formulaText = '';
                                    if (detail.dataStat === 'DONE') {
                                        if (detail.isAttribution) {
                                            formulaText = `입찰 금액 (₩${detail.biddingPrice.toLocaleString()}) - 혜택수수료 (₩${detail.feeAttribution.toLocaleString()}) [회원 등급 혜택 적용 - ${detail.doneSeq}회차]`;
                                        } else {
                                            formulaText = `입찰 금액 (₩${detail.biddingPrice.toLocaleString()}) - 기본수수료 (₩${detail.feeTotal.toLocaleString()}) [혜택 횟수 초과 - ${detail.doneSeq}회차]`;
                                        }
                                    } else if (detail.dataStat === 'TRAVELER_CANCEL') {
                                        formulaText = `여행자 취소 위약금 정산 (₩${detail.feeRefund.toLocaleString()})`;
                                    } else if (detail.dataStat === 'DRIVER_CANCEL') {
                                        formulaText = '기사 귀책 취소로 인한 정산 금액 미발생';
                                    }

                                    return (
                                        <div 
                                            key={detail.resId} 
                                            className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between gap-4 hover:border-primary/20 transition-all duration-300 group"
                                        >
                                            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black border uppercase tracking-wider ${statusColor}`}>
                                                            {statusText}
                                                        </span>
                                                        <span className="text-slate-300 text-[9px] font-black uppercase tracking-widest italic">
                                                            정산일: {detail.yyyyyMMdd.substring(0, 4)}-{detail.yyyyyMMdd.substring(4, 6)}-{detail.yyyyyMMdd.substring(6, 8)}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-headline font-black text-xl text-primary leading-tight italic uppercase">{detail.tripTitle}</h4>
                                                    <p className="text-slate-400 text-xs font-bold italic leading-relaxed">
                                                        경로: {detail.startAddr} → {detail.endAddr}
                                                    </p>
                                                    <p className="text-slate-400 text-[10px] font-medium leading-relaxed">
                                                        운행 기간: {detail.startDt} ~ {detail.endDt}
                                                    </p>
                                                </div>
                                                <div className="text-left md:text-right space-y-1">
                                                    <span className="text-slate-300 text-[8px] font-black tracking-widest block">예약 ID</span>
                                                    <span className="text-slate-700 text-xs font-mono font-bold">{detail.resId}</span>
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                                                <div className="space-y-1">
                                                    <span className="text-slate-300 text-[8px] font-black tracking-widest block">정산 계산 산식</span>
                                                    <p className="text-slate-600 text-xs font-bold italic leading-relaxed pl-3 border-l-2 border-slate-200">
                                                        {formulaText}
                                                    </p>
                                                </div>
                                                <div className="text-right w-full md:w-auto">
                                                    <span className="text-slate-300 text-[8px] font-black tracking-widest block">최종 정산금액</span>
                                                    <span className="text-3xl font-headline font-black text-teal-600 italic tracking-tighter">
                                                        ₩{detail.settlementAmount.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* 모달 푸터 */}
                        <div className="px-8 py-5 border-t border-slate-100 flex justify-end bg-slate-50 gap-4">
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="bg-primary text-white px-8 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest italic shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                            >
                                확인 완료
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <BottomNavDriver activeTab="settlement" />
        </div>
    );
};

export default SettlementHistoryDriver;
