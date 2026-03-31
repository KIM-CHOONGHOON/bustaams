import React from 'react';

const CustomerDashboard = () => {
  return (
    <div className="bg-[#f7f9fb] text-[#191c1e] min-h-screen pb-32 font-['Pretendard']">
      <main className="pt-12 px-6 max-w-7xl mx-auto space-y-12">
        
        {/* User Welcome Section - Optimized for Web */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <p className="text-[#9d4300] font-semibold tracking-wider text-sm uppercase">반가워요!</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-[#191c1e] tracking-tight leading-tight font-['Plus_Jakarta_Sans']">
              안녕하세요, <span className="text-[#004e47]">김지훈</span>님!<br />
              오늘의 새로운 여정을 시작해볼까요?
            </h2>
          </div>
          <div className="hidden md:block pb-2">
            <p className="text-[#3e4947] text-right max-w-xs font-medium">오늘도 벨로시티와 함께 안전하고 편안한 이동을 계획해보세요.</p>
          </div>
        </section>

        {/* Current Status Banner - Optimized for Web (Wider) */}
        <section className="relative overflow-hidden rounded-[2rem] bg-[#004e47] text-white p-8 md:p-12 shadow-xl group">
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
            <img 
              alt="Bus interior" 
              className="w-full h-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDGum5KlJoZ1QYpw5IUtpBjkmHm85WskANrUTCg5K2pp6oBoHGfm904xF0Sha_OV2yNjGAHuI_C5we-RplZzy8FNTllgSB3jrLud6xKDIt-Yn1sUdijX3D970Qn4JoiC3v5tfqVRs4VFH5cP0XqOp47pfFy5EjuwG7xK79EZy2twkr6P2kJi5Pb6AtubxOcGzAlSiIl5ew5i1lqDMgmBcs_lw4egfP7RyHxYkREFQYcVBJXOIo4hSks6H2AOFsHQmbzkLX3Ckbqzmg" 
            />
          </div>
          <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                <span className="w-2 h-2 rounded-full bg-[#ff8d4b] animate-pulse"></span>
                <span className="text-xs font-bold tracking-widest uppercase">진행 중인 요청</span>
              </div>
              <div>
                <h3 className="text-3xl font-bold mb-2">서울 ↔ 부산 워크샵 단체 버스</h3>
                <p className="text-[#93e4d8] font-medium opacity-90">견적 대기 중 • 12개의 새로운 제안이 도착했습니다</p>
              </div>
              <div className="flex gap-4">
                <button className="bg-white text-[#004e47] px-8 py-3 rounded-full font-bold hover:bg-[#a1f1e5] transition-all active:scale-95">
                  견적 리스트 확인
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10">
                <p className="text-white/60 text-xs font-bold uppercase mb-1">출발일</p>
                <p className="text-xl font-bold font-['Plus_Jakarta_Sans']">2024. 06. 15</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10">
                <p className="text-white/60 text-xs font-bold uppercase mb-1">탑승 인원</p>
                <p className="text-xl font-bold font-['Plus_Jakarta_Sans']">45명</p>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Action Grid - Optimized for Web (4 columns) */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-[#191c1e]">빠른 서비스</h3>
            <span className="text-sm text-slate-400 font-medium">6개의 핵심 서비스</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
            {/* Action 1: Bus Request */}
            <div className="group cursor-pointer bg-white p-6 rounded-3xl shadow-[0px_40px_60px_rgba(0,104,95,0.06)] border-l-4 border-[#9d4300] hover:translate-y-[-4px] transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-[#9d4300]/10 flex items-center justify-center mb-4 text-[#9d4300]">
                <span className="material-symbols-outlined">add_task</span>
              </div>
              <h4 className="font-bold text-[#191c1e]">버스 요청 등록</h4>
              <p className="text-xs text-[#3e4947] mt-1">새로운 일정 생성</p>
            </div>

            {/* Action 2: Trip History */}
            <div className="group cursor-pointer bg-white p-6 rounded-3xl shadow-[0px_40px_60px_rgba(0,104,95,0.06)] hover:translate-y-[-4px] transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 text-slate-600">
                <span className="material-symbols-outlined">history</span>
              </div>
              <h4 className="font-bold text-[#191c1e]">과거 운행 이력</h4>
              <p className="text-xs text-[#3e4947] mt-1">지난 여정 확인</p>
            </div>

            {/* Action 3: Ratings */}
            <div className="group cursor-pointer bg-white p-6 rounded-3xl shadow-[0px_40px_60px_rgba(0,104,95,0.06)] hover:translate-y-[-4px] transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center mb-4 text-orange-600">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              </div>
              <h4 className="font-bold text-[#191c1e]">평점 및 감사글</h4>
              <p className="text-xs text-[#3e4947] mt-1">이용 후기 작성</p>
            </div>

            {/* Action 4: Reservations */}
            <div className="group cursor-pointer bg-white p-6 rounded-3xl shadow-[0px_40px_60px_rgba(0,104,95,0.06)] hover:translate-y-[-4px] transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4 text-indigo-600">
                <span className="material-symbols-outlined">event_note</span>
              </div>
              <h4 className="font-bold text-[#191c1e]">예약 리스트</h4>
              <p className="text-xs text-[#3e4947] mt-1">나의 예약 현황 확인</p>
            </div>

            {/* Action 5: Support */}
            <div className="group cursor-pointer bg-white p-6 rounded-3xl shadow-[0px_40px_60px_rgba(0,104,95,0.06)] hover:translate-y-[-4px] transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 text-slate-600">
                <span className="material-symbols-outlined">support_agent</span>
              </div>
              <h4 className="font-bold text-[#191c1e]">1:1 문의</h4>
              <p className="text-xs text-[#3e4947] mt-1">고객 센터 연결</p>
            </div>

            {/* Action 6: Profile */}
            <div className="group cursor-pointer bg-white p-6 rounded-3xl shadow-[0px_40px_60px_rgba(0,104,95,0.06)] hover:translate-y-[-4px] transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center mb-4 text-teal-600">
                <span className="material-symbols-outlined">account_circle</span>
              </div>
              <h4 className="font-bold text-[#191c1e]">회원정보 관리</h4>
              <p className="text-xs text-[#3e4947] mt-1">개인 설정 변경</p>
            </div>
          </div>
        </section>

        {/* Recommended Services - Optimized for Web (2 columns) */}
        <section className="space-y-6">
          <h3 className="text-xl font-bold text-[#191c1e]">추천 서비스</h3>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Promo 1 */}
            <div className="relative h-64 rounded-3xl overflow-hidden group">
              <img 
                alt="Business Meeting" 
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBoFDp_eiY3qmMSnq9KvUnc4OKOr8gWwd03oN9JgpnhNej1pjGlLTvHe1VMU-WiV3V6o2CNM99f9QcT1VB8ylIT7IblNFr9J3NDAoWSZCtjbR14qChACezpVX-AeIVWxD4WIanqYTomBqN4GApcivsYGDKs7x8Upp81RE5cx0zMQ0JNB6RENxSF1htJtNdDca1eQHoROUx1ptXTRApAERrOsdl99Z31Lf7JBxb1-eMpAljFRXMabIdgOaI8W_7PLEq923g9_DQbkMI" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-8 flex flex-col justify-end">
                <span className="text-[#ffdbca] font-bold text-xs tracking-widest uppercase mb-2">비즈니스 특별 서비스</span>
                <h4 className="text-2xl font-bold text-white mb-2">비즈니스 미팅을 위한 프리미엄 버스</h4>
                <p className="text-white/70 text-sm">비즈니스 성공을 위한 최상의 이동 수단</p>
              </div>
            </div>
            {/* Promo 2 */}
            <div className="relative h-64 rounded-3xl overflow-hidden group">
              <img 
                alt="School Trip" 
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuADAP09lj7tbJbdzBC5Sof1AZLHyQ5m7WK8-6RDQXsg4bXfiFfofyhX0RewvidDneDX-9DB6TCIr3cSb0ovtRTGG4GvDssi73B4cnUiknq2rca506lG3O4YaAuXoXFOSK6Zt5-lXqnVbzlxXA8U73BdttYVX9-oJMDFbNW2p59i6q4vwsC95hXiF4k-ppfqDqOhSMjSPGTNUb08rePPhgZVNC4YcuhPd35sKXBCLVfhG6BOj4m-6g7Ef-QfrvrTWEdtoUVmOVGqzYs" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-8 flex flex-col justify-end">
                <span className="text-[#ffdbca] font-bold text-xs tracking-widest uppercase mb-2">안전 제일</span>
                <h4 className="text-2xl font-bold text-white mb-2">학교 행사를 위한 안전한 여정</h4>
                <p className="text-white/70 text-sm">학생들의 안전을 최우선으로 생각합니다</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FAB - Static placement for Web */}
      <button className="fixed bottom-12 right-12 w-14 h-14 bg-[#9d4300] rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all z-50">
        <span className="material-symbols-outlined">add</span>
      </button>
    </div>
  );
};

export default CustomerDashboard;
