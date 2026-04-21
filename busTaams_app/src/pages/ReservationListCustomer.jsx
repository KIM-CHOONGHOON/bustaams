import React from 'react';
import { useNavigate } from 'react-router-dom';

const ReservationListCustomer = () => {
    const navigate = useNavigate();

    const reservations = [
        {
            id: 1,
            status: '운행 예정',
            statusCode: 'UPCOMING',
            from: '샌프란시스코',
            to: '로스앤젤레스',
            date: '2023/12/15',
            busType: '일반 45인승',
            seats: '12A, 12B',
            img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBkFgpCqOKwslyeB-NDZZWgUztAqUL0bfHiOrJqNJJN6DpHr41urNw5IJbiscbKz7SRUeipoTldOC-T9K1hgHX0Ql-j8HNSBG7i7RsroxP2pU55sPH2h18ejgiAIUhlk7ClZgs-q20FqjXXkNpV6ztIhaTC2EUu5gNvLvdKaXaGHKYW2nXvxveE0DY6Z3XOqnvIyAdfKEvapFzLayq9xIjqgGqcuwwu4qmp5WnLSgsnzUNS17N7rvUar-ZpG0fnE-1dIGrFGlPczso'
        },
        {
            id: 2,
            status: '예약 확정',
            statusCode: 'CONFIRMED',
            from: '시애틀',
            to: '포틀랜드',
            date: '2024/01/05',
            busType: '이그제큐티브 스위트',
            seats: '04F',
            img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuANsU3lYLTcEummE_OIbkDTAG6qYL1K1GqAhpmS6U46FK9-pDAA0S8GU_Rf7PNaZeSJrWYyLmI2OJM85jG1b-PgdHBE73M-upzpaeSJSNNaTKJ92evAb4uoOFBFI-zpip_6g2J54ILCYfhUfYPIuVNjq6eXjsXFnUbVG3yWuHW5fVuQw-oU8KUFaH6wdky54TyJQkG8CcXH1_Cvgs57cLHZFu2g_1pUR0p-4DGvuP1jGjIJ31xNUrsri5upMgYgapVT6bn0cuOw0-U'
        },
        {
            id: 3,
            status: '운행 완료',
            statusCode: 'COMPLETED',
            from: '라스베이거스',
            to: '피닉스',
            date: '2023/11/20',
            busType: '일반 45인승',
            seats: '-',
            img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAajDyuTPXjqy919kPT6tOWkBYkWF2ezCjk7h4pY2yvNzH8tmS9kh5hkzflmjQEoSAZXy1jJP9qLgMeOFp4JATVgzPk3vo1ErworFujJHZdo_NwKXTkIJnQE8nH8nIpfF_15KfrqatVeR09ntz6FMzMiFo9LCnG38pDFnrsWnGZa533vqa9QEUEyzWrquG5QCCRev65boyGpomD-8dwifdE3OCONLSKQ2IElHO_7UE-MJJ89-fjj2qYDmOVUYY5v7RuSWSmZRyDW0Y'
        }
    ];

    return (
        <div className="bg-background text-on-surface min-h-screen pb-40 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-3xl border-b border-white py-4 shadow-sm">
                <div className="flex items-center justify-between px-6 h-18 w-full max-w-7xl mx-auto">
                    <div className="flex items-center gap-5">
                        <button className="text-teal-800 hover:bg-slate-50 p-2 rounded-full transition-all">
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                        <h1 className="text-3xl font-black text-teal-900 tracking-tighter font-headline italic">busTaams</h1>
                    </div>
                    <div className="flex items-center gap-8">
                        <nav className="hidden lg:flex items-center gap-10">
                            <a className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em] hover:text-primary transition-all">Home</a>
                            <a className="text-primary font-black uppercase text-[10px] tracking-[0.3em] border-b-2 border-primary pb-1">Reservations</a>
                            <a className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em] hover:text-primary transition-all">Messages</a>
                        </nav>
                        <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-2xl rotate-3">
                            <img alt="User" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDAuydGKeWcVXnNwZDRc1I8NFS_BI9gq969584jVmM5maopYZ63srZ7FvlrWEb_EAlmkWIjBb5BPNcP1t7cxeVW66HWUlO53iZcSpZ7qSCpZdrQUXwvp8X5ibBv6Xx57pJrCmFA8WY8f1W6QCEC0wt2VbiePnFQ6Dco1T3vF-Vkzh0wL5vNyHOTwR2RKCQJ0QLxejtltR8UYIvSuocurIgQmtVJa8pHYHzWuHFe8N8rJRH34uYOlkJtQMcv8C1c99d4lMC41r-mrI" />
                        </div>
                    </div>
                </div>
            </header>

            <main className="pt-32 px-6 max-w-6xl mx-auto space-y-16">
                {/* Editorial Header Section */}
                <section className="animate-in fade-in slide-in-from-top duration-1000 text-left">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="max-w-2xl space-y-4 text-left">
                            <span className="text-secondary font-black tracking-[0.5em] uppercase text-[10px] block mb-2">Luxury Concierge</span>
                            <h2 className="text-6xl md:text-8xl font-black font-headline text-on-surface tracking-tighter leading-none">내 예약 내역</h2>
                            <div className="mt-6 h-1.5 w-32 bg-primary rounded-full shadow-lg shadow-primary/20"></div>
                        </div>
                        <button className="flex items-center gap-3 bg-white px-8 py-4 rounded-full text-slate-400 text-xs font-black uppercase tracking-widest border border-slate-50 shadow-sm hover:text-primary transition-all">
                            <span className="material-symbols-outlined text-sm">filter_list</span>
                            <span>Filter Results</span>
                        </button>
                    </div>
                </section>

                {/* Reservations List */}
                <div className="grid grid-cols-1 gap-12">
                    {reservations.map((res, idx) => (
                        <div 
                            key={res.id}
                            onClick={() => res.statusCode !== 'COMPLETED' && navigate(`/reservation-detail/${res.id}`)}
                            className={`group relative bg-white rounded-[3.5rem] shadow-2xl shadow-teal-900/[0.03] overflow-hidden transition-all duration-700 hover:shadow-teal-900/10 cursor-pointer animate-in fade-in slide-in-from-bottom border border-slate-50 ${res.statusCode === 'COMPLETED' ? 'opacity-60 border-dashed bg-slate-50/50' : ''}`}
                            style={{ animationDelay: `${idx * 200}ms` }}
                        >
                            {/* Vertical Status Accent */}
                            <div className={`absolute left-0 top-0 bottom-0 w-2 transition-all ${res.statusCode === 'UPCOMING' ? 'bg-secondary' : res.statusCode === 'CONFIRMED' ? 'bg-primary' : 'bg-slate-200'}`}></div>
                            
                            <div className="p-10 flex flex-col lg:flex-row gap-12">
                                {/* Image Section */}
                                <div className="w-full lg:w-96 lg:min-w-[24rem] h-64 rounded-[2.5rem] overflow-hidden relative shadow-2xl">
                                    <img className={`w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 ${res.statusCode === 'COMPLETED' ? 'grayscale' : 'grayscale group-hover:grayscale-0'}`} alt="Trip" src={res.img}/>
                                    <div className={`absolute top-6 left-6 text-white text-[9px] font-black px-5 py-2 rounded-full uppercase tracking-widest shadow-xl ${res.statusCode === 'UPCOMING' ? 'bg-secondary' : res.statusCode === 'CONFIRMED' ? 'bg-primary' : 'bg-slate-400'}`}>
                                        {res.status}
                                    </div>
                                </div>
                                
                                {/* Content Section */}
                                <div className="flex-1 flex flex-col justify-between py-2 text-left">
                                    <div className="space-y-10 text-left">
                                        <div className="flex flex-col md:flex-row justify-between items-start gap-6 text-left">
                                            <div className="text-left">
                                                <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.3em] mb-3">Service Route</p>
                                                <h3 className="text-4xl font-headline font-black text-on-surface flex items-center gap-6 tracking-tighter">
                                                    {res.from} 
                                                    <span className={`material-symbols-outlined text-3xl ${res.statusCode === 'COMPLETED' ? 'text-slate-200' : 'text-primary'}`}>east</span> 
                                                    {res.to}
                                                </h3>
                                            </div>
                                            <div className="text-left md:text-right">
                                                <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.3em] mb-3">Status Result</p>
                                                <span className={`${res.statusCode === 'COMPLETED' ? 'text-slate-400' : 'text-primary'} font-black text-xs uppercase tracking-widest flex items-center gap-3`}>
                                                    <span className="material-symbols-outlined text-lg" style={{fontVariationSettings: "'FILL' 1"}}>{res.statusCode === 'COMPLETED' ? 'history' : 'verified'}</span>
                                                    {res.statusCode === 'COMPLETED' ? '운행 종료됨' : '예약 및 확정 완료'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-10 pt-10 border-t border-slate-50 text-left">
                                            <div className="text-left">
                                                <p className="text-slate-300 text-[9px] font-black uppercase tracking-widest mb-2">Depart Date</p>
                                                <p className="text-on-surface font-black tracking-tight text-lg">{res.date}</p>
                                            </div>
                                            <div className="text-left">
                                                <p className="text-slate-300 text-[9px] font-black uppercase tracking-widest mb-2">Vehicle Specification</p>
                                                <p className="text-on-surface font-black tracking-tight text-lg">{res.busType}</p>
                                            </div>
                                            <div className="hidden md:block text-left">
                                                <p className="text-slate-300 text-[9px] font-black uppercase tracking-widest mb-2">Confirmed Seats</p>
                                                <p className="text-on-surface font-black tracking-tight text-lg">{res.seats}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-12 flex flex-wrap gap-4 text-left">
                                        {res.statusCode !== 'COMPLETED' ? (
                                            <>
                                                <button className="bg-slate-900 text-white px-10 py-5 rounded-full font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all">
                                                    View Ticket
                                                </button>
                                                <button className="border-2 border-slate-100 text-slate-400 px-10 py-5 rounded-full font-black text-[10px] uppercase tracking-[0.3em] hover:bg-slate-50 hover:text-primary transition-all">
                                                    Modify
                                                </button>
                                            </>
                                        ) : (
                                            <button className="text-primary font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-3 hover:underline">
                                                <span className="material-symbols-outlined text-lg">receipt_long</span>
                                                Download Receipt
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* Premium Bottom Nav */}
            <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex justify-around items-center px-4 py-2 bg-slate-900 text-white w-[90%] max-w-md mx-auto rounded-full shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] border border-white/10">
                <button onClick={() => navigate('/customer-dashboard')} className="flex flex-col items-center justify-center text-slate-500 px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">gavel</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Auction</span>
                </button>
                <button className="flex flex-col items-center justify-center px-5 py-2 text-white relative">
                    <div className="absolute inset-0 bg-white/10 rounded-2xl blur-lg"></div>
                    <span className="material-symbols-outlined relative z-10" style={{fontVariationSettings: "'FILL' 1"}}>confirmation_number</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1 relative z-10 underline decoration-2 underline-offset-4">Reservations</span>
                </button>
                <button onClick={() => navigate('/chat-room')} className="flex flex-col items-center justify-center text-slate-500 px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">chat_bubble</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Talk</span>
                </button>
                <button onClick={() => navigate('/profile-customer')} className="flex flex-col items-center justify-center bg-white/20 text-white rounded-full w-12 h-12 shadow-lg active:scale-90 transition-all">
                    <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>person</span>
                </button>
            </nav>
        </div>
    );
};

export default ReservationListCustomer;
