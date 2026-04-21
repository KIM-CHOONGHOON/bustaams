import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ProfileCustomer = () => {
    const navigate = useNavigate();
    const [name, setName] = useState('김지수');
    const [phone, setPhone] = useState('010-1234-5678');
    const [email, setEmail] = useState('jisoo.kim@bustaams-premium.com');

    return (
        <div className="bg-background text-on-surface min-h-[100dvh] pb-40 font-body text-left">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white/40 backdrop-blur-3xl border-b border-white/20 py-5 flex items-center justify-between px-6 shadow-sm">
                <div className="flex items-center gap-6 max-w-7xl mx-auto w-full">
                    <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl text-teal-800 shadow-xl shadow-teal-900/5 active:scale-95 transition-all">
                        <span className="material-symbols-outlined text-lg">arrow_back</span>
                    </button>
                    <h1 className="font-headline font-black tracking-tighter text-2xl text-teal-900 italic">Account Management</h1>
                    <div className="ml-auto flex items-center gap-4">
                        <span className="material-symbols-outlined text-slate-300">settings</span>
                    </div>
                </div>
            </header>

            <main className="pt-32 px-6 max-w-3xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom duration-700">
                {/* Profile Header Section */}
                <section className="flex flex-col items-center gap-10 py-10 bg-white rounded-[3.5rem] shadow-2xl shadow-teal-900/5 border border-white relative overflow-hidden text-center group">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-secondary to-primary-container opacity-20"></div>
                    <div className="relative">
                        <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white rotate-3 group-hover:rotate-0 transition-all duration-700">
                            <img alt="User Profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBC8LV7hPGUta4ajIpqrOwoQlqeqE69eGDrkJUbdEcCHTtBPwCvUqSs6kvGY8qYyvNuiodT70QrHsMEtVM3AFCyfI3v0J3hWzucB4lWd2ryKmYO9hy5mpNu33PwJlZ4LJOO2GNSsHTTrFcKrUlXsdqOsqOqEmL5p8BfUC5xHT-G6IKvxcYDM1W-T25uTuJwvlc9cisHDy-TSyNfP9faJZwvpf16_qxNZCohMXZCsSNNVpjxnzYxAf8j9bwvY9bG6ChflXzWUY_CtSY" />
                        </div>
                        <button className="absolute -bottom-2 -right-2 bg-primary text-white p-3 rounded-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all outline-none">
                            <span className="material-symbols-outlined text-lg" style={{fontVariationSettings: "'FILL' 1"}}>edit</span>
                        </button>
                    </div>
                    <div className="space-y-3">
                        <h2 className="text-4xl font-black tracking-tighter text-on-surface italic">{name}</h2>
                        <div className="flex items-center justify-center gap-3">
                            <span className="px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/20 shadow-sm animate-pulse">Premium Member</span>
                            <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                            <span className="text-xs text-slate-300 font-bold tracking-tight italic">{email}</span>
                        </div>
                    </div>
                </section>

                {/* Personal Info Form */}
                <section className="space-y-10 text-left">
                    <h3 className="text-xl font-black text-primary flex items-center gap-4 tracking-tighter italic">
                        <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>person</span>
                        Identity Core
                    </h3>
                    <div className="space-y-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 ml-2">Full Legal Name</label>
                            <input 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-transparent rounded-3xl px-8 py-5 focus:border-primary focus:bg-white transition-all outline-none font-bold text-lg shadow-inner" 
                                type="text"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 ml-2">Mobile Connection</label>
                            <div className="flex gap-4">
                                <input 
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="flex-1 bg-slate-50 border-2 border-transparent rounded-3xl px-8 py-5 focus:border-primary focus:bg-white transition-all outline-none font-bold text-lg shadow-inner" 
                                    type="tel"
                                />
                                <button className="bg-primary text-white px-8 rounded-3xl text-xs font-black uppercase tracking-widest whitespace-nowrap active:scale-95 transition-all shadow-xl shadow-primary/20">Send OTP</button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 ml-2">Digital Address</label>
                            <input 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-transparent rounded-3xl px-8 py-5 focus:border-primary focus:bg-white transition-all outline-none font-bold text-lg shadow-inner" 
                                type="email"
                            />
                        </div>
                    </div>
                </section>

                {/* Account Settings */}
                <section className="space-y-10 text-left">
                    <h3 className="text-xl font-black text-primary flex items-center gap-4 tracking-tighter italic">
                        <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>shield_person</span>
                        Safehold Settings
                    </h3>
                    <div className="grid grid-cols-1 gap-10">
                        {/* Password Change */}
                        <div className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-teal-900/5 border-l-8 border-secondary space-y-8 text-left hover:scale-[1.01] transition-all">
                            <span className="font-black text-2xl flex items-center gap-4 tracking-tighter italic text-secondary">
                                <span className="material-symbols-outlined text-3xl">lock_reset</span>
                                Rotate Key (Password)
                            </span>
                            <div className="space-y-5">
                                <input className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 focus:ring-4 ring-secondary/10 transition-all outline-none text-sm font-bold" placeholder="Current Secret Phrase" type="password" />
                                <input className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 focus:ring-4 ring-secondary/10 transition-all outline-none text-sm font-bold" placeholder="New Secret Phrase" type="password" />
                                <input className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 focus:ring-4 ring-secondary/10 transition-all outline-none text-sm font-bold" placeholder="Verify New Phrase" type="password" />
                            </div>
                        </div>
                        {/* SNS Linking */}
                        <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl shadow-slate-900/20 flex flex-col gap-8 text-left">
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">Global Synchronicity</span>
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="flex items-center gap-5">
                                        <div className="w-10 h-10 bg-[#FEE500] rounded-xl flex items-center justify-center text-[11px] font-black text-black">K</div>
                                        <span className="text-sm font-black text-white tracking-widest uppercase italic">Kakao Sync</span>
                                    </div>
                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-4 py-1 rounded-full">Paired</span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="flex items-center gap-5">
                                        <div className="w-10 h-10 bg-[#03C75A] rounded-xl flex items-center justify-center text-[11px] text-white font-black">N</div>
                                        <span className="text-sm font-black text-white tracking-widest uppercase italic">Naver Sync</span>
                                    </div>
                                    <button className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all">Link Portal</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Preferences Section */}
                <section className="space-y-10 text-left">
                    <h3 className="text-xl font-black text-primary flex items-center gap-4 tracking-tighter italic">
                        <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>tune</span>
                        Experience Control
                    </h3>
                    <div className="bg-slate-50 rounded-[3rem] overflow-hidden border border-slate-100 shadow-inner">
                        <div className="flex items-center justify-between p-8 hover:bg-white transition-all cursor-pointer group border-b border-white">
                            <div className="flex items-center gap-5">
                                <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-all">notifications</span>
                                <span className="font-black text-sm tracking-tight uppercase">Intelligence Alerts</span>
                            </div>
                            <span className="material-symbols-outlined text-slate-200 group-hover:translate-x-2 transition-transform">chevron_right</span>
                        </div>
                        <div className="flex items-center justify-between p-8 hover:bg-white transition-all cursor-pointer group">
                            <div className="flex items-center gap-5">
                                <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-all">policy</span>
                                <span className="font-black text-sm tracking-tight uppercase">Protocol & Ethics</span>
                            </div>
                            <span className="material-symbols-outlined text-slate-200 group-hover:translate-x-2 transition-transform">chevron_right</span>
                        </div>
                    </div>
                </section>

                {/* Save Button */}
                <div className="pt-10 space-y-6">
                    <button className="w-full bg-gradient-to-br from-primary to-primary-container text-white py-7 rounded-full font-black text-xs uppercase tracking-[0.4em] shadow-2xl shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-4 group">
                        Confirm Modifications
                        <span className="material-symbols-outlined group-hover:rotate-12 transition-all" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>
                    </button>
                    <button className="w-full py-4 text-xs font-black text-slate-300 uppercase tracking-widest hover:text-red-500 transition-colors">
                        Deactivate My Existence (Resign)
                    </button>
                </div>
            </main>

            {/* Shared Bottom Nav */}
            <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex justify-around items-center px-4 py-2 bg-slate-900 text-slate-500 w-[90%] max-w-md mx-auto rounded-full shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] border border-white/10">
                <button onClick={() => navigate('/customer-dashboard')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">gavel</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Auction</span>
                </button>
                <button onClick={() => navigate('/reservation-list')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">confirmation_number</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Trips</span>
                </button>
                <button onClick={() => navigate('/chat-room')} className="flex flex-col items-center justify-center px-5 py-2 hover:text-white transition-all">
                    <span className="material-symbols-outlined">chat_bubble</span>
                    <span className="font-black text-[9px] uppercase tracking-widest mt-1">Talk</span>
                </button>
                <button className="flex flex-col items-center justify-center bg-white/20 text-white rounded-full w-12 h-12 shadow-lg active:scale-90 transition-all">
                    <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>person</span>
                </button>
            </nav>
        </div>
    );
};

export default ProfileCustomer;
