import React from 'react';
import { TrendingUp, Users, CheckCircle, Clock } from 'lucide-react';

const Dashboard = () => {
  const kpiCards = [
    { title: '오늘의 견적 요청', value: '142', subtext: '+12% (어제 대비)', icon: <Clock className="text-blue-500" size={24} />, bg: 'bg-blue-50' },
    { title: '진행 중인 입찰', value: '45', subtext: '현재 실시간', icon: <TrendingUp className="text-amber-500" size={24} />, bg: 'bg-amber-50' },
    { title: '확정된 예약', value: '89', subtext: '+5% (어제 대비)', icon: <CheckCircle className="text-emerald-500" size={24} />, bg: 'bg-emerald-50' },
    { title: '신규 승인 대기', value: '24', subtext: '기사 4명 / 일반 20명', icon: <Users className="text-purple-500" size={24} />, bg: 'bg-purple-50' },
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
