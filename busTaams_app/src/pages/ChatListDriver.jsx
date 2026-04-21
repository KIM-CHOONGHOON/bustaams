import React from 'react';
import { useNavigate } from 'react-router-dom';

const ChatListDriver = () => {
    const navigate = useNavigate();

    const activeChats = [
        {
            id: 1,
            name: '사라 젠킨스',
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDvNAjScXl-pwiUo62uxjirVmHFOEUq3KuoWDTNIY7Zvj7BybrZ7JVzxCaV8xHJbV7X1LVvt51bUTSB8YXhZDp3N0VKEiLcanC5bYo2maZlGda1BjaiUQUaOgsL2YQRumMRj8LqzGXDgQlteLJcnabt6g6lRjcNH93PRrjX0fl__LUCMB8ZHxi6yAbl8Zj0h9MXbuprUvyd-RrOE0dqRIzzohHsdm7NPF6jv4iRjtinDolsgGffk882shFRhy0nXtfGO9ceumTBtDw',
            time: '2분 전',
            msg: '"저희 차량단에 엔진 사양이 딱 맞는 것 같아요. 내일 오전에 내부 가상 투어를 예약할 수 있을까요?"',
            tag: '진행 중인 고객',
            info: '볼보 B11R 2022 • 현재 입찰가 $142,000',
            urgent: true
        }
    ];

    const otherChats = [
        {
            id: 2,
            name: '마커스 쏜',
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBB0k9cIXXhabEpKNBdaZAjI6UI9nV9tGyp0aE6dncdzDoZ1_umMaNyqDzIxV3azXiUYWge6UwE64A4kIw0VCtRkd4frkmerfegWg81N4lkqmiO9Pn7o0HpFtyoxj2yqumHqT5eCRTv_CSTd4fIDg7g4Aq6fFpx9j-1YXrWHwg1zf3yPJEDMaCvnR855Won3Zhv4-LAlsFcdFMOSt3ScdVZAqRfLexytAJKC36vXN_2fpG8ii_ez0l6ROSQStNDJawaMshKGbUAJQk',
            tag: '메르세데스 트라베고',
            msg: '운송 허가증 서류를 보냈습니다. 확인 부탁드려요...',
            unread: 3
        },
        {
            id: 3,
            name: '엘레나 로드리게스',
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDN9xc5khPGZo4CahzUsDqZTTufHnmwbllxhsvPXOKSZBu717OEsLPfubNBIosRwxUooJA1zEvlcj1JoNUQG7wms9Sox1J7b4Ro5xWpBwreBhrOJovJRVdP8YFuRj6YgmgV5vQE60ZjHiDuVZHeC92u4XtnFEOg-uev-s-0c7WZTpTxESgNJmAxEN2LOjJDg9koAnard9FM3KI4pNPh34_26eymy0gXm9qgX1T3NofpS8yOBO0IIuThEgCTgLc7SAIZNsok8sPVxOg',
            tag: '스카니아 투어링',
            msg: '경매 낙찰자에게 알림이 전송되었습니다. 인계 마무리 준비가 되었습니다.',
            unread: 0
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

            <main className="pt-48 px-6 max-w-6xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom duration-1000 text-left">
                {/* Header Section */}
                <section className="flex flex-col md:flex-row md:items-end justify-between gap-10 text-left">
                    <div className="max-w-xl space-y-6 text-left">
                        <h2 className="font-headline text-6xl md:text-8xl font-black text-primary leading-[0.85] tracking-tighter italic uppercase text-left">
                            Inbox <br/><span className="text-secondary">& Intel.</span>
                        </h2>
                        <p className="text-slate-400 text-lg font-bold italic tracking-tight leading-relaxed text-left border-l-4 border-slate-50 pl-8">
                            진행 중인 입찰 문의를 관리하고 실시간으로 운송 물류를 조율하세요. 모든 메시지는 당신의 신용이 됩니다.
                        </p>
                    </div>
                    <div className="flex gap-4 text-left">
                        <button className="bg-white px-8 py-4 rounded-full font-black text-[10px] text-primary uppercase tracking-widest border border-slate-50 shadow-xl shadow-teal-900/5 hover:bg-slate-50 transition-all italic">
                            Archive 보관함
                        </button>
                        <button className="bg-primary text-white px-8 py-4 rounded-full font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all italic">
                            New Broadcast 새 공지
                        </button>
                    </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-10 text-left">
                    {/* Active Conversation */}
                    <div className="md:col-span-8 group text-left">
                        {activeChats.map(chat => (
                            <div key={chat.id} onClick={() => navigate('/chat')} className="bg-white p-12 rounded-[3.5rem] shadow-2xl shadow-teal-900/5 relative overflow-hidden transition-all duration-700 hover:-translate-y-2 border-l-[12px] border-secondary cursor-pointer text-left">
                                <div className="flex flex-col md:flex-row gap-10 items-start text-left">
                                    <div className="relative shrink-0 text-left">
                                        <div className="w-24 h-24 rounded-[2rem] overflow-hidden border-4 border-slate-50 rotate-3 p-1">
                                            <img src={chat.avatar} className="w-full h-full object-cover rounded-2xl" alt={chat.name} />
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 bg-secondary text-white text-[8px] font-black px-4 py-2 rounded-full uppercase tracking-widest italic shadow-lg">
                                            {chat.tag}
                                        </div>
                                    </div>
                                    <div className="flex-grow space-y-6 text-left">
                                        <div className="flex justify-between items-start text-left">
                                            <h3 className="font-headline font-black text-3xl text-primary italic uppercase tracking-tighter text-left">{chat.name}</h3>
                                            <span className="font-black text-[9px] text-secondary uppercase tracking-[0.3em] italic">{chat.time}</span>
                                        </div>
                                        <p className="text-xl font-bold italic text-slate-500 leading-tight text-left">
                                            {chat.msg}
                                        </p>
                                        <div className="flex items-center gap-4 text-left">
                                            <span className="flex items-center gap-2 text-primary text-[9px] font-black uppercase tracking-widest italic">
                                                <span className="material-symbols-outlined text-sm">directions_bus</span>
                                                {chat.info.split('•')[0]}
                                            </span>
                                            <div className="w-1.5 h-1.5 bg-slate-100 rounded-full"></div>
                                            <span className="text-slate-300 text-[9px] font-bold italic uppercase tracking-widest">{chat.info.split('•')[1]}</span>
                                        </div>
                                    </div>
                                </div>
                                {chat.urgent && (
                                    <div className="absolute top-10 right-10 flex h-4 w-4">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-4 w-4 bg-secondary"></span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Secondary Conversations */}
                    <div className="md:col-span-4 flex flex-col gap-8 text-left">
                        {otherChats.map(chat => (
                            <div key={chat.id} onClick={() => navigate('/chat')} className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-teal-900/5 hover:bg-slate-50 transition-all duration-500 group cursor-pointer border border-slate-50 text-left">
                                <div className="flex items-center gap-6 mb-6 text-left">
                                    <div className="w-16 h-16 rounded-[1.5rem] overflow-hidden shrink-0 border-4 border-white rotate-3 p-1 shadow-sm">
                                        <img src={chat.avatar} className="w-full h-full object-cover rounded-xl" alt={chat.name} />
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <h4 className="font-headline font-black text-lg text-primary italic uppercase tracking-tight truncate">{chat.name}</h4>
                                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest italic">{chat.tag}</p>
                                    </div>
                                    {chat.unread > 0 && (
                                        <div className="bg-primary text-white w-7 h-7 rounded-full flex items-center justify-center font-black text-[10px] italic shadow-lg shadow-primary/20">
                                            {chat.unread}
                                        </div>
                                    )}
                                </div>
                                <p className="text-sm font-bold italic text-slate-400 line-clamp-2 leading-relaxed text-left border-l-4 border-slate-100 pl-4 group-hover:border-primary transition-colors">
                                    {chat.msg}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="space-y-10 text-left">
                    <div className="flex items-center justify-between px-4 text-left">
                        <h5 className="font-headline font-black text-2xl text-primary italic uppercase tracking-tighter text-left">Recent Activity 로그</h5>
                        <button className="text-slate-300 font-black text-[9px] uppercase tracking-widest italic hover:text-primary transition-colors">View Timeline 전체보기</button>
                    </div>
                    <div className="bg-slate-50 rounded-[3.5rem] p-6 space-y-4 border border-slate-100 text-left">
                        {[
                            { name: '김데이비드', msg: '유지보수 이력 로그를 확인 중입니다...', time: 'YESTERDAY', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCQ0TlKBZUYl4GuoJPhotW2WTMJFN45Ur535Z5hm_nayNtKrCUmsGb2JmwivhryBF8_miOywSWFoI32DRLej4KFpxBcPChP7NcDD8KHbLBO4uUEBAph0rOXMbqPnpdBuV0GDMBpETKAPeTen3xzYDaZwnO1hBd36bexPivfSNh74jUrjl9n7Xut0sVeTe_DI8jeDPacmwXK7N2ePdirzsaLPlebTGM3Tlj6T2MYQFUaTZPupbXaw95Bi-t34mqvbkSQbz5tZ4SB-9s' },
                            { name: '리사 우', msg: '배송에 보험 보장이 포함되어 있나요?', time: 'OCT 24', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBw4y1umSyPAnVQBuS36rv9OdINEiEENEGxhWj5HVy_QFiuieGqvrDeNWTQcymmcR_52OegdwHLP753oviZPJ_vm0bszriouEYOuJ4PpSeT9WO1oHrzwxiyRwZCVodDJqumMUYRbg48rUGnfnZOj6jfYCF6-j1JKYPh9kV0L4t2QADUiv2lMl0P6jZxCCg8Pdbk1P_Ey4vhq3Qb097cRe0uXigEs6LxDJ0igHPdbUbddj6YmC5meM1YTaOdl_BcC877sfjql4glz20' }
                        ].map((item, i) => (
                            <div key={i} className="bg-white flex items-center gap-8 p-6 rounded-3xl hover:translate-x-4 transition-transform duration-500 cursor-pointer text-left border border-white shadow-sm group">
                                <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 grayscale group-hover:grayscale-0 transition-all duration-700 shadow-inner">
                                    <img src={item.img} className="w-full h-full object-cover" alt={item.name} />
                                </div>
                                <div className="flex-1 text-left">
                                    <h4 className="text-lg font-black text-primary italic uppercase tracking-tight text-left">{item.name}</h4>
                                    <p className="text-[11px] font-bold italic text-slate-400 line-clamp-1">{item.msg}</p>
                                </div>
                                <div className="text-right shrink-0 space-y-1">
                                    <span className="block text-[8px] font-black text-slate-200 uppercase tracking-widest italic">{item.time}</span>
                                    <span className="material-symbols-outlined text-slate-100 group-hover:text-primary transition-colors text-lg" style={{fontVariationSettings: "'FILL' 1"}}>done_all</span>
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
                <button className="flex flex-col items-center justify-center px-5 py-2 text-primary relative">
                    <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-lg"></div>
                    <span className="material-symbols-outlined relative z-10" style={{fontVariationSettings: "'FILL' 1"}}>forum</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1 relative z-10 underline decoration-2 underline-offset-4">Inbox</span>
                </button>
                <button onClick={() => navigate('/driver-certification')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">person</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Profile</span>
                </button>
            </nav>
        </div>
    );
};

export default ChatListDriver;
