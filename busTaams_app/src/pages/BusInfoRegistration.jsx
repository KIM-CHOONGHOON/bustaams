import React from 'react';
import { useNavigate } from 'react-router-dom';

const BusInfoRegistration = () => {
    const navigate = useNavigate();

    const busGrades = [
        { label: '45인승', value: '45' },
        { label: '28인승 우등', value: '28' },
        { label: '35인승', value: '35' },
        { label: '25인승 미니', value: '25' },
        { label: '15인승', value: '15' },
        { label: '12인승', value: '12' },
        { label: '21인승 프리미엄', value: '21_premium' },
    ];

    const amenities = [
        { icon: 'wifi', label: '와이파이' },
        { icon: 'usb', label: 'USB 포트' },
        { icon: 'mic', label: '노래방' },
        { icon: 'tv', label: 'TV/모니터' },
        { icon: 'kitchen', label: '냉장고' },
        { icon: 'water_drop', label: '정수기' },
        { icon: 'curtains', label: '커튼' },
        { icon: 'air_purifier_gen', label: '공기청정기' },
    ];

    return (
        <div className="bg-background text-on-surface min-h-[100dvh] pb-48 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/40 backdrop-blur-3xl border-b border-white/20 py-6">
                <div className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto">
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl text-teal-800 shadow-xl shadow-teal-900/5 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-lg">menu</span>
                        </button>
                        <h1 className="font-headline font-black tracking-tighter text-3xl text-teal-900 italic">busTaams</h1>
                    </div>
                    <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-primary-container shadow-2xl rotate-3">
                        <img alt="User profile" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDLNdNQAbua3KeCHG1vsEPgBgwJdOFDE4TX3AGzHm2LvcI_vsinDKaWK-QIJOEo1Yp8n7xvf_-AV9uVqzHt9EIDBaEI0xRjShrShvRSA4zHGTsnTHwvBjBa5tJr4bfXa2BERNWhIolnByegmpLBkh-1SWvciN8vSSoI_q3c0M40vfOgQlQulPSoGj_ZYJcbu3_7W2UIy1lBOn9hHTZz-q2Q6hXHoCfhoKN3liBCS0akSIUvPBTyttaQFDWw7qONE2IUEXUZCBN_m6I" />
                    </div>
                </div>
            </header>

            <main className="pt-40 px-6 max-w-7xl mx-auto space-y-20 animate-in fade-in slide-in-from-bottom duration-1000 text-left">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 text-left">
                    {/* Left Column: Editorial Header */}
                    <div className="lg:col-span-4 flex flex-col gap-10 text-left">
                        <div className="space-y-6 text-left">
                            <span className="text-secondary font-black tracking-[0.4em] uppercase text-[10px] block px-2 italic">Partner Fleet System</span>
                            <h2 className="font-headline text-6xl font-black text-primary leading-[0.9] tracking-tighter italic text-left uppercase">Bus<br/>Registry.</h2>
                            <p className="text-slate-400 text-xl font-bold tracking-tight italic leading-relaxed max-w-sm text-left">
                                승객에게 최고의 신뢰를 제공하기 위해 차량의 모든 제원과 서류를 꼼꼼히 등록해 주세요.
                            </p>
                        </div>

                        <div className="p-8 bg-slate-900 rounded-[3rem] border-l-[12px] border-secondary shadow-2xl shadow-slate-900/20 text-left text-white space-y-4">
                            <p className="text-[10px] font-black text-secondary uppercase tracking-[0.3em] italic">Protocol Notice</p>
                            <p className="text-sm font-bold text-slate-300 leading-relaxed italic text-left">
                                모든 날짜 형식은 <span className="text-white underline underline-offset-4 decoration-secondary/50">YYYY/MM/DD</span> 형식을 준수하십시오. 허위 정보 기재 시 서비스 전용 망 이용이 즉시 제한될 수 있습니다.
                            </p>
                        </div>
                    </div>

                    {/* Right Column: Form Modules */}
                    <div className="lg:col-span-8 space-y-12 text-left pb-20">
                        {/* 01: Identification */}
                        <section className="bg-white/40 backdrop-blur-2xl p-10 md:p-14 rounded-[4rem] shadow-2xl shadow-teal-900/5 border border-white space-y-12 text-left">
                            <div className="flex items-center justify-between border-b-4 border-slate-50 pb-8 text-left">
                                <h3 className="font-headline font-black text-3xl text-on-surface flex items-center gap-6 italic text-left">
                                    <span className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl not-italic">01</span>
                                    Registry Entry
                                </h3>
                                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300 italic">Mandatory Area</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-left">
                                <div className="space-y-4 text-left text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">
                                    <label className="ml-4">Terminal Plate No.</label>
                                    <input className="w-full bg-white border-4 border-slate-50 rounded-[2.5rem] px-8 py-6 text-on-surface font-black text-lg focus:border-primary transition-all outline-none shadow-sm" placeholder="서울 70 사 1234" />
                                </div>
                                <div className="space-y-4 text-left text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">
                                    <label className="ml-4">Chassis Model</label>
                                    <input className="w-full bg-white border-4 border-slate-50 rounded-[2.5rem] px-8 py-6 text-on-surface font-black text-lg focus:border-primary transition-all outline-none shadow-sm" placeholder="현대 유니버스, 기아 그랜버드" />
                                </div>
                                <div className="space-y-4 text-left text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">
                                    <label className="ml-4">Production Year</label>
                                    <input className="w-full bg-white border-4 border-slate-50 rounded-[2.5rem] px-8 py-6 text-on-surface font-black text-lg focus:border-primary transition-all outline-none shadow-sm" placeholder="2023" type="number" />
                                </div>
                            </div>
                        </section>

                        {/* 02: Grade Grid */}
                        <section className="bg-white/40 backdrop-blur-2xl p-10 md:p-14 rounded-[4rem] shadow-2xl shadow-teal-900/5 border border-white space-y-12 text-left">
                            <div className="flex items-center justify-between border-b-4 border-slate-50 pb-8 text-left">
                                <h3 className="font-headline font-black text-3xl text-on-surface flex items-center gap-6 italic text-left">
                                    <span className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl not-italic">02</span>
                                    Grade Selection
                                </h3>
                                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300 italic">Configuration</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-left">
                                {busGrades.map((grade, i) => (
                                    <label key={i} className="relative group cursor-pointer text-left">
                                        <input className="hidden peer" name="bus_grade" type="radio" value={grade.value} />
                                        <div className="p-6 rounded-[2.5rem] bg-white border-4 border-slate-50 peer-checked:border-secondary peer-checked:bg-secondary/5 transition-all text-center flex flex-col items-center justify-center gap-2 group-hover:scale-105">
                                            <span className="text-[10px] font-black text-slate-400 peer-checked:text-secondary uppercase tracking-widest leading-tight">{grade.label}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            <div className="space-y-4 text-left">
                                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 ml-4 italic">Mission Type</label>
                                <select className="w-full bg-white border-4 border-slate-50 rounded-[2.5rem] px-8 py-6 text-on-surface font-black text-lg focus:border-primary transition-all outline-none shadow-sm appearance-none cursor-pointer italic italic">
                                    <option value="">Choose Protocol</option>
                                    <option value="sightseeing">관광/전세 (Sightseeing)</option>
                                    <option value="business">비즈니스 (Enterprise)</option>
                                    <option value="shuttle">셔틀/통근 (Commute)</option>
                                </select>
                            </div>
                            <div className="space-y-6 text-left pt-6">
                                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 ml-4 italic">Visual Archive (Max 9 Units)</label>
                                <div className="grid grid-cols-3 md:grid-cols-5 gap-6 text-left">
                                    <div className="aspect-square bg-slate-900 rounded-[2rem] border-4 border-dashed border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-all text-white group shadow-2xl">
                                        <span className="material-symbols-outlined text-3xl group-hover:rotate-12 transition-all">add_a_photo</span>
                                        <span className="text-[8px] font-black uppercase tracking-widest mt-2">Initialize</span>
                                    </div>
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="aspect-square bg-slate-50 rounded-[2rem] border-4 border-white flex items-center justify-center opacity-20">
                                            <span className="material-symbols-outlined text-slate-400">image</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* 04: Amenities Ledger */}
                        <section className="bg-slate-900 rounded-[4rem] p-10 md:p-14 shadow-2xl shadow-slate-900/40 space-y-12 text-left">
                            <div className="flex items-center justify-between border-b-4 border-white/5 pb-8 text-left">
                                <h4 className="font-headline font-black text-3xl text-white italic uppercase tracking-tighter text-left">Amenity Options</h4>
                                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-600 italic">Intelligence</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-left">
                                {amenities.map((item, i) => (
                                    <label key={i} className="group cursor-pointer text-left">
                                        <input className="hidden peer" type="checkbox" />
                                        <div className="p-8 rounded-[3rem] bg-white/5 border-4 border-transparent peer-checked:border-primary peer-checked:bg-primary/10 transition-all flex flex-col items-center justify-center gap-4 group-hover:bg-white/10 text-center">
                                            <span className="material-symbols-outlined text-slate-700 peer-checked:text-primary transition-all text-3xl">{item.icon}</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 peer-checked:text-primary">{item.label}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </section>

                        {/* 06: Legal Grid */}
                        <section className="bg-white/40 backdrop-blur-2xl p-10 md:p-14 rounded-[4rem] shadow-2xl shadow-teal-900/5 border border-white space-y-12 text-left">
                            <div className="flex items-center justify-between border-b-4 border-slate-50 pb-8 text-left">
                                <h3 className="font-headline font-black text-3xl text-on-surface flex items-center gap-6 italic text-left uppercase">Document Base</h3>
                                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300 italic">Validation</span>
                            </div>
                            <div className="space-y-6 text-left">
                                {[
                                    { title: '사업자 등록증', desc: 'Valid Business ID Card', color: 'bg-tertiary-fixed', icon: 'badge' },
                                    { title: '운송 허가증', desc: 'Transport Permit Protocol', color: 'bg-secondary-fixed', icon: 'local_shipping' },
                                    { title: '보험 증명서', desc: 'Insurance Ledger Grid', color: 'bg-primary-fixed', icon: 'verified_user' }
                                ].map((doc, i) => (
                                    <div key={i} className="bg-slate-50 p-2 rounded-[3rem] text-left hover:scale-[1.02] transition-all">
                                        <div className="bg-white rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center gap-10 text-left">
                                            <div className={`w-20 h-20 rounded-[1.5rem] ${doc.color} flex items-center justify-center text-on-surface shrink-0 shadow-inner`}>
                                                <span className="material-symbols-outlined text-4xl">{doc.icon}</span>
                                            </div>
                                            <div className="flex-1 text-center md:text-left space-y-1 text-left">
                                                <h4 className="font-black text-xl text-on-surface italic leading-none">{doc.title}</h4>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">{doc.desc}</p>
                                            </div>
                                            <button className="w-full md:w-auto px-12 py-5 rounded-full bg-slate-50 text-primary font-black text-[9px] uppercase tracking-[0.4em] hover:bg-primary hover:text-white transition-all shadow-xl">
                                                Inject File
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Footer Action */}
                        <div className="flex flex-col md:flex-row items-center justify-end gap-8 pt-10 border-t-4 border-slate-50 text-left">
                            <button className="px-12 py-8 rounded-full bg-slate-50 text-slate-400 font-black font-headline text-xl italic uppercase tracking-[0.2em] transition-all hover:bg-slate-100">
                                Save Cache
                            </button>
                            <button className="w-full md:w-auto px-20 py-8 rounded-full bg-gradient-to-br from-primary to-primary-container text-white font-black font-headline text-xl italic uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:shadow-primary/50 active:scale-95 transition-all duration-500">
                                Confirm Registry
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Bottom Nav */}
            <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex justify-around items-center px-4 py-2 bg-slate-900 text-slate-500 w-[90%] max-w-lg mx-auto rounded-full shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] border border-white/10">
                <button onClick={() => navigate('/driver-dashboard')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">dashboard</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Home</span>
                </button>
                <button onClick={() => navigate('/estimate-list-driver')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">gavel</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Auction</span>
                </button>
                <button onClick={() => navigate('/bus-info')} className="flex flex-col items-center justify-center px-5 py-2 text-primary relative">
                    <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-lg"></div>
                    <span className="material-symbols-outlined relative z-10" style={{fontVariationSettings: "'FILL' 1"}}>directions_bus</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1 relative z-10 underline decoration-2 underline-offset-4">Fleet</span>
                </button>
            </nav>
        </div>
    );
};

export default BusInfoRegistration;
