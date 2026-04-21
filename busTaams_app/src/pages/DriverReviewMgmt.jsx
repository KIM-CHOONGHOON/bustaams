import React from 'react';
import { useNavigate } from 'react-router-dom';

const DriverReviewMgmt = () => {
    const navigate = useNavigate();

    return (
        <div className="bg-background text-on-background min-h-screen pb-32 font-body">
            {/* TopAppBar */}
            <header className="bg-transparent text-teal-800 font-headline font-extrabold tracking-tight text-3xl docked full-width top-0 flex justify-between items-center w-full px-6 pt-8 pb-4 max-w-7xl mx-auto z-50">
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-3xl hover:opacity-80 transition-opacity cursor-pointer">menu</span>
                    <span className="text-teal-900 font-black tracking-tighter text-[24px]">busTaams</span>
                </div>
                <div className="w-10 h-10 rounded-full overflow-hidden shadow-lg border-2 border-primary-fixed">
                    <img alt="User" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDFDD5rwLaRuvQw9Wg94v6vrciF6SrnH2GXwWQr7Q1b-9G2k6Wk60WMXSH7DwhWreGd5RePOcqdbLfOAbMABfrl2eWjZVnLvgw3t12IXZdnvnD9J8K437wDRuCrU7IhzU5_BQVTwzk7qdYOQUuTxL8WUxixRHIriG7YVg-VCW6XWHyTsKy3Hh-7BKnlNoDK70JyD-zCcbYCwtS2KrEB5-JIDbuDzbSxbiyUNeD1-Jg69z1RA3cbVzzKmXhxaAwmXEQai_KkU8hvrEw" />
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 mt-12">
                {/* Editorial Header Section */}
                <div className="mb-16 relative">
                    <div className="absolute -left-12 top-0 w-24 h-24 bg-primary-fixed opacity-10 rounded-full blur-3xl"></div>
                    <h1 className="text-7xl font-extrabold tracking-tighter text-on-surface leading-[0.9] mb-4 text-[64px]">
                        평점 및 <br/>
                        <span className="text-primary font-light italic">후기 관리.</span>
                    </h1>
                    <p className="text-on-surface-variant max-w-md font-medium text-lg border-l-4 border-secondary pl-6 ml-2 text-[16px]">
                        승객의 진솔한 이야기와 실시간 대응 전략을 통해 드라이버의 우수성을 관리하세요.
                    </p>
                </div>

                {/* Stats Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                    <div className="col-span-1 md:col-span-2 bg-white rounded-xl p-8 shadow-[0_40px_60px_-15px_rgba(0,104,95,0.06)] flex flex-col justify-between">
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-outline mb-8">나의 평점</h3>
                            <div className="flex items-baseline gap-2">
                                <span className="text-6xl font-black text-primary text-[48px]">4.9</span>
                                <span className="text-2xl font-bold text-outline text-[20px]">/ 5.0</span>
                            </div>
                        </div>
                        <div className="mt-8 flex gap-2 items-center">
                            {[1,2,3,4,5].map(star => (
                                <span key={star} className="material-symbols-outlined text-secondary" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                            ))}
                            <span className="ml-4 font-bold text-on-surface-variant text-[14px]">글로벌 드라이버 평균</span>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-primary to-primary-container rounded-xl p-8 text-white shadow-xl flex flex-col justify-between">
                        <span className="material-symbols-outlined text-4xl opacity-50">quick_reference_all</span>
                        <div>
                            <div className="text-4xl font-black mb-1 text-[32px]">92%</div>
                            <div className="text-sm font-bold uppercase tracking-widest opacity-80 leading-tight">답글 <br/>응답률</div>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <h2 className="text-2xl font-black text-on-surface tracking-tight mb-8">최근 고객 감사글</h2>
                    
                    {/* Feedback Card 1 */}
                    <div className="group bg-white rounded-xl p-8 relative shadow-sm hover:shadow-lg transition-all duration-500 overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex flex-col md:flex-row gap-8">
                            <div className="flex-shrink-0">
                                <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center font-black text-primary text-xl">JD</div>
                            </div>
                            <div className="flex-grow">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="text-xl font-extrabold text-on-surface tracking-tight">제임슨 던</h4>
                                        <div className="flex items-center gap-1 mt-1">
                                            {[1,2,3,4,5].map(star => (
                                                <span key={star} className="material-symbols-outlined text-secondary text-sm" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                                            ))}
                                            <span className="text-[10px] font-bold text-outline ml-2 uppercase tracking-tighter">인증된 이용객 • 2시간 전</span>
                                        </div>
                                    </div>
                                    <button className="hidden md:block bg-gradient-to-br from-primary to-primary-container text-white px-8 py-3 rounded-full font-bold text-sm tracking-wide shadow-lg">답글 등록</button>
                                </div>
                                <p className="text-on-surface-variant leading-relaxed text-lg font-medium italic mb-6 text-[16px]">
                                    "기사님이 굉장히 전문적이셨고 버스 상태도 신차처럼 깔끔했습니다. 프리미엄 이동 경험을 입찰 방식으로 이용할 수 있다는 게 정말 혁신적이네요. 꼭 다시 이용하겠습니다."
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Feedback Card 2 with Reply */}
                    <div className="group bg-white rounded-xl p-8 relative shadow-sm hover:shadow-lg transition-all duration-500 overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex flex-col md:flex-row gap-8">
                            <div className="flex-shrink-0">
                                <img alt="User" className="w-16 h-16 rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBV3f0_kHkQUCn5rvt77iRle-ZIROBZI4hcQ0IWes66-z0nQRmJn1ZNlCHoZXzCZJFVvmb52nOOtmUWAnGZFQjM0zFxFD8nIK14cl3O7mj_5Lp9u2F9XdZiusHjVVqHVE9j_uJ3eTnaLpZ5bACp13KyyPrWHh9gSoSqpssK5P9ekXs_NKALiFu5WglXmelLEiL8sus7i5ntEVDDhWX2Gn4t4PfE5j2iKxVn7EoT7mtulPzIgxpYZVumV-0mtWNcaIVgOJzzp-UwnTI" />
                            </div>
                            <div className="flex-grow">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="text-xl font-extrabold text-on-surface tracking-tight">사라 로슨</h4>
                                        <div className="flex items-center gap-1 mt-1">
                                            {[1,2,3,4].map(star => (
                                                <span key={star} className="material-symbols-outlined text-secondary text-sm" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                                            ))}
                                            <span className="material-symbols-outlined text-outline text-sm">star</span>
                                            <span className="text-[10px] font-bold text-outline ml-2 uppercase tracking-tighter">인증된 이용객 • 5시간 전</span>
                                        </div>
                                    </div>
                                    <button className="hidden md:block bg-gradient-to-br from-primary to-primary-container text-white px-8 py-3 rounded-full font-bold text-sm tracking-wide shadow-lg">답글 등록</button>
                                </div>
                                <p className="text-on-surface-variant leading-relaxed text-lg font-medium italic mb-6 text-[16px]">
                                    "좋은 서비스였지만 에어컨 온도가 조금 높았던 것 같아요. 그래도 일반 노선 버스보다 훨씬 나은 이동 수단입니다."
                                </p>
                                <div className="bg-surface-container-low rounded-xl p-6 border-l-2 border-primary-container/20">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="material-symbols-outlined text-primary text-sm">subdirectory_arrow_right</span>
                                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">드라이버 답글</span>
                                    </div>
                                    <p className="text-sm text-on-surface-variant font-medium">
                                        "안녕하세요 사라님, 소중한 의견 감사합니다! 지적해주신 해당 차량의 공조 장치 설정을 즉시 조정했습니다. 다음 노선에서 다시 뵙기를 기대하겠습니다!"
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* BottomNavBar */}
            <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md rounded-full bg-white/80 backdrop-blur-xl shadow-2xl flex justify-around items-center p-2 z-50 h-16">
                <button onClick={() => navigate('/driver-estimate-list')} className="flex flex-col items-center justify-center text-slate-500 px-4">
                    <span className="material-symbols-outlined mb-1">gavel</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">경매</span>
                </button>
                <button className="flex flex-col items-center justify-center text-slate-500 px-4">
                    <span className="material-symbols-outlined mb-1">visibility</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[8px]">관심목록</span>
                </button>
                <button className="flex flex-col items-center justify-center text-slate-500 px-4">
                    <span className="material-symbols-outlined mb-1">payments</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[8px]">입찰내역</span>
                </button>
                <button onClick={() => navigate('/driver-dashboard')} className="flex flex-col items-center justify-center bg-gradient-to-br from-teal-600 to-teal-800 text-white rounded-full w-12 h-12 shadow-lg">
                    <span className="material-symbols-outlined">person</span>
                </button>
            </nav>
        </div>
    );
};

export default DriverReviewMgmt;
