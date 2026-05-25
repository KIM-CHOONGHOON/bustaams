import React, { useState } from 'react';
import { X, Play, RefreshCw, AlertCircle, FileText, CheckCircle, Clock, Database, CalendarClock, ListChecks, History, FileSearch, RotateCcw, Bell, Lock, ChevronLeft } from 'lucide-react';

const BatchDashBoardModal = ({ isOpen, onClose }) => {
  // 현재 활성화된 뷰 상태: 'home' | 각 메뉴 ID
  const [activeView, setActiveView] = useState('home');

  const [logs, setLogs] = useState([
    { time: '2026-05-20 18:00:00', text: '[SYSTEM] Scheduler active.' },
    { time: '2026-05-20 18:00:02', text: '[JOB_DONE_TOUR] Starting DONE status batch...' },
    { time: '2026-05-20 18:00:05', text: '[JOB_DONE_TOUR] Success. 12 reservation items updated.' },
  ]);
  const [isExecuting, setIsExecuting] = useState(null);

  // Mock batch jobs database
  const [jobs, setJobs] = useState([
    { id: 'JOB_DONE_TOUR', name: '여행 종료 처리 배치', cycle: 'DAILY', status: 'SUCCESS', lastRun: '2026-05-20 18:00:00' },
    { id: 'JOB_TAX_SEND', name: '국세청 세금계산서 전송 배치', cycle: 'MONTHLY', status: 'FAILED', lastRun: '2026-05-20 09:00:00', error: 'API Timeout from NTS Server' },
    { id: 'JOB_CARD_PAY', name: '월 정기 기사 회원 결제 배치', cycle: 'MONTHLY', status: 'SUCCESS', lastRun: '2026-05-15 10:00:00' },
    { id: 'JOB_PUSH_ERR', name: '결제 오류 PUSH 발송 배치', cycle: 'DAILY', status: 'SUCCESS', lastRun: '2026-05-20 10:05:00' },
  ]);

  if (!isOpen) return null;

  const handleRunJob = (jobId) => {
    setIsExecuting(jobId);
    setLogs(prev => [...prev, { time: new Date().toISOString().replace('T', ' ').substring(0, 19), text: `[${jobId}] Manual trigger requested.` }]);
    
    setTimeout(() => {
      setJobs(prev => prev.map(job => {
        if (job.id === jobId) {
          return { ...job, status: 'SUCCESS', lastRun: new Date().toISOString().replace('T', ' ').substring(0, 19), error: undefined };
        }
        return job;
      }));
      setLogs(prev => [...prev, { time: new Date().toISOString().replace('T', ' ').substring(0, 19), text: `[${jobId}] Execution finished successfully.` }]);
      setIsExecuting(null);
      alert(`${jobId} 배치가 성공적으로 실행 완료되었습니다.`);
    }, 2000);
  };

  const handleForceUnlock = () => {
    setLogs(prev => [...prev, { time: new Date().toISOString().replace('T', ' ').substring(0, 19), text: '[SYSTEM] Force unlock command sent to lock manager.' }]);
    alert('모든 배치 잠금(Lock)을 강제 해제했습니다.');
  };

  // ─── 배치 기본 정보 관리 메뉴 정의 ─────────────────────────
  const basicMenuItems = [
    { id: 'master', label: '배치 작업 마스터 관리', desc: 'TB_BATCH_JOB_MST 등록/수정/조회', icon: <Database size={24} />, color: 'bg-blue-500' },
    { id: 'schedule', label: '배치 스케줄 관리', desc: 'TB_BATCH_SCHED 등록/변경/조회', icon: <CalendarClock size={24} />, color: 'bg-indigo-500' },
  ];

  // ─── 배치 실행 및 결과 관리 메뉴 정의 ─────────────────────────
  const execMenuItems = [
    { id: 'plan', label: '배치 수행 계획 관리', desc: 'TB_BATCH_PLAN 자동/수동 계획 조회', icon: <ListChecks size={24} />, color: 'bg-emerald-500' },
    { id: 'history', label: '배치 실행 이력 조회', desc: 'TB_BATCH_HIST 실행 결과/상태', icon: <History size={24} />, color: 'bg-teal-500' },
    { id: 'detail', label: '배치 처리 상세 조회', desc: 'TB_BATCH_DTL 건별 처리 결과', icon: <FileSearch size={24} />, color: 'bg-cyan-500' },
    { id: 'retry', label: '배치 재실행 요청 관리', desc: 'TB_BATCH_RETRY_REQ 요청/승인', icon: <RotateCcw size={24} />, color: 'bg-amber-500' },
    { id: 'notification', label: '배치 알림 이력 조회', desc: 'TB_BATCH_NOTI_HIST 발송 이력', icon: <Bell size={24} />, color: 'bg-violet-500' },
    { id: 'lock', label: '배치 실행 잠금 관리', desc: 'TB_BATCH_LOCK 잠금/강제 해제', icon: <Lock size={24} />, color: 'bg-rose-500' },
  ];

  // ─── 서브 뷰 타이틀 매핑 ─────────────────────────
  const getViewTitle = () => {
    const all = [...basicMenuItems, ...execMenuItems];
    const found = all.find(m => m.id === activeView);
    return found ? found.label : 'BATCH JOB 모니터링';
  };

  // ─── 서브 뷰 Placeholder 렌더링 ─────────────────────────
  const renderSubView = () => {
    const all = [...basicMenuItems, ...execMenuItems];
    const found = all.find(m => m.id === activeView);
    if (!found) return null;

    return (
      <div className="flex-1 flex flex-col p-8 overflow-y-auto space-y-6">
        {/* 뒤로가기 */}
        <button
          onClick={() => setActiveView('home')}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors w-fit"
        >
          <ChevronLeft size={16} />
          대시보드로 돌아가기
        </button>

        {/* 서브 뷰 헤더 */}
        <div className="flex items-center gap-4">
          <div className={`p-3 ${found.color} text-white rounded-xl`}>
            {found.icon}
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">{found.label}</h3>
            <p className="text-sm text-slate-500 font-medium">{found.desc}</p>
          </div>
        </div>

        {/* Placeholder 콘텐츠 */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center min-h-[300px]">
          <div className="text-center space-y-3">
            <div className={`w-16 h-16 mx-auto ${found.color}/10 rounded-2xl flex items-center justify-center`}>
              <span className="text-3xl">🚧</span>
            </div>
            <h4 className="text-lg font-bold text-slate-700">{found.label} 화면</h4>
            <p className="text-sm text-slate-400 max-w-sm">
              해당 관리 화면은 백엔드 API 개발 완료 후 연동될 예정입니다.
            </p>
            <p className="text-xs text-slate-300 font-mono">{found.desc}</p>
          </div>
        </div>
      </div>
    );
  };

  // ─── Home 대시보드 (메뉴 버튼 + 모니터링) 렌더링 ─────────────────────────
  const renderHome = () => (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto space-y-6">

      {/* ── 배치 기본 정보 관리 그룹 ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1.5 h-5 bg-blue-500 rounded-full"></span>
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">배치 기본 정보 관리</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {basicMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all flex items-center gap-4 text-left group"
            >
              <div className={`p-3 ${item.color} text-white rounded-xl shrink-0 group-hover:scale-110 transition-transform`}>
                {item.icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{item.label}</p>
                <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── 배치 실행 및 결과 관리 그룹 ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1.5 h-5 bg-emerald-500 rounded-full"></span>
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">배치 실행 및 결과 관리</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {execMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all flex items-center gap-4 text-left group"
            >
              <div className={`p-3 ${item.color} text-white rounded-xl shrink-0 group-hover:scale-110 transition-transform`}>
                {item.icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">{item.label}</p>
                <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── 실시간 모니터링 요약 ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1.5 h-5 bg-slate-800 rounded-full"></span>
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">실시간 모니터링</h3>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-500 rounded-xl"><FileText size={20} /></div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">전체 배치</p>
              <p className="text-2xl font-black text-slate-800">{jobs.length}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-500 rounded-xl"><Clock size={20} /></div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">대기/실행 중</p>
              <p className="text-2xl font-black text-slate-800">{isExecuting ? 1 : 0}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl"><CheckCircle size={20} /></div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">성공</p>
              <p className="text-2xl font-black text-slate-800">{jobs.filter(j => j.status === 'SUCCESS').length}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-rose-50 text-rose-500 rounded-xl"><AlertCircle size={20} /></div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">실패</p>
              <p className="text-2xl font-black text-slate-800">{jobs.filter(j => j.status === 'FAILED').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Jobs Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">배치 등록 목록 및 상태</h3>
          <div className="flex gap-2">
            <button 
              onClick={handleForceUnlock}
              className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5"
            >
              <RefreshCw size={13} />
              강제 락 해제 (Force Unlock)
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                <th className="px-6 py-3">배치 작업 ID</th>
                <th className="px-6 py-3">배치 작업명</th>
                <th className="px-6 py-3">주기</th>
                <th className="px-6 py-3">최종 실행시각</th>
                <th className="px-6 py-3">상태</th>
                <th className="px-6 py-3 text-right">제어</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-mono text-xs text-slate-600">{job.id}</td>
                  <td className="px-6 py-4 text-slate-800">{job.name}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-semibold">{job.cycle}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-mono text-xs">{job.lastRun}</td>
                  <td className="px-6 py-4">
                    {job.status === 'SUCCESS' ? (
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold flex items-center gap-1 w-fit">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>성공
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-bold flex items-center gap-1 w-fit cursor-help" title={job.error}>
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>실패
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleRunJob(job.id)}
                      disabled={isExecuting !== null}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 ${
                        isExecuting === job.id
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-md'
                      }`}
                    >
                      {isExecuting === job.id ? (
                        <>
                          <span className="w-3 h-3 border-2 border-amber-700 border-t-transparent rounded-full animate-spin"></span>
                          실행 중
                        </>
                      ) : (
                        <>
                          <Play size={12} fill="white" />
                          수동 구동
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Terminal Console log view */}
      <div className="bg-slate-900 rounded-2xl shadow-inner border border-slate-950 p-6 flex flex-col h-48">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
          <span className="text-xs font-mono font-bold text-slate-400 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            실시간 배치 콘솔 로그 (Live Console Logs)
          </span>
          <button 
            onClick={() => setLogs([])}
            className="text-xs text-slate-500 hover:text-slate-300 font-semibold"
          >
            Clear logs
          </button>
        </div>
        <div className="flex-1 overflow-y-auto font-mono text-xs text-emerald-400 space-y-1">
          {logs.length === 0 ? (
            <span className="text-slate-600 italic">No logs generated.</span>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="text-slate-600 shrink-0">[{log.time}]</span>
                <span className="break-all">{log.text}</span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );

  return (
    <div 
      id="BatchDashBoard" 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden transform transition-all scale-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 bg-slate-950 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
              <FileText size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                {activeView === 'home' ? 'BATCH JOB 모니터링' : getViewTitle()}
              </h2>
              <p className="text-xs text-slate-400 font-medium">관리자 배치 작업 관리 대시보드</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden min-h-0 bg-slate-50">
          {activeView === 'home' ? renderHome() : renderSubView()}
        </div>

      </div>
    </div>
  );
};

export default BatchDashBoardModal;
