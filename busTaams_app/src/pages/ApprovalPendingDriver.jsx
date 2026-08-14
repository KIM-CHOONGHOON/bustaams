import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { request, getDriverProfile } from '../api';
import BottomNavDriver from '../components/BottomNavDriver';
import { notify } from '../utils/toast';

const ApprovalPendingDriver = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const tabParam = searchParams.get('tab') || 'customer_wait';
    const [activeTab, setActiveTab] = useState(tabParam);

    const [bids, setBids] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userImage, setUserImage] = useState('');
    const [driverProfile, setDriverProfile] = useState(null);

    useEffect(() => {
        const queryTab = searchParams.get('tab');
        if (queryTab && queryTab !== activeTab) {
            setActiveTab(queryTab);
        }
    }, [searchParams]);

    // KG 이니시스 카드 결제 창 호출 함수 (한글 주석)
    const initiateDriverPayment = async (bid) => {
        try {
            // 1. 서버에서 결제 준비 데이터 가져오기 (isDriver: true 전달)
            const res = await request('/payment/ready', {
                method: 'POST',
                body: JSON.stringify({
                    resId: bid.id,
                    reqId: bid.reqId,
                    price: bid.feeTotalAmt,
                    isDriver: true,
                    goodname: `${bid.title} 데이터 이용료 결제`,
                    buyername: driverProfile?.driver?.custNm || '기사님',
                    buyertel: driverProfile?.driver?.phoneNo || '010-0000-0000',
                    buyeremail: driverProfile?.driver?.email || 'driver@example.com'
                })
            });

            const data = res;

            // 2. 폼 데이터 설정
            const form = document.getElementById('SendPayForm');
            if (!form) {
                notify.error('오류 발생', '결제 폼을 찾을 수 없습니다.');
                return;
            }

            const finalGoodName = `BusTaams_Fee`;
            const cleanBuyerName = `Driver`;
            const cleanMobile = (data.buyertel || '').replace(/[^0-9]/g, '');

            const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
                (navigator.maxTouchPoints && navigator.maxTouchPoints > 1) ||
                window.innerWidth < 1024;

            if (isMobile) {
                console.log('>>> [Driver Payment] Launching Mobile Payment Page:', data.oid);
                form.action = "https://mobile.inicis.com/smart/payment/";
                form.target = "_self";
                form.method = "POST";

                form.P_MID.value = data.mid;
                form.P_OID.value = data.oid;
                form.P_AMT.value = data.price;
                form.P_GOODS.value = finalGoodName;
                form.P_UNAME.value = cleanBuyerName;
                form.P_MOBILE.value = cleanMobile;
                form.P_EMAIL.value = data.buyeremail;
                form.P_NEXT_URL.value = data.returnUrl;
                form.P_RESERVED.value = "vbank_receipt=Y";
                form.P_INI_PAYMENT.value = "CARD";
                form.P_CHARSET.value = "euc-kr";

                form.submit();
            } else {
                console.log('>>> [Driver Payment] Launching PC Web Standard Pay:', data.oid);
                form.removeAttribute('action');
                form.removeAttribute('target');
                form.method = "POST";

                form.version.value = "1.0";
                form.mid.value = data.mid;
                form.oid.value = data.oid;
                form.price.value = data.price;
                form.timestamp.value = data.timestamp;
                form.signature.value = data.signature;
                form.mKey.value = data.mKey;
                form.currency.value = "WON";
                form.goodname.value = finalGoodName;
                form.buyername.value = cleanBuyerName;
                form.buyertel.value = cleanMobile;
                form.buyeremail.value = data.buyeremail;
                form.returnUrl.value = `${window.location.origin}/api/payment/return`;
                form.closeUrl.value = `${window.location.origin}/close-payment`;
                form.gopaymethod.value = "Card";

                window.INIStdPay.pay(form);
            }
        } catch (error) {
            console.error('Driver payment initiation error:', error);
            notify.error('오류 발생', error.message || '결제 요청 중 오류가 발생했습니다.');
        }
    };

    // 기사 이용대금 결제 처리 함수 (한글 주석)
    const handleDriverPay = async (bid) => {
        const feeAmt = bid.feeTotalAmt || Math.floor((bid.price || 0) * 0.022);
        const confirmed = await notify.confirm(
            '데이터 이용료 결재 및 배차 확정',
            `'${bid.title}' 건의 데이터 이용료 ${feeAmt.toLocaleString()}원을 결제하고 배차를 확정하시겠습니까?`,
            '결재 및 배차 확정',
            '취소'
        );

        if (!confirmed) return;

        // PG 카드결제 창 띄우기
        await initiateDriverPayment(bid);
    };

    // 입찰 취소 처리 함수 (한글 주석)
    const handleCancelBid = async (id) => {
        const confirmed = await notify.confirm(
            '입찰을 취소하시겠습니까?',
            '취소된 입찰은 되돌릴 수 없으며 다시 경매 입찰에 참여할 수 있게 됩니다.',
            '입찰 취소',
            '뒤로가기'
        );

        if (!confirmed) return;

        try {
            const result = await request(`/app/driver/cancel-bid/${id}`, {
                method: 'POST'
            });

            if (result.success) {
                await notify.success('입찰 취소 완료', '입찰이 성공적으로 취소되었습니다.');
                fetchData();
            } else {
                await notify.error('입찰 취소 실패', result.error || '오류가 발생했습니다.');
            }
        } catch (err) {
            console.error('Cancel bid error:', err);
            await notify.error('입찰 취소 실패', err.message || '서버 통신 오류가 발생했습니다.');
        }
    };

    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
        setSearchParams({ tab: newTab });
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const profRes = await getDriverProfile();
            if (profRes.success && profRes.data) {
                setDriverProfile(profRes.data);
                setUserImage(profRes.data.driver?.profileImg || '');
            }

            const res = await request(`/app/driver/bids/waiting?tab=${activeTab}`);
            if (res.success) {
                setBids(res.data);
            }
        } catch (err) {
            console.error('Fetch waiting bids error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    return (
        <div className="bg-[#f7f9fb] text-[#191c1e] min-h-screen pb-32 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-sm border-b border-slate-100 py-4 h-16 flex items-center">
                <div className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-xl transition-all active:scale-95 duration-200">
                            <span className="material-symbols-outlined text-2xl text-slate-600">arrow_back</span>
                        </button>
                        <h1 className="font-headline font-black tracking-tighter text-2xl text-[#004e47] italic">승인 대기 목록</h1>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                        {userImage ? (
                            <img alt="User profile" className="w-full h-full object-cover" src={userImage} />
                        ) : (
                            <span className="material-symbols-outlined text-slate-400 flex items-center justify-center h-full">person</span>
                        )}
                    </div>
                </div>
            </header>

            <main className="pt-24 px-6 max-w-7xl mx-auto">
                {/* 3개 단계 탭 선택 바 (한글 주석) */}
                <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8 border border-slate-200/60 shadow-inner">
                    <button 
                        onClick={() => handleTabChange('customer_wait')}
                        className={`flex-1 py-3 px-3 rounded-xl text-xs md:text-sm font-bold transition-all ${activeTab === 'customer_wait' ? 'bg-white text-[#004e47] shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        승인대기 목록
                    </button>
                    <button 
                        onClick={() => handleTabChange('driver_pay')}
                        className={`flex-1 py-3 px-3 rounded-xl text-xs md:text-sm font-bold transition-all ${activeTab === 'driver_pay' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        결제 대기 목록
                    </button>
                    <button 
                        onClick={() => handleTabChange('final_approval_wait')}
                        className={`flex-1 py-3 px-3 rounded-xl text-xs md:text-sm font-bold transition-all ${activeTab === 'final_approval_wait' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        고객 최종 승인대기 목록
                    </button>
                </div>

                {/* Editorial Header Section */}
                <section className="mb-8">
                    <div className="text-left">
                        <p className="text-[#3e4947] text-sm font-medium leading-relaxed">
                            {activeTab === 'customer_wait' && '기사님이 제출하신 응찰 건입니다. 고객님의 1차 선택 및 데이터 이용료 결재를 기다리는 중입니다.'}
                            {activeTab === 'driver_pay' && '고객 결제 완료! 데이터 이용료를 결재하시면 배차가 최종 확정됩니다.'}
                            {activeTab === 'final_approval_wait' && '기사 데이터 이용료 결재가 완료되었습니다. 고객님의 최종 승인 버튼 클릭을 기다리는 중입니다.'}
                        </p>
                    </div>
                </section>



                {/* Pending Items List */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 border-4 border-[#004e47] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : bids.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {bids.map((bid) => (
                            <div key={bid.id} className="bg-white p-8 relative overflow-hidden transition-all duration-500 hover:shadow-[0_40px_80px_-20px_rgba(0,104,95,0.15)] rounded-2xl border border-slate-100 flex flex-col justify-between group">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-125 group-hover:rotate-12 transition-all">
                                    <span className="material-symbols-outlined text-[80px]" style={{fontSize: '80px'}}>pending_actions</span>
                                </div>
                                
                                <div className="relative z-10">
                                    <h3 className="text-2xl font-black text-[#004e47] mb-4 italic tracking-tight">{bid.title}</h3>
                                    
                                    {/* 운행 일정 */}
                                    <div className="flex items-center gap-4 border-b border-slate-100 pb-6 text-left mb-6">
                                        <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shadow-sm flex-shrink-0">
                                            <span className="material-symbols-outlined text-orange-600 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_today</span>
                                        </div>
                                        <div className="flex flex-col text-left">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic mb-1">
                                                운행 일정
                                            </p>
                                            <p className="text-lg font-black text-[#1E293B] leading-snug">
                                                {bid.startDt ? bid.startDt.split(' ')[0].replace(/[-/]/g, '.') : ''} -
                                            </p>
                                            <p className="text-lg font-black text-[#1E293B] leading-snug">
                                                {bid.endDt ? bid.endDt.split(' ')[0].replace(/[-/]/g, '.') : ''}
                                            </p>
                                        </div>
                                    </div>

                                    {/* 여행 경로 타이틀 */}
                                    <h4 className="text-base font-black pb-3 border-b border-slate-50 flex items-center gap-2 italic text-teal-800 mb-6">
                                        <span className="material-symbols-outlined text-primary text-lg" style={{fontVariationSettings: "'FILL' 1"}}>route</span>
                                        여행 경로
                                    </h4>

                                    {/* 전체 운행 경로 타임라인 표시 (한글 주석) */}
                                    <div className="mt-6 space-y-8 relative">
                                        <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-100"></div>
                                        {bid.fullPath && bid.fullPath.map((path, idx) => {
                                            const isStart = idx === 0;
                                            const isEnd = idx === bid.fullPath.length - 1;
                                            const isDest = path.label === '목적지';
                                            const pointType = isStart ? 'START' : isEnd ? 'END' : isDest ? 'ROUND_TRIP' : 'WAYPOINT';
                                            
                                            return (
                                                <div key={idx} className="relative pl-12 text-left">
                                                    {/* 타임라인 둥근 배지 포인트 */}
                                                    <div className={`absolute left-0 top-1.5 w-8 h-8 rounded-full border-4 border-white shadow-md z-10 flex items-center justify-center ${
                                                        pointType === 'START' ? 'bg-teal-600 text-white shadow-teal-200' : 
                                                        pointType === 'END' ? 'bg-rose-500 text-white shadow-rose-200' : 
                                                        pointType === 'ROUND_TRIP' ? 'bg-indigo-600 text-white shadow-indigo-100' :
                                                        'bg-amber-400 text-white shadow-amber-100'
                                                    }`}>
                                                        <span className="material-symbols-outlined text-[16px] font-black">
                                                            {pointType === 'START' ? 'location_on' : 
                                                             pointType === 'END' ? 'flag' : 
                                                             pointType === 'ROUND_TRIP' ? 'near_me' : 'more_horiz'}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col text-left">
                                                        <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                                                            pointType === 'START' ? 'text-teal-600' : 
                                                            pointType === 'END' ? 'text-rose-500' : 
                                                            pointType === 'ROUND_TRIP' ? 'text-indigo-500' : 'text-amber-500'
                                                        }`}>
                                                            {path.label}
                                                        </span>
                                                        <span className="text-lg font-black tracking-tight text-on-surface text-left">
                                                            {path.addr}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    
                                    <div className="space-y-4 mb-8">
                                        <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-3">
                                            <span className="text-slate-400 font-bold uppercase tracking-tighter text-[11px]">입찰 금액</span>
                                            <span className="font-black text-[#004e47] text-lg">₩{Number(bid.price).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-3">
                                            <span className="text-slate-400 font-bold uppercase tracking-tighter text-[11px]">버스 모델</span>
                                            <span className="font-black text-[#004e47]">{bid.busModel}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative z-10 flex flex-col gap-3">
                                    {activeTab === 'driver_pay' ? (
                                        <button 
                                            onClick={() => handleDriverPay(bid)}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black text-sm active:scale-95 transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-lg">payment</span>
                                            데이터 이용료 결재 및 배차 확정
                                        </button>
                                    ) : activeTab === 'final_approval_wait' ? (
                                        <div className="w-full bg-emerald-50 border border-emerald-200 text-emerald-700 py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2">
                                            <span className="material-symbols-outlined text-lg">verified</span>
                                            고객 최종 승인 대기 중
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => handleCancelBid(bid.id)}
                                            className="w-full bg-red-50 text-red-600 py-4 rounded-xl font-black text-sm italic uppercase tracking-[0.1em] shadow-xl shadow-red-900/5 hover:bg-red-100 hover:text-red-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2 border border-red-100"
                                        >
                                            <span className="material-symbols-outlined text-lg">cancel</span>
                                            입찰 취소
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-20 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl shadow-teal-900/5">
                            <span className="material-symbols-outlined text-4xl text-slate-300">hourglass_empty</span>
                        </div>
                        <div className="space-y-2">
                            <p className="text-teal-900 font-black text-xl italic uppercase tracking-tight">승인 대기 중인 입찰이 없습니다.</p>
                            <p className="text-slate-400 font-medium text-sm">새로운 경매에 참여하여 수익 기회를 만들어보세요.</p>
                        </div>
                        <button 
                            onClick={() => navigate('/estimate-list-driver')}
                            className="px-8 py-3 bg-white text-[#004e47] border border-slate-200 rounded-xl font-black text-xs uppercase tracking-widest hover:border-[#004e47] hover:bg-[#004e47] hover:text-white transition-all shadow-sm"
                        >
                            경매 리스트 보러가기
                        </button>
                    </div>
                )}
            </main>

            <BottomNavDriver activeTab="approval" />

            {/* 이니시스 결제용 숨김 폼 */}
            <form id="SendPayForm" name="SendPayForm" method="POST" acceptCharset="euc-kr" style={{ display: 'none' }}>
                {/* PC 웹표준 필드 */}
                <input type="hidden" name="version" value="1.0" />
                <input type="hidden" name="mid" value="" />
                <input type="hidden" name="oid" value="" />
                <input type="hidden" name="price" value="" />
                <input type="hidden" name="timestamp" value="" />
                <input type="hidden" name="signature" value="" />
                <input type="hidden" name="mKey" value="" />
                <input type="hidden" name="currency" value="WON" />
                <input type="hidden" name="goodname" value="" />
                <input type="hidden" name="buyername" value="" />
                <input type="hidden" name="buyertel" value="" />
                <input type="hidden" name="buyeremail" value="" />
                <input type="hidden" name="returnUrl" value="" />
                <input type="hidden" name="closeUrl" value={`${window.location.origin}/close-payment`} />
                <input type="hidden" name="gopaymethod" value="Card" />

                {/* 모바일 필드 (P_ 접두사) */}
                <input type="hidden" name="P_MID" value="" />
                <input type="hidden" name="P_OID" value="" />
                <input type="hidden" name="P_AMT" value="" />
                <input type="hidden" name="P_GOODS" value="" />
                <input type="hidden" name="P_UNAME" value="" />
                <input type="hidden" name="P_MOBILE" value="" />
                <input type="hidden" name="P_EMAIL" value="" />
                <input type="hidden" name="P_NEXT_URL" value="" />
                <input type="hidden" name="P_RESERVED" value="" />
                <input type="hidden" name="P_INI_PAYMENT" value="" />
                <input type="hidden" name="P_CHARSET" value="euc-kr" />
            </form>
        </div>
    );
};

export default ApprovalPendingDriver;
