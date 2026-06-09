const { pool } = require('../../db');

/**
 * JOB_MOM_RESET Batch Job Logic
 * 
 * Target: TB_PAYMENT_MASTER drivers with successful payment in the current month (PAY_YYMM = YYYYMM).
 * Action: Initialize/Reset TB_MOM_MEMBER quota for the current month.
 */
async function runBatch(customExecId = null) {
    const jobId = 'JOB_MOM_RESET';
    const processId = `PID_${process.pid}`;
    const lockKey = jobId;
    
    let conn;
    let execId = customExecId;
    let acquiredLock = false;

    console.log(`[${jobId}] Starting monthly mom member reset batch job...`);

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
                    'RUNNING', NOW(), 'N', 'SYSTEM', 'Monthly automated reset run'
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

        // Current Year-Month for evaluation (YYYYMM format)
        const [yyyymmRows] = await conn.execute("SELECT DATE_FORMAT(CURDATE(), '%Y%m') as yyyymm");
        const currentYyyymm = yyyymmRows[0].yyyymm;

        // 3. Find Drivers with Successful Payment for current month
        const [paidDrivers] = await conn.execute(`
            SELECT DISTINCT CUST_ID 
            FROM TB_PAYMENT_MASTER 
            WHERE PAY_YYMM = ? AND PAY_STATUS = 'SUCCESS'
        `, [currentYyyymm]);

        console.log(`[${jobId}] Found ${paidDrivers.length} successfully paid drivers for ${currentYyyymm}.`);

        let successCount = 0;
        let failCount = 0;

        for (const driver of paidDrivers) {
            const custId = driver.CUST_ID;
            try {
                // Fetch driver details fee policy
                const [details] = await conn.execute(`
                    SELECT FEE_POLICY 
                    FROM TB_DRIVER_DETAIL 
                    WHERE CUST_ID = ? 
                    LIMIT 1
                `, [custId]);

                let feePolicy = 'DRIVER_GENERAL'; // Default fallback
                if (details.length > 0 && details[0].FEE_POLICY) {
                    feePolicy = details[0].FEE_POLICY;
                }

                // Determine BASIC_CNT
                let basicCnt = 10;
                if (feePolicy === 'DRIVER_MIDDLE') {
                    basicCnt = 20;
                } else if (feePolicy === 'DRIVER_HIGH') {
                    basicCnt = 30;
                }

                // Upsert TB_MOM_MEMBER for the current month
                await conn.execute(`
                    INSERT INTO TB_MOM_MEMBER (
                        CUST_ID, YYYYMM, FEE_POLICY, BASIC_CNT, USE_CNT, REMAINING_CNT, REG_DT, REG_ID, MOD_DT, MOD_ID
                    ) VALUES (
                        ?, ?, ?, ?, 0, ?, NOW(), 'SYSTEM_BATCH', NOW(), 'SYSTEM_BATCH'
                    )
                    ON DUPLICATE KEY UPDATE
                        FEE_POLICY = VALUES(FEE_POLICY),
                        BASIC_CNT = VALUES(BASIC_CNT),
                        USE_CNT = 0,
                        REMAINING_CNT = VALUES(REMAINING_CNT),
                        MOD_DT = NOW(),
                        MOD_ID = 'SYSTEM_BATCH'
                `, [custId, currentYyyymm, feePolicy, basicCnt, basicCnt]);

                // Insert into Detail Table
                await conn.execute(`
                    INSERT INTO TB_BATCH_DTL (
                        EXEC_ID, TARGET_KEY, TARGET_TABLE, BEFORE_STAT, AFTER_STAT, WORK_STAT
                    ) VALUES (?, ?, 'TB_MOM_MEMBER', 'RESET_BEFORE', ?, 'SUCCESS')
                `, [execId, custId, feePolicy]);

                successCount++;
            } catch (err) {
                console.error(`[${jobId}] Failed to initialize MOM quota for Driver CUST_ID: ${custId}`, err);
                failCount++;

                // Log failure to details
                await conn.execute(`
                    INSERT INTO TB_BATCH_DTL (
                        EXEC_ID, TARGET_KEY, TARGET_TABLE, BEFORE_STAT, AFTER_STAT, WORK_STAT, ERR_MSG
                    ) VALUES (?, ?, 'TB_MOM_MEMBER', 'RESET_BEFORE', 'FAILED_RESET', 'FAILED', ?)
                `, [execId, custId, err.message.substring(0, 250)]);
            }
        }

        await conn.commit();

        // 4. Update History to SUCCESS or FAILED
        await conn.execute(`
            UPDATE TB_BATCH_HIST 
            SET EXEC_STAT = ?, END_DT = NOW(), TARGET_CNT = ?, SUCC_CNT = ?, FAIL_CNT = ?
            WHERE EXEC_ID = ?
        `, [failCount === 0 ? 'SUCCESS' : 'FAILED', paidDrivers.length, successCount, failCount, execId]);

        console.log(`[${jobId}] Batch run completed. Success: ${successCount}, Fail: ${failCount}.`);
        return { success: true, targets: paidDrivers.length, successCount, failCount };

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
