import React from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNavDriver from '../components/BottomNavDriver';

const SettlementHistoryDriver = () => {
    const navigate = useNavigate();

    const transactions = [
        { id: 1, month: '2024년 5월', type: '운행 정산', status: '정산 완료', txn: 'SET-202405-01', amount: '2,450,000' },
        { id: 2, month: '2024년 4월', type: '운행 정산', status: '정산 완료', txn: 'SET-202404-01', amount: '2,880,000' },
        { id: 3, month: '2024년 3월', type: '운행 정산', status: '정산 완료', txn: 'SET-202403-01', amount: '3,120,000' },
        { id: 4, month: '2024년 2월', type: '운행 정산', status: '정산 완료', txn: 'SET-202402-01', amount: '1,950,000' }
    ];

    return (
        <div className="bg-background text-on-surface min-h-[100dvh] pb-40 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/40 backdrop-blur-3xl border-b border-white/20 py-6">
                <div className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto">
                    <div className="flex items-center gap-6 text-left">
                        <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl text-teal-800 shadow-xl shadow-teal-900/5 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                        </button>
                        <h1 className="font-headline font-black tracking-tighter text-3xl text-teal-900 italic uppercase">정산 내역</h1>
                    </div>
                </div>
            </header>

            <main className="pt-48 px-6 max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom duration-1000 text-left">
                {/* Header Information Section */}
                <section className="flex flex-col md:flex-row md:items-end justify-between gap-10 text-left">
                    <div className="max-w-2xl space-y-6 text-left">
                        <span className="text-secondary font-black tracking-[0.4em] uppercase text-[10px] block px-2 italic">수익 및 정산 관리</span>
                        <h2 className="font-headline text-6xl md:text-8xl font-black text-primary leading-[0.85] tracking-tighter italic uppercase text-left">
                            정산 <br/><span className="text-slate-200 underline decoration-slate-200/20 underline-offset-[12px]">내역서.</span>
                        </h2>
                        <p className="text-slate-400 text-lg font-bold italic tracking-tight leading-relaxed text-left border-l-4 border-slate-50 pl-8">
                            운행에 따른 정산 대금을 확인하고 관리하세요. 모든 수익 내역은 투명하게 기록되며 세무 신고용으로 활용 가능합니다.
                        </p>
                    </div>
                    <div className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-teal-900/5 flex flex-col gap-3 border border-white text-left relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:rotate-12 transition-transform duration-1000">
                            <span className="material-symbols-outlined text-6xl">account_balance_wallet</span>
                        </div>
                        <span className="text-slate-300 text-[9px] font-black uppercase tracking-widest italic">다음 정산 예정일</span>
                        <span className="font-headline text-3xl font-black text-primary italic uppercase tracking-tighter">2024.06.12</span>
                        <span className="text-secondary font-black text-xl italic">지급 대기 금액: ₩1,250,000</span>
                    </div>
                </section>

                {/* Filters */}
                <nav className="flex flex-wrap items-center gap-6 text-left px-4">
                    <button className="bg-primary text-white px-8 py-4 rounded-full font-black text-[10px] uppercase tracking-widest italic shadow-xl shadow-primary/20">전체 정산 내역</button>
                    <button className="bg-white text-slate-400 px-8 py-4 rounded-full font-black text-[10px] uppercase tracking-widest italic border border-slate-50 hover:bg-slate-50 transition-all">2023년</button>
                    <button className="bg-white text-slate-400 px-8 py-4 rounded-full font-black text-[10px] uppercase tracking-widest italic border border-slate-50 hover:bg-slate-50 transition-all">2024년</button>
                    <div className="ml-auto flex items-center gap-3 text-slate-300 font-black text-[9px] uppercase tracking-widest italic">
                        <span className="material-symbols-outlined text-sm">filter_list</span>
                        정렬 방식
                    </div>
                </nav>

                {/* Transactions List */}
                <div className="space-y-8 text-left uppercase">
                    {transactions.map(item => (
                        <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 items-center bg-white p-10 rounded-[3rem] shadow-xl shadow-teal-900/5 hover:-translate-x-2 transition-all duration-500 border border-slate-50 group text-left">
                            <div className="md:col-span-2 mb-6 md:mb-0 text-left">
                                <span className="block font-black text-primary italic text-xl tracking-tighter">{item.month}</span>
                                <span className="text-slate-300 text-[9px] font-black uppercase tracking-widest italic">{item.type}</span>
                            </div>
                            <div className="md:col-span-4 mb-6 md:mb-0 text-left">
                                <div className="flex items-center gap-6 text-left">
                                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>
                                    </div>
                                    <div className="text-left space-y-1">
                                        <span className="block font-black text-primary text-xs italic tracking-widest">{item.status}</span>
                                        <span className="text-slate-300 text-[8px] font-bold italic tracking-tighter">{item.txn}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="md:col-span-3 mb-8 md:mb-0 text-left flex flex-col">
                                <span className="text-3xl font-black text-primary italic tracking-tighter leading-none">₩{item.amount}</span>
                                {item.note && <span className="text-[8px] text-secondary font-black tracking-widest italic mt-2">{item.note}</span>}
                            </div>
                            <div className="md:col-span-3 flex justify-end gap-4 text-left">
                                <button className="flex items-center gap-3 bg-slate-50 text-slate-400 px-6 py-3 rounded-full text-[9px] font-black uppercase tracking-widest italic hover:bg-primary hover:text-white transition-all">
                                     <span className="material-symbols-outlined text-lg">description</span>
                                     상세내역
                                 </button>
                                 <button className="w-12 h-12 flex items-center justify-center bg-primary text-white rounded-full hover:scale-110 transition-all shadow-lg shadow-primary/20">
                                     <span className="material-symbols-outlined text-xl">download</span>
                                 </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Support Box */}
                <section className="mt-32 bg-slate-900 rounded-[4rem] p-16 relative overflow-hidden text-left flex flex-col md:flex-row gap-16 items-center">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-primary rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
                    </div>
                    <div className="relative z-10 flex-1 space-y-8 text-left">
                        <h3 className="font-headline text-4xl font-black text-white italic uppercase tracking-tighter leading-tight text-left">정산 계좌 정보 & 정산 주기 설정</h3>
                        <p className="text-slate-400 text-sm font-bold italic leading-relaxed max-w-sm text-left border-l-4 border-slate-800 pl-8">
                            정산 계좌 정보 변경이 필요하거나 정산 금액에 문의가 있으신가요? busTaams 정산 지원팀이 신속하게 도와드립니다.
                        </p>
                        <div className="flex flex-wrap gap-6 text-left">
                            <button className="bg-primary text-white px-10 py-6 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all italic">
                                계좌 정보 관리
                            </button>
                            <button className="bg-white/10 text-white px-10 py-6 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] hover:bg-white/20 transition-all active:scale-95 italic backdrop-blur-xl border border-white/10">
                                정산 문의하기
                            </button>
                        </div>
                    </div>
                    <div className="relative z-10 w-full md:w-80 aspect-square rounded-[3rem] overflow-hidden border-8 border-white/5 rotate-3 shadow-2xl">
                        <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCa8RTGumtz11_o9kEsVPpesr2OpNGcZ7tRdwhFmJ7XyGYDX_ntMYryyQ1eg5xmc2rd-tYVb-BMcv3hd08aZMvpaHfi7ckhZ3HTIHQj9RNSw8RxPV2EDRMeIfjjie6ic08kQ5S77p7dz1Z89v_BYJjsgfIl5kONQgZF5OwKzfr3yiJwGgtLdqv-MYBToZnS46tC_vKtrwdLhl4Hi1NsZxkppGLTFhrDjsS3QYp2amkfW-V4OOOEpP3fhg4lY8B2HwipP10XKk36EBQ" />
                    </div>
                </section>

            </main>

            <BottomNavDriver activeTab="settlement" />
        </div>
    );
};

export default SettlementHistoryDriver;
