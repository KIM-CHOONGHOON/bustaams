import React, { useState, useEffect } from 'react';

/**
 * ScheduleForm
 *
 * Props:
 *  - onCancel: () => void – called when the user clicks the Cancel button.
 *  - onSubmit: (data: object) => Promise<void> – called with the form data when the user clicks Save.
 *  - initialData?: object – optional data for edit mode. When provided, the form fields are pre‑filled.
 *
 * The form mirrors the columns of TB_BATCH_SCHED:
 *   BATCH_JOB_ID, BATCH_JOB_NM, EXEC_TIME, EXEC_MONTH, EXEC_DAY,
 *   EXEC_DOW, CALC_RULE, HOLIDAY_RULE, USE_YN
 *
 * All fields are rendered with TailwindCSS utilities for a premium look.
 */
const ScheduleForm = ({ onCancel, onSubmit, initialData = {} }) => {
  const [form, setForm] = useState({
    BATCH_JOB_ID: '',
    BATCH_JOB_NM: '',
    EXEC_TIME: '',
    EXEC_MONTH: '',
    EXEC_DAY: '',
    EXEC_DOW: '',
    CALC_RULE: '',
    HOLIDAY_RULE: '',
    USE_YN: false,
    ...initialData,
  });

  // Populate fields when initialData changes (edit mode)
  useEffect(() => {
    setForm((prev) => ({ ...prev, ...initialData }));
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Trim empty strings to undefined so backend can ignore unchanged fields
    const payload = { ...form };
    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-4 p-6 bg-white rounded-xl shadow-lg">
      <h3 className="text-2xl font-bold text-gray-800 mb-4">배치 스케줄 {initialData?.BATCH_JOB_ID ? '수정' : '등록'}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">배치 작업 ID</label>
          <input
            name="BATCH_JOB_ID"
            type="text"
            required
            disabled={!!initialData?.BATCH_JOB_ID}
            value={form.BATCH_JOB_ID}
            onChange={handleChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">배치 작업명</label>
          <input
            name="BATCH_JOB_NM"
            type="text"
            required
            value={form.BATCH_JOB_NM}
            onChange={handleChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">실행 시간 (HH:MM)</label>
          <input
            name="EXEC_TIME"
            type="time"
            required
            value={form.EXEC_TIME}
            onChange={handleChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">월 (예: 1,2,3) 혹은 *</label>
          <input
            name="EXEC_MONTH"
            type="text"
            placeholder="* 또는 1,2,3"
            value={form.EXEC_MONTH}
            onChange={handleChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">일 (예: 1,15,30) 혹은 *</label>
          <input
            name="EXEC_DAY"
            type="text"
            placeholder="* 또는 1,15,30"
            value={form.EXEC_DAY}
            onChange={handleChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">요일 (0-6) 혹은 *</label>
          <input
            name="EXEC_DOW"
            type="text"
            placeholder="* 또는 0,1,2"
            value={form.EXEC_DOW}
            onChange={handleChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">계산 규칙 (CALC_RULE)</label>
          <input
            name="CALC_RULE"
            type="text"
            value={form.CALC_RULE}
            onChange={handleChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">휴일 규칙 (HOLIDAY_RULE)</label>
          <input
            name="HOLIDAY_RULE"
            type="text"
            value={form.HOLIDAY_RULE}
            onChange={handleChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div className="col-span-2 flex items-center">
          <input
            name="USE_YN"
            type="checkbox"
            checked={form.USE_YN}
            onChange={handleChange}
            className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">사용 여부</span>
        </div>
      </div>
      <div className="flex justify-end space-x-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
        >
          취소
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
        >
          저장
        </button>
      </div>
    </form>
  );
};

export default ScheduleForm;
