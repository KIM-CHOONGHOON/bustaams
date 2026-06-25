const { pool } = require('../../db');

/**
 * JOB_PARTNER_DAILY_02 Batch Job Logic
 * 
 * Target: Active sales admins (TB_ADMIN.ADMIN_GRADE = 'SALES' and ADMIN_STAT = 'ACTIVE')
 *         who registered more than 6 months ago, but have no driver recruitment records
 *         (no matching RECOM_CODE inside TB_USER with RECOM_ASSIGN_DT or REG_DT in the last 6 months).
 * Action: Change ADMIN_STAT to 'LEAVE', record in MEMO,
 *         and clear RECOM_CODE & RECOM_ASSIGN_DT for any drivers mapped to this admin.
 */
async function runBatch(customExecId = null) {
    const jobId = 'JOB_PARTNER_DAILY_02';
    const processId = `PID_${process.pid}`;
    const lockKey = jobId;
    
    let conn;
    let execId = customExecId;
    let acquiredLock = false;

    console.log(`[${jobId}] Starting sales auto leave batch job...`);

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
                    'RUNNING', NOW(), 'N', 'SYSTEM', 'Automated sales inactivity checkout'
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

        // 3. Find target inactive sales admins
        // Inactive: SALES admin, ACTIVE status, registered > 6 months ago, and no recom assignments in last 6 months
        const [targets] = await conn.execute(`
            SELECT a.ADMIN_ID, a.ADMIN_NM, a.MEMO
            FROM TB_ADMIN a
            WHERE a.ADMIN_GRADE = 'SALES'
              AND a.ADMIN_STAT = 'ACTIVE'
              AND a.REG_DT < DATE_SUB(NOW(), INTERVAL 6 MONTH)
              AND NOT EXISTS (
                  SELECT 1 
                  FROM TB_USER u
                  WHERE u.USER_TYPE = 'DRIVER'
                    AND TRIM(u.RECOM_CODE) = TRIM(a.ADMIN_ID)
                    AND (
                        u.REG_DT >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                        OR (u.RECOM_ASSIGN_DT IS NOT NULL AND u.RECOM_ASSIGN_DT >= DATE_SUB(NOW(), INTERVAL 6 MONTH))
                    )
              )
        `);

        console.log(`[${jobId}] Found ${targets.length} inactive sales admins to check out.`);

        let successCount = 0;
        let failCount = 0;

        for (const target of targets) {
            const adminId = target.ADMIN_ID;
            const adminNm = target.ADMIN_NM;
            const originalMemo = target.MEMO || '';
            const newMemo = `${originalMemo}\n[SYSTEM ${new Date().toISOString().substring(0,10)}] 6개월 실적 미달로 자동 탈퇴 처리 및 기사 추천인 매핑 초기화`.trim();

            let connTx;
            try {
                connTx = await pool.getConnection();
                await connTx.beginTransaction();

                // A. Update Admin status to LEAVE
                await connTx.execute(`
                    UPDATE TB_ADMIN 
                    SET ADMIN_STAT = 'LEAVE', MEMO = ?, MOD_DT = NOW()
                    WHERE ADMIN_ID = ?
                `, [newMemo, adminId]);

                // B. Count driver mapping resets
                const [drivers] = await connTx.execute(`
                    SELECT CUST_ID FROM TB_USER 
                    WHERE RECOM_CODE = ? AND USER_TYPE = 'DRIVER'
                `, [adminId]);

                // C. Reset recom info for drivers
                if (drivers.length > 0) {
                    await connTx.execute(`
                        UPDATE TB_USER 
                        SET RECOM_CODE = NULL, RECOM_ASSIGN_DT = NULL, MOD_DT = NOW()
                        WHERE RECOM_CODE = ? AND USER_TYPE = 'DRIVER'
                    `, [adminId]);
                    console.log(`[${jobId}] Cleared 추천인 for ${drivers.length} drivers mapped to SALES ID: ${adminId}`);
                }

                // D. Insert into detail log
                await connTx.execute(`
                    INSERT INTO TB_BATCH_DTL (
                        EXEC_ID, TARGET_KEY, TARGET_TABLE, BEFORE_STAT, AFTER_STAT, WORK_STAT, ERR_MSG
                    ) VALUES (?, ?, 'TB_ADMIN', 'ACTIVE', 'LEAVE', 'SUCCESS', ?)
                `, [execId, adminId, `매핑 해제된 기사 수: ${drivers.length}`]);

                await connTx.commit();
                successCount++;
                console.log(`[${jobId}] Admin: ${adminNm} (${adminId}) has been successfully set to LEAVE.`);
            } catch (err) {
                console.error(`[${jobId}] Failed to process auto leave for Admin: ${adminId}`, err);
                if (connTx) await connTx.rollback();
                failCount++;

                // Log failure to detail
                await conn.execute(`
                    INSERT INTO TB_BATCH_DTL (
                        EXEC_ID, TARGET_KEY, TARGET_TABLE, BEFORE_STAT, AFTER_STAT, WORK_STAT, ERR_MSG
                    ) VALUES (?, ?, 'TB_ADMIN', 'ACTIVE', 'FAILED', 'FAILED', ?)
                `, [execId, adminId, err.message.substring(0, 250)]);
            } finally {
                if (connTx) connTx.release();
            }
        }

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
        if (execId && conn) {
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
