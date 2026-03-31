import React from 'react';

const CustomerDashboard = ({ user, setShowAccountSettings }) => {
  return (
    <div className="bg-surface min-h-screen font-body text-on-surface">
      {/* 
         주석: App.jsx의 Header가 이미 상단에 있으므로, 
         Dashboard 내의 중복된 TopNavBar는 제거하거나 서브 네비게이션으로 처리합니다.
         여기서는 디자인을 '그대로' 재현하기 위해 메인 컨텐츠 영역만 집중 구현합니다.
      */}
      
      <main className="max-w-[1440px] mx-auto px-8 py-12">
        {/* Hero Section: Active Request */}
        <section className="mb-16">
          <div className="hero-gradient rounded-3xl p-12 text-white flex flex-col md:flex-row items-center justify-between relative overflow-hidden tonal-stacking">
            <div className="relative z-10 max-w-2xl">
              <div className="flex items-center space-x-3 mb-6">
                <span className="bg-secondary px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">실시간 상태</span>
                <h2 className="text-primary-fixed font-headline font-bold text-lg">진행 중인 견적 요청</h2>
              </div>
              <h1 className="text-5xl font-headline font-extrabold mb-8 leading-tight tracking-tighter">
                서울 서초구 → 부산 해운대구<br/>
                <span className="text-primary-fixed">대형 전세버스 패키지</span>
              </h1>
              <div className="grid grid-cols-2 gap-8 mb-10">
                <div>
                  <p className="text-primary-fixed/60 text-xs uppercase font-bold tracking-widest mb-1">출발 일시</p>
                  <p className="text-xl font-semibold">2024년 10월 24일 09:00</p>
                </div>
                <div>
                  <p className="text-primary-fixed/60 text-xs uppercase font-bold tracking-widest mb-1">인원 및 수량</p>
                  <p className="text-xl font-semibold">45인승 대형 · 1대</p>
                </div>
              </div>
              <button className="accent-gradient px-8 py-4 rounded-full text-white font-bold text-sm flex items-center gap-2 hover:scale-105 transition-transform duration-300 shadow-xl">
                견적 리스트 확인하기
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            </div>
            <div className="hidden lg:block absolute right-[-10%] bottom-[-20%] w-[600px] h-[600px] opacity-20">
              <img 
                alt="Premium Bus" 
                className="w-full h-full object-contain" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCnB-qy8bgCj68b05tkEWLpYiY4ZwW78YbL6_ihG9UV2iKi91YT8DInWGGQPzO8hqj_oE3V7tLKiRBDwtBsvZd0IEjssiPTCBonMM8MLCDhEVK1aQRkjr7oF3QPUpb2SQ4BGc4OCC3xmZM6w9wz-9r2AVBOidU8Zqt-f9oLAlKp17FRpveMs5Pmt7QZ6vF-vhEMPIk4SjEUJQFSe4wCMRy5_3l8fE36gm_83HigLyeQTf8DRLh2vFSnxs0i8uMGZXQpU_B3bH6Rweo" 
              />
            </div>
          </div>
        </section>

        {/* Middle Section: Service Grid */}
        <section className="mb-24">
          <h3 className="font-headline text-3xl font-extrabold text-teal-900 mb-10 tracking-tight">주요 서비스</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {/* Register Bus */}
            <div className="bg-surface-container-lowest p-8 rounded-2xl tonal-stacking flex flex-col items-center text-center group cursor-pointer hover:bg-primary hover:text-on-primary transition-all duration-300 no-line-rule">
              <div className="w-14 h-14 bg-surface-container-high rounded-full flex items-center justify-center mb-6 group-hover:bg-primary-container">
                <span className="material-symbols-outlined text-primary group-hover:text-on-primary-container">directions_bus</span>
              </div>
              <span className="font-bold text-sm">버스 등록</span>
            </div>
            {/* Trip History */}
            <div className="bg-surface-container-lowest p-8 rounded-2xl tonal-stacking flex flex-col items-center text-center group cursor-pointer hover:bg-primary hover:text-on-primary transition-all duration-300 no-line-rule">
              <div className="w-14 h-14 bg-surface-container-high rounded-full flex items-center justify-center mb-6 group-hover:bg-primary-container">
                <span className="material-symbols-outlined text-primary group-hover:text-on-primary-container">history</span>
              </div>
              <span className="font-bold text-sm">이용 내역</span>
            </div>
            {/* Reviews */}
            <div className="bg-surface-container-lowest p-8 rounded-2xl tonal-stacking flex flex-col items-center text-center group cursor-pointer hover:bg-primary hover:text-on-primary transition-all duration-300 no-line-rule">
              <div className="w-14 h-14 bg-surface-container-high rounded-full flex items-center justify-center mb-6 group-hover:bg-primary-container">
                <span className="material-symbols-outlined text-primary group-hover:text-on-primary-container">rate_review</span>
              </div>
              <span className="font-bold text-sm">리뷰 관리</span>
            </div>
            {/* Reservation List */}
            <div className="bg-surface-container-lowest p-8 rounded-2xl tonal-stacking flex flex-col items-center text-center group cursor-pointer hover:bg-primary hover:text-on-primary transition-all duration-300 no-line-rule">
              <div className="w-14 h-14 bg-surface-container-high rounded-full flex items-center justify-center mb-6 group-hover:bg-primary-container">
                <span className="material-symbols-outlined text-primary group-hover:text-on-primary-container">event_available</span>
              </div>
              <span className="font-bold text-sm">예약 목록</span>
            </div>
            {/* 1:1 Inquiry */}
            <div className="bg-surface-container-lowest p-8 rounded-2xl tonal-stacking flex flex-col items-center text-center group cursor-pointer hover:bg-primary hover:text-on-primary transition-all duration-300 no-line-rule">
              <div className="w-14 h-14 bg-surface-container-high rounded-full flex items-center justify-center mb-6 group-hover:bg-primary-container">
                <span className="material-symbols-outlined text-primary group-hover:text-on-primary-container">support_agent</span>
              </div>
              <span className="font-bold text-sm">1:1 문의</span>
            </div>
            {/* Member Info */}
            <div 
              onClick={() => setShowAccountSettings(true)}
              className="bg-surface-container-lowest p-8 rounded-2xl tonal-stacking flex flex-col items-center text-center group cursor-pointer hover:bg-primary hover:text-on-primary transition-all duration-300 no-line-rule"
            >
              <div className="w-14 h-14 bg-surface-container-high rounded-full flex items-center justify-center mb-6 group-hover:bg-primary-container">
                <span className="material-symbols-outlined text-primary group-hover:text-on-primary-container">person</span>
              </div>
              <span className="font-bold text-sm">회원 정보</span>
            </div>
          </div>
        </section>

        {/* Bottom Section: Recommended Banners */}
        <section>
          <h3 className="font-headline text-3xl font-extrabold text-teal-900 mb-10 tracking-tight">추천 서비스</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Banner 1 */}
            <div className="group relative h-[450px] rounded-3xl overflow-hidden tonal-stacking cursor-pointer">
              <img 
                alt="VIP Service" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAZ8ns1S5rBu3lNocUMReeJvuLjuv8XE2XFY_2gQGdDmos2bcCnUZ1vn7GWHkvlxG0IR08q-9KMxVNQ8eBmst0OU1F2kcXcJ9hF59lNu3qQMTIs0Ums7QAgnI8MaYcny1xxg8Vy3qvz12i09bLRdqm-iT8bV7fr7s2Vs1xOjvPKhdgRoWwmJuyEK8H_taMIVSobYKbJpsXCRFr6mzxh_e6LxhDfSu4lByBfYRJ3Ju5Bb0g1-Z3UEKWTxUvuhO1IIfKW7brDB5YyBKA" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-teal-950/90 via-teal-900/20 to-transparent p-12 flex flex-col justify-end">
                <p className="text-primary-fixed font-bold tracking-widest text-xs uppercase mb-4">VIP 컨시어지</p>
                <h4 className="text-white text-4xl font-headline font-bold mb-6 leading-tight">의전 및 기업 행사 전용<br/>프리미엄 라운지 서비스</h4>
                <div className="w-12 h-1 bg-secondary transition-all duration-300 group-hover:w-24"></div>
              </div>
            </div>
            {/* Banner 2 */}
            <div className="group relative h-[450px] rounded-3xl overflow-hidden tonal-stacking cursor-pointer">
              <img 
                alt="Group Travel" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCegHMQz24j1T0iMs83q3v5FRDlxeQcpigVdcybtaYznVi4igtArIBtwG-ecXg8_FK3rfLdthmpK4iCXjWYz0kH-KFKZfR2-a1xcqIB_Zq0R1C6dFjhcK6BuDIqOlw0zwAlnbGKiptNWnH7F5ZTgf4wb4aAS1lTyzWRNRJ79EfqcKzfYXOw_S5urwh7Rhcq22bijvlBfF1Oi3HG2DYE30vnOBqbE0aUP644NnlEcIYXT0raVl96CVKPKz9vQNJrsBn1AAdMlj5alpU" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-teal-950/90 via-teal-900/20 to-transparent p-12 flex flex-col justify-end">
                <p className="text-primary-fixed font-bold tracking-widest text-xs uppercase mb-4">단체 패키지</p>
                <h4 className="text-white text-4xl font-headline font-bold mb-6 leading-tight">단체 관광 및 워크숍<br/>맞춤형 올인원 패키지</h4>
                <div className="w-12 h-1 bg-secondary transition-all duration-300 group-hover:w-24"></div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/50 w-full py-16 mt-32">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 px-12 max-w-[1440px] mx-auto">
          <div className="space-y-6">
            <div className="text-xl font-bold text-teal-800 font-headline italic">busTaams</div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-xs">국내 최대 규모의 버스 입찰 플랫폼으로, 투명하고 효율적인 예약 경험을 제공합니다.</p>
          </div>
          <div>
            <h5 className="text-xs uppercase tracking-widest font-bold text-teal-700 mb-6">서비스</h5>
            <ul className="space-y-4 text-xs uppercase tracking-widest text-slate-400">
              <li><a className="hover:text-secondary transition-all" href="#">이용약관</a></li>
              <li><a className="hover:text-secondary transition-all" href="#">개인정보 처리방침</a></li>
              <li><a className="hover:text-secondary transition-all" href="#">탁송 서비스</a></li>
            </ul>
          </div>
          <div>
            <h5 className="text-xs uppercase tracking-widest font-bold text-teal-700 mb-6">고객 지원</h5>
            <ul className="space-y-4 text-xs uppercase tracking-widest text-slate-400">
              <li><a className="hover:text-secondary transition-all" href="#">고객센터 문의</a></li>
              <li><a className="hover:text-secondary transition-all" href="#">프레스 킷</a></li>
            </ul>
          </div>
          <div className="flex flex-col justify-between">
            <p className="text-slate-400 text-[10px] leading-relaxed">© 2024 busTaams. All rights reserved.</p>
            <div className="flex space-x-4 mt-6">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer hover:bg-primary hover:text-white transition-colors">
                <span className="material-symbols-outlined text-lg">share</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer hover:bg-primary hover:text-white transition-colors">
                <span className="material-symbols-outlined text-lg">mail</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CustomerDashboard;
