import { useNavigate } from 'react-router-dom';
import BottomNavDriver from '../components/BottomNavDriver';

const FailBidListDriver = () => {
    const navigate = useNavigate();

    const failedBids = [
        {
            id: 1,
            title: '어반 비즈니스 셔틀',
            route: '성남 판교 테크노밸리 → 서울 강남역',
            deadline: '2023/10/20 마감',
            price: '850,000',
            model: 'Hyundai Universe',
            image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDZmRZL_HsaOszSmVrtuGwUBYyk6tx-rD4Vk4Dasgb37vYAbbZuWacuLUPqrpB9BVhKLuUw-tF2Etkrkt-rZ4xwhT9ZgE3DjgEoksHVJIAaAcDdV-b-rsVtEvcVtKK2EmfqAmsfSSz-jkrLECuP2Pl1W98npMSrPEjigDVHPy5EauRaAGFpUNKJwbmlxIhbJXkrmDZf4k95TECEDbq8ljjlCzWMxf9L9qkUPJwW0evuxafMlIu1mxVH0QFXZ0fXd6sgXKIvpbZIdOo'
        },
        {
            id: 2,
            title: '인천공항 크루 수송',
            route: '송도 국제도시 → 인천공항 T2',
            price: '420,000',
            model: 'Kia Granbird'
        },
        {
            id: 3,
            title: '강원 스키 리조트 투어',
            route: '잠실 종합운동장 → 용평 리조트',
            price: '1,200,000',
            model: 'Mercedes-Benz Sprinter'
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

            <main className="pt-48 px-6 max-w-7xl mx-auto space-y-20 animate-in fade-in slide-in-from-bottom duration-1000 text-left">
                {/* Editorial Header Section */}
                <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end text-left">
                    <div className="md:col-span-7 space-y-6 text-left">
                        <span className="text-secondary font-black tracking-[0.4em] uppercase text-[10px] block px-2 italic">유찰 내역 분석</span>
                        <h2 className="font-headline text-6xl md:text-8xl font-black text-primary leading-[0.85] tracking-tighter italic uppercase text-left">
                            유찰된 <br/><span className="text-slate-200 underline decoration-slate-200/20 underline-offset-[12px]">견적들.</span>
                        </h2>
                    </div>
                    <div className="md:col-span-5 md:pl-12 text-left border-l-4 border-slate-50">
                        <p className="text-slate-400 text-lg font-bold italic tracking-tight leading-relaxed text-left">
                            낙찰되지 않은 지난 입찰 내역들입니다. 유찰 사유를 분석하고 다음 입찰 전략을 최적화하세요.
                        </p>
                    </div>
                </section>

                <nav className="flex gap-10 border-b-4 border-slate-50 pb-4 text-left justify-center">
                    <button className="text-primary font-black text-sm uppercase tracking-[0.3em] italic border-b-8 border-primary pb-4">
                        낙찰 실패 내역 (3)
                    </button>
                </nav>

                {/* History Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 text-left">
                    {/* Large Featured Item (First one) */}
                    <div className="lg:col-span-2 group">
                        <div className="bg-white rounded-[4rem] p-12 relative overflow-hidden transition-all duration-700 hover:shadow-2xl hover:shadow-teal-900/5 flex flex-col md:flex-row gap-12 border border-slate-50 text-left">
                            <div className="absolute left-0 top-0 bottom-0 w-2 bg-slate-100"></div>
                            <div className="flex-1 space-y-8 text-left">
                                <div className="flex items-center gap-4 text-left">
                                    <span className="px-5 py-2 rounded-full bg-slate-50 text-slate-300 text-[9px] font-black uppercase tracking-widest italic border border-slate-100">유찰 (FAILED)</span>
                                    <span className="text-slate-300 font-bold text-[9px] uppercase tracking-widest italic">{failedBids[0].deadline}</span>
                                </div>
                                <div className="text-left space-y-2">
                                    <h3 className="font-headline text-4xl font-black text-primary italic uppercase tracking-tighter text-left group-hover:text-secondary transition-colors duration-700 leading-tight">
                                        {failedBids[0].title}
                                    </h3>
                                    <p className="text-slate-400 font-bold italic text-sm leading-tight uppercase tracking-widest">{failedBids[0].route}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-6 text-left">
                                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 text-left group-hover:bg-white transition-colors">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-300 mb-2 italic">나의 견적가</p>
                                        <p className="font-headline text-2xl font-black text-primary italic tracking-tighter">₩{failedBids[0].price}</p>
                                    </div>
                                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 text-left group-hover:bg-white transition-colors">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-300 mb-2 italic">차량 모델</p>
                                        <p className="font-black text-primary text-xs italic">{failedBids[0].model}</p>
                                    </div>
                                </div>
                                <button onClick={() => navigate(`/fail-bid-detail-driver/${failedBids[0].id}`)} className="bg-primary text-white px-12 py-6 rounded-[2.5rem] font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all italic">
                                    상세 사유 분석
                                </button>
                            </div>
                            <div className="w-full md:w-72 h-72 rounded-[3rem] overflow-hidden grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000 border-8 border-slate-50">
                                <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" src={failedBids[0].image} alt={failedBids[0].title} />
                            </div>
                        </div>
                    </div>

                    {/* Standard Items */}
                    {failedBids.slice(1).map((item) => (
                        <div key={item.id} className="group bg-white rounded-[3.5rem] p-10 relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-teal-900/5 hover:-translate-y-2 text-left border border-slate-50">
                            <div className="space-y-8 text-left">
                                <div className="flex justify-between items-center text-left">
                                    <span className="px-5 py-2 rounded-full bg-slate-100 text-slate-300 text-[9px] font-black uppercase tracking-widest italic">유찰</span>
                                    <span className="material-symbols-outlined text-slate-100 group-hover:text-slate-200 transition-colors duration-500 text-4xl">cancel</span>
                                </div>

                                <div className="space-y-2 text-left">
                                    <h3 className="font-headline text-2xl font-black text-primary italic uppercase tracking-tighter text-left group-hover:text-secondary transition-colors duration-500 leading-tight line-clamp-1">
                                        {item.title}
                                    </h3>
                                    <p className="text-slate-400 font-bold italic text-[10px] leading-tight uppercase tracking-widest line-clamp-1">{item.route}</p>
                                </div>

                                <div className="space-y-4 text-left border-t border-slate-50 pt-8">
                                    <div className="flex justify-between items-center text-left">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-300 italic">견적 금액</span>
                                        <span className="font-black text-primary text-xs italic">₩{item.price}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-left">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-300 italic">차량 모델</span>
                                        <span className="font-black text-primary text-xs italic">{item.model}</span>
                                    </div>
                                </div>

                                <button onClick={() => navigate(`/fail-bid-detail-driver/${item.id}`)} className="w-full py-6 rounded-[2.5rem] bg-slate-50 text-primary font-black text-[10px] uppercase tracking-[0.3em] hover:bg-primary hover:text-white transition-all active:scale-95 italic">
                                    상세 보기
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* Bottom Nav */}
            <BottomNavDriver />
        </div>
    );
};

export default FailBidListDriver;
