import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { findId, findPassword } from '../api';
import { notify } from '../utils/toast';

const FindAccount = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('id'); // 'id' or 'pw'
    const [showResult, setShowResult] = useState(false);

    // Form inputs
    const [phoneNo, setPhoneNo] = useState('');
    const [userId, setUserId] = useState('');
    const [foundId, setFoundId] = useState('');

    const handleFindId = async () => {
        if (!phoneNo) return notify.warn('휴대폰 번호를 입력하세요.');
        try {
            const res = await findId(phoneNo);
            if (res.success) {
                setFoundId(res.userId);
                setShowResult(true);
            } else {
                notify.error('실패', res.error || '정보를 찾을 수 없습니다.');
            }
        } catch (err) {
            notify.error('오류', '아이디 찾기 중 오류가 발생했습니다.');
        }
    };

    const handleFindPw = async () => {
        if (!userId || !phoneNo) return notify.warn('아이디와 휴대폰 번호를 모두 입력하세요.');
        try {
            const res = await findPassword(userId, phoneNo);
            if (res.success) {
                notify.success('발송 성공', '임시 비밀번호가 휴대폰으로 발송되었습니다. (서버 로그 확인 가능)');
                setTimeout(() => navigate('/login'), 1500); // 1.5초 후 로그인 화면으로 이동
            } else {
                notify.error('실패', res.error || '일치하는 사용자 정보를 찾을 수 없습니다.');
            }
        } catch (err) {
            notify.error('오류', '비밀번호 발송 중 오류가 발생했습니다.');
        }
    };

    return (
        <div className="bg-background text-on-surface font-body min-h-screen flex flex-col items-center">
            {/* Top Navigation Bar */}
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-sm border-b border-slate-50 flex items-center justify-between px-6 py-4">
                <button onClick={() => navigate(-1)} className="text-teal-600 active:scale-95 duration-200 p-2 hover:bg-slate-50 rounded-full transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-2xl font-black text-teal-700 italic tracking-tighter">busTaams</h1>
                <div className="w-10"></div>
            </header>

            <main className="flex-grow pt-24 pb-12 px-6 max-w-md mx-auto w-full text-left">
                {/* Header Section */}
                <section className="mb-12">
                    <h2 className="text-4xl font-extrabold text-on-surface leading-tight tracking-tighter mb-2 text-[32px] md:text-[40px]">
                        계정 정보를<br/>잊으셨나요?
                    </h2>
                    <p className="text-on-surface-variant font-medium text-sm">안전한 서비스 이용을 위해 본인 확인이 필요합니다.</p>
                </section>

                {/* Tabs */}
                <div className="mb-10 flex gap-8 border-none overflow-x-auto no-scrollbar relative">
                    <button 
                        onClick={() => {setActiveTab('id'); setShowResult(false);}}
                        className={`relative pb-2 text-xl font-bold transition-all duration-300 ${activeTab === 'id' ? 'text-teal-700' : 'text-slate-300 hover:text-teal-600/60'}`}
                    >
                        아이디 찾기
                        {activeTab === 'id' && <span className="absolute bottom-0 left-0 w-8 h-1 bg-teal-600 rounded-full"></span>}
                    </button>
                    <button 
                        onClick={() => {setActiveTab('pw'); setShowResult(false);}}
                        className={`relative pb-2 text-xl font-bold transition-all duration-300 ${activeTab === 'pw' ? 'text-teal-700' : 'text-slate-300 hover:text-teal-600/60'}`}
                    >
                        비밀번호 찾기
                        {activeTab === 'pw' && <span className="absolute bottom-0 left-0 w-8 h-1 bg-teal-600 rounded-full"></span>}
                    </button>
                </div>

                {!showResult ? (
                    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {activeTab === 'id' ? (
                            <div className="space-y-8">
                                <div className="space-y-6">
                                    <div className="relative group">
                                        <label className="block text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-2 ml-1">휴대폰 번호</label>
                                        <input 
                                            value={phoneNo}
                                            onChange={(e) => setPhoneNo(e.target.value.replace(/[^0-9]/g, ''))}
                                            className="w-full px-6 py-4 bg-slate-50 border-none rounded-xl focus:bg-white focus:shadow-xl transition-all duration-300 text-on-surface placeholder:text-slate-300 font-medium outline-none" 
                                            placeholder="01012345678" 
                                            type="tel"
                                        />
                                    </div>
                                </div>
                                <button 
                                    onClick={handleFindId}
                                    className="w-full py-5 rounded-full bg-gradient-to-r from-primary to-teal-800 text-white font-bold text-lg shadow-2xl shadow-primary/20 active:scale-95 transition-all outline-none"
                                >
                                    아이디 찾기
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                <div className="space-y-6">
                                    <div className="relative">
                                        <label className="block text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-2 ml-1">아이디</label>
                                        <input 
                                            value={userId}
                                            onChange={(e) => setUserId(e.target.value)}
                                            className="w-full px-6 py-4 bg-slate-50 border-none rounded-xl font-medium outline-none" 
                                            placeholder="아이디를 입력하세요" 
                                            type="text"
                                        />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-2 ml-1">휴대폰 번호</label>
                                        <input 
                                            value={phoneNo}
                                            onChange={(e) => setPhoneNo(e.target.value.replace(/[^0-9]/g, ''))}
                                            className="w-full px-6 py-4 bg-slate-50 border-none rounded-xl font-medium outline-none" 
                                            placeholder="01012345678" 
                                            type="tel"
                                        />
                                    </div>
                                </div>
                                <button 
                                    onClick={handleFindPw}
                                    className="w-full py-5 rounded-full bg-slate-100 text-slate-400 font-bold text-lg hover:bg-primary hover:text-white transition-all shadow-md active:scale-95 outline-none"
                                >
                                    임시 비밀번호 발송
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Result Preview Card */
                    <section className="mt-8 animate-in zoom-in-95 duration-500">
                        <div className="bg-white rounded-2xl p-8 shadow-2xl shadow-teal-900/5 border-l-4 border-secondary relative overflow-hidden border border-slate-50/50">
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="material-symbols-outlined text-secondary text-[20px]" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>
                                    <span className="text-[11px] font-bold text-secondary uppercase tracking-widest">본인 확인 완료</span>
                                </div>
                                <p className="text-on-surface-variant mb-1 font-medium text-sm">고객님의 아이디는 아래와 같습니다.</p>
                                <div className="text-3xl font-extrabold text-on-surface tracking-tight mb-8">
                                    {foundId}
                                </div>
                                <div className="flex flex-col md:flex-row gap-3">
                                    <button 
                                        onClick={() => navigate('/login')}
                                        className="flex-1 py-4 bg-slate-100 rounded-full font-bold text-on-surface active:scale-95 transition-all text-sm"
                                    >
                                        로그인하기
                                    </button>
                                    <button 
                                        onClick={() => {setActiveTab('pw'); setShowResult(false);}}
                                        className="flex-1 py-4 bg-gradient-to-br from-secondary to-orange-600 text-white rounded-full font-bold active:scale-95 transition-all text-sm"
                                    >
                                        비밀번호 찾기
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                )}
            </main>

            <footer className="mt-auto pb-12 px-6 text-center">
                <p className="text-[12px] text-on-surface-variant font-medium">
                    도움이 필요하신가요? <button className="text-teal-600 font-bold underline decoration-2 underline-offset-4 ml-1">고객센터 문의</button>
                </p>
            </footer>
        </div>
    );
};

export default FindAccount;
