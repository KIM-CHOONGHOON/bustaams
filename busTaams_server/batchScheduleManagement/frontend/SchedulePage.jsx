import './index.css';
import ScheduleTable from './ScheduleTable';
import ScheduleForm from './ScheduleForm';
import { fetchSchedules, createSchedule, updateSchedule, deleteSchedule, fetchHistory } from './api';

const SchedulePage = () => {
  const [jobId, setJobId] = useState(''); // selected job id
  const [schedules, setSchedules] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  // Load schedules for the selected job
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
    <div id="batchScheduleManagementRoot" style={{ padding: '1rem', fontFamily: '"Inter", sans-serif' }}>
      {/* Header with title and mode label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#0ff', textShadow: '0 0 8px #0ff' }}>배치 스케줄 관리</h1>
        <span style={{ fontSize: '0.9rem', color: '#fff', background: 'rgba(0,255,255,0.2)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>등록/변경/조회</span>
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="batchScheduleManagementJobSelect" style={{ color: '#fff' }}>배치 작업 ID:</label>
        <input
          id="batchScheduleManagementJobSelect"
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
          placeholder="예: BATCH001"
          style={{
            marginLeft: '0.5rem',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid #0ff',
            color: '#fff',
            borderRadius: '4px',
            padding: '0.2rem 0.5rem'
          }}
        />
        <button id="batchScheduleManagementRefreshBtn" onClick={loadSchedules} style={{ marginLeft: '0.5rem', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.3rem 0.6rem' }}>조회</button>
        <button id="batchScheduleManagementAddBtn" onClick={handleAdd} style={{ marginLeft: '0.5rem', background: '#0ff', color: '#000', border: 'none', borderRadius: '4px', padding: '0.3rem 0.6rem' }}>추가</button>
      </div>
      <ScheduleTable schedules={schedules} onEdit={handleEdit} onDelete={handleDelete} />

      {/* Modal overlay for the form */}
      {showForm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backdropFilter: 'blur(8px)'
          }}
        >
          <div style={{ background: 'rgba(10,10,30,0.9)', borderRadius: '12px', padding: '1.5rem', minWidth: '320px', boxShadow: '0 0 20px rgba(0,255,255,0.4)' }}>
            <ScheduleForm
              initialData={editItem}
              onCancel={() => setShowForm(false)}
              onSubmit={handleFormSubmit}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulePage;
