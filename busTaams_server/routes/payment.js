const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const iconv = require('iconv-lite');
const { getCurrentYyyyMm } = require('../lib/loginPayload');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// 이니시스 설정 (.env에서 가져옴)
const MID = process.env.INICIS_MID || 'INIpayTest';
const SIGN_KEY = process.env.INICIS_SIGN_KEY || 'SU5JTElURV9UUklQTEVERVNfS0VZU1RS';

module.exports = function createPaymentRouter(pool, app) {
    const router = express.Router();
    
    // /api/payment 경로로 라우터 등록
    if (app) {
        app.use('/api/payment', router);
    }

    // 결제 고유 ID 생성 (YYYYMMDD + 12자리 순번) (한글 주석)
    const generatePayId = async (connectionOrPool) => {
        const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
        const [rows] = await connectionOrPool.execute(
            `SELECT MAX(PAY_ID) as maxVal FROM TB_PAYMENT_MASTER WHERE PAY_ID LIKE ?`,
            [`${todayStr}%`]
        );
        const maxVal = rows[0]?.maxVal;
        if (!maxVal) {
            return todayStr + '000000000001';
        }
        const seqPart = maxVal.substring(8);
        const nextSeq = parseInt(seqPart, 10) + 1;
        return todayStr + String(nextSeq).padStart(12, '0');
    };
    
    /**
     * POST /api/payment/ready
     * 결제 요청 전 서명 및 필수 데이터 생성
     */
    /**
     * 💰 기사의 멤버십 정보 및 등급에 따라 저장할 FEE_POLICY를 판별하여 반환하는 헬퍼 함수 (한글 주석)
     */
    const determineFeePolicy = async (connection, driverId) => {
        try {
            const safeDriverId = String(driverId || '').trim();

            // 1. TB_MOM_MEMBER에서 기사의 현재 월(YYYYMM) 정보 조회
            const [momRows] = await connection.execute(
                "SELECT FEE_POLICY, REMAINING_CNT FROM TB_MOM_MEMBER WHERE CUST_ID = ? AND YYYYMM = DATE_FORMAT(NOW(), '%Y%m')",
                [safeDriverId]
            );
            
            if (momRows.length > 0) {
                // 2. 해당 월 정보가 존재하고 REMAINING_CNT가 0건이면 'DRIVER' 저장
                if (parseInt(momRows[0].REMAINING_CNT, 10) === 0) {
                    return 'DRIVER';
                }
                // REMAINING_CNT가 0건이 아니면 TB_MOM_MEMBER의 FEE_POLICY를 반환
                return momRows[0].FEE_POLICY;
            }
            
            // 3. 만약 TB_MOM_MEMBER의 해당 월 정보가 없으면 TB_DRIVER_DETAIL 테이블의 FEE_POLICY 조회
            const [driverRows] = await connection.execute(
                "SELECT FEE_POLICY FROM TB_DRIVER_DETAIL WHERE CUST_ID = ?",
                [safeDriverId]
            );
            if (driverRows.length > 0 && driverRows[0].FEE_POLICY) {
                return driverRows[0].FEE_POLICY;
            }
            
            return null;
        } catch (err) {
            console.error('[determineFeePolicy] Error determining fee policy:', err);
            return null;
        }
    };

    /**
     * 결제 완료 후 공통 DB 업데이트 처리
     */
    const updateDBAfterPayment = async (oid, connection) => {
        console.log(`>>> [updateDBAfterPayment] Starting for OID: ${oid}`);
        // oid 파싱: BUS_RES_{resId}_{ts} 또는 BUS_REQ_{reqId}_{ts}
        const parts = oid.split('_');
        const type = parts[1]; // RES 또는 REQ
        const targetId = parts[2]; // resId 또는 reqId

        if (type === 'RES') {
            // 단건 승인 로직 (resId)
            const [bidRows] = await connection.execute('SELECT REQ_ID, REQ_BUS_SEQ, DRIVER_ID FROM TB_BUS_RESERVATION WHERE RES_ID = ?', [targetId]);
            if (bidRows.length > 0) {
                const { REQ_ID: reqId, REQ_BUS_SEQ: unitSeq, DRIVER_ID: driverId } = bidRows[0];
                
                // 기사 등급(FEE_POLICY) 판별
                const feePolicy = await determineFeePolicy(connection, driverId);

                await connection.execute(
                    'UPDATE TB_BUS_RESERVATION SET DATA_STAT = "CONFIRM", CONFIRM_DT = NOW(), FEE_POLICY = ? WHERE RES_ID = ?', 
                    [feePolicy, targetId]
                );
                await connection.execute('UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = "CONFIRM" WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?', [reqId, unitSeq]);

                // 모든 차량 확정 확인
                const [busStats] = await connection.execute(
                    'SELECT COUNT(*) as total, SUM(CASE WHEN DATA_STAT = "CONFIRM" THEN 1 ELSE 0 END) as confirmed FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ?',
                    [reqId]
                );
                if (busStats[0].total > 0 && busStats[0].total === busStats[0].confirmed) {
                    await connection.execute('UPDATE TB_AUCTION_REQ SET DATA_STAT = "CONFIRM", MOD_DT = NOW() WHERE REQ_ID = ?', [reqId]);
                }

                // [추가] 기사의 월 사용건수(USE_CNT)를 1 증가시키고 잔여 건수(REMAINING_CNT)는 9999로 설정/유지 (한글 주석)
                const yyyyMM = getCurrentYyyyMm();
                await connection.execute(
                    `INSERT INTO TB_MOM_MEMBER (
                        CUST_ID, YYYYMM, FEE_POLICY, BASIC_CNT, USE_CNT, REMAINING_CNT, REG_DT, REG_ID, MOD_DT, MOD_ID
                     ) VALUES (?, ?, ?, 9999, 1, 9999, NOW(), ?, NOW(), ?)
                     ON DUPLICATE KEY UPDATE
                        USE_CNT = USE_CNT + 1,
                        REMAINING_CNT = 9999,
                        MOD_DT = NOW(),
                        MOD_ID = ?`,
                    [driverId, yyyyMM, feePolicy || 'DRIVER', driverId, driverId, driverId]
                );

                // [알림 발송] 비동기 처리 (한글 주석)
                (async () => {
                    try {
                        const [reqInfo] = await pool.execute('SELECT TRIP_TITLE FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [reqId]);
                        if (reqInfo.length > 0) {
                            const tripTitle = reqInfo[0].TRIP_TITLE;
                            const { sendNotification } = require('../services/notificationService');
                            const title = '[예약 확정] 결제가 완료되어 예약이 확정되었습니다.';
                            const body = `여정: ${tripTitle}\n고객의 결제가 완료되어 최종 예약 확정되었습니다. 일정을 확인해 주세요.`;
                            const link = `/estimate-detail-driver/${reqId}`;

                            await sendNotification(pool, {
                                custId: driverId,
                                title,
                                body,
                                link,
                                type: 'SYSTEM'
                            });
                        }
                    } catch (err) {
                        console.error(`[Notification] 결제 완료 알림 발송 실패 (기사 ID: ${driverId}):`, err);
                    }
                })();
            }
        } else if (type === 'REQ') {
            // 전체 승인 로직 (reqId)
            const [bids] = await connection.execute(`
                SELECT RES_ID, REQ_BUS_SEQ, DRIVER_ID 
                FROM TB_BUS_RESERVATION 
                WHERE REQ_ID = ? AND DATA_STAT = 'BIDDING'
                GROUP BY REQ_BUS_SEQ
            `, [targetId]);

            for (const bid of bids) {
                // 기사 등급(FEE_POLICY) 판별
                const feePolicy = await determineFeePolicy(connection, bid.DRIVER_ID);

                await connection.execute(
                    'UPDATE TB_BUS_RESERVATION SET DATA_STAT = "CONFIRM", CONFIRM_DT = NOW(), FEE_POLICY = ? WHERE RES_ID = ?', 
                    [feePolicy, bid.RES_ID]
                );
                await connection.execute('UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = "CONFIRM" WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?', [targetId, bid.REQ_BUS_SEQ]);

                // [추가] 각 기사의 월 사용건수(USE_CNT)를 1 증가시키고 잔여 건수(REMAINING_CNT)는 9999로 설정/유지 (한글 주석)
                const yyyyMM = getCurrentYyyyMm();
                await connection.execute(
                    `INSERT INTO TB_MOM_MEMBER (
                        CUST_ID, YYYYMM, FEE_POLICY, BASIC_CNT, USE_CNT, REMAINING_CNT, REG_DT, REG_ID, MOD_DT, MOD_ID
                     ) VALUES (?, ?, ?, 9999, 1, 9999, NOW(), ?, NOW(), ?)
                     ON DUPLICATE KEY UPDATE
                        USE_CNT = USE_CNT + 1,
                        REMAINING_CNT = 9999,
                        MOD_DT = NOW(),
                        MOD_ID = ?`,
                    [bid.DRIVER_ID, yyyyMM, feePolicy || 'DRIVER', bid.DRIVER_ID, bid.DRIVER_ID, bid.DRIVER_ID]
                );

                // [알림 발송] 비동기 처리 (한글 주석)
                (async () => {
                    try {
                        const [reqInfo] = await pool.execute('SELECT TRIP_TITLE FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [targetId]);
                        if (reqInfo.length > 0) {
                            const tripTitle = reqInfo[0].TRIP_TITLE;
                            const { sendNotification } = require('../services/notificationService');
                            const title = '[예약 확정] 결제가 완료되어 예약이 확정되었습니다.';
                            const body = `여정: ${tripTitle}\n고객의 결제가 완료되어 최종 예약 확정되었습니다. 일정을 확인해 주세요.`;
                            const link = `/estimate-detail-driver/${targetId}`;

                            await sendNotification(pool, {
                                custId: bid.DRIVER_ID,
                                title,
                                body,
                                link,
                                type: 'SYSTEM'
                            });
                        }
                    } catch (err) {
                        console.error(`[Notification] 결제 완료 알림 발송 실패 (기사 ID: ${bid.DRIVER_ID}):`, err);
                    }
                })();
            }
            await connection.execute('UPDATE TB_AUCTION_REQ SET DATA_STAT = "CONFIRM" WHERE REQ_ID = ?', [targetId]);
        }
    };

    router.post('/ready', authenticateToken, async (req, res) => {
        console.log('>>> [Payment Ready] Requested:', req.body);
        try {
            let { price, goodname, buyername, buyertel, buyeremail, resId, reqId } = req.body;

            // 토큰 정보로부터 결제자의 CUST_ID를 구함 (한글 주석)
            let custId = req.user.custId;
            if (!custId) {
                const [uRows] = await pool.execute(
                    'SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?',
                    [req.user.userId]
                );
                if (uRows.length === 0) {
                    return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
                }
                custId = uRows[0].CUST_ID;
            }

            if (!price) {
                console.warn('>>> [Payment Ready] Missing price');
                return res.status(400).json({ error: '결제 금액(price)이 필요합니다.' });
            }

            // [안전장치] 테스트 모드일 경우 결제 금액을 1,000원으로 강제 고정 (한글 주석)
            let cleanAmount = String(price).replace(/[^0-9]/g, '');
            if (MID === 'INIpayTest') {
                console.log(`[PAY_SAFETY_V2] Test mode detected. Forcing amount from ${cleanAmount} to 1000 KRW.`);
                cleanAmount = '1000';
            }

            const timestamp = String(new Date().getTime());
            
            // 주문번호(oid) 생성: 결제 대상 정보를 포함하여 생성
            let oid = '';
            if (resId) {
                oid = `BUS_RES_${resId}_${timestamp}`;
            } else if (reqId) {
                oid = `BUS_REQ_${reqId}_${timestamp}`;
            } else {
                oid = `BUS_PAY_${timestamp}`;
            }

            console.log(`>>> [Payment Ready] Generated OID: ${oid}, Price: ${cleanAmount}`);

            // 결제 마스터 테이블(TB_PAYMENT_MASTER)에 READY 상태로 최초 결제 시도 정보 저장 (한글 주석)
            const payId = await generatePayId(pool);
            await pool.execute(
                `INSERT INTO TB_PAYMENT_MASTER (
                    PAY_ID, ORDER_NO, PAY_TYPE, REQ_ID, CUST_ID, 
                    PG_MID, PLAN_DATE, PAY_AMOUNT, PAY_STATUS, 
                    REG_ID, REG_DT
                ) VALUES (?, ?, 'ONETIME', ?, ?, ?, CURDATE(), ?, 'READY', ?, NOW())`,
                [
                    payId,
                    oid,
                    reqId || resId || null,
                    custId,
                    MID,
                    cleanAmount,
                    custId
                ]
            );

            // Signature 생성: SHA256(oid=...&price=...&timestamp=...)
            const signatureStr = `oid=${oid}&price=${cleanAmount}&timestamp=${timestamp}`;
            const signature = crypto.createHash('sha256')
                .update(signatureStr, 'utf8')
                .digest('hex')
                .toUpperCase(); // 대문자 변환 (한글 주석)

            // verification용 mKey 생성: SHA256(signKey)
            const mKey = crypto.createHash('sha256')
                .update(SIGN_KEY, 'utf8')
                .digest('hex')
                .toUpperCase(); // 대문자 변환 (한글 주석)

            const host = req.get('x-forwarded-host') || req.get('host');
            const protocol = req.get('x-forwarded-proto') || req.protocol;
            // P_NEXT_URL은 반드시 백엔드 API 주소여야 함 (이니시스 POST 수신용)
            const returnUrl = `${protocol}://${host}/api/payment/mobile-return`;

            const responseData = {
                mid: MID,
                oid,
                price: cleanAmount,
                amount: cleanAmount,
                timestamp,
                signature,
                mKey,
                goodname: goodname || 'BusTaams 예약 결제',
                buyername: buyername || '구매자',
                buyertel: buyertel || '010-0000-0000',
                buyeremail: buyeremail || 'test@example.com',
                returnUrl: returnUrl
            };

            console.log('>>> [Payment Ready] Success response data prepared');
            res.json(responseData);
        } catch (err) {
            console.error('>>> [Payment Ready] Critical Error:', err);
            res.status(500).json({ error: '결제 준비 중 오류가 발생했습니다.', detail: err.message });
        }
    });

    const returnHandler = async (req, res) => {
        console.log('>>> [Payment Return] Body:', req.body);
        
        // 헬퍼: HTML 응답 생성 (프론트엔드로 리다이렉트)
        const sendHtmlResponse = (msg, redirectPath) => {
            // Referer가 있으면 해당 오리진을 사용, 없으면 프로토콜+호스트 사용
            const referer = req.get('referer');
            let frontOrigin = '';
            if (referer) {
                const url = new URL(referer);
                frontOrigin = url.origin;
            } else {
                // 기본적으로 프론트엔드가 5174 포트를 사용한다고 가정 (또는 환경변수 활용 권장)
                frontOrigin = `${req.get('x-forwarded-proto') || req.protocol}://${(req.get('x-forwarded-host') || req.get('host')).split(':')[0]}:5174`;
            }

            const finalUrl = redirectPath.startsWith('http') ? redirectPath : `${frontOrigin}${redirectPath}`;

            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>결제 처리 중</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f8fafc; color: #1e293b; }
                        .content { text-align: center; padding: 40px; background: white; border-radius: 24px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); max-width: 90%; width: 400px; }
                        .loader { border: 4px solid #f1f5f9; border-top: 4px solid #00685f; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px; }
                        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                        p { font-size: 16px; font-weight: 600; line-height: 1.5; margin-bottom: 10px; }
                        .sub { font-size: 14px; color: #64748b; font-weight: 400; }
                    </style>
                </head>
                <body>
                    <div class="content">
                        <div class="loader"></div>
                        <p>${msg}</p>
                        <p class="sub">잠시 후 이동합니다...</p>
                    </div>
                    <script>
                        if ("${msg}") alert("${msg.replace(/"/g, '\\"').replace(/\n/g, '\\n')}");
                        window.location.href = "${finalUrl}";
                    </script>
                </body>
                </html>
            `);
        };

        // 1. 모바일 결제 처리 (P_STATUS가 있는 경우)
        if (req.body.P_STATUS !== undefined) {
            const { P_STATUS, P_RMESG1, P_TID, P_REQ_URL, P_MID, P_OID } = req.body;

            if (P_STATUS !== '00') {
                // 결제 마스터 테이블에 인증 실패 상태 저장 (한글 주석)
                try {
                    await pool.execute(
                        `UPDATE TB_PAYMENT_MASTER SET 
                            PAY_STATUS = 'FAIL', 
                            PG_RESULT_CODE = ?, 
                            PG_RESULT_MSG = ?, 
                            COMPLETE_DT = NOW(),
                            MOD_DT = NOW(),
                            MOD_ID = 'SYSTEM'
                         WHERE ORDER_NO = ?`,
                        [P_STATUS, P_RMESG1 || '모바일 결제 인증 실패', P_OID]
                    );
                } catch (dbErr) {
                    console.error('>>> [Payment DB Update Error (Mobile Auth Fail)]:', dbErr);
                }
                return sendHtmlResponse(`결제 인증 실패: ${P_RMESG1}`, '/approval-list');
            }

            try {
                // 승인 요청 시 사용할 MID 결정 (전달받은 P_MID가 없으면 설정된 MID 사용)
                const targetMid = P_MID || MID;
                console.log(`>>> [Mobile Approval Request] URL: ${P_REQ_URL}, MID: ${targetMid}, TID: ${P_TID}, OID: ${P_OID}`);

                // 모바일 승인 요청 (P_REQ_URL로 P_MID, P_TID 전송)
                const approvalRes = await axios.post(P_REQ_URL, 
                    `P_MID=${targetMid}&P_TID=${P_TID}`, 
                    { 
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        responseType: 'arraybuffer'
                    }
                );

                const resultStr = iconv.decode(Buffer.from(approvalRes.data), 'euc-kr');
                console.log('>>> [Payment Mobile Approval] Result:', resultStr);

                // 결과 파싱 (P_STATUS=00&P_AMT=1000&...)
                const resultParams = new URLSearchParams(resultStr);
                const status = resultParams.get('P_STATUS');
                const amt = resultParams.get('P_AMT');
                const msg = resultParams.get('P_RMESG1');
                const tid = resultParams.get('P_TID') || P_TID;
                const oid = resultParams.get('P_OID') || P_OID;
                const type = resultParams.get('P_TYPE');

                if (status === '00') {
                    const connection = await pool.getConnection();
                    try {
                        await connection.beginTransaction();
                        await updateDBAfterPayment(oid, connection);

                        // 결제 마스터 테이블에 결제 성공 정보 반영 (한글 주석)
                        await connection.execute(
                            `UPDATE TB_PAYMENT_MASTER SET 
                                PAY_STATUS = 'SUCCESS',
                                PG_TID = ?,
                                CARD_AUTH_NO = ?,
                                PG_RESULT_CODE = ?,
                                PG_RESULT_MSG = ?,
                                CARD_CODE = ?,
                                CARD_NAME = ?,
                                CARD_MASK_NO = ?,
                                COMPLETE_DT = NOW(),
                                MOD_DT = NOW(),
                                MOD_ID = 'SYSTEM'
                             WHERE ORDER_NO = ?`,
                            [
                                tid,
                                resultParams.get('P_AUTH_NO') || null,
                                status,
                                msg || '성공',
                                resultParams.get('P_FN_CD1') || null,
                                resultParams.get('P_FN_NM') || null,
                                resultParams.get('P_CARD_NUM') || resultParams.get('P_CARD_NO') || null,
                                oid
                            ]
                        );

                        await connection.commit();

                        // oid에서 reqId 또는 resId 추출 (예: BUS_REQ_123_timestamp)
                        const parts = oid.split('_');
                        const type = parts[1];
                        const targetId = parts[2];
                        let redirectPath = '/customer-dashboard';
                        
                        if (type === 'REQ') {
                            redirectPath = `/customer-dashboard?payResult=success`; // 404 수정 (한글 주석)
                        } else if (type === 'RES') {
                            // 단건의 경우 해당 reqId를 찾아야 하므로 일단 대시보드로 보내거나 상세로 보냄
                            redirectPath = `/customer-dashboard?payResult=success&resId=${targetId}`;
                        }

                        sendHtmlResponse('결제가 성공적으로 완료되었습니다.', redirectPath);
                    } catch (dbErr) {
                        await connection.rollback();
                        console.error('>>> [Payment DB Update Error (Mobile)]:', dbErr);
                        sendHtmlResponse(`결제 성공했으나 데이터 업데이트 중 오류가 발생했습니다. (오류: ${dbErr.message})`, '/customer-dashboard');
                    } finally {
                        connection.release();
                    }
                } else {
                    // 결제 마스터 테이블에 승인 실패 정보 반영 (한글 주석)
                    try {
                        await pool.execute(
                            `UPDATE TB_PAYMENT_MASTER SET 
                                PAY_STATUS = 'FAIL', 
                                PG_TID = ?, 
                                PG_RESULT_CODE = ?, 
                                PG_RESULT_MSG = ?, 
                                COMPLETE_DT = NOW(),
                                MOD_DT = NOW(),
                                MOD_ID = 'SYSTEM'
                             WHERE ORDER_NO = ?`,
                            [tid, status, msg || '모바일 결제 승인 실패', oid]
                        );
                    } catch (dbErr) {
                        console.error('>>> [Payment DB Update Error (Mobile Approval Fail)]:', dbErr);
                    }
                    sendHtmlResponse(`모바일 결제 승인 실패: ${msg || '알 수 없는 오류'}`, '/approval-list');
                }
            } catch (err) {
                console.error('Mobile Approval Critical Error:', err);
                try {
                    await pool.execute(
                        `UPDATE TB_PAYMENT_MASTER SET 
                            PAY_STATUS = 'FAIL', 
                            PG_RESULT_CODE = 'ERROR', 
                            PG_RESULT_MSG = ?, 
                            COMPLETE_DT = NOW(),
                            MOD_DT = NOW(),
                            MOD_ID = 'SYSTEM'
                         WHERE ORDER_NO = ?`,
                        [err.message || '모바일 결제 승인 에러', P_OID]
                    );
                } catch (dbErr) {
                    console.error('>>> [Payment DB Update Error (Mobile Auth Exception)]:', dbErr);
                }
                res.status(500).send('모바일 결제 승인 처리 중 오류 발생');
            }
            return;
        }

        // 2. PC 웹표준 결제 처리
        const { resultCode, resultMsg, authToken, authUrl, mid } = req.body;

        if (resultCode !== '0000') {
            // 결제 마스터 테이블에 인증 실패 상태 저장 (한글 주석)
            try {
                await pool.execute(
                    `UPDATE TB_PAYMENT_MASTER SET 
                        PAY_STATUS = 'FAIL', 
                        PG_RESULT_CODE = ?, 
                        PG_RESULT_MSG = ?, 
                        COMPLETE_DT = NOW(),
                        MOD_DT = NOW(),
                        MOD_ID = 'SYSTEM'
                     WHERE ORDER_NO = ?`,
                    [resultCode, resultMsg || 'PC 결제 인증 실패', req.body.orderNumber || req.body.MOID]
                );
            } catch (dbErr) {
                console.error('>>> [Payment DB Update Error (PC Auth Fail)]:', dbErr);
            }
            return sendHtmlResponse(`결제 인증 실패: ${resultMsg}`, '/approval-list');
        }

        try {
            const timestamp = new Date().getTime();
            const signatureStr = `authToken=${authToken}&timestamp=${timestamp}`;
            const signature = crypto.createHash('sha256')
                .update(signatureStr)
                .digest('hex');

            const params = {
                mid: mid,
                authToken: authToken,
                signature: signature,
                timestamp: timestamp,
                format: 'JSON'
            };

            const response = await axios.post(authUrl, params);
            const result = response.data;

            console.log('>>> [Payment PC Approval] Result:', result);

            if (result.resultCode === '0000') {
                const connection = await pool.getConnection();
                try {
                    await connection.beginTransaction();
                    await updateDBAfterPayment(result.MOID, connection);

                    // 결제 마스터 테이블에 결제 성공 정보 반영 (한글 주석)
                    await connection.execute(
                        `UPDATE TB_PAYMENT_MASTER SET 
                            PAY_STATUS = 'SUCCESS',
                            PG_TID = ?,
                            CARD_AUTH_NO = ?,
                            PG_RESULT_CODE = ?,
                            PG_RESULT_MSG = ?,
                            CARD_CODE = ?,
                            CARD_NAME = ?,
                            CARD_MASK_NO = ?,
                            COMPLETE_DT = NOW(),
                            MOD_DT = NOW(),
                            MOD_ID = 'SYSTEM'
                         WHERE ORDER_NO = ?`,
                        [
                            result.tid || null,
                            result.applNum || null,
                            result.resultCode,
                            result.resultMsg || '성공',
                            result.cardCode || null,
                            result.cardName || null,
                            result.cardNumber || null,
                            result.MOID
                        ]
                    );

                    await connection.commit();

                    const oid = result.MOID;
                    const parts = oid.split('_');
                    const targetId = parts[2];
                    const redirectPath = parts[1] === 'REQ' 
                        ? `/customer-dashboard?payResult=success` // 404 수정 (한글 주석)
                        : `/customer-dashboard?payResult=success`;

                    sendHtmlResponse('결제가 성공적으로 완료되었습니다.', redirectPath);
                } catch (dbErr) {
                    await connection.rollback();
                    console.error('>>> [Payment DB Update Error (PC)]:', dbErr);
                    sendHtmlResponse(`결제 성공했으나 데이터 업데이트 중 오류가 발생했습니다. (오류: ${dbErr.message})`, '/customer-dashboard');
                } finally {
                    connection.release();
                }
            } else {
                // 결제 마스터 테이블에 승인 실패 정보 반영 (한글 주석)
                try {
                    await pool.execute(
                        `UPDATE TB_PAYMENT_MASTER SET 
                            PAY_STATUS = 'FAIL',
                            PG_TID = ?,
                            PG_RESULT_CODE = ?,
                            PG_RESULT_MSG = ?,
                            COMPLETE_DT = NOW(),
                            MOD_DT = NOW(),
                            MOD_ID = 'SYSTEM'
                         WHERE ORDER_NO = ?`,
                        [
                            result.tid || null,
                            result.resultCode,
                            result.resultMsg || 'PC 결제 승인 실패',
                            result.MOID || req.body.orderNumber
                        ]
                    );
                } catch (dbErr) {
                    console.error('>>> [Payment DB Update Error (PC Approval Fail)]:', dbErr);
                }
                sendHtmlResponse(`결제 승인 실패: ${result.resultMsg}`, '/approval-list');
            }
        } catch (err) {
            console.error('PC Approval Critical Error:', err);
            try {
                await pool.execute(
                    `UPDATE TB_PAYMENT_MASTER SET 
                        PAY_STATUS = 'FAIL', 
                        PG_RESULT_CODE = 'ERROR', 
                        PG_RESULT_MSG = ?, 
                        COMPLETE_DT = NOW(),
                        MOD_DT = NOW(),
                        MOD_ID = 'SYSTEM'
                     WHERE ORDER_NO = ?`,
                    [err.message || 'PC 결제 승인 에러', req.body.orderNumber || req.body.MOID]
                );
            } catch (dbErr) {
                console.error('>>> [Payment DB Update Error (PC Exception)]:', dbErr);
            }
            res.status(500).send('결제 승인 처리 중 오류가 발생했습니다.');
        }
    };

    router.post('/mobile-return', returnHandler);
    router.post('/return', returnHandler);

    return router;
};
