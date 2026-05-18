import React, { useState } from 'react';

const Login = ({ onLoginSuccess, onGoSignup }) => {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!adminId || !password) return alert('아이디와 비밀번호를 입력해주세요.');

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess();
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden font-sans">
      {/* 배경 장식 (밝은 테마에 맞게 은은하게) */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md px-6 z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-6 shadow-lg shadow-primary/20">
             <span className="text-3xl text-white font-black leading-none">B</span>
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">버스탐스 관리자</h1>
        </div>

        <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2 ml-1">아이디</label>
              <input 
                type="text" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-medium" 
                placeholder="관리자 아이디를 입력하세요" 
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2 ml-1">비밀번호</label>
              <input 
                type="password" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-medium" 
                placeholder="비밀번호를 입력하세요" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-8 bg-primary text-white font-bold py-4 rounded-xl hover:bg-emerald-800 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              '관리자 로그인'
            )}
          </button>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500 font-medium">
              아직 관리자 계정이 없으신가요? 
              <button 
                type="button" 
                onClick={onGoSignup}
                className="ml-2 text-primary font-bold hover:underline"
              >
                관리자 가입하기
              </button>
            </p>
          </div>
        </form>

        <div className="mt-10 text-center">
          <p className="text-xs text-slate-400 font-medium">
            &copy; 2026 BusTaams Platform. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
