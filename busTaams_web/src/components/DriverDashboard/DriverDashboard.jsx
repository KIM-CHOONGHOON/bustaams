import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';

// ─────────────── SideNavBar ───────────────
function SideNavBar({ driver, onLogout, activeMenu, setActiveMenu }) {
  const navItems = [
    { key: 'dashboard', icon: 'directions_bus', label: '메인 플릿' },
    { key: 'auction',   icon: 'gavel',          label: '실시간 입찰' },
    { key: 'schedule',  icon: 'event_available', label: '운행 일정' },
    { key: 'payment',   icon: 'payments',        label: '결제 내역' },
    { key: 'cert',      icon: 'verified_user',   label: '인증 정보' },
    { key: 'settings',  icon: 'settings',        label: '설정' },
  ];

  return (
    <aside className="hidden md:flex flex-col p-6 gap-4 h-screen w-72 sticky left-0 top-0 bg-slate-100/50 transition-all duration-300 ease-out text-sm font-semibold"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Brand */}
      <div className="mb-8 px-2">
        <span className="text-2xl font-bold italic text-teal-800">busTaams</span>
      </div>

      {/* Driver Profile */}
      <div className="flex items-center gap-4 mb-8 p-3 bg-white rounded-2xl shadow-[0_40px_60px_-15px_rgba(0,104,95,0.06)]">
        <img
          alt="드라이버 프로필 사진"
          className="w-12 h-12 rounded-full object-cover"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCfHq5nUEawxkFp_KpjVVL2R4S3Adj9siu6OQkocMqSWdNszV5zcW6_0-ruqFi3VMVcieh5pnz1QlWcbF77sQtKnZfyd4KVxCPumy4gHm7RANeM9EZ0H1CfeL308mTBXctIff-ktR7WDsQEgNUwcVdhQkQJP6EqpF1GcFKglDXYn_yN3hcc2dn9_z4jFI3XCz4uaaFjl7wxJlXvrrFW6ajJcsgOLCIHgb2_9VKU8MXuGxpiGu0QyPbTx1NXVVyAk3eX_sj_iLLZiWY"
        />
        <div>
          <p className="text-on-surface font-bold">{driver?.name || '프리미엄 캡틴'}</p>
          <p className="text-xs text-slate-500">인증된 멤버</p>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map(item => (
          <a
            key={item.key}
            href="#"
            onClick={e => { e.preventDefault(); setActiveMenu(item.key); }}
            className={`flex items-center gap-3 p-3 rounded-xl transition-transform duration-200 ${
              activeMenu === item.key
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-500 hover:translate-x-1 hover:bg-teal-50/50'
            }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      {/* 신규 버스 등록 */}
      <button className="mt-4 mb-8 bg-gradient-to-br from-primary to-primary-container text-white py-4 rounded-full font-bold shadow-lg active:scale-95 transition-all">
        신규 버스 등록
      </button>

      {/* Bottom Links */}
      <div className="mt-auto border-t border-slate-200/50 pt-4 flex flex-col gap-1">
        <a href="#" className="flex items-center gap-3 p-3 text-slate-500 hover:text-teal-600 transition-colors">
          <span className="material-symbols-outlined">help_outline</span>
          <span>고객지원</span>
        </a>
        <a href="#" onClick={e => { e.preventDefault(); onLogout(); }}
          className="flex items-center gap-3 p-3 text-slate-500 hover:text-error transition-colors"
        >
          <span className="material-symbols-outlined">logout</span>
          <span>로그아웃</span>
        </a>
      </div>
    </aside>
  );
}

// ─────────────── EarningsSection ───────────────
function EarningsSection({ stats }) {
  return (
    <section className="grid grid-cols-12 gap-8 items-start">
      <div className="col-span-12 lg:col-span-4 space-y-4">
        <h2 className="text-4xl font-extrabold tracking-tighter text-on-surface leading-none">
          오늘의 성과<span className="text-primary">.</span>
        </h2>
        <p className="text-slate-500 max-w-xs">실시간 입찰 현황과 수익 지표를 한눈에 확인하고 비즈니스를 관리하세요.</p>
      </div>
      <div className="col-span-12 lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 총 수익 카드 */}
        <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-[0_40px_60px_-15px_rgba(0,104,95,0.06)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">총 수익</p>
          <h3 className="text-3xl font-bold text-on-surface">
            {stats?.totalRevenue ? `₩${stats.totalRevenue.toLocaleString()}` : '₩1,240,000'}
          </h3>
          <div className="mt-4 flex items-center gap-2 text-primary font-bold">
            <span className="material-symbols-outlined">trending_up</span>
            <span>지난주 대비 {stats?.revenueGrowth || 12}% 상승</span>
          </div>
        </div>
        {/* 활성 입찰 카드 */}
        <div className="bg-primary text-white rounded-2xl p-8 shadow-[0_40px_60px_-15px_rgba(0,104,95,0.06)] flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-primary-fixed/60 text-sm font-bold uppercase tracking-widest">활성 입찰</p>
              <h3 className="text-4xl font-bold">{String(stats?.activeBids || 8).padStart(2, '0')}</h3>
            </div>
            <span className="material-symbols-outlined text-4xl opacity-20">gavel</span>
          </div>
          <div className="h-1 w-full bg-white/20 rounded-full mt-6 overflow-hidden">
            <div className="h-full bg-white" style={{ width: `${Math.min(((stats?.activeBids || 8) / 12) * 100, 100)}%` }}></div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────── QuickMenu ───────────────
/** 바로가기: `기사정보등록_기사 화면.md` — 「기사 정보」→ DriverProfileSetup (`driverView === 'profileSetup'`) */
function QuickMenu({ onProfileSetup, onBusInfoSetup, onQuotationList }) {
  const menus = [
    { key: 'driverProfile', icon: 'person',                  label: '기사 정보',  accent: false },
    { key: 'busInfo',       icon: 'directions_bus',          label: '버스 정보',  accent: false },
    { key: 'quotation',     icon: 'request_quote',           label: '여행자 견적 목록', accent: false },
    { key: null,            icon: 'event_note',              label: '예정 리스트', accent: true  },
    { key: null,            icon: 'pending_actions',         label: '보류 리스트', accent: false },
    { key: null,            icon: 'task_alt',                label: '완료 리스트', accent: false },
    { key: null,            icon: 'cancel',                  label: '거절 리스트', accent: false },
    { key: null,            icon: 'forum',                   label: '실시간 채팅', accent: false },
    { key: null,            icon: 'account_balance_wallet',  label: '정산 관리',  accent: false },
    { key: null,            icon: 'loyalty',                 label: '요금제 선택', accent: false },
  ];

  const handleQuickAction = (key) => {
    if (key === 'driverProfile') {
      onProfileSetup?.();
      return;
    }
    if (key === 'busInfo') {
      onBusInfoSetup?.();
      return;
    }
    if (key === 'quotation') {
      onQuotationList?.();
      return;
    }
  };

  return (
    <section className="space-y-6">
      <h3 className="text-xl font-bold text-on-surface ml-2">바로가기 메뉴</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {menus.map((m, i) => (
          <button
            key={m.key || `menu-${i}`}
            type="button"
            aria-label={m.label}
            onClick={() => handleQuickAction(m.key)}
            className={`flex flex-col items-center justify-center gap-3 p-6 bg-surface-container-lowest rounded-2xl hover:bg-teal-50/50 transition-all group shadow-sm ${
              m.accent ? 'border-l-4 border-secondary' : ''
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
              m.accent
                ? 'bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-white'
                : 'bg-slate-100 group-hover:bg-primary group-hover:text-white'
            }`}>
              <span className="material-symbols-outlined">{m.icon}</span>
            </div>
            <span className="text-xs font-bold text-slate-600">{m.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

// ─────────────── TodaySchedule ───────────────
function TodaySchedule({ schedule }) {
  const item = schedule?.[0];
  return (
    <div className="lg:col-span-1 space-y-6">
      <div className="flex justify-between items-end">
        <h3 className="text-xl font-bold text-on-surface">오늘의 일정</h3>
        <a href="#" className="text-xs font-bold text-primary">전체보기</a>
      </div>
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_40px_60px_-15px_rgba(0,104,95,0.06)] border-l-4 border-secondary">
        <div className="flex items-center justify-between mb-4">
          <span className="px-3 py-1 bg-secondary-container text-on-secondary-container text-[10px] font-bold rounded-full uppercase">운행 예정</span>
          <span className="text-xs font-bold text-slate-400">{item?.time || '오후 02:30'}</span>
        </div>
        <h4 className="text-lg font-bold mb-2">{item?.route || '서울 ↔ 부산 정기 운행'}</h4>
        <div className="space-y-3 mt-4">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span className="material-symbols-outlined text-sm">location_on</span>
            <span>{item?.departure || '서울 고속버스터미널'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span className="material-symbols-outlined text-sm">airport_shuttle</span>
            <span>{item?.bus || '프리미엄 45인승 (가-1234)'}</span>
          </div>
        </div>
        <button className="w-full mt-6 py-3 bg-surface-container-high rounded-xl text-sm font-bold hover:bg-surface-container-highest transition-colors">
          운행 시작하기
        </button>
      </div>
    </div>
  );
}

// ─────────────── AuctionList ───────────────
function AuctionList({ auctions }) {
  const defaultAuctions = [
    {
      id: 1,
      badge: '실시간 경매',
      badgeColor: 'secondary',
      title: '인천 공항 ↔ 평창 리조트',
      desc: '외국인 관광객 20명 단체 투어 | 2024/05/20',
      price: 850000,
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAPCo3FlmpLIkM1Tvpv4eSchT7zh4qqrE2cyPCk4IsMOPF79k9iZN4lk3JalVszxDUvjY6Fe568ijY3addlL22HaDI4MtQAbkejaFQegtF3zqaSHXF0GS742WdEKbQDU5a8VHbgoeCYS4dHw-W80x_X5RgEXCwQFBhBxRjOItWCVTrFe_pQDQV5xXQnX7xKmGCcpsOVVibvXmP--3XBfvu0ApPUBGVSo37fJtcx3LX6rYK83kyqv0dEBB0q5aANhW8t2iQrOizyKpY',
    },
    {
      id: 2,
      badge: '마감 임박',
      badgeColor: 'primary',
      title: '판교 IT 밸리 ↔ 워크샵 이동',
      desc: '기업 임직원 40명 | 2024/05/22',
      price: 1100000,
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBHJiOxXQAns6r72uoiVdzEUkAJpuGd-1y990p6-QXIrHa9A2SrDE3PqoSJbUcGwZdfw9uwIdXaKkO3h9gBnnVMxjI6q7dvmfIWJvwSteB96r-lDn8AAOhJIcz9ROk_DUyZvPR-tXIxuQbNqaFWHtmYGhtbWSk2V5w_gVhL6jdGDt9n0h3oNyUAgBuxocew8CJqrf5V9wh05d9oBUY4gTBViC8HbVyoBjQwmHHLXBOzVucz7tKyFAOPChkfhuwZ1HA4eC5dctsFjLY',
    },
  ];

  const list = auctions?.length ? auctions : defaultAuctions;

  return (
    <div className="lg:col-span-2 space-y-6">
      <div className="flex justify-between items-end">
        <h3 className="text-xl font-bold text-on-surface">실시간 입찰 기회</h3>
        <div className="flex gap-2">
          <button className="p-1 text-slate-400 hover:text-primary">
            <span className="material-symbols-outlined">filter_list</span>
          </button>
        </div>
      </div>
      <div className="space-y-4">
        {list.map(item => (
          <div key={item.id} className="bg-white rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-center shadow-[0_40px_60px_-15px_rgba(0,104,95,0.06)] relative group overflow-hidden">
            <div className="w-full md:w-32 h-24 rounded-xl overflow-hidden bg-slate-100 shrink-0">
              <img className="w-full h-full object-cover" src={item.img} alt={item.title} />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 bg-${item.badgeColor} rounded-full`}></span>
                <span className={`text-[10px] font-extrabold text-${item.badgeColor} tracking-tighter uppercase`}>{item.badge}</span>
              </div>
              <h4 className="text-lg font-bold">{item.title}</h4>
              <p className="text-sm text-slate-400">{item.desc}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-slate-400 font-bold mb-1">현재 최고가</p>
              <p className="text-xl font-black text-on-surface">₩{item.price.toLocaleString()}</p>
              <button className="mt-2 bg-primary text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-primary-container transition-all">
                입찰 참여
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────── Main DriverDashboard ───────────────
const DriverDashboard = ({ currentUser, onLogout, onProfileSetup, onBusInfoSetup, onQuotationList }) => {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [auctions, setAuctions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uuid) return;

    const fetchAll = async () => {
      try {
        const headers = { 'Content-Type': 'application/json' };

        const [statsRes, scheduleRes, auctionsRes] = await Promise.allSettled([
          fetch(`${API_BASE}/api/driver/dashboard?uuid=${currentUser.uuid}`, { headers }),
          fetch(`${API_BASE}/api/driver/schedule/today?uuid=${currentUser.uuid}`, { headers }),
          fetch(`${API_BASE}/api/driver/auctions`, { headers }),
        ]);

        if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
          const d = await statsRes.value.json(); setStats(d);
        }
        if (scheduleRes.status === 'fulfilled' && scheduleRes.value.ok) {
          const d = await scheduleRes.value.json(); setSchedule(d);
        }
        if (auctionsRes.status === 'fulfilled' && auctionsRes.value.ok) {
          const d = await auctionsRes.value.json(); setAuctions(d);
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [currentUser]);

  return (
    <div className="bg-background text-on-background min-h-screen flex">
      {/* SideNav */}
      <SideNavBar
        driver={currentUser}
        onLogout={onLogout}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
      />

      <main className="flex-1 min-h-screen relative overflow-x-hidden">
        <div className="px-12 pb-12 pt-8 max-w-7xl mx-auto space-y-12">
          {/* Earnings */}
          <EarningsSection stats={stats} />

          {/* Quick Menu */}
          <QuickMenu
            onProfileSetup={onProfileSetup}
            onBusInfoSetup={onBusInfoSetup}
            onQuotationList={onQuotationList}
          />

          {/* Schedule + Auctions */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <TodaySchedule schedule={schedule} />
            <AuctionList auctions={auctions} />
          </section>
        </div>
      </main>

      {/* Floating FAB */}
      <div className="fixed bottom-8 right-8 z-50">
        <button className="w-16 h-16 bg-gradient-to-br from-secondary to-secondary-container text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform">
          <span className="material-symbols-outlined text-3xl">add</span>
        </button>
      </div>
    </div>
  );
};

export default DriverDashboard;
