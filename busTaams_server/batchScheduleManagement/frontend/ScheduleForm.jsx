import React, { useState, useEffect } from 'react';

/**
 * ScheduleForm
 * ----------
 * A reusable form component for creating and editing batch schedules.
 * All form field IDs are prefixed with `batchScheduleManagement` to avoid any naming clash.
 * The component mirrors the UI design language used throughout the project –
 * glass‑morphism card, subtle hover animations, and accent teal tones.
 */
export default function ScheduleForm({
  initialData = {},
  onSubmit,
  onCancel,
}) {
  const [jobId, setJobId] = useState(initialData.jobId || '');
  const [execTime, setExecTime] = useState(initialData.execTime || '');
  const [execMonth, setExecMonth] = useState(initialData.execMonth || '*');
  const [execDay, setExecDay] = useState(initialData.execDay || '*');
  const [execDOW, setExecDOW] = useState(initialData.execDOW || '*');
  const [calcRule, setCalcRule] = useState(initialData.calcRule || 'T');
  const [holidayRule, setHolidayRule] = useState(initialData.holidayRule || 'RUN');
  const [useYn, setUseYn] = useState(initialData.useYn || 'Y');

  const handleSubmit = e => {
    e.preventDefault();
    const payload = {
      jobId,
      execTime,
      execMonth,
      execDay,
      execDOW,
      calcRule,
      holidayRule,
      useYn,
    };
    // If the parent component supplied an ID (editing mode), attach it.
    if (initialData.schedId) payload.schedId = initialData.schedId;
    onSubmit(payload);
  };

  return (
    <form
      id="batchScheduleManagement-schedule-form"
      className="glass-card"
      onSubmit={handleSubmit}
    >
      <h2 className="text-xl font-semibold mb-4 text-teal-300">
        {initialData.schedId ? '스케줄 수정' : '스케줄 추가'}
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-gray-200">Job ID</span>
          <input
            id="batchScheduleManagement-job-id"
            type="text"
            required
            className="mt-1 block w-full rounded-md bg-white/10 border border-teal-500 text-white placeholder-gray-400 focus:(outline-none ring-2 ring-teal-400)"
            value={jobId}
            onChange={e => setJobId(e.target.value)}
            placeholder="예: AUCTION_JOB"
          />
        </label>
        <label className="block">
          <span className="text-gray-200">Execution Time (HH:mm)</span>
          <input
            id="batchScheduleManagement-exec-time"
            type="time"
            required
            className="mt-1 block w-full rounded-md bg-white/10 border border-teal-500 text-white placeholder-gray-400 focus:(outline-none ring-2 ring-teal-400)"
            value={execTime}
            onChange={e => setExecTime(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-gray-200">Month (Cron)</span>
          <input
            id="batchScheduleManagement-exec-month"
            type="text"
            className="mt-1 block w-full rounded-md bg-white/10 border border-teal-500 text-white placeholder-gray-400 focus:(outline-none ring-2 ring-teal-400)"
            value={execMonth}
            onChange={e => setExecMonth(e.target.value)}
            placeholder="* (매월)"
          />
        </label>
        <label className="block">
          <span className="text-gray-200">Day (Cron)</span>
          <input
            id="batchScheduleManagement-exec-day"
            type="text"
            className="mt-1 block w-full rounded-md bg-white/10 border border-teal-500 text-white placeholder-gray-400 focus:(outline-none ring-2 ring-teal-400)"
            value={execDay}
            onChange={e => setExecDay(e.target.value)}
            placeholder="* (매일)"
          />
        </label>
        <label className="block">
          <span className="text-gray-200">Day‑of‑Week (Cron)</span>
          <input
            id="batchScheduleManagement-exec-dow"
            type="text"
            className="mt-1 block w-full rounded-md bg-white/10 border border-teal-500 text-white placeholder-gray-400 focus:(outline-none ring-2 ring-teal-400)"
            value={execDOW}
            onChange={e => setExecDOW(e.target.value)}
            placeholder="* (요일무관)"
          />
        </label>
        <label className="block">
          <span className="text-gray-200">Calc Rule</span>
          <select
            id="batchScheduleManagement-calc-rule"
            className="mt-1 block w-full rounded-md bg-white/10 border border-teal-500 text-white focus:(outline-none ring-2 ring-teal-400)"
            value={calcRule}
            onChange={e => setCalcRule(e.target.value)}
          >
            <option value="T">T (기본)</option>
            <option value="F">F (수동)</option>
          </select>
        </label>
        <label className="block">
          <span className="text-gray-200">Holiday Rule</span>
          <select
            id="batchScheduleManagement-holiday-rule"
            className="mt-1 block w-full rounded-md bg-white/10 border border-teal-500 text-white focus:(outline-none ring-2 ring-teal-400)"
            value={holidayRule}
            onChange={e => setHolidayRule(e.target.value)}
          >
            <option value="RUN">RUN</option>
            <option value="SKIP">SKIP</option>
          </select>
        </label>
        <label className="block">
          <span className="text-gray-200">사용 여부</span>
          <select
            id="batchScheduleManagement-use-yn"
            className="mt-1 block w-full rounded-md bg-white/10 border border-teal-500 text-white focus:(outline-none ring-2 ring-teal-400)"
            value={useYn}
            onChange={e => setUseYn(e.target.value)}
          >
            <option value="Y">Y (활성)</option>
            <option value="N">N (비활성)</option>
          </select>
        </label>
      </div>
      <div className="flex justify-end space-x-3 mt-6">
        <button
          type="button"
          id="batchScheduleManagement-cancel-btn"
          className="btn-cancel"
          onClick={onCancel}
        >
          취소
        </button>
        <button
          type="submit"
          id="batchScheduleManagement-submit-btn"
          className="btn-primary"
        >
          저장
        </button>
      </div>
    </form>
  );
}
