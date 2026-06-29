'use strict';

const { pool } = require('../db');
const path = require('path');

// Run check every minute
function startScheduler() {
    console.log('⏰ Starting Batch Scheduler Daemon (checking every minute)...');
    setInterval(checkSchedules, 60000);
    // Also run once immediately on start
    checkSchedules();
}

async function checkSchedules() {
    const now = new Date();
    
    // Convert to KST / local time values
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // Date: YYYY-MM-DD
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const dayOfWeek = now.getDay() + 1; // 1: Sunday, 7: Saturday

    let conn;
    try {
        conn = await pool.getConnection();

        // 1. Fetch active schedules
        const [schedules] = await conn.execute(`
            SELECT s.*, m.EXEC_FILE_PATH, m.RETRY_POLICY, m.MAX_RETRY_CNT, m.BATCH_JOB_NM
            FROM TB_BATCH_SCHED s
            INNER JOIN TB_BATCH_JOB_MST m ON s.BATCH_JOB_ID = m.BATCH_JOB_ID
            WHERE s.USE_YN = 'Y' AND m.USE_YN = 'Y'
        `);

        for (const sched of schedules) {
            // Check if month matches
            if (sched.EXEC_MONTH !== '*' && parseInt(sched.EXEC_MONTH) !== (now.getMonth() + 1)) continue;
            // Check if day matches
            if (sched.EXEC_DAY !== '*' && parseInt(sched.EXEC_DAY) !== now.getDate()) continue;
            // Check if day of week matches
            if (sched.EXEC_DOW !== '*' && !sched.EXEC_DOW.split(',').map(Number).includes(dayOfWeek)) continue;
            
            // Compare hour and minute
            const schedTime = sched.EXEC_TIME; // e.g. '05:30:00'
            if (!schedTime) continue;
            const [sHour, sMin] = schedTime.split(':');
            
            if (parseInt(sHour) !== hours || parseInt(sMin) !== minutes) {
                continue;
            }

            console.log(`⏰ Schedule Match Found: ${sched.BATCH_JOB_ID} at ${schedTime}`);

            // 2. Check if a plan already exists for today/round 1 to prevent double execution
            const [existPlans] = await conn.execute(`
                SELECT PLAN_ID FROM TB_BATCH_PLAN 
                WHERE BATCH_JOB_ID = ? AND JOB_DT = ? AND JOB_ROUND = 1
            `, [sched.BATCH_JOB_ID, todayStr]);

            if (existPlans.length > 0) {
                // Already planned and likely running/completed
                continue;
            }

            // 3. Register Plan
            const [planResult] = await conn.execute(`
                INSERT INTO TB_BATCH_PLAN (BATCH_JOB_ID, JOB_DT, JOB_ROUND, PLAN_STAT, PLAN_TYPE, REG_DT)
                VALUES (?, ?, 1, 'READY', 'AUTO', NOW())
            `, [sched.BATCH_JOB_ID, todayStr]);
            const planId = planResult.insertId;

            console.log(`⏰ Created Plan ID ${planId} for Job ${sched.BATCH_JOB_ID}`);

            // 4. Trigger Batch Job execution asynchronously
            triggerJobExecution(sched.BATCH_JOB_ID, todayStr, planId);
        }
    } catch (err) {
        console.error('❌ Scheduler check error:', err);
    } finally {
        if (conn) conn.release();
    }
}

async function triggerJobExecution(jobId, jobDt, planId) {
    let conn;
    let execId;
    try {
        conn = await pool.getConnection();

        // 1. Create history record
        const [histResult] = await conn.execute(`
            INSERT INTO TB_BATCH_HIST (
                BATCH_JOB_ID, JOB_DT, JOB_ROUND, EXEC_STAT, START_DT, DRY_RUN_YN, REQ_USR_ID, REQ_REASON
            ) VALUES (
                ?, ?, 1, 'RUNNING', NOW(), 'N', 'SYSTEM', 'Scheduled Automated Execution'
            )
        `, [jobId, jobDt]);
        execId = histResult.insertId;

        // Update Plan Status to RUNNING
        await conn.execute(`
            UPDATE TB_BATCH_PLAN SET PLAN_STAT = 'RUNNING', MOD_DT = NOW()
            WHERE PLAN_ID = ?
        `, [planId]);

        // Release connection before running batch script to avoid locks
        conn.release();
        conn = null;

        // 2. Load and run the job dynamically
        console.log(`⏰ Executing job ${jobId} (Exec ID: ${execId})...`);
        const jobModulePath = path.join(__dirname, 'jobs', `${jobId}.js`);
        const jobModule = require(jobModulePath);
        
        const result = await jobModule.run(execId);

        // Update Plan Status based on outcome
        conn = await pool.getConnection();
        const finalStatus = (result && result.success) ? 'SUCCESS' : 'FAILED';
        await conn.execute(`
            UPDATE TB_BATCH_PLAN SET PLAN_STAT = ?, MOD_DT = NOW()
            WHERE PLAN_ID = ?
        `, [finalStatus, planId]);

        console.log(`⏰ Job ${jobId} finished with status: ${finalStatus}`);

    } catch (e) {
        console.error(`❌ Failed execution trigger for job ${jobId}:`, e);
        try {
            if (!conn) conn = await pool.getConnection();
            if (execId) {
                await conn.execute(`
                    UPDATE TB_BATCH_HIST 
                    SET EXEC_STAT = 'FAILED', END_DT = NOW(), ERR_MSG = ?
                    WHERE EXEC_ID = ?
                `, [e.message.substring(0, 255), execId]);
            }
            await conn.execute(`
                UPDATE TB_BATCH_PLAN SET PLAN_STAT = 'FAILED', MOD_DT = NOW()
                WHERE PLAN_ID = ?
            `, [planId]);
        } catch (dbErr) {
            console.error('Error writing job failure status:', dbErr);
        }
    } finally {
        if (conn) conn.release();
    }
}

module.exports = { startScheduler };
