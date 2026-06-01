const express = require('express');
const router = express.Router();
const { pool } = require('../../db'); // adjust path as needed

// Helper to standardize JSON response
function jsonResponse(res, success, data = null, message = null) {
  res.json({ success, data, message });
}

// GET schedules for a specific batch job
router.get('/schedules/:jobId', async (req, res) => {
  const { jobId } = req.params;
  try {
    const [rows] = await pool.execute(
      `SELECT SCHED_ID AS schedId,
              BATCH_JOB_ID AS batchJobId,
              EXEC_TIME AS execTime,
              EXEC_MONTH AS execMonth,
              EXEC_DAY AS execDay,
              EXEC_DOW AS execDOW,
              CALC_RULE AS calcRule,
              HOLIDAY_RULE AS holidayRule,
              USE_YN AS useYn
       FROM TB_BATCH_SCHED
       WHERE BATCH_JOB_ID = ?`,
      [jobId]
    );
    jsonResponse(res, true, rows);
  } catch (e) {
    console.error('Error fetching schedules:', e);
    jsonResponse(res, false, null, e.message);
  }
});

// POST create a new schedule
router.post('/schedule', async (req, res) => {
  const {
    jobId,
    execTime,
    execMonth = '*',
    execDay = '*',
    execDOW = '*',
    calcRule = 'T',
    holidayRule = 'RUN',
    useYn = 'Y'
  } = req.body;

  if (!jobId || !execTime) {
    return jsonResponse(res, false, null, 'jobId and execTime are required');
  }

  try {
    const [result] = await pool.execute(
      `INSERT INTO TB_BATCH_SCHED (BATCH_JOB_ID, EXEC_TIME, EXEC_MONTH, EXEC_DAY, EXEC_DOW, CALC_RULE, HOLIDAY_RULE, USE_YN, REG_DT)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [jobId, execTime, execMonth, execDay, execDOW, calcRule, holidayRule, useYn]
    );
    jsonResponse(res, true, { schedId: result.insertId });
  } catch (e) {
    console.error('Error inserting schedule:', e);
    jsonResponse(res, false, null, e.message);
  }
});

// PUT update a schedule
router.put('/schedule/:schedId', async (req, res) => {
  const { schedId } = req.params;
  const {
    execTime,
    execMonth,
    execDay,
    execDOW,
    calcRule,
    holidayRule,
    useYn
  } = req.body;

  // Build dynamic set clause based on provided fields
  const updates = [];
  const params = [];
  if (execTime !== undefined) { updates.push('EXEC_TIME = ?'); params.push(execTime); }
  if (execMonth !== undefined) { updates.push('EXEC_MONTH = ?'); params.push(execMonth); }
  if (execDay !== undefined) { updates.push('EXEC_DAY = ?'); params.push(execDay); }
  if (execDOW !== undefined) { updates.push('EXEC_DOW = ?'); params.push(execDOW); }
  if (calcRule !== undefined) { updates.push('CALC_RULE = ?'); params.push(calcRule); }
  if (holidayRule !== undefined) { updates.push('HOLIDAY_RULE = ?'); params.push(holidayRule); }
  if (useYn !== undefined) { updates.push('USE_YN = ?'); params.push(useYn); }

  if (updates.length === 0) {
    return jsonResponse(res, false, null, 'No fields to update');
  }

  params.push(schedId);

  try {
    await pool.execute(
      `UPDATE TB_BATCH_SCHED SET ${updates.join(', ')}, MOD_DT = CURRENT_TIMESTAMP WHERE SCHED_ID = ?`,
      params
    );
    jsonResponse(res, true);
  } catch (e) {
    console.error('Error updating schedule:', e);
    jsonResponse(res, false, null, e.message);
  }
});

// DELETE a schedule (only if no pending execution plan)
router.delete('/schedule/:schedId', async (req, res) => {
  const { schedId } = req.params;

  try {
    // Check for pending plans (TB_BATCH_PLAN) that reference this schedule's job
    const [planRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM TB_BATCH_PLAN p
       JOIN TB_BATCH_SCHED s ON p.BATCH_JOB_ID = s.BATCH_JOB_ID
       WHERE s.SCHED_ID = ? AND p.STATUS = 'READY'`,
      [schedId]
    );
    if (planRows[0].cnt > 0) {
      return jsonResponse(res, false, null, 'Cannot delete schedule with pending execution plans');
    }

    await pool.execute('DELETE FROM TB_BATCH_SCHED WHERE SCHED_ID = ?', [schedId]);
    jsonResponse(res, true);
  } catch (e) {
    console.error('Error deleting schedule:', e);
    jsonResponse(res, false, null, e.message);
  }
});

// GET execution history (optional filters)
router.get('/history', async (req, res) => {
  const { jobId, date, round } = req.query;
  const conditions = [];
  const params = [];
  if (jobId) { conditions.push('h.BATCH_JOB_ID = ?'); params.push(jobId); }
  if (date) { conditions.push('h.EXECUTION_DATE = ?'); params.push(date); }
  if (round) { conditions.push('h.EXEC_ROUND = ?'); params.push(round); }

  const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  try {
    const [rows] = await pool.execute(
      `SELECT h.TB_BATCH_HISTORY AS id,
              h.BATCH_JOB_ID AS batchJobId,
              h.EXECUTION_DATE AS executionDate,
              h.EXEC_ROUND AS execRound,
              h.START_TIME AS startTime,
              h.END_TIME AS endTime,
              h.STATUS AS status,
              h.PROCESS_STEP AS processStep,
              h.EXECUTION_MODE AS executionMode,
              h.AFFECTED_ROWS AS affectedRows,
              h.NOTES AS notes
       FROM TB_BATCH_HISTORY h ${whereClause}
       ORDER BY h.START_TIME DESC`
, params);
    jsonResponse(res, true, rows);
  } catch (e) {
    console.error('Error fetching history:', e);
    jsonResponse(res, false, null, e.message);
  }
});

module.exports = router;
