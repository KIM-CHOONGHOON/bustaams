import React, { useState, useEffect } from 'react';
import { Plus, Search, ChevronDown, Play, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

const BatchTaskList = ({ onBack, onRegister }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await fetch('/api/admin/batch/list');
        if (res.ok) {
          const data = await res.json();
          setTasks(data);
        }
      } catch (err) {
        console.error('Failed to fetch batch tasks', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);
  return (
    <div className="w-full h-full flex flex-col p-8 text-slate-800 bg-slate-50 overflow-y-auto">
      {/* Back Button */}
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors w-fit mb-6"
        >
          <ChevronLeft size={16} />
          대시보드로 돌아가기
        </button>

        {/* Page Header Section */}
        <div className="flex justify-between items-end mb-8 shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">배치 작업 목록</h1>
            <p className="text-sm text-slate-500">시스템에서 실행 중인 모든 배치 프로세스를 관리하고 모니터링합니다.</p>
          </div>
          <button 
            onClick={onRegister}
            className="flex items-center gap-2 px-6 py-3 bg-blue-800 text-white rounded-lg font-bold text-sm hover:shadow-lg transition-all active:scale-95"
          >
            <Plus size={18} />
            배치 신규 등록
          </button>
        </div>

      {/* Filter Section */}
      <section className="bg-white/80 backdrop-blur-md border border-slate-200 p-6 rounded-xl mb-8 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6 shrink-0">
        <div className="md:col-span-7">
          <label className="block text-xs font-bold text-slate-700 mb-2">배치 작업 검색</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-blue-800 transition-all text-sm outline-none"
              placeholder="작업 ID 또는 작업명을 입력하세요..."
              type="text"
            />
          </div>
        </div>
        <div className="md:col-span-3">
          <label className="block text-xs font-bold text-slate-700 mb-2">실행 주기 필터</label>
          <div className="relative">
            <select className="w-full appearance-none pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-blue-800 transition-all text-sm outline-none cursor-pointer">
              <option>전체</option>
              <option>매일 (DAILY)</option>
              <option>매주 (WEEKLY)</option>
              <option>매월 (MONTHLY)</option>
              <option>수시 (ON_DEMAND)</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
          </div>
        </div>
        <div className="md:col-span-2 flex items-end">
          <button className="w-full py-2 px-4 bg-slate-100 text-blue-800 font-bold text-sm rounded-lg border border-blue-800/20 hover:bg-slate-200 transition-all">
            필터 초기화
          </button>
        </div>
      </section>

      {/* Table Section */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-xl overflow-hidden shadow-sm shrink-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">배치작업 ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">배치작업명</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">실행주기</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">사용여부</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">상태</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-slate-500">로딩 중...</td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-slate-500">등록된 배치 작업이 없습니다.</td>
                </tr>
              ) : (
                tasks.map(task => (
                  <tr key={task.jobId} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-5 font-mono text-sm text-blue-800 font-medium">{task.jobId}</td>
                    <td className="px-6 py-5">
                      <p className="text-sm font-medium text-slate-800">{task.jobName}</p>
                      <p className="text-[11px] text-slate-400">
                        스케줄: {task.execTime} (기준: {task.calcRule}, 휴일: {task.holidayRule})
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-sm text-slate-500">{task.execCycle}</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      {task.useYn === 'Y' ? (
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-full">사용중</span>
                      ) : (
                        <span className="px-3 py-1 bg-slate-200 text-slate-500 text-xs font-bold rounded-full">미사용</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${task.useYn === 'Y' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                        <span className={`text-sm font-medium ${task.useYn === 'Y' ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {task.useYn === 'Y' ? '정상' : '대기'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 hover:bg-slate-200 rounded text-slate-500 transition-colors" title="실행">
                          <Play size={18} />
                        </button>
                        <button className="p-2 hover:bg-slate-200 rounded text-slate-500 transition-colors" title="수정">
                          <Edit size={18} />
                        </button>
                        <button className="p-2 hover:bg-red-50 hover:text-red-600 rounded text-slate-500 transition-colors" title="삭제">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="px-6 py-4 flex items-center justify-between bg-white border-t border-slate-200">
          <p className="text-sm text-slate-500">총 3개의 작업 중 1-3 표시</p>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 disabled:opacity-30" disabled>
              <ChevronLeft size={18} />
            </button>
            <button className="w-8 h-8 rounded-lg bg-blue-800 text-white text-xs font-bold flex items-center justify-center">1</button>
            <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-400">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 shrink-0 pb-8">
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-xl border border-slate-200 border-l-4 border-l-emerald-500 shadow-sm">
          <p className="text-xs font-bold text-slate-500 mb-1">정상 작동 중</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-slate-800">2</span>
            <span className="text-sm text-emerald-700 mb-1">성공률 100%</span>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-xl border border-slate-200 border-l-4 border-l-blue-800 shadow-sm">
          <p className="text-xs font-bold text-slate-500 mb-1">예약된 작업</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-slate-800">12</span>
            <span className="text-sm text-blue-800 mb-1">다음 24시간 이내</span>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-xl border border-slate-200 border-l-4 border-l-red-600 shadow-sm">
          <p className="text-xs font-bold text-slate-500 mb-1">실패 알림</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-red-600">0</span>
            <span className="text-sm text-slate-400 mb-1">최근 7일간</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchTaskList;
