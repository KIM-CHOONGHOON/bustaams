import React from 'react';
import { useNavigate } from 'react-router-dom';

const RatingReplyDriver = () => {
    const navigate = useNavigate();

    const feedbacks = [
        {
            id: 1,
            name: '제임슨 던',
            initials: 'JD',
            rating: 5,
            tag: '인증된 이용객 • 2시간 전',
            text: '"기사님이 굉장히 전문적이셨고 버스 상태도 신차처럼 깔끔했습니다. 프리미엄 이동 경험을 입찰 방식으로 이용할 수 있다는 게 정말 혁신적이네요. 꼭 다시 이용하겠습니다."',
            replied: false
        },
        {
            id: 2,
            name: '사라 로슨',
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBV3f0_kHkQUCn5rvt77iRle-ZIROBZI4hcQ0IWes66-z0nQRmJn1ZNlCHoZXzCZJFVvmb52nOOtmUWAnGZFQjM0zFxFD8nIK14cl3O7mj_5Lp9u2F9XdZiusHjVVqHVE9j_uJ3eTnaLpZ5bACp13KyyPrWHh9gSoSqpssK5P9ekXs_NKALiFu5WglXmelLEiL8sus7i5ntEVDDhWX2Gn4t4PfE5j2iKxVn7EoT7mtulPzIgxpYZVumV-0mtWNcaIVgOJzzp-UwnTI',
            rating: 4,
            tag: '인증된 이용객 • 5시간 전',
            text: '"좋은 서비스였지만 에어컨 온도가 조금 높았던 것 같아요. 그래도 일반 노선 버스보다 훨씬 나은 이동 수단입니다."',
            replied: true,
            replyText: '"안녕하세요 사라님, 소중한 의견 감사합니다! 지적해주신 해당 차량의 공조 장치 설정을 즉시 조정했습니다. 다음 노선에서 다시 뵙기를 기대하겠습니다!"'
        },
        {
            id: 3,
            name: '마커스 리베라',
            initials: 'MR',
            rating: 5,
            tag: '인증된 이용객 • 어제',
            text: '"완벽한 운행이었습니다. 기사님께서 제 큰 짐을 주저 없이 도와주셨어요. 대중교통의 표준이라고 할 만합니다."',
            replied: false
        }
    ];

    return (
        <div className="bg-background text-on-surface min-h-[100dvh] pb-48 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/40 backdrop-blur-3xl border-b border-white/20 py-6">
                <div className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto">
                    <div className="flex items-center gap-6 text-left">
                        <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl text-teal-800 shadow-xl shadow-teal-900/5 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                        </button>
                        <h1 className="font-headline font-black tracking-tighter text-3xl text-teal-900 italic uppercase">busTaams</h1>
                    </div>
                </div>
            </header>

            <main className="pt-48 px-6 max-w-6xl mx-auto space-y-20 animate-in fade-in slide-in-from-bottom duration-1000 text-left">
                {/* Editorial Header Section */}
                <section className="relative text-left">
                    <div className="absolute -left-20 top-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl opacity-20"></div>
                    <h2 className="font-headline text-7xl md:text-9xl font-black text-primary leading-[0.8] tracking-tighter italic uppercase text-left">
                        Rating <br/><span className="text-secondary">& Feedback.</span>
                    </h2>
                    <p className="mt-10 text-slate-400 text-xl font-bold italic tracking-tight leading-relaxed max-w-xl border-l-8 border-secondary pl-8 text-left">
                        승객의 진솔한 이야기와 실시간 대응 전략을 통해 드라이버의 우수성을 관리하세요. 당신의 평판은 곧 자산이 됩니다.
                    </p>
                </section>

                {/* Stats Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                    <div className="md:col-span-2 bg-white rounded-[3.5rem] p-12 shadow-2xl shadow-teal-900/5 flex flex-col justify-between border border-white text-left">
                        <div className="text-left space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 italic">Global Reputation Index</h3>
                            <div className="flex items-baseline gap-4 text-left">
                                <span className="text-8xl font-black text-primary italic tracking-tighter leading-none">4.9</span>
                                <span className="text-3xl font-black text-slate-200 italic">/ 5.0</span>
                            </div>
                        </div>
                        <div className="mt-12 flex items-center justify-between text-left">
                            <div className="flex gap-2">
                                {[1,2,3,4,5].map(i => (
                                    <span key={i} className="material-symbols-outlined text-secondary text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                                ))}
                            </div>
                            <span className="font-black text-slate-300 text-[10px] uppercase tracking-widest italic animate-pulse">Top 1% Elite Driver Class</span>
                        </div>
                    </div>
                    <div className="bg-slate-900 rounded-[3.5rem] p-12 text-white shadow-2xl shadow-slate-900/40 flex flex-col justify-between text-left relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                        <span className="material-symbols-outlined text-5xl text-secondary opacity-50 group-hover:rotate-12 transition-transform duration-700">chat_bubble</span>
                        <div className="text-left space-y-2">
                            <div className="text-6xl font-black italic tracking-tighter leading-none">92%</div>
                            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">Reply Delta Index</div>
                        </div>
                    </div>
                </div>

                {/* Feedback List */}
                <div className="space-y-12 text-left">
                    <h3 className="text-3xl font-black italic uppercase tracking-tighter text-primary px-4 text-left">Recent Customer Intel</h3>
                    <div className="space-y-10 text-left">
                        {feedbacks.map((item) => (
                            <div key={item.id} className="group bg-white rounded-[3.5rem] p-12 relative shadow-2xl shadow-teal-900/5 hover:-translate-y-2 transition-all duration-700 border border-slate-50 overflow-hidden text-left">
                                <div className="absolute left-0 top-0 bottom-0 w-2 bg-secondary opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
                                <div className="flex flex-col md:flex-row gap-12 text-left">
                                    <div className="shrink-0 text-left">
                                        {item.avatar ? (
                                            <img className="w-24 h-24 rounded-[2rem] object-cover border-4 border-slate-50 rotate-3 p-1" src={item.avatar} alt={item.name} />
                                        ) : (
                                            <div className="w-24 h-24 rounded-[2rem] bg-slate-900 flex items-center justify-center font-black text-white text-3xl italic tracking-tighter rotate-3 border-4 border-slate-50 p-1">
                                                {item.initials}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-grow space-y-8 text-left">
                                        <div className="flex flex-col md:flex-row justify-between items-start text-left gap-6">
                                            <div className="text-left space-y-2">
                                                <h4 className="text-2xl font-black text-primary italic uppercase tracking-tight text-left">{item.name}</h4>
                                                <div className="flex items-center gap-3 text-left">
                                                    <div className="flex gap-1">
                                                        {[1,2,3,4,5].map(i => (
                                                            <span key={i} className={`material-symbols-outlined text-sm ${i <= item.rating ? 'text-secondary' : 'text-slate-200'}`} style={{fontVariationSettings: i <= item.rating ? "'FILL' 1" : ""}}>star</span>
                                                        ))}
                                                    </div>
                                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">{item.tag}</span>
                                                </div>
                                            </div>
                                            {!item.replied && (
                                                <button className="px-8 py-4 bg-primary text-white rounded-full font-black text-[10px] uppercase tracking-[0.3em] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all italic">
                                                    Draft Intelligence Reply
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-xl font-bold italic text-slate-500 leading-tight text-left border-l-4 border-slate-50 pl-8">
                                            {item.text}
                                        </p>

                                        {item.replied && (
                                            <div className="bg-slate-50 rounded-[2.5rem] p-8 space-y-4 border border-white text-left relative overflow-hidden group/reply">
                                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover/reply:opacity-20 transition-opacity">
                                                    <span className="material-symbols-outlined text-6xl">verified_user</span>
                                                </div>
                                                <div className="flex items-center gap-4 text-left">
                                                    <span className="material-symbols-outlined text-primary text-2xl">reply</span>
                                                    <p className="text-[9px] font-black text-primary uppercase tracking-[0.4em] italic leading-none">Official Fleet Response</p>
                                                </div>
                                                <p className="text-sm font-bold text-slate-400 italic leading-relaxed text-left relative z-10">
                                                    {item.replyText}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Bottom Nav */}
            <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex justify-around items-center px-4 py-2 bg-slate-900 text-slate-500 w-[90%] max-w-lg mx-auto rounded-full shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] border border-white/10">
                <button onClick={() => navigate('/driver-main')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">dashboard</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Home</span>
                </button>
                <button onClick={() => navigate('/estimate-list-driver')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">gavel</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Auction</span>
                </button>
                <button onClick={() => navigate('/completed-trips-driver')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">history</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">History</span>
                </button>
                <button className="flex flex-col items-center justify-center px-5 py-2 text-primary relative">
                    <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-lg"></div>
                    <span className="material-symbols-outlined relative z-10" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1 relative z-10 underline decoration-2 underline-offset-4">Intel</span>
                </button>
            </nav>
        </div>
    );
};

export default RatingReplyDriver;
