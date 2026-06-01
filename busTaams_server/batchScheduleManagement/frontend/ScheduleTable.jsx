import React from 'react';

const ScheduleTable = ({ schedules, onEdit, onDelete }) => {
  return (
    <table id="batchScheduleManagementTable" style={{ width: '100%', marginTop: '1rem', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ backgroundColor: '#f0f0f0' }}>
          <th>스케줄 ID</th>
          <th>실행시간</th>
          <th>실행월</th>
          <th>실행일</th>
          <th>요일</th>
          <th>기준규칙</th>
          <th>휴일처리</th>
          <th>사용여부</th>
          <th>액션</th>
        </tr>
      </thead>
      <tbody>
        {schedules.map((s) => (
          <tr key={s.schedId} style={{ borderBottom: '1px solid #ddd' }}>
            <td>{s.schedId}</td>
            <td>{s.execTime}</td>
            <td>{s.execMonth}</td>
            <td>{s.execDay}</td>
            <td>{s.execDOW}</td>
            <td>{s.calcRule}</td>
            <td>{s.holidayRule}</td>
            <td>{s.useYn}</td>
            <td>
              <button id="batchScheduleManagementEditBtn" onClick={() => onEdit(s)} style={{ marginRight: '0.5rem' }}>수정</button>
              <button id="batchScheduleManagementDeleteBtn" onClick={() => onDelete(s.schedId)}>삭제</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ScheduleTable;
