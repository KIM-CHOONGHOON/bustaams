const { pool } = require('../../db');

/**
 * JOB_DONE_TOUR Batch Job Logic
 * 
 * Target: TB_AUCTION_REQ where DATA_STAT = 'CONFIRM' and END_DT <= today.
 * Action: Update TB_AUCTION_REQ, TB_AUCTION_REQ_BUS, and TB_BUS_RESERVATION status to 'DONE'.
 */
async function runBatch(customExecId = null) {
    const jobId = 'JOB_DONE_TOUR';
    const processId = `PID_${process.pid}`;
    const lockKey = jobId;
    
    let conn;
    let execId = customExecId;
    let acquiredLock = false;

    console.log(`[${jobId}] Starting batch job...`);

    try {
        conn = await pool.getConnection();

        // 1. Acquire Lock
        try {
            await conn.execute(`
                INSERT INTO TB_BATCH_LOCK (LOCK_KEY, BATCH_JOB_ID, PROCESS_ID, ACQUIRED_DT, EXPIRED_DT)
                VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 MINUTE))
            `, [lockKey, jobId, processId]);
            acquiredLock = true;
            console.log(`[${jobId}] Lock acquired successfully.`);
        } catch (lockError) {
            console.warn(`[${jobId}] Failed to acquire lock. Another instance might be running:`, lockError.message);
            // If programmatically called and had customExecId, mark it failed
            if (execId) {
                await conn.execute(`
                    UPDATE TB_BATCH_HIST 
                    SET EXEC_STAT = 'FAILED', END_DT = NOW(), ERR_MSG = 'Failed to acquire batch execution lock.'
                    WHERE EXEC_ID = ?
                `, [execId]);
            }
            return { success: false, error: 'LOCK_ACQUIRE_FAILED' };
        }

        // 2. Create History Record if not programmatically provided
        if (!execId) {
            const [histResult] = await conn.execute(`
                INSERT INTO TB_BATCH_HIST (
                    BATCH_JOB_ID, JOB_DT, JOB_ROUND, EXEC_STAT, START_DT, DRY_RUN_YN, REQ_USR_ID, REQ_REASON
                ) VALUES (
                    ?, CURDATE(), 
                    IFNULL((SELECT MAX(h.JOB_ROUND) + 1 FROM TB_BATCH_HIST h WHERE h.BATCH_JOB_ID = ? AND h.JOB_DT = CURDATE()), 1),
                    'RUNNING', NOW(), 'N', 'SYSTEM', 'Scheduled automated run'
                )
            `, [jobId, jobId]);
            execId = histResult.insertId;
        } else {
            // Update state to RUNNING for programmatic execution
            await conn.execute(`
                UPDATE TB_BATCH_HIST 
                SET EXEC_STAT = 'RUNNING', START_DT = NOW(), ERR_MSG = NULL 
                WHERE EXEC_ID = ?
            `, [execId]);
        }

        await conn.beginTransaction();

        // 3. Find Tour Completed targets (CONFIRM status && END_DT < today)
        const [targets] = await conn.execute(`
            SELECT REQ_ID, TRIP_TITLE, DATA_STAT, END_DT 
            FROM TB_AUCTION_REQ 
            WHERE DATA_STAT = 'CONFIRM' AND DATE(END_DT) < CURDATE()
        `);

        console.log(`[${jobId}] Found ${targets.length} targets to transition to DONE.`);

        let successCount = 0;
        let failCount = 0;

        for (const target of targets) {
            const reqId = target.REQ_ID;
            try {
                // Update TB_AUCTION_REQ
                const [r1] = await conn.execute(`
                    UPDATE TB_AUCTION_REQ 
                    SET DATA_STAT = 'DONE', MOD_DT = NOW(), MOD_ID = 'BATCH_DONE'
                    WHERE REQ_ID = ? AND DATA_STAT = 'CONFIRM'
                `, [reqId]);

                // Update TB_AUCTION_REQ_BUS
                await conn.execute(`
                    UPDATE TB_AUCTION_REQ_BUS 
                    SET DATA_STAT = 'DONE', MOD_DT = NOW(), MOD_ID = 'BATCH_DONE'
                    WHERE REQ_ID = ? AND DATA_STAT = 'CONFIRM'
                `, [reqId]);

                // Update TB_BUS_RESERVATION
                await conn.execute(`
                    UPDATE TB_BUS_RESERVATION 
                    SET DATA_STAT = 'DONE', MOD_DT = NOW(), MOD_ID = 'BATCH_DONE', DONE_DT = NOW()
                    WHERE REQ_ID = ? AND DATA_STAT = 'CONFIRM'
                `, [reqId]);

                // Insert into Detail Table
                await conn.execute(`
                    INSERT INTO TB_BATCH_DTL (
                        EXEC_ID, TARGET_KEY, TARGET_TABLE, BEFORE_STAT, AFTER_STAT, WORK_STAT
                    ) VALUES (?, ?, 'TB_AUCTION_REQ', 'CONFIRM', 'DONE', 'SUCCESS')
                `, [execId, reqId]);

                successCount++;
                console.log(`[${jobId}] Successfully updated REQ_ID: ${reqId} to DONE.`);
            } catch (err) {
                console.error(`[${jobId}] Failed to update REQ_ID: ${reqId}`, err);
                failCount++;

                // Log failure to details
                await conn.execute(`
                    INSERT INTO TB_BATCH_DTL (
                        EXEC_ID, TARGET_KEY, TARGET_TABLE, BEFORE_STAT, AFTER_STAT, WORK_STAT, ERR_MSG
                    ) VALUES (?, ?, 'TB_AUCTION_REQ', 'CONFIRM', 'CONFIRM', 'FAILED', ?)
                `, [execId, reqId, err.message.substring(0, 250)]);
            }
        }

        await conn.commit();

        // 4. Update History to SUCCESS
        await conn.execute(`
            UPDATE TB_BATCH_HIST 
            SET EXEC_STAT = ?, END_DT = NOW(), TARGET_CNT = ?, SUCC_CNT = ?, FAIL_CNT = ?
            WHERE EXEC_ID = ?
        `, [failCount === 0 ? 'SUCCESS' : 'FAILED', targets.length, successCount, failCount, execId]);

        console.log(`[${jobId}] Batch run completed. Success: ${successCount}, Fail: ${failCount}.`);
        return { success: true, targets: targets.length, successCount, failCount };

    } catch (e) {
        console.error(`[${jobId}] Fatal error during batch processing:`, e);
        if (conn) {
            try { await conn.rollback(); } catch(rErr) { console.error("Rollback error:", rErr); }
        }

        // Update history to FAILED with error message
        if (execId) {
            try {
                await conn.execute(`
                    UPDATE TB_BATCH_HIST 
                    SET EXEC_STAT = 'FAILED', END_DT = NOW(), ERR_MSG = ?
                    WHERE EXEC_ID = ?
                `, [e.message.substring(0, 255), execId]);
            } catch(hErr) {
                console.error("Failed to update history error status:", hErr);
            }
        }

        return { success: false, error: e.message };
    } finally {
        // 5. Release Lock
        if (acquiredLock && conn) {
            try {
                await conn.execute(`DELETE FROM TB_BATCH_LOCK WHERE LOCK_KEY = ?`, [lockKey]);
                console.log(`[${jobId}] Lock released.`);
            } catch (lockReleaseError) {
                console.error(`[${jobId}] Failed to release lock:`, lockReleaseError);
            }
        }
        if (conn) {
            conn.release();
        }
    }
}

// Support running directly from CLI / cron execution
if (require.main === module) {
    runBatch().then((result) => {
        console.log("CLI Execution Result:", result);
        process.exit(result.success ? 0 : 1);
    }).catch(err => {
        console.error("CLI Execution Failure:", err);
        process.exit(1);
    });
}

module.exports = { run: runBatch };
