import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const InquiryDetailCustomer = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    return (
        <div className="bg-background text-on-surface min-h-screen pb-32 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-50 shadow-sm">
                <div className="flex items-center justify-between px-6 h-18 w-full max-w-3xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="material-symbols-outlined text-teal-800 hover:bg-slate-50 p-2 rounded-full transition-all">arrow_back</button>
                        <h1 className="font-headline text-lg font-black tracking-tighter text-teal-900 italic leading-none">busTaams</h1>
                    </div>
                </div>
            </header>

            <main className="pt-32 px-6 max-w-3xl mx-auto">
                {/* Page Header & Status */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                    <div className="space-y-3">
                        <span className="inline-flex items-center px-5 py-2 rounded-full bg-primary text-white text-[10px] font-black tracking-[0.2em] uppercase shadow-lg shadow-primary/20">
                            Solved
                        </span>
                        <h2 className="text-[40px] font-black text-primary tracking-tighter leading-tight mt-4">1:1 문의 상세 정보</h2>
                    </div>
                    <div className="text-slate-300 text-[10px] font-black uppercase tracking-widest pb-2">
                        Ticket Number #AU-882194
                    </div>
                </div>

                <div className="space-y-12">
                    {/* User's Question Card */}
                    <section className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-teal-900/[0.03] border border-slate-50 relative overflow-hidden">
                        <div className="flex flex-col gap-8 relative z-10">
                            <div className="flex justify-between items-start">
                                <div className="space-y-2">
                                    <p className="text-secondary font-black text-[10px] uppercase tracking-[0.2em]">결제 및 계약금 관련</p>
                                    <h3 className="text-2xl font-black text-on-surface tracking-tight leading-snug">터미널 도착 버스 경매 계약금 환불 관련 문입니다.</h3>
                                </div>
                                <time className="text-slate-300 text-[11px] font-black uppercase tracking-widest">2023. 11. 24</time>
                            </div>
                            <div className="h-px w-full bg-slate-50"></div>
                            <div className="prose prose-slate max-w-none">
                                <p className="text-on-surface-variant leading-relaxed font-bold opacity-70 text-lg">
                                    최근 서울-부산 노선 우등 버스 경매에 참여했습니다. 입찰 결과 낙찰되지 않았음을 확인했는데, 아직 제 계대로 계약금이 환불되지 않았습니다.
                                    <br/><br/>
                                    경매 ID #B-772의 환불 상태를 확인해 주실 수 있나요? 주말 거래의 경우 별도의 처리 기간이 있는지 궁금합니다.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Admin Response Card */}
                    <section className="bg-slate-50 rounded-[2.5rem] p-10 relative overflow-hidden border border-slate-100">
                        {/* Kinetic Accent Line */}
                        <div className="absolute left-0 top-0 bottom-0 w-2 bg-primary"></div>
                        <div className="pl-6">
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20 rotate-3">
                                        <span className="material-symbols-outlined text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>support_agent</span>
                                    </div>
                                    <div>
                                        <h4 className="font-black text-on-surface tracking-tight text-xl">운영진 공식 답변</h4>
                                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-0.5">Concierge Support</p>
                                    </div>
                                </div>
                                <time className="text-slate-300 text-[10px] font-black uppercase tracking-widest">2023. 11. 25, 10:42 AM</time>
                            </div>
                            <div className="bg-white/60 backdrop-blur-sm p-8 rounded-[1.5rem] border border-white">
                                <p className="text-on-surface leading-loose font-bold text-[17px] opacity-80">
                                    안녕하세요, 소중한 고객님. 버스탐(busTaams) 고객 센터를 찾아주셔서 진심으로 감사드립니다.
                                    <br/><br/>
                                    고객님의 경매 #B-772 참여 내역을 상세히 확인하였습니다. 낙찰되지 않은 입찰의 경우, 계약금 환불은 경매 종료 직후 자동으로 프로세스가 시작됩니다. 이번 건은 주말에 발생하여, 이용하시는 금융기관에 따라 잔액 반영까지 영업일 기준 1-2일이 추가로 소요될 수 있는 점 양해 부탁드립니다.
                                    <br/><br/>
                                    확인 결과, 환불 처리는 오늘 오전 09:00에 저희 측에서 최종 완료되었습니다. "내 예약" 탭에서 상세 내역을 다시 한번 확인해 보시기 바랍니다. 수요일까지 입금이 확인되지 않을 경우, 거래 ID와 함께 다시 문의해 주시면 즉각 조치하겠습니다.
                                </p>
                            </div>
                            <div className="mt-10 flex justify-end">
                                <button className="bg-gradient-to-br from-primary to-teal-800 text-white px-10 py-5 rounded-full font-black text-sm shadow-2xl shadow-primary/30 hover:scale-[1.05] transition-all active:scale-95 flex items-center gap-3">
                                    <span>답변이 도움이 되었습니다</span>
                                    <span className="material-symbols-outlined text-[20px]">thumb_up</span>
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            {/* Premium Bottom Nav */}
            <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex justify-around items-center px-4 py-2 bg-white/80 backdrop-blur-[30px] w-[90%] max-w-md mx-auto rounded-full shadow-2xl shadow-teal-900/20 border border-white/50">
                <button onClick={() => navigate('/customer-dashboard')} className="flex flex-col items-center justify-center text-slate-300 px-5 py-2 hover:text-teal-600 transition-all">
                    <span className="material-symbols-outlined">gavel</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Auction</span>
                </button>
                <button className="flex flex-col items-center justify-center bg-primary/10 text-primary rounded-full px-5 py-2 transition-all">
                    <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>chat_bubble</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Support</span>
                </button>
                <button onClick={() => navigate('/reservation-list')} className="flex flex-col items-center justify-center text-slate-300 px-5 py-2 hover:text-teal-600 transition-all">
                    <span className="material-symbols-outlined">directions_bus</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Trips</span>
                </button>
                <button onClick={() => navigate('/profile-customer')} className="flex flex-col items-center justify-center text-slate-300 px-5 py-2 hover:text-teal-600 transition-all">
                    <span className="material-symbols-outlined">person</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Account</span>
                </button>
            </nav>
        </div>
    );
};

export default InquiryDetailCustomer;
