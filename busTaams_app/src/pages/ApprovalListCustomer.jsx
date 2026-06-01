import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { getImageUrl } from '../api';
import { notify } from '../utils/toast';
import BottomNavCustomer from '../components/BottomNavCustomer';
import Avatar from '../components/Avatar';

const ApprovalListCustomer = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const reqId = searchParams.get('reqId');

    const [tripSummary, setTripSummary] = useState(null);
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [customerProfile, setCustomerProfile] = useState(null);
    const [imageVersion, setImageVersion] = useState(Date.now());
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';




    const fetchDashboardData = async () => {
        try {
            const profileRes = await api.get('/app/customer/profile');
            if (profileRes.success) {
                setCustomerProfile(profileRes.data);
                setImageVersion(Date.now());
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

    const fetchEstimates = async () => {
        if (!reqId) return;
        try {
            const result = await api.get(`/app/customer/estimate-list/${reqId}`);
            if (result.success) {
                setTripSummary(result.data.tripSummary);
                setUnits(result.data.units);
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
        fetchEstimates();
    }, [reqId]);

    const handleCancelBus = async (unitSeq) => {
        const confirmed = await notify.confirm('차량 청약 취소', `차량 #${unitSeq}의 청약 요청을 취소하시겠습니까?`);
        if (!confirmed) return;
        try {
            const res = await api.post(`/app/customer/cancel-bus`, { reqId, unitSeq });
            if (res.success) {
                notify.success('취소 완료', '해당 차량의 청약 요청이 취소되었습니다.');
                fetchEstimates();
            }
        } catch (error) {
            console.error('Cancel bus error:', error);
            notify.error('오류 발생', '취소 처리 중 오류가 발생했습니다.');
        }
    };

    const handleApproveBid = async (bidId, price, driverName) => {
        const confirmed = await notify.confirm('청약 승인 및 결제', `${driverName} 기사님의 청약을 승인하고 결제를 진행하시겠습니까?`);
        if (!confirmed) return;

        initiatePayment({
            resId: bidId,
            price: price,
            goodname: `${tripSummary.title} - ${driverName} 기사님`,
            buyername: customerProfile?.custNm || '구매자',
            buyertel: customerProfile?.phoneNo || '010-0000-0000',
            buyeremail: customerProfile?.email || 'test@example.com'
        });
    };

    //const handleApproveAll = async () => {
    //    const totalResFee = units.reduce((acc, unit) => acc + (Number(unit.unitResFee) || 0), 0);
    //    const confirmed = await notify.confirm('전체 청약 승인 및 결제', `진행 중인 모든 청약을 승인하고 예약금(6.6%)인 총 ${totalResFee.toLocaleString()}원을 결제하시겠습니까?`);
    //    if (!confirmed) return;
    //
    //    initiatePayment({
    //        reqId: reqId,
    //        price: totalResFee,
    //        goodname: `${tripSummary.title} 예약금 결제`,
    //        buyername: customerProfile?.custNm || '구매자',
    //        buyertel: customerProfile?.phoneNo || '010-0000-0000',
    //        buyeremail: customerProfile?.email || 'test@example.com'
    //    });
    //};

    //const handleApproveAll = async () => {
    //    const totalResFee = units.reduce(
    //        (acc, unit) => acc + (Number(unit.unitResFee) || 0),
    //        0
    //    );
    //
    //    const confirmed = await notify.confirm(
    //        '전체 승인',
    //        `진행 중인 모든 청약을 승인하시겠습니까?\n\n예약금: ${totalResFee.toLocaleString()}원`
    //    );
    //
    //    if (!confirmed) return;
    //
        // 무통장 입금 안내 노출
    //    await notify.info(
    //        '예약금 입금 안내',
    //        `은행명 : IBK기업은행\n계좌번호 : 088-038608-04-011\n예금주 : (주)청솔테크\n입금금액 : ${totalResFee.toLocaleString()}원\n* 입금 확인 후 예약이 승인됩니다.`
    //    );
    // 
    //    try {
            // 백엔드 API를 호출하여 결제 상태 업데이트 (PAYMENT_STS = '1')
    //        const res = await api.post('/app/customer/payment-bank', { reqId });
    //        if (res.success) {
    //            notify.success('승인 요청 완료', '무통장 입금 안내 및 결제 대기 상태가 반영되었습니다.');
    //            fetchEstimates(); // 화면 데이터 갱신
    //        } else {
    //            notify.error('업데이트 실패', res.error || '결제 상태 업데이트 중 오류가 발생했습니다.');
    //        }
    //    } catch (error) {
    //        console.error('Update payment status error:', error);
    //        notify.error('오류 발생', '서버와의 통신 중 오류가 발생했습니다.');
    //    }
    //};

    const handleApproveAll = async () => {
        const totalResFee = units.reduce(
            (acc, unit) => acc + (Number(unit.unitResFee) || 0),
            0
        );

        const today = new Date();
        const bankEndDate = new Date('2026-05-23T23:59:59');

        // 2026년 5월 23일까지는 무통장 입금
        if (today <= bankEndDate) {
            const confirmed = await notify.confirm(
                '전체 승인',
                `진행 중인 모든 청약을 승인하시겠습니까?\n\n예약금: ${totalResFee.toLocaleString()}원`
            );

            if (!confirmed) return;

            await notify.info(
                '예약금 입금 안내',
                `은행명 : IBK기업은행\n계좌번호 : 088-038608-04-011\n예금주 : (주)청솔테크\n입금금액 : ${totalResFee.toLocaleString()}원\n* 입금 확인 후 예약이 승인됩니다.`
            );

            try {
                // 백엔드 API를 호출하여 결제 상태 업데이트 (PAYMENT_STS = '1')
                const res = await api.post('/app/customer/payment-bank', { reqId });

                if (res.success) {
                    notify.success('승인 요청 완료', '무통장 입금 안내 및 결제 대기 상태가 반영되었습니다.');
                    fetchEstimates();
                } else {
                    notify.error('업데이트 실패', res.error || '결제 상태 업데이트 중 오류가 발생했습니다.');
                }
            } catch (error) {
                console.error('Update payment status error:', error);
                notify.error('오류 발생', '서버와의 통신 중 오류가 발생했습니다.');
            }

            return;
        }

        // 2026년 5월 31일부터는 카드결제
        const confirmed = await notify.confirm(
            '전체 승인 및 카드결제',
            `진행 중인 모든 청약을 승인하고 예약금 (6.6%)인 총 ${totalResFee.toLocaleString()}원을 카드결제 하시겠습니까?`
        );

        if (!confirmed) return;

        initiatePayment({
            reqId: reqId,
            price: totalResFee,
            goodname: `${tripSummary.title} 예약금 결제`,
            buyername: customerProfile?.custNm || '구매자',
            buyertel: customerProfile?.phoneNo || '010-0000-0000',
            buyeremail: customerProfile?.email || 'test@example.com'
        });
    };

    const initiatePayment = async (payData) => {
        try {
            // 0. 결제 금액 유효성 검증
            if (!payData.price || Number(payData.price) <= 0) {
                notify.error('결제 오류', '결제 금액이 0원 이하입니다. 관리자에게 문의해 주세요.');
                return;
            }

            // 1. 서버에서 결제 준비 데이터 가져오기
            const res = await api.post('/payment/ready', payData);
            const data = res;

            // 2. 폼 데이터 설정 (이니시스 모바일 전용)
            const form = document.getElementById('SendPayForm');
            if (!form) {
                notify.error('오류 발생', '결제 폼을 찾을 수 없습니다.');
                return;
            }

            // 이니시스 EUC-KR 인코딩 오류(인증 실패 01)를 방지하기 위해 상품명과 구매자명을 안전한 영문으로 대체하여 전송합니다. (한글 주석)
            const finalGoodName = `BusTaams_Trip`;
            const cleanBuyerName = `Customer`;

            // 3. 전화번호 정제: 하이픈 제거 (이니시스 모바일 필수)
            const cleanMobile = (data.buyertel || '').replace(/[^0-9]/g, '');

            // 모바일과 PC 기기 구분 분기 처리 (한글 주석)
            const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

            if (isMobile) {
                console.log('>>> [Payment] Launching Mobile Payment Page:', data.oid);
                form.action = "https://mobile.inicis.com/smart/payment/";
                form.target = "_self";
                form.method = "POST";

                // 모바일 필수 파라미터 매핑
                form.P_MID.value = data.mid;
                form.P_OID.value = data.oid;
                form.P_AMT.value = data.price;
                form.P_GOODS.value = finalGoodName;
                form.P_UNAME.value = cleanBuyerName;
                form.P_MOBILE.value = cleanMobile;
                form.P_EMAIL.value = data.buyeremail;
                form.P_NEXT_URL.value = data.returnUrl;
                form.P_RESERVED.value = "twotrs=Y&app_scheme=bustaams://&cp_cls=euc-kr&vbank_receipt=Y";
                form.P_INI_PAYMENT.value = "CARD";
                form.P_CHARSET.value = "euc-kr";

                console.log('>>> [Payment] Submitting Mobile Form');
                form.submit();
            } else {
                console.log('>>> [Payment] Launching PC Web Standard Pay:', data.oid);
                form.removeAttribute('action');
                form.removeAttribute('target');
                form.method = "POST";

                // PC 웹 표준 필수 파라미터 매핑
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

                console.log('>>> [Payment] Calling INIStdPay.pay');
                window.INIStdPay.pay(form);
            }

        } catch (error) {
            console.error('Payment initiation error:', error);
            notify.error('오류 발생', error.message || '결제 요청 중 오류가 발생했습니다.');
        }
    };

    const handleCancelRequest = async () => {
        const confirmed = await notify.confirm('전체 청약 요청 취소', '전체 청약 요청을 취소하시겠습니까?');
        if (!confirmed) return;
        try {
            const res = await api.post('/app/customer/cancel-request', { reqId });
            if (res.success) {
                notify.success('취소 완료', '전체 취소되었습니다.');
                navigate('/customer-dashboard');
            } else {
                notify.error('취소 실패', res.error || '취소 중 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error('Cancel error:', error);
            notify.error('오류 발생', '취소 중 오류가 발생했습니다.');
        }
    };

    const handleRequestBusChange = async (unitSeq) => {
        const confirmed = await notify.confirm('차량 변경요청', `차량 #${unitSeq}의 사양 변경을 요청하시겠습니까? 요청 시 기존 입찰 내역은 무효화될 수 있습니다.`);
        if (!confirmed) return;
        try {
            const res = await api.post('/app/customer/request-bus-change', { reqId, busSeq: unitSeq });
            if (res.success) {
                notify.success('요청 완료', '차량 변경요청이 접수되었습니다. 새로운 견적을 기다려주세요.');
                fetchEstimates();
            } else {
                notify.error('요청 실패', res.error || '처리 중 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error('Request bus change error:', error);
            notify.error('오류 발생', '서버와의 통신 중 오류가 발생했습니다.');
        }
    };

    const getBusStatusDisplay = (status) => {
        const config = {
            'AUCTION': { label: '청약대기중..', color: 'bg-slate-100 text-slate-400' },
            'BIDDING': { label: '승인대기중..', color: 'bg-orange-100 text-orange-700' },
            'CONFIRM': { label: '예약 확정..', color: 'bg-teal-100 text-teal-700' },
            'DONE': { label: '운행 종료..', color: 'bg-slate-100 text-slate-500' },
            'TRAVELER_CANCEL': { label: '여행자 버스 예약 전체 취소', color: 'bg-red-100 text-red-700' },
            'DRIVER_CANCEL': { label: '버스 기사 응찰 취소', color: 'bg-red-100 text-red-700' },
            'BUS_CHANGE': { label: '여행자 버스 변경 요청', color: 'bg-purple-100 text-purple-700' },
            'BUS_CANCEL': { label: '여행자 버스 취소(버스 대수 감소)', color: 'bg-gray-100 text-gray-600' }
        };
        return config[status] || { label: status || '상태 대기', color: 'bg-slate-100 text-slate-400' };
    };

    if (loading) {
        return (
            <div className="bg-background text-on-surface min-h-screen font-body text-left">
                <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,104,95,0.04)] py-4">
                    <div className="flex items-center justify-between px-6 max-w-7xl mx-auto w-full">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate(-1)} className="text-teal-700 hover:bg-slate-100 transition-colors p-2 rounded-xl scale-95 active:scale-90 duration-200">
                                <span className="material-symbols-outlined">arrow_back</span>
                            </button>
                            <h1 className="text-xl font-bold text-teal-900 tracking-tight">승인 상세 화면</h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 animate-pulse"></div>
                        </div>
                    </div>
                </header>
                <div className="flex items-center justify-center pt-32">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="font-black text-primary animate-pulse tracking-widest uppercase text-xs">Loading Estimates</p>
                    </div>
                </div>
            </div>
        );
     }

    if (!tripSummary) {
        return (
            <div className="bg-background text-on-surface min-h-screen font-body text-left">
                <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,104,95,0.04)] py-4">
                    <div className="flex items-center justify-between px-6 max-w-7xl mx-auto w-full">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate(-1)} className="text-teal-700 hover:bg-slate-100 transition-colors p-2 rounded-xl scale-95 active:scale-90 duration-200">
                                <span className="material-symbols-outlined">arrow_back</span>
                            </button>
                            <h1 className="text-xl font-bold text-teal-900 tracking-tight">승인 상세 화면</h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <Avatar
                                profileImage={customerProfile?.profileImage}
                                imageVersion={imageVersion}
                                className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                                onClick={() => navigate('/profile-customer')}
                            />
                        </div>
                    </div>
                </header>
                <div className="flex flex-col items-center justify-center pt-32 p-6 text-center">
                    <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">error</span>
                    <h2 className="text-2xl font-black text-teal-900 mb-2">요청 정보를 찾을 수 없습니다.</h2>
                    <button onClick={() => navigate(-1)} className="mt-4 px-8 py-3 bg-primary text-white rounded-xl font-black transition-all hover:bg-slate-900 active:scale-95 btn-primary">뒤로 가기</button>
                </div>
            </div>
        );
    }

    const totalReqAmt = units.reduce((acc, unit) => acc + (Number(unit.unitReqAmt) || 0), 0);
    const totalResFee = units.reduce((acc, unit) => acc + (Number(unit.unitResFee) || 0), 0);

    return (
        <div className="bg-background text-on-surface min-h-screen pb-32 font-body text-left">
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,104,95,0.04)] py-4">
                <div className="flex items-center justify-between px-6 max-w-7xl mx-auto w-full">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="text-teal-700 hover:bg-slate-100 transition-colors p-2 rounded-xl scale-95 active:scale-90 duration-200">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <h1 className="text-xl font-bold text-teal-900 tracking-tight">승인 상세 화면</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <Avatar
                            profileImage={customerProfile?.profileImage}
                            imageVersion={imageVersion}
                            className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 overflow-hidden border-2 border-white shadow-sm transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                            onClick={() => navigate('/profile-customer')}
                        />
                    </div>
                </div>
            </header>

            <main className="pt-28 px-6 max-w-6xl mx-auto space-y-10">
                <section className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                    <div className="md:col-span-8">
                        <p className="text-orange-600 font-bold tracking-[0.2em] text-xs mb-3 uppercase italic">Approval Pending</p>
                        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-on-surface leading-tight italic">
                            <span className="text-primary">{tripSummary.title}</span>
                        </h1>
                    </div>
                    <div className="md:col-span-4 text-right">
                        <span className={`inline-flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold shadow-lg ${getBusStatusDisplay(tripSummary.status).color}`}>
                            <span className={`w-2.5 h-2.5 rounded-full ${tripSummary.status === 'CONFIRM' ? 'bg-teal-500' : (tripSummary.status.includes('CANCEL') ? 'bg-error' : 'bg-secondary')
                                }`}></span>
                            {getBusStatusDisplay(tripSummary.status).label}
                        </span>
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-7 space-y-8">
                        <div className="bg-white rounded-2xl p-8 shadow-[0_40px_60px_rgba(0,0,0,0.03)] border border-slate-50 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-2 h-full bg-primary/20"></div>
                            <h2 className="text-2xl font-black mb-10 flex items-center gap-3 italic text-teal-800">
                                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>route</span>
                                여행 경로
                            </h2>
                            <div className="mt-8 space-y-10 relative">
                                <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-100"></div>

                                {tripSummary.fullRoute && tripSummary.fullRoute.map((step, idx) => (
                                    <div key={idx} className="relative pl-12">
                                        <div className={`absolute left-0 top-1.5 w-8 h-8 rounded-full border-4 border-white shadow-md z-10 flex items-center justify-center ${
                                            step.type === 'START' ? 'bg-teal-600 text-white shadow-teal-200' : 
                                            step.type === 'END' ? 'bg-rose-500 text-white shadow-rose-200' : 
                                            step.type === 'ROUND_TRIP' ? 'bg-indigo-600 text-white shadow-indigo-100' :
                                            'bg-amber-400 text-white shadow-amber-100'
                                        }`}>
                                            <span className="material-symbols-outlined text-[16px] font-black">
                                                {step.type === 'START' ? 'location_on' : 
                                                 step.type === 'END' ? 'flag' : 
                                                 step.type === 'ROUND_TRIP' ? 'near_me' : 'more_horiz'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col text-left">
                                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                                                step.type === 'START' ? 'text-teal-600' : 
                                                step.type === 'END' ? 'text-rose-500' : 
                                                step.type === 'ROUND_TRIP' ? 'text-indigo-500' : 'text-amber-500'
                                            }`}>
                                                {step.title}
                                            </p>
                                            <h4 className="text-lg font-black tracking-tight text-on-surface text-left">
                                                {step.addr}
                                            </h4>
                                            {step.time && (
                                                <p className="text-xs text-slate-400 font-bold mt-1 opacity-70 italic text-left">
                                                    {step.time}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-between items-end px-2">
                                <h2 className="text-2xl font-black italic tracking-tighter">승인 처리 차량 목록</h2>
                                <span className="text-sm text-slate-400 font-bold">{units.length}대 요청됨</span>
                            </div>

                            {units.map((unit) => {
                                const selectedEst = unit.estimates && unit.estimates.length > 0 ? unit.estimates[0] : null;
                                return (
                                <div key={unit.unitSeq} className="bg-white rounded-2xl p-8 shadow-xl shadow-teal-900/5 border border-slate-50 space-y-8 animate-in fade-in slide-in-from-bottom duration-500">
                                    {/* 기사 정보와 차량 정보 통합 헤더 */}
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-50 pb-6 w-full">
                                        <div className="flex items-center gap-5">
                                            {/* 기사 이미지 및 하단 버스 타입 */}
                                            <div className="flex flex-col items-center shrink-0">
                                                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-100 shadow-inner">
                                                    {selectedEst && selectedEst.image ? (
                                                        <img
                                                            src={getImageUrl(selectedEst.image)}
                                                            alt={selectedEst.driverName}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                e.target.onerror = null;
                                                                e.target.src = '';
                                                                e.target.className = 'hidden';
                                                                if (e.target.nextSibling) e.target.nextSibling.classList.remove('hidden');
                                                            }}
                                                        />
                                                    ) : null}
                                                    <span className={`material-symbols-outlined text-4xl text-orange-600 ${selectedEst && selectedEst.image ? 'hidden' : ''}`}>directions_bus</span>
                                                </div>
                                                {/* 버스의 타입 정보를 기사의 이미지 밑으로 이동 */}
                                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2 text-center">{unit.busType}</p>
                                            </div>

                                            {/* 기사명, 평점, 연식 및 모델명 (1줄씩 표시), 요청금액 */}
                                            <div className="text-left">
                                                <div className="flex items-center gap-3">
                                                    <h4 className="font-black text-xl tracking-tighter leading-tight italic">
                                                        {selectedEst ? selectedEst.driverName : `차량 #${unit.unitSeq}`}
                                                    </h4>
                                                    {selectedEst && (
                                                        <span className="flex items-center bg-secondary/10 px-2 py-0.5 rounded-xl text-secondary text-[11px] font-black">
                                                            <span className="material-symbols-outlined text-[12px] mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                                            {selectedEst.rating}
                                                        </span>
                                                    )}
                                                </div>
                                                {/* 차량의 연식과 모델명을 1줄씩 표시 */}
                                                {selectedEst && (
                                                    <div className="mt-1.5 space-y-0.5">
                                                        {selectedEst.busYear && (
                                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{selectedEst.busYear}년형</p>
                                                        )}
                                                        {selectedEst.busModel && (
                                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{selectedEst.busModel}</p>
                                                        )}
                                                    </div>
                                                )}
                                                <p className="text-sm font-black text-orange-600 mt-2">요청금액: {Number(unit.unitReqAmt || 0).toLocaleString()}원</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 상세 정보 영역 */}
                                    <div className="space-y-4">
                                        {unit.estimates.length === 0 ? (
                                            <div className="py-12 bg-slate-50/50 rounded-2xl text-center border-2 border-dashed border-slate-100 flex flex-col items-center gap-6">
                                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest italic">현재 응찰 내역이 없습니다.</p>
                                                <div className="w-full max-w-xs space-y-3">
                                                    <button
                                                        onClick={() => handleRequestBusChange(unit.unitSeq)}
                                                        className="w-full py-4 rounded-xl font-black text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2 active:scale-95 bg-purple-600 text-white shadow-lg shadow-purple-900/10 btn-primary"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">published_with_changes</span>
                                                        차량 변경요청
                                                    </button>
                                                    {unit.unitStat !== 'TRAVELER_CANCEL' && unit.unitStat !== 'CONFIRM' && (
                                                        <button
                                                            onClick={() => handleCancelBus(unit.unitSeq)}
                                                            className="w-full py-2 text-[10px] font-black text-error border border-error/10 rounded-xl hover:bg-error/5 transition-all active:scale-95 uppercase tracking-widest btn-secondary"
                                                        >
                                                            이 차량 청약 요청 취소
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            unit.estimates.map((est) => (
                                                <div key={est.id} className="space-y-8 animate-in fade-in duration-300">
                                                    <div className="flex flex-col gap-8">
                                                        {/* 차량 사진 리스트 */}
                                                        {est.busImages && est.busImages.length > 0 && (
                                                            <div className="space-y-4">
                                                                <div className="flex justify-between items-center px-2">
                                                                    <h6 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic flex items-center gap-2">
                                                                        <span className="material-symbols-outlined text-[14px]">gallery_thumbnail</span>
                                                                        차량 사진 ({est.busImages.length})
                                                                    </h6>
                                                                </div>
                                                                <div className="grid grid-cols-1 gap-6">
                                                                    {est.busImages.map((img, iIdx) => (
                                                                        <div key={iIdx} className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden shadow-2xl border-8 border-white group/photo bg-slate-100 flex items-center justify-center">
                                                                            <img
                                                                                src={getImageUrl(img)}
                                                                                alt={`차량 사진 ${iIdx + 1}`}
                                                                                className="w-full h-full object-cover transition-transform duration-700 group-hover/photo:scale-110"
                                                                                onError={(e) => {
                                                                                    e.target.onerror = null;
                                                                                    e.target.className = 'hidden';
                                                                                    if (e.target.nextSibling) e.target.nextSibling.classList.remove('hidden');
                                                                                }}
                                                                            />
                                                                            <span className="material-symbols-outlined text-5xl text-slate-200 hidden">directions_bus</span>
                                                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-end p-8">
                                                                                <span className="text-white text-xs font-black uppercase tracking-[0.3em] bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl border border-white/30">Vehicle Photo {iIdx + 1}</span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* 차량 상세 스펙 */}
                                                        <div className="flex flex-col gap-4">
                                                            <div className="bg-slate-50/80 p-6 rounded-2xl space-y-4">
                                                                <h6 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic flex items-center gap-2">
                                                                    <span className="material-symbols-outlined text-[14px]">ac_unit</span>
                                                                    편의시설 및 서비스
                                                                </h6>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    {[
                                                                        { key: '테이블', icon: 'table_restaurant' },
                                                                        { key: '와이파이', icon: 'wifi' },
                                                                        { key: 'USB충전', icon: 'usb' },
                                                                        { key: '냉장고', icon: 'kitchen' },
                                                                        { key: '개인모니터', icon: 'monitor' },
                                                                        { key: '생수제공', icon: 'water_drop' },
                                                                        { key: '간식제공', icon: 'icecream' }
                                                                    ].map((item, idx) => {
                                                                        const isActive = est.tags && est.tags.includes(item.key);
                                                                        if (!isActive) return null;
                                                                        return (
                                                                            <div key={idx} className="flex flex-col items-center justify-center p-3 rounded-xl bg-white shadow-sm border border-teal-100/30 group/item hover:scale-105 transition-transform text-center gap-1.5">
                                                                                <span className="material-symbols-outlined text-teal-600 text-xl group-hover/item:rotate-12 transition-transform">{item.icon}</span>
                                                                                <span className="text-xs font-black text-slate-700 tracking-tighter">{item.key}</span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    {(!est.tags || est.tags.length === 0) && (
                                                                        <div className="col-span-2 text-center py-4 text-slate-300 font-bold text-xs italic">등록된 편의시설이 없습니다.</div>
                                                                    )}
                                                                    {/* 편의시설 목록 맨 밑에 ABES(ADAS) 정보 노출 (2열 영역 모두 채우기) */}
                                                                    <div className="col-span-2 flex items-center gap-3 p-3 rounded-xl bg-white shadow-sm border border-teal-100/30 group/item hover:translate-x-1 transition-transform text-left">
                                                                        <span className="material-symbols-outlined text-teal-600 text-lg">verified_user</span>
                                                                        <span className="text-xs font-black text-slate-700 tracking-tighter">ABES (ADAS): {est.hasAdas === 'Y' ? '장착 완료' : '미장착'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="bg-slate-50/80 p-6 rounded-2xl space-y-4 text-left">
                                                                <h6 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic flex items-center gap-2">
                                                                    <span className="material-symbols-outlined text-[14px]">verified_user</span>
                                                                    안전 및 인증 정보
                                                                </h6>
                                                                <div className="grid grid-cols-2 gap-y-3">
                                                                    <div>
                                                                        <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">보험 만료일</p>
                                                                        <p className="text-[11px] font-black text-slate-800">{est.insuranceExpDt}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">정기검사만료일</p>
                                                                        <p className="text-[11px] font-black text-slate-800">{est.lastInspectDt}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* 차량 관리 버튼 */}
                                                        <div className="pt-4">
                                                            <div className="grid grid-cols-1 gap-3">
                                                                <button
                                                                    onClick={() => handleRequestBusChange(unit.unitSeq)}
                                                                    className="w-full py-4 rounded-xl font-black text-[11px] tracking-widest uppercase transition-all flex items-center justify-center gap-2 active:scale-95 bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-700 btn-secondary"
                                                                >
                                                                    <span className="material-symbols-outlined text-sm">published_with_changes</span>
                                                                    차량 변경요청
                                                                </button>

                                                                {unit.unitStat !== 'TRAVELER_CANCEL' && unit.unitStat !== 'CONFIRM' && (
                                                                    <button
                                                                        onClick={() => handleCancelBus(unit.unitSeq)}
                                                                        className="w-full py-2 text-[10px] font-black text-slate-400 hover:text-error transition-all active:scale-95 uppercase tracking-widest"
                                                                    >
                                                                        이 차량 청약 요청 취소
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                         )}
                                    </div>
                                </div>
                            );
                            })}
                        </div>
                    </div>

                    <div className="lg:col-span-5 space-y-8">
                        <div className="bg-slate-900 rounded-2xl p-8 text-white sticky top-28 shadow-2xl shadow-slate-900/20 border border-slate-800">
                            <h2 className="text-2xl font-black mb-8 italic tracking-tighter">최종 승인 요약</h2>

                            <div className="space-y-6 mb-10">
                                {units.map((unit) => {
                                    const selectedEst = unit.estimates && unit.estimates.length > 0 ? unit.estimates[0] : null;
                                    return (
                                    <div key={unit.unitSeq} className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10 group hover:bg-white/10 transition-all">
                                        <div className="text-left">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                {selectedEst ? selectedEst.driverName : `차량 #${unit.unitSeq}`}
                                            </p>
                                            <p className="text-sm font-bold text-slate-200">{unit.busType}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-secondary italic">₩{Number(unit.unitReqAmt || 0).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>

                            <div className="pt-8 border-t border-white/10 space-y-4">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">총 합계 금액</p>
                                    <span className="text-xl font-bold text-slate-300 italic">₩{totalReqAmt.toLocaleString()}</span>
                                </div>
                                <div className="bg-secondary/10 p-4 rounded-2xl border border-secondary/20">
                                    <p className="text-[10px] font-black text-secondary uppercase tracking-[0.3em] mb-1">총 예약금 결제 금액 (6.6%)</p>
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-4xl font-black tracking-tighter text-secondary italic">₩{totalResFee.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-10">
                                {tripSummary.status === 'BIDDING' && (
                                    <div className="space-y-3">
                                        <button
                                            onClick={handleApproveAll}
                                            className="w-full py-5 bg-secondary text-white rounded-xl font-black text-sm tracking-widest uppercase shadow-xl shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group btn-primary"
                                        >
                                            <span className="material-symbols-outlined text-xl group-hover:rotate-12 transition-transform">task_alt</span>
                                            전체 승인 및 예약금 결제하기
                                        </button>
                                        <p className="text-[10px] text-slate-400 font-bold text-center uppercase tracking-tighter italic leading-relaxed">
                                            * 전체 금액의 6.6% 예약금이 선결제됩니다.<br />
                                            * 승인 시 기사님들에게 예약 확정 알림이 전송됩니다.
                                        </p>
                                    </div>
                                )}
                                {tripSummary.status !== 'TRAVELER_CANCEL' && tripSummary.status !== 'CONFIRM' && (
                                    <button
                                        onClick={handleCancelRequest}
                                        className="w-full bg-white/5 text-error border border-error/20 py-5 rounded-xl font-black text-lg hover:bg-error/10 active:scale-95 transition-all flex items-center justify-center gap-3 italic btn-secondary"
                                    >
                                        <span className="material-symbols-outlined">cancel</span>
                                        전체 청약 취소
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <BottomNavCustomer />

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

export default ApprovalListCustomer;
