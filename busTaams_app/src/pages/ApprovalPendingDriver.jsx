import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { request, getDriverProfile } from '../api';
import BottomNavDriver from '../components/BottomNavDriver';
import { notify } from '../utils/toast';

const ApprovalPendingDriver = () => {
    const navigate = useNavigate();
    const [bids, setBids] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userImage, setUserImage] = useState('');

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

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 프로필 정보 조회
                const profRes = await getDriverProfile();
                if (profRes.success && profRes.data) {
                    setUserImage(profRes.data.driver?.profileImg || '');
                }

                // 승인 대기 목록 조회
                const res = await request('/app/driver/bids/waiting');
                if (res.success) {
                    setBids(res.data);
                }
            } catch (err) {
                console.error('Fetch waiting bids error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

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

            <main className="pt-28 px-6 max-w-7xl mx-auto">
                {/* Editorial Header Section */}
                <section className="mb-12">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                        <div className="md:col-span-7">
                            <span className="text-[#9d4300] font-bold tracking-widest uppercase text-[10px] mb-4 block">운행 관리</span>
                            <h1 className="text-4xl font-extrabold text-[#004e47] leading-[1.1] tracking-tighter italic uppercase">
                                승인 대기 중인 입찰
                            </h1>
                        </div>
                        <div className="md:col-span-5 md:pl-8 text-left">
                            <p className="text-[#3e4947] text-sm font-medium leading-relaxed">
                                현재 고객의 승인을 기다리고 있는 입찰 내역입니다. 승인이 완료되면 즉시 알림으로 안내해 드립니다.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Dynamic Tabs / Filters */}
                <nav className="flex gap-8 mb-12 pb-4 border-b border-slate-200 overflow-x-auto no-scrollbar">
                    <button className="text-[#004e47] font-black border-b-4 border-[#004e47] pb-2 whitespace-nowrap text-sm uppercase tracking-widest">
                        승인 대기 중 ({bids.length})
                    </button>
                </nav>

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
                                    <div className="flex justify-between items-start mb-8">
                                        <span className="bg-[#ffdbca] text-[#783200] px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[#ffb690]/20">
                                            승인 대기
                                        </span>
                                        <span className="material-symbols-outlined text-slate-300">more_vert</span>
                                    </div>
                                    
                                    <h3 className="text-2xl font-black text-[#004e47] mb-1 italic tracking-tight">{bid.title}</h3>
                                    {/* 전체 운행 경로 타임라인 표시 (한글 주석) */}
                                    <div className="mt-8 space-y-10 relative">
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
                                            <span className="text-slate-400 font-bold uppercase tracking-tighter text-[11px]">운행 기간</span>
                                            <span className="font-black text-[#004e47] italic">{bid.startDt} ~ {bid.endDt}</span>
                                        </div>
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
                                    <button 
                                        onClick={() => handleCancelBid(bid.id)}
                                        className="w-full bg-red-50 text-red-600 py-4 rounded-xl font-black text-sm italic uppercase tracking-[0.1em] shadow-xl shadow-red-900/5 hover:bg-red-100 hover:text-red-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2 border border-red-100"
                                    >
                                        <span className="material-symbols-outlined text-lg">cancel</span>
                                        입찰 취소
                                    </button>
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
        </div>
    );
};

export default ApprovalPendingDriver;
