import React from 'react';
import { useNavigate } from 'react-router-dom';

const ContactDetailsCustomer = () => {
    const navigate = useNavigate();

    return (
        <div className="bg-background text-on-surface min-h-[100dvh] pb-40 font-body text-left text-sm md:text-base">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/40 backdrop-blur-3xl border-b border-white/20 py-6">
                <div className="flex justify-between items-center w-full px-6 max-w-3xl mx-auto">
                    <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl text-teal-800 shadow-xl shadow-teal-900/5 active:scale-95 transition-all">
                        <span className="material-symbols-outlined text-lg">arrow_back</span>
                    </button>
                    <h1 className="font-headline font-black tracking-tighter text-xl text-teal-900 italic">Conversation Log</h1>
                    <div className="w-10"></div>
                </div>
            </header>

            <main className="pt-32 px-6 max-w-3xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom duration-1000">
                {/* Status Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-4 border-slate-50 pb-10 text-left">
                    <div className="space-y-4 text-left">
                        <span className="inline-flex items-center px-6 py-2 rounded-full bg-primary text-white text-[10px] font-black tracking-[0.3em] uppercase shadow-xl shadow-primary/20">
                            Protocol Resolved
                        </span>
                        <h2 className="text-5xl font-black text-on-surface tracking-tighter leading-none italic uppercase">Inquiry Dossier</h2>
                    </div>
                    <div className="text-slate-300 text-[10px] font-black uppercase tracking-widest text-left">
                        Reference ID: #AU-882194
                    </div>
                </div>

                <div className="space-y-10 text-left">
                    {/* User's Message Card */}
                    <section className="bg-white rounded-[3.5rem] p-10 md:p-12 shadow-2xl shadow-teal-900/5 border border-white relative overflow-hidden text-left">
                        <div className="flex flex-col gap-8 text-left">
                            <div className="flex justify-between items-start text-left">
                                <div className="space-y-2 text-left">
                                    <p className="text-secondary font-black text-[10px] uppercase tracking-widest leading-none">Category: Financial & Escrow</p>
                                    <h3 className="text-2xl font-black text-on-surface tracking-tight leading-snug italic">터미널 도착 버스 경매 계약금 환불 관련 문의</h3>
                                </div>
                                <time className="text-slate-300 text-[10px] font-black uppercase tracking-widest">2023.11.24</time>
                            </div>
                            <div className="h-[2px] w-full bg-slate-50"></div>
                            <div className="text-slate-500 font-bold italic leading-relaxed text-left text-sm md:text-base">
                                <p>
                                    최근 서울-부산 노선 우등 버스 경매에 참여했습니다. 입찰 결과 낙찰되지 않았음을 확인했는데, 아직 제 계좌로 계약금이 환불되지 않았습니다.
                                    <br/><br/>
                                    경매 ID #B-772의 환불 상태를 확인해 주실 수 있나요? 주말 거래의 경우 별도의 처리 기간이 있는지 궁금합니다.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Admin Response Card */}
                    <section className="bg-slate-900 rounded-[3.5rem] p-10 md:p-12 relative overflow-hidden shadow-2xl shadow-slate-900/30 text-left animate-in zoom-in duration-700 delay-500">
                        {/* Status Bar */}
                        <div className="absolute left-0 top-12 bottom-12 w-2 bg-primary rounded-r-full"></div>
                        
                        <div className="pl-6 space-y-10 text-left">
                            <div className="flex justify-between items-center text-left">
                                <div className="flex items-center gap-6 text-left">
                                    <div className="w-14 h-14 rounded-[1.5rem] bg-primary/20 flex items-center justify-center text-primary shadow-inner">
                                        <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>support_agent</span>
                                    </div>
                                    <div className="text-left">
                                        <h4 className="font-black text-white text-xl tracking-tighter italic">운영진 답변</h4>
                                        <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">VIP Concierge Desk</p>
                                    </div>
                                </div>
                                <time className="text-slate-600 text-[9px] font-black uppercase tracking-widest">2023.11.25 10:42 AM</time>
                            </div>

                            <div className="text-slate-300 font-medium leading-relaxed bg-white/5 p-8 rounded-[2.5rem] border border-white/5 text-left text-sm md:text-base">
                                <p>
                                    안녕하세요, 소중한 고객님. 버스탐(busTaams) 컨시어지 데스크입니다.
                                    <br/><br/>
                                    고객님의 경매 #B-772 참여 내역을 확인했습니다. 낙찰되지 않은 입찰의 경우, 계약금 환불은 경매 종료 후 24시간 이내에 자동으로 시작됩니다. 이번 건은 주말에 발생하여, 이용하시는 금융기관에 따라 잔액 반영까지 영업일 기준 1-2일이 추가로 소요될 수 있습니다.
                                    <br/><br/>
                                    환불 처리는 오늘 오전 09:00에 저희 측에서 완료되었습니다. "내 예약" 탭에서 공식 거래 영수증을 확인해 보시기 바랍니다. 수요일까지 입금이 확인되지 않을 경우, 다시 문의해 주시기 바랍니다.
                                </p>
                            </div>

                            <div className="flex justify-end text-left">
                                <button className="bg-primary text-white px-10 py-5 rounded-full font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl shadow-primary/30 active:scale-95 transition-all hover:bg-white hover:text-black group">
                                    Was this helpful? <span className="material-symbols-outlined inline-block ml-2 group-hover:rotate-12">recommend</span>
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            {/* Shared Bottom Nav */}
            <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex justify-around items-center px-4 py-2 bg-white/70 backdrop-blur-3xl text-slate-400 w-[90%] max-w-md mx-auto rounded-full shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] border border-white">
                <button onClick={() => navigate('/customer-dashboard')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-primary transition-all">
                    <span className="material-symbols-outlined">gavel</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Auction</span>
                </button>
                <button onClick={() => navigate('/contact-list')} className="flex flex-col items-center justify-center px-5 py-2 text-primary relative">
                    <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-lg"></div>
                    <span className="material-symbols-outlined relative z-10" style={{fontVariationSettings: "'FILL' 1"}}>chat_bubble</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1 relative z-10 underline decoration-2 underline-offset-4">Talk</span>
                </button>
                <button onClick={() => navigate('/reservation-list')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-primary transition-all">
                    <span className="material-symbols-outlined">confirmation_number</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Trips</span>
                </button>
                <button onClick={() => navigate('/profile-customer')} className="flex flex-col items-center justify-center bg-slate-900 text-white rounded-full w-12 h-12 shadow-lg active:scale-90 transition-all">
                    <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>person</span>
                </button>
            </nav>
        </div>
    );
};

export default ContactDetailsCustomer;
