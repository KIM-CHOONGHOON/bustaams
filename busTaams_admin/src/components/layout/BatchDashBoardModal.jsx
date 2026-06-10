import React, { useState, useEffect } from 'react';
import { X, Play, RefreshCw, AlertCircle, FileText, CheckCircle, Clock, Database, CalendarClock, ListChecks, History, FileSearch, RotateCcw, Bell, Lock, ChevronLeft } from 'lucide-react';
import BatchTaskList from './BatchTaskList';
import ScheduleForm from '../../batchScheduleManagement/frontend/ScheduleForm';
import NewBatchRegistration from './NewBatchRegistration';

const BatchDashBoardModal = ({ isOpen, onClose }) => {
  const [activeView, setActiveView] = useState('home');
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({ total: 0, running: 0, success: 0, fail: 0 });
  const [logs, setLogs] = useState([]);
  const [isExecuting, setIsExecuting] = useState(null);
  const [scheduleList, setScheduleList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [jobToEdit, setJobToEdit] = useState(null);

  // Sub-view states
  const [subData, setSubData] = useState([]);
  const [subLoading, setSubLoading] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const statsRes = await fetch('/api/admin/batch/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      const listRes = await fetch('/api/admin/batch/list');
      if (listRes.ok) {
        const listData = await listRes.json();
        setJobs(listData.map(item => ({
          id: item.jobId,
          name: item.jobName,
          cycle: item.execCycle,
          status: item.lastStatus || 'SUCCESS', // Fallback to success if not run
          lastRun: item.lastRunTime || '-',
          error: item.lastError
        })));
      }
    } catch (error) {
      console.error('Failed to fetch batch dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubViewData = async () => {
    if (activeView === 'home' || activeView === 'master' || activeView === 'register') return;
    setSubLoading(true);
    try {
      let url = '';
      if (activeView === 'schedule') url = '/api/admin/batch/schedules';
      else if (activeView === 'plan') url = '/api/admin/batch/plans';
      else if (activeView === 'history') url = '/api/admin/batch/histories';
      else if (activeView === 'detail') url = '/api/admin/batch/details';
      else if (activeView === 'retry') url = '/api/admin/batch/retries';
      else if (activeView === 'notification') url = '/api/admin/batch/notifications';
      else if (activeView === 'lock') url = '/api/admin/batch/locks';
      
      if (url) {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setSubData(data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch sub-view data', err);
    } finally {
      setSubLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDashboardData();
      setLogs([
        { time: new Date().toISOString().replace('T', ' ').substring(0, 19), text: '[SYSTEM] Scheduler active and connected.' }
      ]);
    }
  }, [isOpen]);

  useEffect(() => {
    fetchSubViewData();
  }, [activeView]);

  // Fetch existing schedules when schedule view is active
  useEffect(() => {
    if (activeView === 'schedule') {
      fetch('/schedule/inqueryList')
        .then(res => res.json())
        .then(data => setScheduleList(data))
        .catch(err => console.error('Failed to fetch schedules:', err));
    }
  }, [activeView]);

  if (!isOpen) return null;

  const handleRunJob = async (jobId) => {
    setIsExecuting(jobId);
    setLogs(prev => [...prev, { time: new Date().toISOString().replace('T', ' ').substring(0, 19), text: `[${jobId}] Manual trigger requested.` }]);
    
    try {
      const response = await fetch(`/api/admin/batch/run/${jobId}`, {
        method: 'POST'
      });
      if (response.ok) {
        setLogs(prev => [...prev, { time: new Date().toISOString().replace('T', ' ').substring(0, 19), text: `[${jobId}] Trigger request accepted by server.` }]);
        
        // Wait 2.5 seconds to query again to show updated list/stats
        setTimeout(() => {
          fetchDashboardData();
          setLogs(prev => [...prev, { time: new Date().toISOString().replace('T', ' ').substring(0, 19), text: `[${jobId}] Execution logs refreshed.` }]);
          setIsExecuting(null);
          alert(`${jobId} 배치가 성공적으로 실행 요청되었습니다.`);
        }, 2500);
      } else {
        alert('배치 실행 요청에 실패했습니다.');
        setIsExecuting(null);
      }
    } catch (error) {
      console.error(error);
      alert('배치 실행 요청 중 통신 오류가 발생했습니다.');
      setIsExecuting(null);
    }
  };

  const handleForceUnlock = async () => {
    try {
      const res = await fetch('/api/admin/batch/unlock', { method: 'POST' });
      if (res.ok) {
        setLogs(prev => [...prev, { time: new Date().toISOString().replace('T', ' ').substring(0, 19), text: '[SYSTEM] Force unlock command executed successfully.' }]);
        alert('모든 배치 잠금(Lock)을 강제 해제했습니다.');
        fetchDashboardData();
      } else {
        alert('잠금 해제 실패');
      }
    } catch (e) {
      console.error(e);
      alert('잠금 해제 통신 오류');
    }
  };

  // ─── 배치 기본 정보 관리 메뉴 정의 ─────────────────────────
  const basicMenuItems = [
    { id: 'master', label: '배치 작업 목록', desc: 'TB_BATCH_JOB_MST 등록/수정/조회', icon: <Database size={24} />, color: 'bg-blue-500' },
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
    if (activeView === 'register') return '배치 신규 등록';
    const all = [...basicMenuItems, ...execMenuItems];
    const found = all.find(m => m.id === activeView);
    return found ? found.label : 'BATCH JOB 모니터링';
  };

  // ─── 서브 뷰 테이블 렌더러 ─────────────────────────
  const renderTableContent = (viewType) => {
    if (subLoading) {
      return (
        <div className="flex items-center justify-center p-12 text-slate-500 font-medium">
          <span className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-2"></span>
          데이터를 로딩 중입니다...
        </div>
      );
    }
    if (subData.length === 0) {
      return (
        <div className="text-center p-12 text-slate-400 font-medium italic">
          조회된 데이터가 없습니다.
        </div>
      );
    }

    if (viewType === 'schedule') {
      return (
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
              <th className="px-6 py-3">스케줄 ID</th>
              <th className="px-6 py-3">배치 작업명</th>
              <th className="px-6 py-3">수행시간</th>
              <th className="px-6 py-3">수행월/일/요일</th>
              <th className="px-6 py-3">기준일 계산</th>
              <th className="px-6 py-3">휴일 처리</th>
              <th className="px-6 py-3 text-center">사용여부</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {subData.map(item => (
              <tr key={item.SCHED_ID} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 font-mono text-xs text-slate-600">{item.SCHED_ID}</td>
                <td className="px-6 py-4 text-slate-800">{item.jobName || item.BATCH_JOB_ID}</td>
                <td className="px-6 py-4 text-slate-800 font-mono text-xs">{item.EXEC_TIME}</td>
                <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                  {item.EXEC_MONTH} / {item.EXEC_DAY} / {item.EXEC_DOW}
                </td>
                <td className="px-6 py-4 text-slate-600">{item.CALC_RULE}</td>
                <td className="px-6 py-4 text-slate-600">{item.HOLIDAY_RULE}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${item.USE_YN === 'Y' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                    {item.USE_YN === 'Y' ? '사용' : '미사용'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (viewType === 'plan') {
      return (
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
              <th className="px-6 py-3">계획 ID</th>
              <th className="px-6 py-3">배치 작업명</th>
              <th className="px-6 py-3">수행일자</th>
              <th className="px-6 py-3">수행회차</th>
              <th className="px-6 py-3">계획상태</th>
              <th className="px-6 py-3">유형</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {subData.map(item => (
              <tr key={item.PLAN_ID} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 font-mono text-xs text-slate-600">{item.PLAN_ID}</td>
                <td className="px-6 py-4 text-slate-800">{item.jobName || item.BATCH_JOB_ID}</td>
                <td className="px-6 py-4 text-slate-800 font-mono text-xs">{item.JOB_DT ? item.JOB_DT.substring(0, 10) : ''}</td>
                <td className="px-6 py-4 text-slate-600">{item.JOB_ROUND}회차</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${item.PLAN_STAT === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : item.PLAN_STAT === 'FAILED' ? 'bg-rose-100 text-rose-700' : item.PLAN_STAT === 'RUNNING' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                    {item.PLAN_STAT}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600">{item.PLAN_TYPE}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (viewType === 'history') {
      return (
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
              <th className="px-6 py-3">실행 ID</th>
              <th className="px-6 py-3">배치 작업명</th>
              <th className="px-6 py-3">수행일자/회차</th>
              <th className="px-6 py-3">시작/종료 시각</th>
              <th className="px-6 py-3">상태</th>
              <th className="px-6 py-3">성공/실패/전체</th>
              <th className="px-6 py-3">비고/오류</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {subData.map(item => (
              <tr key={item.EXEC_ID} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 font-mono text-xs text-slate-600">{item.EXEC_ID}</td>
                <td className="px-6 py-4 text-slate-800">{item.jobName || item.BATCH_JOB_ID}</td>
                <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                  {item.JOB_DT ? item.JOB_DT.substring(0, 10) : ''} ({item.JOB_ROUND}회)
                </td>
                <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                  시작: {item.START_DT ? item.START_DT.replace('T', ' ').substring(0, 19) : '-'}<br/>
                  종료: {item.END_DT ? item.END_DT.replace('T', ' ').substring(0, 19) : '-'}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${item.EXEC_STAT === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : item.EXEC_STAT === 'FAILED' ? 'bg-rose-100 text-rose-700' : item.EXEC_STAT === 'RUNNING' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                    {item.EXEC_STAT}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono text-xs text-slate-600">
                  {item.SUCC_CNT} / {item.FAIL_CNT} / {item.TARGET_CNT}
                </td>
                <td className="px-6 py-4 text-xs max-w-xs truncate text-rose-600 font-medium" title={item.ERR_MSG}>
                  {item.ERR_MSG || item.REQ_REASON || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (viewType === 'detail') {
      return (
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
              <th className="px-6 py-3">상세 ID</th>
              <th className="px-6 py-3">실행 ID</th>
              <th className="px-6 py-3">배치 작업명</th>
              <th className="px-6 py-3">대상 업무 키 / 테이블</th>
              <th className="px-6 py-3">이전 ➔ 이후 상태</th>
              <th className="px-6 py-3 text-center">처리상태</th>
              <th className="px-6 py-3">오류메시지</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {subData.map(item => (
              <tr key={item.DTL_ID} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 font-mono text-xs text-slate-600">{item.DTL_ID}</td>
                <td className="px-6 py-4 font-mono text-xs text-slate-600">{item.EXEC_ID}</td>
                <td className="px-6 py-4 text-slate-800">{item.jobName || item.jobId}</td>
                <td className="px-6 py-4 font-mono text-xs">
                  {item.TARGET_KEY} ({item.TARGET_TABLE})
                </td>
                <td className="px-6 py-4 font-mono text-xs text-slate-600">
                  {item.BEFORE_STAT} ➔ {item.AFTER_STAT}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${item.WORK_STAT === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {item.WORK_STAT}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-rose-600 font-medium" title={item.ERR_MSG}>
                  {item.ERR_MSG || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (viewType === 'retry') {
      return (
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
              <th className="px-6 py-3">재실행 ID</th>
              <th className="px-6 py-3">배치 작업명</th>
              <th className="px-6 py-3">원본 ➔ 신규 실행 ID</th>
              <th className="px-6 py-3">요청자 / 사유</th>
              <th className="px-6 py-3">승인자</th>
              <th className="px-6 py-3 text-center">상태</th>
              <th className="px-6 py-3">요청일시</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {subData.map(item => (
              <tr key={item.RETRY_REQ_ID} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 font-mono text-xs text-slate-600">{item.RETRY_REQ_ID}</td>
                <td className="px-6 py-4 text-slate-800">{item.jobName || item.jobId}</td>
                <td className="px-6 py-4 font-mono text-xs text-slate-600">
                  {item.ORIG_EXEC_ID} ➔ {item.NEW_EXEC_ID || '-'}
                </td>
                <td className="px-6 py-4">
                  <p className="text-slate-800">{item.REQ_USR_ID}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.REQ_REASON}</p>
                </td>
                <td className="px-6 py-4 text-slate-700">{item.APPR_USR_ID || '-'}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${item.APPR_STAT === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : item.APPR_STAT === 'REJECTED' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                    {item.APPR_STAT}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono text-xs text-slate-500">{item.REG_DT ? item.REG_DT.substring(0, 19).replace('T', ' ') : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (viewType === 'notification') {
      return (
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
              <th className="px-6 py-3">알림 ID</th>
              <th className="px-6 py-3">배치 작업명</th>
              <th className="px-6 py-3">알림 유형</th>
              <th className="px-6 py-3">알림 내용</th>
              <th className="px-6 py-3 text-center">발송상태</th>
              <th className="px-6 py-3">발송 오류</th>
              <th className="px-6 py-3">발송일시</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {subData.map(item => (
              <tr key={item.NOTI_ID} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 font-mono text-xs text-slate-600">{item.NOTI_ID}</td>
                <td className="px-6 py-4 text-slate-800">{item.jobName || item.jobId}</td>
                <td className="px-6 py-4 text-slate-700">{item.NOTI_TYPE}</td>
                <td className="px-6 py-4 text-xs text-slate-600 max-w-sm truncate" title={item.NOTI_MSG}>{item.NOTI_MSG}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${item.NOTI_STAT === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {item.NOTI_STAT}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-rose-600 font-medium">{item.ERR_MSG || '-'}</td>
                <td className="px-6 py-4 font-mono text-xs text-slate-500">{item.REG_DT ? item.REG_DT.substring(0, 19).replace('T', ' ') : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (viewType === 'lock') {
      return (
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
              <th className="px-6 py-3">잠금 키</th>
              <th className="px-6 py-3">배치 작업명</th>
              <th className="px-6 py-3">프로세스 ID / 서버</th>
              <th className="px-6 py-3">획득일시</th>
              <th className="px-6 py-3">만료일시</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {subData.map(item => (
              <tr key={item.LOCK_KEY} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 font-mono text-xs text-slate-600">{item.LOCK_KEY}</td>
                <td className="px-6 py-4 text-slate-800">{item.jobName || item.BATCH_JOB_ID}</td>
                <td className="px-6 py-4 font-mono text-xs text-slate-700">{item.PROCESS_ID}</td>
                <td className="px-6 py-4 font-mono text-xs text-slate-500">{item.ACQUIRED_DT ? item.ACQUIRED_DT.substring(0, 19).replace('T', ' ') : ''}</td>
                <td className="px-6 py-4 font-mono text-xs text-slate-500">{item.EXPIRED_DT ? item.EXPIRED_DT.substring(0, 19).replace('T', ' ') : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
  };

  // ─── 서브 뷰 Placeholder 대체 렌더링 ─────────────────────────
  const renderSubView = () => {
    if (activeView === 'master') {
      return (
        <BatchTaskList 
          onBack={() => setActiveView('home')} 
          onRegister={() => { setJobToEdit(null); setActiveView('register'); }} 
          onEditJob={(job) => { setJobToEdit(job); setActiveView('register'); }}
          onRunJob={handleRunJob}
          isExecuting={isExecuting}
        />
      );
    }
    
    if (activeView === 'register') {
      return <NewBatchRegistration onBack={() => { setJobToEdit(null); setActiveView('master'); }} jobToEdit={jobToEdit} />;
    }

    // Special handling for schedule management view
    if (activeView === 'schedule') {
      return (
        <div className="flex-1 flex flex-col p-8 overflow-y-auto space-y-6">
          {/* Schedule list (if any) */}
          {scheduleList.length > 0 && (
            <div className="mb-4">
              <h4 className="text-lg font-bold mb-2">등록된 스케줄 목록</h4>
              <ul className="list-disc list-inside text-sm text-slate-700">
                {scheduleList.map((item, idx) => (
                  <li key={idx}>{item.BATCH_JOB_NM || item.id}</li>
                ))}
              </ul>
            </div>
          )}
          {/* Schedule form */}
          <ScheduleForm
            onCancel={() => setActiveView('home')}
            onSubmit={async (data) => {
              try {
                const res = await fetch('/schedule/inqueryList', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data),
                });
                if (!res.ok) throw new Error('Failed to save schedule');
                alert('스케줄이 성공적으로 저장되었습니다.');
                // Refresh list after save
                fetch('/schedule/inqueryList')
                  .then(r => r.json())
                  .then(d => setScheduleList(d))
                  .catch(e => console.error('Refresh list error:', e));
              } catch (e) {
                console.error(e);
                alert('스케줄 저장에 실패했습니다.');
              }
              setActiveView('home');
            }}
          />
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col p-8 overflow-y-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setActiveView('home')}
            className="px-4 py-2 bg-slate-200 text-slate-700 hover:bg-slate-350 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
          >
            <ChevronLeft size={16} />
            대시보드로 돌아가기
          </button>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">{getViewTitle()} 상세 목록</h3>
          </div>
          <div className="overflow-x-auto">
            {renderTableContent(activeView)}
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
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><FileText size={20} /></div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">전체 배치</p>
              <p className="text-2xl font-black text-slate-800">{stats.total}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-500 rounded-xl"><Clock size={20} /></div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">대기/실행 중</p>
              <p className="text-2xl font-black text-slate-800">{stats.running || (isExecuting ? 1 : 0)}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl"><CheckCircle size={20} /></div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">성공 (최근 7일)</p>
              <p className="text-2xl font-black text-slate-800">{stats.success}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-rose-50 text-rose-500 rounded-xl"><AlertCircle size={20} /></div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">실패 (최근 7일)</p>
              <p className="text-2xl font-black text-slate-800">{stats.fail}</p>
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
          {loading ? (
            <div className="text-center py-10 text-slate-400 font-medium">데이터 조회 중...</div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-10 text-slate-400 font-medium">등록된 배치 작업이 없습니다.</div>
          ) : (
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
                      ) : job.status === 'RUNNING' ? (
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-bold flex items-center gap-1 w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>실행 중
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
          )}
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
