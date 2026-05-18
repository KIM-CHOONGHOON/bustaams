import React from 'react';
import { useNavigate } from 'react-router-dom';

const ContactListCustomer = () => {
    const navigate = useNavigate();

    const inquiries = [
        {
            id: 1,
            category: '입찰 및 예약 문의',
            status: 'Done',
            title: '대형 버스 경매 입찰 방식에 대해 궁금합니다.',
            date: '2024/05/20',
            replyCount: 1,
            isCompleted: true
        },
        {
            id: 2,
            category: '서비스 이용 불편',
            status: 'Pending',
            title: '모바일 앱 알림 설정 오류 건',
            date: '2024/05/22',
            replyCount: 0,
            isCompleted: false
        },
        {
            id: 3,
            category: '계정 및 인증',
            status: 'Done',
            title: '법인 회원으로 전환하고 싶습니다.',
            date: '2024/05/15',
            replyCount: 1,
            isCompleted: true
        }
    ];

    return (
        <div className="bg-background text-on-surface min-h-[100dvh] pb-60 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/40 backdrop-blur-3xl border-b border-white/20 py-6">
                <div className="flex justify-between items-center w-full px-6 max-w-2xl mx-auto">
                    <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl text-teal-800 shadow-xl shadow-teal-900/5 active:scale-95 transition-all">
                        <span className="material-symbols-outlined text-lg">arrow_back</span>
                    </button>
                    <h1 className="font-headline font-black tracking-tighter text-xl text-teal-900 italic">Inquiry Archive</h1>
                    <div className="w-10"></div>
                </div>
            </header>

            <main className="pt-32 px-6 max-w-2xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom duration-1000">
                {/* Editorial Header */}
                <section className="space-y-4 text-left">
                    <h2 className="font-headline text-4xl font-black text-on-surface tracking-tighter leading-tight italic">
                        Your Trusted<br/>
                        <span className="text-primary underline decoration-primary/20 underline-offset-8">Conversations.</span>
                    </h2>
                    <p className="text-slate-400 font-bold text-sm tracking-tight italic leading-relaxed max-w-xs">
                        남겨주신 문의사항은 담당 큐레이터가 정밀 검토 후 순차적으로 답변을 전해 드립니다.
                    </p>
                </section>

                {/* List Container */}
                <div className="space-y-6 text-left">
                    {inquiries.map((item, index) => (
                        <article 
                            key={item.id} 
                            onClick={() => navigate('/contact-details')}
                            className={`group relative bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-teal-900/5 border border-white hover:scale-[1.02] transition-all duration-500 cursor-pointer text-left animate-in fade-in slide-in-from-bottom border-l-8 ${item.isCompleted ? 'border-l-primary' : 'border-l-slate-100 opacity-80'}`}
                            style={{animationDelay: `${index * 100}ms`}}
                        >
                            <div className="flex justify-between items-start mb-6 text-left">
                                <span className={`text-[9px] font-black tracking-[0.3em] uppercase px-5 py-2 rounded-full ${item.isCompleted ? 'bg-primary/5 text-primary' : 'bg-slate-50 text-slate-300'}`}>
                                    {item.category}
                                </span>
                                <span className={`text-[8px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg ${item.isCompleted ? 'bg-primary text-white shadow-primary/20' : 'bg-slate-900 text-white shadow-slate-900/20'}`}>
                                    {item.status}
                                </span>
                            </div>
                            <h3 className="font-headline text-xl font-black text-on-surface mb-6 tracking-tight leading-snug group-hover:text-primary transition-colors text-left italic">
                                {item.title}
                            </h3>
                            <div className="flex items-center gap-6 text-left">
                                <div className="flex flex-col text-left">
                                    <span className="text-[8px] text-slate-300 font-black uppercase tracking-widest leading-none mb-1">Timestamp</span>
                                    <span className="text-xs font-black tracking-tighter leading-none">{item.date}</span>
                                </div>
                                <div className="h-6 w-[2px] bg-slate-50"></div>
                                <div className="flex items-center gap-2 text-left">
                                    <span className="material-symbols-outlined text-lg text-primary" style={{fontVariationSettings: "'FILL' 1"}}>chat_bubble</span>
                                    <span className="text-xs font-black tracking-tighter">{item.replyCount} Response</span>
                                </div>
                            </div>
                        </article>
                    ))}

                    {/* End Marker */}
                    <div className="py-20 flex flex-col items-center justify-center opacity-20 grayscale">
                        <div className="w-16 h-16 rounded-[2rem] bg-slate-100 flex items-center justify-center mb-4 rotate-12">
                            <span className="material-symbols-outlined text-3xl">terminal</span>
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400">EndOfProtocol</p>
                    </div>
                </div>
            </main>

            {/* Floating Action Button */}
            <div className="fixed bottom-32 left-0 right-0 px-6 flex justify-center z-40 pointer-events-none">
                <button 
                    onClick={() => navigate('/contact-customer')}
                    className="pointer-events-auto flex items-center gap-4 bg-slate-900 text-white px-10 py-6 rounded-full shadow-2xl shadow-slate-900/40 hover:scale-105 hover:bg-primary active:scale-95 transition-all duration-500 group"
                >
                    <span className="material-symbols-outlined group-hover:rotate-180 transition-transform duration-700">add_circle</span>
                    <span className="font-black text-sm uppercase tracking-[0.3em]">Create Inquiry</span>
                </button>
            </div>

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

export default ContactListCustomer;
