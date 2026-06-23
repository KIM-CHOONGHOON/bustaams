import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, CheckCircle, Clock } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({
    auctionRequests: 0,
    activeBids: 0,
    confirmedReservations: 0,
    pendingDrivers: 0
  });

  const [trendData, setTrendData] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // 1. KPI 데이터 조회
        const kpiRes = await fetch('/api/admin/dashboard/kpi');
        if (kpiRes.ok) {
          const kpiData = await kpiRes.json();
          setStats(kpiData);
        }

        // 2. 최근 7일 트렌드 데이터 조회
        const trendRes = await fetch('/api/admin/dashboard/trend');
        if (trendRes.ok) {
          const trendVal = await trendRes.json();
          setTrendData(trendVal);
        }

        // 3. 최근 활동 내역 조회 (실제 여정 목록 상위 5건 활용)
        const tripsRes = await fetch('/api/admin/trips?searchType=all&searchKeyword=');
        if (tripsRes.ok) {
          const tripsData = await tripsRes.json();
          setRecentActivities(tripsData.slice(0, 5));
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const kpiCards = [
    { 
      title: '견적 요청 대기', 
      value: (stats.auctionRequests ?? 0).toString(), 
      subtext: '입찰 대기 중인 신규 요청 건수', 
      icon: <Clock className="text-blue-500" size={24} />, 
      bg: 'bg-blue-50' 
    },
    { 
      title: '진행 중인 입찰', 
      value: (stats.activeBids ?? 0).toString(), 
      subtext: '현재 입찰 참여 중인 요청 건수', 
      icon: <TrendingUp className="text-amber-500" size={24} />, 
      bg: 'bg-amber-50' 
    },
    { 
      title: '확정된 예약', 
      value: (stats.confirmedReservations ?? 0).toString(), 
      subtext: '배차 확정 건수', 
      icon: <CheckCircle className="text-emerald-500" size={24} />, 
      bg: 'bg-emerald-50' 
    },
    { 
      title: '신규 승인 대기', 
      value: (stats.pendingDrivers ?? 0).toString(), 
      subtext: '승인이 필요한 기사님', 
      icon: <Users className="text-purple-500" size={24} />, 
      bg: 'bg-purple-50' 
    },
  ];

  // --- SVG 차트 그리기 헬퍼 ---
  const renderSvgChart = () => {
    if (!trendData || trendData.length === 0) {
      return (
        <div className="text-slate-400 font-bold text-sm">트렌드 데이터가 존재하지 않습니다.</div>
      );
    }

    const width = 500;
    const height = 220;
    const padding = 40;

    // 최대값 계산 (최소 5 이상으로 설정)
    const maxVal = Math.max(
      ...trendData.map(d => Math.max(d.requests ?? 0, d.confirmed ?? 0)),
      5
    );

    // 좌표 매핑
    const getX = (index) => padding + (index * (width - padding * 2)) / (trendData.length - 1);
    const getY = (value) => height - padding - ((value ?? 0) * (height - padding * 2)) / maxVal;

    // SVG Line/Area Path 생성
    let reqLinePath = '';
    let reqAreaPath = '';
    let confLinePath = '';
    let confAreaPath = '';

    trendData.forEach((d, i) => {
      const x = getX(i);
      const yReq = getY(d.requests);
      const yConf = getY(d.confirmed);

      if (i === 0) {
        reqLinePath = `M ${x} ${yReq}`;
        reqAreaPath = `M ${x} ${height - padding} L ${x} ${yReq}`;
        confLinePath = `M ${x} ${yConf}`;
        confAreaPath = `M ${x} ${height - padding} L ${x} ${yConf}`;
      } else {
        reqLinePath += ` L ${x} ${yReq}`;
        reqAreaPath += ` L ${x} ${yReq}`;
        confLinePath += ` L ${x} ${yConf}`;
        confAreaPath += ` L ${x} ${yConf}`;
      }

      if (i === trendData.length - 1) {
        reqAreaPath += ` L ${x} ${height - padding} Z`;
        confAreaPath += ` L ${x} ${height - padding} Z`;
      }
    });

    // 가로 격자선 및 Y축 눈금
    const yTicks = [0, Math.round(maxVal / 2), maxVal];

    return (
      <div className="relative w-full h-[250px] flex items-center justify-center">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          <defs>
            {/* 파란색 그라디언트 (견적 요청) */}
            <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
            {/* 초록색 그라디언트 (배차 확정) */}
            <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* 격자선 */}
          {yTicks.map((val, idx) => {
            const y = getY(val);
            return (
              <g key={idx}>
                <line 
                  x1={padding} 
                  y1={y} 
                  x2={width - padding} 
                  y2={y} 
                  stroke="#f1f5f9" 
                  strokeWidth="1.5" 
                  strokeDasharray="4 4" 
                />
                <text 
                  x={padding - 10} 
                  y={y + 4} 
                  textAnchor="end" 
                  fill="#94a3b8" 
                  className="text-[10px] font-black"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* X축 날짜 텍스트 */}
          {trendData.map((d, i) => {
            const x = getX(i);
            return (
              <text 
                key={i} 
                x={x} 
                y={height - padding + 20} 
                textAnchor="middle" 
                fill="#94a3b8" 
                className="text-[10px] font-bold"
              >
                {d.date}
              </text>
            );
          })}

          {/* 채우기 영역 (Area) */}
          <path d={reqAreaPath} fill="url(#reqGrad)" />
          <path d={confAreaPath} fill="url(#confGrad)" />

          {/* 선 (Line) */}
          <path d={reqLinePath} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d={confLinePath} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* 마우스 호버 감지용 수직 바 및 데이터 점 */}
          {trendData.map((d, i) => {
            const x = getX(i);
            const yReq = getY(d.requests);
            const yConf = getY(d.confirmed);

            return (
              <g 
                key={i}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* 투명 가이드 바 (마우스 감지 영역 넓힘) */}
                <rect 
                  x={x - (width - padding * 2) / (trendData.length - 1) / 2}
                  y={padding}
                  width={(width - padding * 2) / (trendData.length - 1)}
                  height={height - padding * 2}
                  fill="transparent"
                  className="cursor-pointer"
                />

                {/* 활성화된 수직 안내선 */}
                {hoveredIndex === i && (
                  <line 
                    x1={x} 
                    y1={padding} 
                    x2={x} 
                    y2={height - padding} 
                    stroke="#cbd5e1" 
                    strokeWidth="1.5"
                  />
                )}

                {/* 견적 요청 점 */}
                <circle 
                  cx={x} 
                  cy={yReq} 
                  r={hoveredIndex === i ? 6 : 4} 
                  fill="#ffffff" 
                  stroke="#3b82f6" 
                  strokeWidth={hoveredIndex === i ? 3 : 2} 
                />

                {/* 배차 확정 점 */}
                <circle 
                  cx={x} 
                  cy={yConf} 
                  r={hoveredIndex === i ? 6 : 4} 
                  fill="#ffffff" 
                  stroke="#10b981" 
                  strokeWidth={hoveredIndex === i ? 3 : 2} 
                />
              </g>
            );
          })}
        </svg>

        {/* 인터랙티브 툴팁 팝업 */}
        {hoveredIndex !== null && trendData[hoveredIndex] && (
          <div 
            className="absolute bg-slate-900 text-white text-xs rounded-xl p-3 shadow-xl border border-slate-800 space-y-1 z-10 pointer-events-none animate-fade-in"
            style={{
              left: `${getX(hoveredIndex) * 2 - 50}px`,
              top: `20px`
            }}
          >
            <p className="font-black text-slate-300 border-b border-slate-800 pb-1 mb-1 text-center">
              {trendData[hoveredIndex].date}
            </p>
            <p className="flex items-center justify-between gap-3 text-sky-400 font-bold">
              <span>견적 요청:</span>
              <span className="text-white font-extrabold">{trendData[hoveredIndex].requests}건</span>
            </p>
            <p className="flex items-center justify-between gap-3 text-emerald-400 font-bold">
              <span>배차 확정:</span>
              <span className="text-white font-extrabold">{trendData[hoveredIndex].confirmed}건</span>
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">대시보드</h1>
        <p className="text-slate-500 font-medium mt-1.5">시스템의 전반적인 현황을 한눈에 파악하세요.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {kpiCards.map((card, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${card.bg} shrink-0`}>
                {card.icon}
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">{card.title}</p>
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                {loading ? '...' : card.value}
              </h3>
              <p className="text-xs font-semibold text-slate-400 mt-2">{card.subtext}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 min-h-[380px] flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-800">최근 7일간 견적/예약 트렌드</h2>
            <p className="text-xs font-medium text-slate-400 mt-1">일별 신규 견적 요청 수와 배차 확정 수 추이</p>
          </div>
          
          <div className="mt-4 flex-1 flex items-center justify-center">
            {loading ? (
              <div className="flex flex-col items-center gap-2">
                <span className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                <p className="text-xs font-semibold text-slate-400">데이터를 로드하고 있습니다...</p>
              </div>
            ) : (
              renderSvgChart()
            )}
          </div>

          <div className="flex justify-center gap-6 mt-4 text-xs font-bold border-t border-slate-50 pt-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-1.5 rounded-full bg-blue-500 inline-block"></span>
              <span className="text-slate-500">견적 요청</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
              <span className="text-slate-500">배차 확정</span>
            </div>
          </div>
        </div>
        
        {/* Right: Recent Activities */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
          <div>
            <h2 className="text-lg font-black text-slate-800">최근 활동 내역</h2>
            <p className="text-xs font-medium text-slate-400 mt-1">시스템에 접수된 최신 견적 및 배차 건</p>
          </div>
          
          <div className="space-y-5 mt-6 flex-1">
            {loading ? (
              <div className="flex justify-center items-center h-full text-slate-400 text-xs">
                불러오는 중...
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="text-slate-400 text-sm font-medium text-center py-16">
                최근 활동 내역이 없습니다.
              </div>
            ) : (
              recentActivities.map((act) => (
                <div key={act.reqId} className="flex gap-3 items-start border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <span className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${
                    act.dataStat === 'CONFIRM' ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold text-slate-700 truncate">
                      {act.dataStat === 'CONFIRM' ? '배차 완료됨' : '신규 견적 요청 접수'}
                    </p>
                    <p className="text-sm font-black text-slate-800 mt-0.5 truncate">{act.tripTitle}</p>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5 font-bold">
                      <span className="truncate">{act.travelerName || '일반 고객'}</span>
                      <span>{act.regDt?.substring(5, 16)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
