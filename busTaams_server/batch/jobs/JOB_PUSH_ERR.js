const { pool } = require('../../db');
const { sendNotification } = require('../../services/notificationService');

/**
 * JOB_PUSH_ERR Batch Job Logic
 * 
 * Target: Drivers in TB_DRIVER_PAYMENT_HIST with PAY_STAT = 'FAILED' 
 *         and who haven't received a 'PAYMENT_FAIL' PUSH notification for that billing month yet.
 * Action: Send FCM Push Notification and save notification history to DB.
 */
async function runBatch(customExecId = null) {
    const jobId = 'JOB_PUSH_ERR';
    const processId = `PID_${process.pid}`;
    const lockKey = jobId;
    
    let conn;
    let execId = customExecId;
    let acquiredLock = false;

    console.log(`[${jobId}] Starting payment error push notification batch job...`);

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
                    'RUNNING', NOW(), 'N', 'SYSTEM', 'Automated payment error push run'
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

        // 3. Find target failed payments without sent notifications
        const [targets] = await conn.execute(`
            SELECT h.PAY_HIST_SEQ, h.BILLING_YYYYMM, h.PAY_AMT, h.FAIL_MSG, u.CUST_ID, u.USER_NM
            FROM TB_DRIVER_PAYMENT_HIST h
            INNER JOIN TB_USER u ON (u.USER_ID = h.DRIVER_ID OR u.CUST_ID = h.DRIVER_ID)
            WHERE h.PAY_STAT = 'FAILED'
              AND NOT EXISTS (
                  SELECT 1 FROM TB_NOTIFICATION n
                  WHERE n.CUST_ID = u.CUST_ID 
                    AND n.NOTIF_TYPE = 'PAYMENT_FAIL' 
                    AND n.BODY LIKE CONCAT('%', h.BILLING_YYYYMM, '%')
              )
        `);

        console.log(`[${jobId}] Found ${targets.length} payment failure targets to notify.`);

        let successCount = 0;
        let failCount = 0;

        for (const target of targets) {
            const custId = target.CUST_ID;
            const yymm = target.BILLING_YYYYMM;
            const payAmt = Number(target.PAY_AMT).toLocaleString();
            const failMsg = target.FAIL_MSG || '카드 승인 거절';

            // Parse YYYY and MM
            const yyyy = yymm.substring(0, 4);
            const mm = yymm.substring(4, 6);

            const title = `[busTaams] 정기 결제 실패 안내`;
            const body = `[busTaams] ${yyyy}년 ${mm}월 정기 회비(${payAmt}원) 결제에 실패했습니다. (사유: ${failMsg}). 마이페이지에서 결제 수단을 변경해 주세요.`;

            try {
                // Send push notification & save to TB_NOTIFICATION (handled inside service)
                const pushResult = await sendNotification(pool, {
                    custId,
                    title,
                    body,
                    type: 'PAYMENT_FAIL',
                    link: '/driver/mypage/payment' // Target redirection link
                });

                // Insert into Detail Table
                await conn.execute(`
                    INSERT INTO TB_BATCH_DTL (
                        EXEC_ID, TARGET_KEY, TARGET_TABLE, BEFORE_STAT, AFTER_STAT, WORK_STAT
                    ) VALUES (?, ?, 'TB_DRIVER_PAYMENT_HIST', 'FAILED', 'NOTIFIED', 'SUCCESS')
                `, [execId, String(target.PAY_HIST_SEQ)]);

                successCount++;
                console.log(`[${jobId}] Successfully notified CUST_ID: ${custId} for billing month ${yymm}`);
            } catch (err) {
                console.error(`[${jobId}] Failed to send notification to CUST_ID: ${custId}`, err);
                failCount++;

                // Log failure to details
                await conn.execute(`
                    INSERT INTO TB_BATCH_DTL (
                        EXEC_ID, TARGET_KEY, TARGET_TABLE, BEFORE_STAT, AFTER_STAT, WORK_STAT, ERR_MSG
                    ) VALUES (?, ?, 'TB_DRIVER_PAYMENT_HIST', 'FAILED', 'NOTIFICATION_FAILED', 'FAILED', ?)
                `, [execId, String(target.PAY_HIST_SEQ), err.message.substring(0, 250)]);
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
