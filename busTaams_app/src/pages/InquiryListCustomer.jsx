import React from 'react';
import { useNavigate } from 'react-router-dom';

const InquiryListCustomer = () => {
    const navigate = useNavigate();

    const inquiries = [
        {
            id: 1,
            category: '입찰 및 예약 문의',
            status: '답변 완료',
            title: '대형 버스 경매 입찰 방식에 대해 궁금합니다.',
            date: '2024/05/20',
            replyCount: 1,
            isCompleted: true
        },
        {
            id: 2,
            category: '서비스 이용 불편',
            status: '답변 대기',
            title: '모바일 앱 알림 설정 오류 건',
            date: '2024/05/22',
            replyCount: 0,
            isCompleted: false
        },
        {
            id: 3,
            category: '계정 및 인증',
            status: '답변 완료',
            title: '법인 회원으로 전환하고 싶습니다.',
            date: '2024/05/15',
            replyCount: 1,
            isCompleted: true
        }
    ];

    return (
        <div className="bg-background text-on-surface min-h-screen pb-40 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-sm border-b border-slate-50">
                <div className="flex items-center justify-between px-6 py-4 w-full max-w-2xl mx-auto">
                    <button onClick={() => navigate(-1)} className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-50 transition-all active:scale-90">
                        <span className="material-symbols-outlined text-teal-800">arrow_back</span>
                    </button>
                    <h1 className="font-headline font-black text-lg text-teal-800 tracking-tighter italic">1:1 문의 내역</h1>
                    <div className="w-10"></div>
                </div>
            </header>

            <main className="pt-28 px-6 max-w-2xl mx-auto">
                {/* Welcome Section */}
                <section className="mb-14">
                    <h2 className="font-headline text-[32px] font-black text-on-surface tracking-tighter leading-tight">
                        고객님의 소중한<br/>
                        <span className="text-primary italic">문의 기록</span>입니다.
                    </h2>
                    <p className="mt-4 text-on-surface-variant font-bold text-sm leading-relaxed max-w-xs opacity-60">
                        남겨주신 문의사항은 담당자가 확인 후 순차적으로 답변해 드리고 있습니다.
                    </p>
                </section>

                {/* List of Inquiries */}
                <div className="space-y-6">
                    {inquiries.map((inquiry) => (
                        <article 
                            key={inquiry.id}
                            onClick={() => navigate(`/inquiry-detail/${inquiry.id}`)}
                            className="group relative bg-white rounded-2xl p-7 shadow-2xl shadow-teal-900/[0.03] border border-slate-50 cursor-pointer hover:translate-y-[-4px] transition-all duration-300"
                        >
                            {inquiry.isCompleted && (
                                <div className="absolute left-0 top-7 bottom-7 w-1.5 bg-primary rounded-r-full"></div>
                            )}
                            <div className="flex justify-between items-start mb-5">
                                <span className={`text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-full ${inquiry.isCompleted ? 'bg-primary/5 text-primary' : 'bg-slate-100 text-slate-400'}`}>
                                    {inquiry.category}
                                </span>
                                <span className={`text-[10px] font-black px-3 py-1.5 rounded-full ${inquiry.isCompleted ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-400'}`}>
                                    {inquiry.status}
                                </span>
                            </div>
                            <h3 className="font-headline text-lg font-black text-on-surface mb-3 tracking-tight group-hover:text-primary transition-colors">
                                {inquiry.title}
                            </h3>
                            <div className="flex items-center gap-4 text-on-surface-variant opacity-70">
                                <span className="text-xs font-bold">{inquiry.date}</span>
                                <span className="w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
                                <div className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px]">{inquiry.isCompleted ? 'chat_bubble' : 'hourglass_empty'}</span>
                                    <span className="text-xs font-bold">
                                        {inquiry.isCompleted ? `${inquiry.replyCount}개 답변` : '검토중'}
                                    </span>
                                </div>
                            </div>
                        </article>
                    ))}

                    {/* End State */}
                    <div className="py-16 flex flex-col items-center justify-center opacity-20">
                        <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-3xl text-on-surface-variant">help_center</span>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant">History Complete</p>
                    </div>
                </div>
            </main>

            {/* Floating Action Button */}
            <div className="fixed bottom-32 left-0 right-0 px-6 flex justify-center pointer-events-none z-40">
                <button 
                    onClick={() => navigate('/inquiry-form')}
                    className="pointer-events-auto flex items-center gap-3 bg-gradient-to-br from-primary to-teal-800 text-white px-8 py-5 rounded-full shadow-2xl shadow-primary/40 hover:scale-105 active:scale-95 transition-all duration-300 outline-none"
                >
                    <span className="material-symbols-outlined font-black">add</span>
                    <span className="font-headline font-black text-base tracking-tight">새로운 문의 시작하기</span>
                </button>
            </div>

            {/* BottomNavBar */}
            <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] rounded-full bg-white/80 backdrop-blur-xl shadow-2xl shadow-teal-900/10 z-50 border border-slate-50">
                <div className="flex justify-around items-center p-2">
                    <button onClick={() => navigate('/customer-dashboard')} className="flex flex-col items-center justify-center text-slate-300 px-5 py-2 hover:text-teal-600 transition-all">
                        <span className="material-symbols-outlined">gavel</span>
                        <span className="font-black text-[9px] uppercase tracking-wider mt-1">Auction</span>
                    </button>
                    <button className="flex flex-col items-center justify-center bg-primary/10 text-primary rounded-full px-5 py-2 transition-all">
                        <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>chat_bubble</span>
                        <span className="font-black text-[9px] uppercase tracking-wider mt-1">Support</span>
                    </button>
                    <button onClick={() => navigate('/reservation-list')} className="flex flex-col items-center justify-center text-slate-300 px-5 py-2 hover:text-teal-600 transition-all">
                        <span className="material-symbols-outlined">directions_bus</span>
                        <span className="font-black text-[9px] uppercase tracking-wider mt-1">Book</span>
                    </button>
                    <button onClick={() => navigate('/profile-customer')} className="flex flex-col items-center justify-center text-slate-300 px-5 py-2 hover:text-teal-600 transition-all">
                        <span className="material-symbols-outlined">person</span>
                        <span className="font-black text-[9px] uppercase tracking-wider mt-1">Me</span>
                    </button>
                </div>
            </nav>
        </div>
    );
};

export default InquiryListCustomer;
