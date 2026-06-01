import React, { useEffect, useState } from 'react';
import ScheduleTable from './ScheduleTable';
import ScheduleForm from './ScheduleForm';
import { fetchSchedules, createSchedule, updateSchedule, deleteSchedule, fetchHistory } from './api';

const SchedulePage = () => {
  const [jobId, setJobId] = useState(''); // selected job id
  const [schedules, setSchedules] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const loadSchedules = async () => {
    if (!jobId) return;
    const data = await fetchSchedules(jobId);
    setSchedules(data);
  };

  useEffect(() => {
    loadSchedules();
  }, [jobId]);

  const handleAdd = () => {
    setEditItem(null);
    setShowForm(true);
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setShowForm(true);
  };

  const handleDelete = async (schedId) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      await deleteSchedule(schedId);
      loadSchedules();
    }
  };

  const handleFormSubmit = async (formData) => {
    if (editItem) {
      await updateSchedule(editItem.schedId, formData);
    } else {
      await createSchedule({ jobId, ...formData });
    }
    setShowForm(false);
    loadSchedules();
  };

  return (
    <div id="batchScheduleManagementRoot" style={{ padding: '1rem' }}>
      <h1>배치 스케줄 관리</h1>
      <div>
        <label htmlFor="batchScheduleManagementJobSelect">배치 작업 ID:</label>
        <input
          id="batchScheduleManagementJobSelect"
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
          placeholder="예: BATCH001"
          style={{ marginLeft: '0.5rem' }}
        />
        <button id="batchScheduleManagementRefreshBtn" onClick={loadSchedules} style={{ marginLeft: '0.5rem' }}>조회</button>
        <button id="batchScheduleManagementAddBtn" onClick={handleAdd} style={{ marginLeft: '0.5rem' }}>추가</button>
      </div>
      <ScheduleTable
        schedules={schedules}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      {showForm && (
        <ScheduleForm
          initialData={editItem}
          onCancel={() => setShowForm(false)}
          onSubmit={handleFormSubmit}
        />
      )}
    </div>
  );
};

export default SchedulePage;
