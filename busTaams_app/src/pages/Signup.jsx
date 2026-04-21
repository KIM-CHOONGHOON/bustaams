import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Signup = () => {
    const navigate = useNavigate();
    const [userType, setUserType] = useState('customer');

    return (
        <div className="bg-background text-on-background min-h-screen flex flex-col font-body">
            <header className="flex justify-between items-center w-full px-6 pt-8 pb-4 max-w-7xl mx-auto">
                <div className="flex items-center">
                    <h1 className="text-teal-900 font-headline font-black tracking-tighter text-3xl">busTaams</h1>
                </div>
                <button className="text-slate-500 font-label font-bold uppercase tracking-widest text-[10px] hover:opacity-80 transition-opacity">
                    고객지원
                </button>
            </header>

            <main className="flex-grow flex flex-col items-center justify-center px-6 py-12">
                <div className="w-full max-w-4xl mx-auto mb-12 flex justify-center">
                    <div className="bg-surface-container-high p-1 rounded-full flex w-full max-w-xs shadow-inner">
                        <button 
                            className={`flex-1 py-3 px-6 rounded-full font-headline font-bold text-sm transition-all ${userType === 'customer' ? 'bg-primary-container text-white shadow-md' : 'text-on-surface-variant hover:bg-surface-container'}`}
                            onClick={() => setUserType('customer')}
                            type="button"
                        >고객</button>
                        <button 
                            className={`flex-1 py-3 px-6 rounded-full font-headline font-bold text-sm transition-all ${userType === 'driver' ? 'bg-primary-container text-white shadow-md' : 'text-on-surface-variant hover:bg-surface-container'}`}
                            onClick={() => setUserType('driver')}
                            type="button"
                        >기사</button>
                    </div>
                </div>

                <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
                    <section className="md:col-span-5 flex flex-col space-y-8">
                        <div className="space-y-4">
                            <span className="text-secondary font-label font-bold uppercase tracking-[0.2em] text-xs">최고의 기회</span>
                            <h2 className="font-headline font-extrabold text-5xl lg:text-6xl text-on-surface leading-[1.1] tracking-tight text-[48px]">
                                새로운 <br/><span className="text-primary-container">여정의 시작.</span>
                            </h2>
                        </div>
                        <p className="font-body text-on-surface-variant text-lg leading-relaxed max-w-sm text-[16px]">
                            엄선된 프리미엄 버스 경매를 만나보세요. 정교하게 큐레이션된 플릿 자산을 제공합니다.
                        </p>
                        <div className="relative w-full aspect-[4/5] rounded-lg overflow-hidden shadow-[0_40px_60px_-15px_rgba(25,28,30,0.06)] bg-surface-container-low hidden md:block">
                            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuB2fWUX7XcWFDn0Y9JCFUpfCNxyz4PbfBAh6E2aBRAby4GxStSG1kWSSHsMXPlyiIGa08W3YNAkN1msm2tagmXjLujlynojhDukW256FWbtN0zlAnt7Y0xpycil1Z6LEFc0wbKMBWLOBjrK0GdQNLPHxDO62EOIwXxMwgrFFcUEK344ysHW-xNENvpddCNc96UXa9508sKGup1vmpR0Hu4l0aVInCmD_kAj9ic97XLOjJafXMmjsmJOR5Hcc_lDBoql9XTGWSKUs6Q" alt="Bus" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" />
                            <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent"></div>
                        </div>
                    </section>

                    <section className="md:col-span-7 w-full bg-white p-8 md:p-12 rounded-2xl shadow-[0_40px_60px_-15px_rgba(25,28,30,0.06)]">
                        <form className="space-y-8">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="font-headline font-bold text-sm tracking-tight text-on-surface px-1">이메일</label>
                                    <input className="w-full bg-surface-container-high border-none rounded-lg py-4 px-6 focus:ring-2 focus:ring-primary-fixed-dim transition-all outline-none text-on-surface" placeholder="example@email.com" type="email" />
                                </div>
                                <div className="space-y-2">
                                    <label className="font-headline font-bold text-sm tracking-tight text-on-surface px-1">고객명</label>
                                    <input className="w-full bg-surface-container-high border-none rounded-lg py-4 px-6 focus:ring-2 focus:ring-primary-fixed-dim transition-all outline-none text-on-surface" placeholder="실명을 입력하세요" type="text" />
                                </div>
                                <div className="space-y-2">
                                    <label className="font-headline font-bold text-sm tracking-tight text-on-surface px-1">아이디</label>
                                    <div className="flex gap-3">
                                        <input className="flex-grow bg-surface-container-high rounded-lg py-4 px-6 border-none focus:ring-2 focus:ring-primary-fixed-dim outline-none" placeholder="고유한 아이디" type="text" />
                                        <button className="whitespace-nowrap px-6 rounded-lg font-label font-bold text-xs uppercase tracking-widest text-primary border border-primary-fixed hover:bg-primary-fixed transition-colors" type="button">중복 확인</button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="font-headline font-bold text-sm tracking-tight text-on-surface px-1">비밀번호</label>
                                    <div className="space-y-3">
                                        <input className="w-full bg-surface-container-high border-none rounded-lg py-4 px-6 focus:ring-2 focus:ring-primary-fixed-dim transition-all outline-none" placeholder="비밀번호" type="password" />
                                        <input className="w-full bg-surface-container-high border-none rounded-lg py-4 px-6 focus:ring-2 focus:ring-primary-fixed-dim transition-all outline-none" placeholder="비밀번호 확인" type="password" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-surface-container-highest">
                                <label className="font-headline font-bold text-sm tracking-tight text-on-surface px-1">약관 및 정책 동의</label>
                                <div className="bg-surface-container-low rounded-xl p-6 space-y-4">
                                    <div className="flex items-start gap-3">
                                        <input className="mt-1 w-5 h-5 rounded border-outline-variant text-primary" type="checkbox" id="terms-all" />
                                        <label className="text-sm font-body text-on-surface-variant flex-grow" htmlFor="terms-all"><span className="text-primary font-bold">[필수]</span> 서비스 이용약관 동의</label>
                                        <button className="text-[10px] text-outline underline font-label" type="button">상세보기</button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <label className="font-headline font-bold text-sm tracking-tight text-on-surface px-1">전자 서명</label>
                                <div className="w-full h-40 bg-surface-container-high rounded-xl border-2 border-dashed border-outline-variant relative overflow-hidden flex items-center justify-center cursor-crosshair">
                                    <span className="text-outline-variant font-label text-[10px] uppercase tracking-[0.2em] pointer-events-none">여기에 서명해 주세요</span>
                                </div>
                            </div>

                            <div className="pt-6">
                                <button className="w-full bg-primary-container text-white py-5 rounded-full font-headline font-bold text-lg shadow-lg active:scale-95 transition-transform" type="submit">계정 생성</button>
                            </div>

                            <div className="text-center pt-4">
                                <p className="text-xs font-body text-outline text-[12px]">이미 계정이 있으신가요? <button type="button" onClick={() => navigate('/login')} className="text-primary-container font-bold underline underline-offset-4 ml-1">로그인하기</button></p>
                            </div>
                        </form>
                    </section>
                </div>
            </main>

            <footer className="p-8 text-center text-outline-variant font-label text-[10px] tracking-[0.5em] uppercase">
                Editorial Transit Experience © busTaams 2024
            </footer>
        </div>
    );
};

export default Signup;
