const { pool } = require('../../db');

/**
 * JOB_PARTNER_DAILY_01 Batch Job Logic
 * 
 * Target: TB_AUCTION_REQ where DATA_STAT = 'AUCTION' and REG_DT < NOW() - 2 Days.
 * Action: Cancel requests by changing DATA_STAT to 'TRAVELER_CANCEL' for both TB_AUCTION_REQ and TB_AUCTION_REQ_BUS.
 */
async function runBatch(customExecId = null) {
    const jobId = 'JOB_PARTNER_DAILY_01';
    const processId = `PID_${process.pid}`;
    const lockKey = jobId;
    
    let conn;
    let execId = customExecId;
    let acquiredLock = false;

    console.log(`[${jobId}] Starting auction expiration batch job...`);

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
                    'RUNNING', NOW(), 'N', 'SYSTEM', 'Automated request expiration run'
                )
            `, [jobId, jobId]);
            execId = histResult.insertId;
        } else {
            await conn.execute(`
                UPDATE TB_BATCH_HIST 
                SET EXEC_STAT = 'RUNNING', START_DT = NOW(), ERR_MSG = NULL 
                WHERE EXEC_ID = ?
            `, [execId]);
        }

        await conn.beginTransaction();

        // 3. Find target requests: status = 'AUCTION' && REG_DT <= NOW() - 2 days
        const [targets] = await conn.execute(`
            SELECT REQ_ID, TRIP_TITLE, REG_DT, DATA_STAT
            FROM TB_AUCTION_REQ 
            WHERE DATA_STAT = 'AUCTION' AND REG_DT <= DATE_SUB(NOW(), INTERVAL 2 DAY)
        `);

        console.log(`[${jobId}] Found ${targets.length} expired auction requests.`);

        let successCount = 0;
        let failCount = 0;

        for (const target of targets) {
            const reqId = target.REQ_ID;
            try {
                // Update TB_AUCTION_REQ to TRAVELER_CANCEL
                await conn.execute(`
                    UPDATE TB_AUCTION_REQ 
                    SET DATA_STAT = 'TRAVELER_CANCEL', MOD_DT = NOW(), MOD_ID = 'BATCH_EXP'
                    WHERE REQ_ID = ? AND DATA_STAT = 'AUCTION'
                `, [reqId]);

                // Update TB_AUCTION_REQ_BUS to TRAVELER_CANCEL
                await conn.execute(`
                    UPDATE TB_AUCTION_REQ_BUS 
                    SET DATA_STAT = 'TRAVELER_CANCEL', MOD_DT = NOW(), MOD_ID = 'BATCH_EXP'
                    WHERE REQ_ID = ? AND DATA_STAT = 'AUCTION'
                `, [reqId]);

                // Insert into Detail Table
                await conn.execute(`
                    INSERT INTO TB_BATCH_DTL (
                        EXEC_ID, TARGET_KEY, TARGET_TABLE, BEFORE_STAT, AFTER_STAT, WORK_STAT
                    ) VALUES (?, ?, 'TB_AUCTION_REQ', 'AUCTION', 'TRAVELER_CANCEL', 'SUCCESS')
                `, [execId, reqId]);

                successCount++;
                console.log(`[${jobId}] Successfully expired REQ_ID: ${reqId}`);
            } catch (err) {
                console.error(`[${jobId}] Failed to expire REQ_ID: ${reqId}`, err);
                failCount++;

                // Log failure to details
                await conn.execute(`
                    INSERT INTO TB_BATCH_DTL (
                        EXEC_ID, TARGET_KEY, TARGET_TABLE, BEFORE_STAT, AFTER_STAT, WORK_STAT, ERR_MSG
                    ) VALUES (?, ?, 'TB_AUCTION_REQ', 'AUCTION', 'AUCTION_FAILED', 'FAILED', ?)
                `, [execId, reqId, err.message.substring(0, 250)]);
            }
        }

        await conn.commit();

        // 4. Update History to SUCCESS or FAILED
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
