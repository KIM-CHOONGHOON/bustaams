import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, CheckCircle, Clock } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({
    todayRequests: 0,
    activeBids: 0,
    confirmedReservations: 0,
    pendingDrivers: 0
  });

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        const response = await fetch('/api/admin/dashboard/kpi');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch KPIs:', error);
      }
    };
    fetchKPIs();
  }, []);

  const kpiCards = [
    { title: '오늘의 견적 요청', value: stats.todayRequests.toString(), subtext: '오늘 등록된 요청 건수', icon: <Clock className="text-blue-500" size={24} />, bg: 'bg-blue-50' },
    { title: '진행 중인 입찰', value: stats.activeBids.toString(), subtext: '현재 입찰 참여 중인 버스', icon: <TrendingUp className="text-amber-500" size={24} />, bg: 'bg-amber-50' },
    { title: '확정된 예약', value: stats.confirmedReservations.toString(), subtext: '결제/배차 확정 건수', icon: <CheckCircle className="text-emerald-500" size={24} />, bg: 'bg-emerald-50' },
    { title: '신규 승인 대기', value: stats.pendingDrivers.toString(), subtext: '승인이 필요한 기사님', icon: <Users className="text-purple-500" size={24} />, bg: 'bg-purple-50' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-800">대시보드</h1>
        <p className="text-slate-500 font-medium mt-1">시스템의 전반적인 현황을 한눈에 파악하세요.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {kpiCards.map((card, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${card.bg}`}>
                {card.icon}
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 mb-1">{card.title}</p>
              <h3 className="text-3xl font-black text-slate-800">{card.value}</h3>
              <p className="text-xs font-medium text-slate-400 mt-2">{card.subtext}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 min-h-[400px]">
          <h2 className="text-lg font-bold text-slate-800 mb-4">최근 7일간 견적/예약 트렌드</h2>
          <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-xl border border-slate-100 border-dashed">
            <p className="text-slate-400 font-medium">실제 차트 라이브러리(Recharts)가 연동될 영역입니다.</p>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">최근 활동 내역</h2>
          <div className="space-y-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="w-2 h-2 mt-2 rounded-full bg-emerald-500 shrink-0"></div>
                <div>
                  <p className="text-sm font-bold text-slate-700">신규 견적 요청 접수 (REQ-00{i})</p>
                  <p className="text-xs text-slate-500 mt-1">서울 ↔ 부산 왕복 / 45인승</p>
                  <p className="text-[10px] text-slate-400 mt-1">{i * 10}분 전</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
