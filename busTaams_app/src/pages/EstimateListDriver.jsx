import React from 'react';
import { useNavigate } from 'react-router-dom';

const EstimateListDriver = () => {
    const navigate = useNavigate();

    const auctions = [
        {
            id: 1,
            title: '럭셔리 코치 XC-90',
            price: '1,250,000',
            driver: '마커스 쏜 기사님',
            rating: '4.9',
            reviews: '124',
            time: '2시간 14분',
            image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB2oUNV1xMc25dIn1KpPPmaMqXugr7OWCTVEBaAibWsbE_hRN_BmsSjQjfKMdMhb5F0GoU_P1AQRz7JmxUxfmdP42mftQdp4nxV26hHbJ6pSwzEB__tsLzt45m0gFzOccQSHa7a0oz9KIdX5r99Z-Ikz1SfE-_GxTSX3KOj5g8ENIgT83iTK2nqTKPATP_Kna6IeSAMHcF0CAxxDooIn8rwuXyIvX_wRTg0z5-oT1jOLcQzjFhdHxdDOY_mCNSKHOsjFT5hzx9LZdU',
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCLDcP8y75YYpBL3GuxTY48QTShKuFV81r3hnGpW7XQNSg9UjdXL7a3Wi1VcPW6mABZ92DufReTTcmdyqj9yUllaQA3xlQEy4StmyYXO_KVGG99r1DzCucEwmy2LltULeXoVmDWOdtt5B-0wjYxgBnZ7fsERz8iP5yLLzxFSIPip0t92nU6S56uesUYZ-TcPROMC8IT5hS_PQiO2pRVROZU6-CV6R5AKXRr0pgSJ47PBfKYlXHujMgBQVd66M1uxi6ETtpQgtsmTJQ'
        },
        {
            id: 2,
            title: '트랜짓 엘리트 V8',
            price: '980,000',
            driver: '엘레나 로드리게스 기사님',
            rating: '4.8',
            reviews: '89',
            time: '14분 02초',
            image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBUzUuAnm7tAdjE8cP_0aWgMOrAOy2A1eV-kf0TVBLo6hOnVgN6GbDIfsKDV_yl0ZoTcRtXF-Ec07kR9N9Eq7wIZSF2CFZl4i_gemDfvmtxRPjB857pMXvVuCQ7Al-KPTxdK58oIOldhDBBxnIrw69j0yJ6eoBx2uSaP4xi6pslWx2zYJci3trkB9Np1gWnYYy122KyqFfDtgUT7KRxwjCVsN97uVjeSfsZ31A35812_TTLiBtKgXlW9YrbRM0VOC0z_f4GjCOFf-g',
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBe_Ok73tcanyn4qGUMhqBye7oDoE5X0C6405MqLDWwGWLM-LWTxoZeB6rUF_dq0zHXNMdk720bjUFHc-b-yemw492R8xsv8DVT0xLGTiB5nCQAyl-TWKTUfmfCNCJepC3AJKYPEFpxKn97MjTspqlWa3c0O2zCDCNOg8H5r6XBah8v6785wgQA0rfaFVQdWkV8OF8qXBCKtQkyfilm6vjg43xvmRUJgv0d-Y6hhlz42XuYUjhNfZuC5aIhIxRo_mtPsYDaK58j72A',
            extraSpace: true
        },
        {
            id: 3,
            title: '어반 보이저',
            price: '1,550,000',
            driver: '제임슨 포드 기사님',
            rating: '5.0',
            reviews: '215',
            time: '5시간 45분',
            image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD6Rcl_8jRtDQUpVbdDSWNK-0TbvgcsIBuC6VMPF4e4CjOntradZooBIn4ES5r0Iu5wbdNTZHswsUosN23KVx1mUMJkAZV3qpSULcynDEdK4xFzzuYF7CZOQERb26WlTftC57Zj90c4MQfcSoyw6b-BsERyT_grAifAvC086ee7OFAsmfgnseEOiZk6W1bHrES14Weg-lMD1QkkGNrRi8oOIHRvJPk70aYkx6Sv9s3Qh7ZK2shVZW30bTLJr86gEzqu-Aca6GNnjXQ',
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBbOLCdBnSPl_OEJIyX9UZNTYJSsMfFH49KDtQ4TJAYt654o5zq98BTxcNUbhxIlL_hZAqFOOIw6wF1fizYhJXPbecITHWeo1lRiIiPRtb4xx4wHIB_-1n1enTDJMg39cyG8F_C3hiUwzZhCCpDLn0zh_dTJ0M-uOIQLaXA_YqLLM2w1545ToTV7xHSfV5fwF49m7Xa-gyVxQVifUIX3u4hqYyKrwJbeAStgwpFgwTEJLPm0BL7pyLu_DsN0SJ-GOV0W_UBoQsdQKY',
        }
    ];

    return (
        <div className="bg-background text-on-surface min-h-[100dvh] pb-48 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/40 backdrop-blur-3xl border-b border-white/20 py-6">
                <div className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto">
                    <div className="flex items-center gap-6">
                        <button className="p-3 bg-white rounded-2xl text-teal-800 shadow-xl shadow-teal-900/5 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-lg">menu</span>
                        </button>
                        <h1 className="font-headline font-black tracking-tighter text-3xl text-teal-900 italic underline decoration-secondary decoration-4 underline-offset-8">busTaams</h1>
                    </div>
                    <div className="flex items-center gap-10">
                        <nav className="hidden lg:flex gap-10">
                            <button className="text-secondary font-black text-[10px] uppercase tracking-[0.3em] active:scale-95 transition-all italic">Auction</button>
                            <button className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] active:scale-95 transition-all">Watchlist</button>
                            <button className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] active:scale-95 transition-all">Bid History</button>
                        </nav>
                        <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-2xl rotate-3">
                            <img alt="User profile" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDKjXtv6KseLglTu2V7P3RqTc5ik2EMdOXNOAWZRPuDVPjG8D09MtQtYIl-OwVLlLGSlTxFWpyDFuB5EcuDQDPcdUx9k8VXwP_nwxpMBOsr0VI5seXFY0efXWb6gA6ow8qwkmuwhadZGrc5-3qkVidBjXF382qrknwxyCCWgMZSr1LwkeM_bXGNWHn9IKttM3ypSgQ1EjLjza03NHa165LLFb7ACDGzTowmSeWzNMVJ4GjOaGH3V3j4Rl2VJuy334qJZwx3KfHz0DU" />
                        </div>
                    </div>
                </div>
            </header>

            <main className="pt-48 px-6 max-w-7xl mx-auto space-y-24 animate-in fade-in slide-in-from-bottom duration-1000 text-left">
                {/* Editorial Header */}
                <section className="grid grid-cols-1 md:grid-cols-12 gap-8 text-left">
                    <div className="md:col-span-8 space-y-6 text-left">
                        <span className="text-secondary font-black tracking-[0.4em] uppercase text-[10px] block px-2 italic">Global Fleet Opportunities</span>
                        <h2 className="font-headline text-6xl md:text-9xl font-black text-primary tracking-[ -0.05em] leading-[0.85] italic text-left uppercase">
                            Available <br/><span className="text-secondary">Estimates.</span>
                        </h2>
                        <p className="text-slate-400 text-xl font-bold tracking-tight italic leading-relaxed max-w-md text-left">
                            엄선된 운송 기회. 즉시 투입 가능한 고성능 코치. 프리미엄 서비스와 역동적인 에너지를 경험하세요.
                        </p>
                    </div>
                </section>

                {/* Auction Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 text-left">
                    {auctions.map((auction, i) => (
                        <div key={auction.id} className={`group relative bg-white rounded-[3.5rem] p-8 shadow-2xl shadow-teal-900/5 transition-all hover:-translate-y-4 duration-500 text-left ${auction.extraSpace ? 'lg:mt-24' : ''}`}>
                            <div className="absolute left-6 top-10 bottom-10 w-1.5 bg-secondary rounded-full opacity-50"></div>
                            
                            <div className="flex justify-between items-start mb-8 pl-6 text-left">
                                <div className="text-left">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary mb-2 block italic">Live Protocol</span>
                                    <h3 className="font-headline text-2xl font-black text-on-surface leading-tight text-left">{auction.title}</h3>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 block mb-1">Current Bid</span>
                                    <p className="font-headline text-2xl font-black text-primary italic leading-none">₩{auction.price}</p>
                                </div>
                            </div>

                            <div className="aspect-[1.5] w-full rounded-[2.5rem] overflow-hidden bg-slate-50 mb-8 shadow-inner relative">
                                <img alt={auction.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src={auction.image} />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
                            </div>

                            <div className="flex items-center justify-between mb-10 pl-2 text-left">
                                <div className="flex items-center gap-4 text-left">
                                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-xl">
                                        <img alt={auction.driver} src={auction.avatar} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[11px] font-black text-on-surface leading-none mb-1 italic">{auction.driver}</p>
                                        <div className="flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-sm text-secondary" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                                            <span className="text-[10px] font-black text-slate-400">{auction.rating} ({auction.reviews})</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-slate-400 text-left">
                                    <span className="material-symbols-outlined text-xl italic">schedule</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">{auction.time}</span>
                                </div>
                            </div>

                            <button onClick={() => navigate('/estimate-detail-driver')} className="w-full py-6 rounded-[2rem] bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.3em] hover:bg-primary transition-all active:scale-95 shadow-2xl shadow-slate-900/30 italic">
                                Select Entry
                            </button>
                        </div>
                    ))}
                </div>

                {/* Section Spacer for Editorial Feel */}
                <div className="pt-24 pb-12 text-left">
                    <div className="h-1 w-20 bg-secondary rounded-full mb-10"></div>
                    <p className="font-headline text-4xl font-black text-on-surface leading-[1.1] tracking-tighter max-w-3xl italic text-left uppercase">
                        "The future of <span className="text-primary underline decoration-primary/20">collective transit</span> thrives on rapid estimation <br/>and peak precision."
                    </p>
                </div>
            </main>

            {/* Bottom Nav */}
            <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex justify-around items-center px-4 py-2 bg-slate-900 text-slate-500 w-[90%] max-w-lg mx-auto rounded-full shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] border border-white/10">
                <button onClick={() => navigate('/driver-dashboard')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">dashboard</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Home</span>
                </button>
                <button onClick={() => navigate('/estimate-list-driver')} className="flex flex-col items-center justify-center px-5 py-2 text-primary relative">
                    <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-lg"></div>
                    <span className="material-symbols-outlined relative z-10" style={{fontVariationSettings: "'FILL' 1"}}>gavel</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1 relative z-10 underline decoration-2 underline-offset-4">Auction</span>
                </button>
                <button onClick={() => navigate('/driver-info')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">person</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Profile</span>
                </button>
            </nav>
        </div>
    );
};

export default EstimateListDriver;
