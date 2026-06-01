import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { getDriverProfile } from '../api';
import { notify } from '../utils/toast';
import Swal from 'sweetalert2';
import BottomNavDriver from '../components/BottomNavDriver';

/**
 * 기사용 운행 상세 페이지
 * 백엔드 /api/app/driver/mission-detail/:id 에서 데이터를 가져와 렌더링함
 */
const UpcomingTripDetailDriver = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [trip, setTrip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userProfileImg, setUserProfileImg] = useState('');
    const [cancelReasons, setCancelReasons] = useState([]);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                // 1. 기사 프로필 정보 조회 (헤더용)
                const profRes = await getDriverProfile();
                if (profRes.success && profRes.data) {
                    setUserProfileImg(profRes.data.driver?.profileImg || '');
                }

                // 2. 상세 정보 조회
                const result = await api.get(`/app/driver/mission-detail/${id}`);
                if (result.success) {
                    setTrip(result.data);
                } else {
                    setError(result.error);
                }

                // 3. 취소 사유 코드 조회
                const codeRes = await api.get('/common/codes/DRIVER_CANCEL_REASON');
                if (codeRes.success) {
                    setCancelReasons(codeRes.data);
                }
            } catch (err) {
                console.error('Fetch detail error:', err);
                setError(err.message || '데이터를 가져오는데 실패했습니다.');
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id]);

    const handleCompleteTrip = async () => {
        const confirmed = await notify.confirm('운행 완료 처리', '정말로 운행을 완료 처리하시겠습니까?\n완료 후에는 수정이 불가능합니다.');
        if (!confirmed) return;

        try {
            const res = await api.post(`/app/driver/complete-mission/${id}`);
            if (res.success) {
                notify.success('운행 완료', '성공적으로 완료 처리되었습니다.');
                navigate('/completed-trips-driver');
            } else {
                notify.error('오류 발생', res.error || '완료 처리 중 오류가 발생했습니다.');
            }
        } catch (err) {
            notify.error('오류 발생', '서버와의 통신 중 오류가 발생했습니다.');
        }
    };

    const handleCancelTrip = async () => {
        // [추가] 계약 취소 시 위약금 청구 경고 및 확인 팝업
        const checkConfirm = await Swal.fire({
            title: '계약 취소 경고',
            text: '위약금 550,000원이 청구 됩니다. 그래도 취소 하시겠습니까?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '네',
            cancelButtonText: '아니오',
            customClass: {
                popup: 'rounded-2xl border-none shadow-2xl p-8',
                title: 'font-black text-2xl text-[#1D3557] mb-2',
                confirmButton: 'bg-[#ba1a1a] text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-red-100 mx-2 active:scale-95 transition-all',
                cancelButton: 'bg-gray-100 text-gray-500 px-8 py-4 rounded-xl font-bold mx-2 active:scale-95 transition-all'
            },
            buttonsStyling: false
        });

        // '아니오'를 선택한 경우 취소 요청 중단
        if (!checkConfirm.isConfirmed) {
            return;
        }

        const { value: formValues } = await Swal.fire({
            title: '계약 취소 요청',
            html: `
                <div class="text-left py-2">
                    <p class="text-[11px] text-red-600 mb-4 font-bold bg-red-50 p-3 rounded-xl leading-relaxed">
                        ※ 주의: 반복적인 취소는 서비스 이용에 제한이 있을 수 있습니다.<br/>
                        (1회: 1주일 정지, 2회: 2주일 정지, 3회 이상: 영구 정지)
                    </p>
                    <div class="mb-4">
                        <label class="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">취소 사유 선택</label>
                        <select id="cancelCode" class="w-full p-4 rounded-xl border border-gray-100 bg-gray-50 text-sm font-bold focus:ring-2 focus:ring-[#004D40] outline-none appearance-none shadow-sm">
                            ${cancelReasons.map(r => `<option value="${r.code}">${r.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="mb-4">
                        <label class="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">상세 사유</label>
                        <textarea id="cancelReasonText" class="w-full p-4 rounded-xl border border-gray-100 bg-gray-50 text-sm font-medium h-28 focus:ring-2 focus:ring-[#004D40] outline-none shadow-sm" placeholder="상세 사유를 입력해주세요."></textarea>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">증빙 서류 첨부 (선택)</label>
                        <div class="relative group">
                            <input type="file" id="reasonDoc" class="hidden" onchange="document.getElementById('file-name-display').innerText = this.files[0] ? this.files[0].name : '파일을 선택해주세요.'">
                            <button onclick="document.getElementById('reasonDoc').click()" class="w-full p-4 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-xs font-bold hover:border-[#004D40] hover:text-[#004D40] transition-all flex items-center justify-center gap-2">
                                <span class="material-symbols-outlined">attach_file</span>
                                <span id="file-name-display">증빙 서류 선택하기</span>
                            </button>
                        </div>
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: '취소 요청하기',
            cancelButtonText: '닫기',
            customClass: {
                popup: 'rounded-2xl border-none shadow-2xl p-8',
                title: 'font-black text-2xl text-[#1D3557] mb-2',
                confirmButton: 'bg-[#ba1a1a] text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-red-100 mx-2 active:scale-95 transition-all',
                cancelButton: 'bg-gray-100 text-gray-500 px-8 py-4 rounded-xl font-bold mx-2 active:scale-95 transition-all'
            },
            buttonsStyling: false,
            preConfirm: () => {
                const cancelCode = document.getElementById('cancelCode').value;
                const cancelReasonText = document.getElementById('cancelReasonText').value;
                const reasonDoc = document.getElementById('reasonDoc').files[0];
                
                if (!cancelReasonText) {
                    Swal.showValidationMessage('상세 사유를 입력해주세요.');
                    return false;
                }
                
                return { cancelCode, cancelReasonText, reasonDoc }
            }
        });

        if (formValues) {
            try {
                setLoading(true);
                const formData = new FormData();
                formData.append('cancelCode', formValues.cancelCode);
                formData.append('cancelReasonText', formValues.cancelReasonText);
                if (formValues.reasonDoc) {
                    formData.append('reasonDoc', formValues.reasonDoc);
                }

                const res = await api.post(`/app/driver/cancel-mission/${id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                if (res.success) {
                    await notify.success('취소 완료', '운행 취소 처리가 완료되었습니다.\n운행 내역에서 상세 정보를 확인할 수 있습니다.');
                    navigate('/upcoming-trips-driver');
                } else {
                    notify.error('오류 발생', res.error || '취소 처리 중 오류가 발생했습니다.');
                }
            } catch (err) {
                console.error('Cancel trip error:', err);
                notify.error('오류 발생', '서버와의 통신 중 오류가 발생했습니다.');
            } finally {
                setLoading(false);
            }
        }
    };

    if (loading) {
        return (
            <div className="bg-[#F8F9FA] min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 animate-pulse">
                    <span className="material-symbols-outlined text-5xl text-[#004D40] animate-spin">progress_activity</span>
                    <p className="text-gray-400 font-bold">상세 정보를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    if (error || !trip) {
        return (
            <div className="bg-[#F8F9FA] min-h-screen flex flex-col items-center justify-center p-10 text-center">
                <span className="material-symbols-outlined text-6xl text-gray-200 mb-6">error</span>
                <h2 className="text-2xl font-black text-[#004D40] mb-4">{error || '정보를 찾을 수 없습니다.'}</h2>
                <button onClick={() => navigate(-1)} className="bg-[#004D40] text-white px-8 py-4 rounded-xl font-bold">돌아가기</button>
            </div>
        );
    }

    return (
        <div className="bg-[#F8F9FA] text-[#1D3557] min-h-[100dvh] pb-32 font-body text-left">
            {/* 상단 앱바 - 표준화된 스타일 적용 */}
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-white/20 px-4 h-16 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
                        <span className="material-symbols-outlined text-slate-600">arrow_back</span>
                    </button>
                    <h1 className="text-lg font-bold text-slate-800">운행상세 내역</h1>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#eceef0] overflow-hidden border-2 border-white shadow-sm flex items-center justify-center">
                    {userProfileImg ? (
                        <img alt="User Profile" src={userProfileImg} className="w-full h-full object-cover" />
                    ) : (
                        <span className="material-symbols-outlined text-[#bec9c6]">person</span>
                    )}
                </div>
            </header>

            <main className="pt-24 px-6 max-w-2xl mx-auto pb-20">
                {/* 헤더 정보 */}
                <div className="mb-8">
                    <span className="text-[#E64A19] font-bold text-xs block mb-1">운행 예정</span>
                    <div className="flex flex-col gap-4">
                        <h2 className="text-xl md:text-2xl font-black text-[#004D40] leading-tight break-keep">
                            {trip.title || '여행 제목 없음'}
                        </h2>
                        <div className="text-left md:text-right border-t border-gray-100 pt-4 md:border-none md:pt-0">
                            <p className="text-gray-400 text-[10px] font-bold mb-1 uppercase tracking-widest">계약 금액</p>
                            <p className="text-3xl font-black text-[#004D40]">₩{Number(trip.price).toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* 메인 정보 카드 */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative mb-12 border-l-4 border-l-[#E64A19]">
                    <div className="p-8 space-y-10">
                        {/* 일정 및 간략 타임라인 */}
                        <div>
                            <p className="text-gray-400 text-[10px] font-bold mb-2 uppercase">일정</p>
                            <p className="text-lg font-black text-[#1D3557] mb-2">{trip.startDate.split(' ')[0]} – {trip.endDate.split(' ')[0]}</p>
                        </div>

                        {/* 고객 정보 */}
                        <div className="bg-[#F8F9FA] rounded-2xl p-6">
                            <p className="text-[10px] text-gray-400 font-bold mb-4 text-center">고객 연락처 정보</p>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-[#004D40] overflow-hidden border-2 border-white shadow-sm">
                                    {trip.customerImage ? (
                                        <img 
                                            src={trip.customerImage.startsWith('http') ? 
                                                trip.customerImage : 
                                                `${import.meta.env.VITE_API_BASE_URL || ''}${trip.customerImage}`} 
                                            className="w-full h-full object-cover" 
                                            alt={trip.customerName} 
                                        />
                                    ) : (
                                        <span className="material-symbols-outlined text-2xl">person</span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-bold">고객명</p>
                                            <p className="font-black text-sm text-[#1D3557]">{trip.customerName}</p>
                                        </div>
                                        <a href={`tel:${trip.customerPhone}`} className="bg-[#004D40] text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-md active:scale-95 transition-all">
                                            <span className="material-symbols-outlined text-sm">call</span>
                                            <span className="text-[10px] font-bold">전화하기</span>
                                        </a>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-bold">연락처</p>
                                            <p className="font-bold text-xs text-[#1D3557]">{trip.customerPhone}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-bold">이메일</p>
                                            <p className="font-bold text-xs text-[#1D3557]">{trip.customerEmail || '정보 없음'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 차량 정보 */}
                        <div className="bg-[#E9ECEF] rounded-2xl p-6">
                            <p className="text-[10px] text-gray-400 font-bold mb-4">차량 정보</p>
                            <div className="flex items-start gap-4">
                                <div className="text-[#004D40]">
                                    <span className="material-symbols-outlined text-3xl">directions_bus</span>
                                </div>
                                <div>
                                    <p className="font-black text-sm text-[#1D3557]">{trip.model || '기본 차량'}</p>
                                    <p className="text-xs text-[#004D40] font-bold">{trip.busNumber || '서울 70 자 1234'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 한글 주석: ReservationDetailCustomer 스타일을 따르는 기사용 상세 경로 타임라인 */}
                <section className="bg-white rounded-[3.5rem] p-12 shadow-2xl shadow-teal-900/[0.03] border border-slate-50 text-left mb-12">
                    <div className="text-xl font-black tracking-tight border-b border-slate-50 pb-6 italic text-teal-700 flex items-center gap-2">
                        <span className="material-symbols-outlined">route</span>
                        전체 운행 경로
                    </div>
                    <div className="mt-8 space-y-10 relative">
                        <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-100"></div>
                        {trip.waypoints.map((wp, idx) => {
                            const isStart = wp.type === 'START';
                            const isEnd = wp.type === 'END';
                            const isDest = wp.type === 'ROUND' || wp.type === 'ROUND_TRIP';
                            const title = isStart ? '출발지' : isEnd ? '도착지' : isDest ? '목적지' : (wp.type === 'START_WAY' ? '출발 경유지' : '도착 경유지');
                            const pointType = isStart ? 'START' : isEnd ? 'END' : isDest ? 'ROUND_TRIP' : 'WAYPOINT';

                            return (
                                <div key={idx} className="relative pl-12">
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
                                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                                            pointType === 'START' ? 'text-teal-600' : 
                                            pointType === 'END' ? 'text-rose-500' : 
                                            pointType === 'ROUND_TRIP' ? 'text-indigo-500' : 'text-amber-500'
                                        }`}>
                                            {title}
                                        </p>
                                        <h4 className="text-lg font-black tracking-tight text-on-surface text-left">
                                            {wp.addr}
                                        </h4>
                                        <p className="text-xs text-slate-400 font-bold mt-1 opacity-70 italic text-left">
                                            {isStart ? '승객 명단 확인 및 수하물 적재를 위해 최소 20분 전 대기 권장합니다.' :
                                             isEnd ? '최종 목적지 하차 및 차량 내부 유실물 확인 후 운행 종료 보고 바랍니다.' :
                                             isDest ? '목적지에서의 대기 시간 및 집결 시간을 다시 한번 확인해 주세요.' :
                                             '안전한 승하차를 위해 주변 환경을 확인하고 정차해 주세요.'}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* 액션 버튼 */}
                <div className="space-y-4 mb-10">
                    <button
                        onClick={handleCompleteTrip}
                        className="w-full bg-[#004D40] text-white py-4 rounded-xl font-black text-lg shadow-xl shadow-[#004D40]/20 flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
                        <span className="material-symbols-outlined font-variation-fill" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        운행 완료 처리하기
                    </button>
                    <button
                        onClick={() => navigate(`/chat-room/${trip.id}`)}
                        className="w-full bg-[#00695C] text-white py-4 rounded-xl font-black text-lg shadow-xl shadow-[#00695C]/20 flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
                        <span className="material-symbols-outlined font-variation-fill" style={{ fontVariationSettings: "'FILL' 1" }}>chat_bubble</span>
                        busTaams Talk 실시간 채팅
                    </button>
                    <div className="text-center pt-4">
                        <p className="text-gray-400 text-xs font-bold">
                            운행이 어려우신가요? <button onClick={handleCancelTrip} className="text-gray-500 underline underline-offset-4 decoration-gray-300">계약 취소 요청</button>
                        </p>
                    </div>
                </div>
            </main>

            {/* 하단 네비게이션 */}
            <BottomNavDriver activeTab="trips" />
        </div>
    );
};

export default UpcomingTripDetailDriver;
