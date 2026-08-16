const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const iconv = require('iconv-lite');
const router = express.Router();
const { sendNotification } = require('../services/notificationService');

// 이니시스 설정 (.env에서 가져옴)
const MID = process.env.INICIS_MID || 'INIpayTest';
const SIGN_KEY = process.env.INICIS_SIGN_KEY || 'SU5JTElURV9UUklQTEVERVNfS0VZU1RS';

// 💰 기사 데이터 이용료 동적 계산 헬퍼 함수 (한글 주석)
async function calculateDriverDynamicFee(connection, custId, biddingPrice) {
    try {
        const [momRows] = await connection.execute(
            `SELECT FEE_POLICY, BASIC_CNT, USE_CNT 
             FROM TB_MOM_MEMBER 
             WHERE CUST_ID = ? AND YYYYMM = DATE_FORMAT(NOW(), '%Y%m')`,
            [custId]
        );

        let feePolicy = 'DRIVER';
        let basicCnt = 0;
        let useCnt = 0;

        if (momRows.length > 0) {
            feePolicy = momRows[0].FEE_POLICY;
            basicCnt = momRows[0].BASIC_CNT;
            useCnt = momRows[0].USE_CNT;
        } else {
            const [driverRows] = await connection.execute(
                "SELECT FEE_POLICY FROM TB_DRIVER_DETAIL WHERE CUST_ID = ?",
                [custId]
            );
            if (driverRows.length > 0) {
                feePolicy = driverRows[0].FEE_POLICY;
            }
        }

        if (feePolicy === 'DRIVER_GENERAL') {
            basicCnt = 10;
        } else if (feePolicy === 'DRIVER_MIDDLE') {
            basicCnt = 20;
        } else if (feePolicy === 'DRIVER_HIGH') {
            basicCnt = 30;
        }

        let feeRate = 0.033; // 일반 기사는 3.3%

        if (['DRIVER_GENERAL', 'DRIVER_MIDDLE', 'DRIVER_HIGH'].includes(feePolicy)) {
            if (useCnt < basicCnt) {
                feeRate = 0.022;
            } else {
                feeRate = 0.033;
            }
        }

        const feeTotalAmt = Math.floor(biddingPrice * feeRate);

        return {
            feePolicy,
            feeRate,
            feeTotalAmt
        };
    } catch (err) {
        console.error('[calculateDriverDynamicFee] Error:', err);
        return {
            feePolicy: 'DRIVER',
            feeRate: 0.033,
            feeTotalAmt: Math.floor(biddingPrice * 0.033)
        };
    }
}

module.exports = function createPaymentRouter(pool, app) {
    const router = express.Router();
    
    // /api/payment 경로로 라우터 등록
    if (app) {
        app.use('/api/payment', router);
    }
    
    /**
     * POST /api/payment/ready
     * 결제 요청 전 서명 및 필수 데이터 생성
     */
    /**
     * 결제 완료 후 공통 DB 업데이트 처리
     */
    /**
     * 결제 완료 후 공통 DB 업데이트 처리
     */
    const sendDriverPaymentPushNotification = async (connection, reqId, unitSeq, resId) => {
        try {
            // 1. 여행 제목(trip title) 조회
            const [reqRows] = await connection.execute(
                `SELECT TRIP_TITLE FROM TB_AUCTION_REQ WHERE REQ_ID = ?`,
                [reqId]
            );
            const tripTitle = reqRows.length > 0 ? reqRows[0].TRIP_TITLE : '요청하신 여행';

            // 2. 해당 버스기사의 USER_ID 및 CUST_ID 조회
            const [resRows] = await connection.execute(
                `SELECT r.DRIVER_ID, u.USER_ID 
                 FROM TB_BUS_RESERVATION r
                 JOIN TB_USER u ON r.DRIVER_ID = u.CUST_ID
                 WHERE r.RES_ID = ?`,
                [resId]
            );

            if (resRows.length > 0) {
                const driverCustId = resRows[0].DRIVER_ID;
                const driverUserId = resRows[0].USER_ID;

                // push message 발송
                console.log(`>>> [Push Notification] Sending payment completed push to driver ${driverUserId} (${driverCustId}) for reqId: ${reqId}, unitSeq: ${unitSeq}`);
                
                await sendNotification(pool, {
                    custId: driverCustId,
                    title: `[데이터 이용료 결제 요청]`,
                    body: `"${tripTitle}"의 여행자님의 데이터 이용료가 결제되었습니다. 기사님께서도 데이터 이용료 결제 해주세요.`,
                    link: `/app/driver/bids/waiting?tab=driver_pay&reqId=${reqId}&resId=${resId}`, // 기사 결제 대기 목록으로 링크 (동적 분기용 파라미터 탑재)
                    type: 'SYSTEM'
                });
            }
        } catch (pushErr) {
            console.error('>>> [Push Notification Error] Failed to send driver payment push notification:', pushErr);
        }
    };

    const updateDBAfterPayment = async (oid, connection, tid, amt) => {
        console.log(`>>> [updateDBAfterPayment] Starting for OID: ${oid}, TID: ${tid}, Amt: ${amt}`);
        // oid 파싱: BUS_RES_{resId}_{ts} 또는 BUS_REQ_{reqId}_{ts} 또는 BUS_DRV_{resId}_{ts}
        const parts = oid.split('_');
        const type = parts[1]; // RES 또는 REQ 또는 DRV
        const targetId = parts[2]; // resId 또는 reqId

        // 8월 17일까지 테스트 기간인 경우 데이터베이스에는 원래 가격으로 기록
        let finalAmt = Number(amt) || 33000;
        const now = new Date();
        const limitDate = new Date('2026-08-17T23:59:59');

        if (type === 'RES') {
            if (now <= limitDate && finalAmt === 1100) {
                console.log(`>>> [TEST PAYMENT OVERRIDE] Restoring database recorded amount to 33,000 KRW (paid: 1,100 KRW)`);
                finalAmt = 33000;
            }
            // 고객 단건 승인 및 결제 완료 처리 -> 상태를 'DRIVER_PAY_WAIT'으로 변경하고 고객 결제 정보를 저장합니다.
            console.log(`>>> [updateDBAfterPayment RES] Updating customer payment to DRIVER_PAY_WAIT for RES_ID: ${targetId}`);
            
            const [bidRows] = await connection.execute('SELECT REQ_ID, REQ_BUS_SEQ FROM TB_BUS_RESERVATION WHERE RES_ID = ?', [targetId]);
            if (bidRows.length > 0) {
                const { REQ_ID: reqId, REQ_BUS_SEQ: unitSeq } = bidRows[0];

                // 1. TB_BUS_RESERVATION 결제 정보 적재 및 상태 전이
                await connection.execute(
                    `UPDATE TB_BUS_RESERVATION 
                     SET DATA_STAT = 'DRIVER_PAY_WAIT',
                         CUSTOMER_PAY_STAT = 'Y',
                         CUSTOMER_PAY_AMT = ?,
                         CUSTOMER_PAY_DT = NOW(),
                         CUSTOMER_PAY_ID = ?,
                         MOD_DT = NOW() 
                     WHERE RES_ID = ? AND DATA_STAT = 'CUSTOMER_PAY_WAIT'`,
                    [finalAmt, tid || `PAY-CUST-${Date.now()}`, targetId]
                );

                // 2. TB_AUCTION_REQ_BUS 상태를 DRIVER_PAY_WAIT으로 변경
                await connection.execute(
                    `UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = 'DRIVER_PAY_WAIT', MOD_DT = NOW() 
                     WHERE REQ_ID = ? AND REQ_BUS_SEQ = ? AND DATA_STAT = 'CUSTOMER_PAY_WAIT'`,
                    [reqId, unitSeq]
                );

                // 3. TB_AUCTION_REQ 마스터 상태도 DRIVER_PAY_WAIT으로 변경
                await connection.execute(
                    `UPDATE TB_AUCTION_REQ SET DATA_STAT = 'DRIVER_PAY_WAIT', MOD_DT = NOW() WHERE REQ_ID = ?`,
                    [reqId]
                );

                // 4. 해당 버스 기사에게 PUSH 알림 전송
                await sendDriverPaymentPushNotification(connection, reqId, unitSeq, targetId);
            }
        } else if (type === 'REQ') {
            if (now <= limitDate && finalAmt === 1100) {
                console.log(`>>> [TEST PAYMENT OVERRIDE] Restoring database recorded amount to 33,000 KRW (paid: 1,100 KRW)`);
                finalAmt = 33000;
            }
            // 고객 전체 승인 및 결제 완료 처리 -> 상태를 'DRIVER_PAY_WAIT'으로 변경하고 고객 결제 정보를 저장합니다.
            console.log(`>>> [updateDBAfterPayment REQ] Updating customer payment to DRIVER_PAY_WAIT for REQ_ID: ${targetId}`);
            
            // 1. TB_BUS_RESERVATION 결제 정보 적재 및 상태 전이
            await connection.execute(
                `UPDATE TB_BUS_RESERVATION 
                 SET DATA_STAT = 'DRIVER_PAY_WAIT',
                     CUSTOMER_PAY_STAT = 'Y',
                     CUSTOMER_PAY_AMT = ?,
                     CUSTOMER_PAY_DT = NOW(),
                     CUSTOMER_PAY_ID = ?,
                     MOD_DT = NOW() 
                 WHERE REQ_ID = ? AND DATA_STAT = 'CUSTOMER_PAY_WAIT'`,
                [finalAmt, tid || `PAY-CUST-${Date.now()}`, targetId]
            );

            // 2. TB_AUCTION_REQ 상태를 DRIVER_PAY_WAIT으로 변경
            await connection.execute(
                `UPDATE TB_AUCTION_REQ SET DATA_STAT = 'DRIVER_PAY_WAIT', MOD_DT = NOW() WHERE REQ_ID = ?`,
                [targetId]
            );

            // 3. TB_AUCTION_REQ_BUS 상태를 DRIVER_PAY_WAIT으로 변경
            await connection.execute(
                `UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = 'DRIVER_PAY_WAIT', MOD_DT = NOW() 
                 WHERE REQ_ID = ? AND DATA_STAT = 'CUSTOMER_PAY_WAIT'`,
                [targetId]
            );

            // 4. 전체 예약 건에 연동된 기사들에게 각각 PUSH 알림 전송
            const [bids] = await connection.execute(
                `SELECT RES_ID, REQ_BUS_SEQ FROM TB_BUS_RESERVATION WHERE REQ_ID = ?`,
                [targetId]
            );
            for (const bid of bids) {
                await sendDriverPaymentPushNotification(connection, targetId, bid.REQ_BUS_SEQ, bid.RES_ID);
            }
        } else if (type === 'DRV') {
            // 기사 데이터 이용료 결제 완료 처리 -> 상태를 'FINAL_APPROVAL_WAIT'으로 변경하고 기사의 결제 정보를 저장합니다.
            console.log(`>>> [updateDBAfterPayment DRV] Updating driver payment to FINAL_APPROVAL_WAIT for RES_ID: ${targetId}`);

            const [priceRows] = await connection.execute(
                'SELECT REQ_ID, DRIVER_ID, DRIVER_BIDDING_PRICE FROM TB_BUS_RESERVATION WHERE RES_ID = ?',
                [targetId]
            );
            if (priceRows.length > 0) {
                const { REQ_ID: reqId, DRIVER_ID: driverId, DRIVER_BIDDING_PRICE: biddingPriceStr } = priceRows[0];
                const biddingPrice = Number(biddingPriceStr) || 0;

                // 동적 계산 수수료 산출
                const dynamic = await calculateDriverDynamicFee(connection, driverId, biddingPrice);

                // 2. TB_BUS_RESERVATION 기사 결제 완료 업데이트 및 상태를 'FINAL_APPROVAL_WAIT' (고객 최종 승인대기)로 변경
                await connection.execute(
                    `UPDATE TB_BUS_RESERVATION 
                     SET DRIVER_PAY_STAT = 'Y',
                         DRIVER_PAY_AMT = ?,
                         DRIVER_PAY_DT = NOW(),
                         DRIVER_PAY_ID = ?,
                         DRIVER_FEE_RATE = ?,
                         DATA_STAT = 'FINAL_APPROVAL_WAIT',
                         MOD_ID = ?,
                         MOD_DT = NOW()
                     WHERE RES_ID = ?`,
                    [dynamic.feeTotalAmt, tid || `PAY-DRIVER-${Date.now()}`, dynamic.feeRate, driverId, targetId]
                );

                // 3. TB_AUCTION_REQ_BUS 상태도 'FINAL_APPROVAL_WAIT'로 변경
                const [bRows] = await connection.execute('SELECT REQ_BUS_SEQ FROM TB_BUS_RESERVATION WHERE RES_ID = ?', [targetId]);
                if (bRows.length > 0) {
                    const { REQ_BUS_SEQ: uSeq } = bRows[0];
                    await connection.execute(
                        `UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = 'FINAL_APPROVAL_WAIT', MOD_ID = ?, MOD_DT = NOW() 
                         WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?`,
                        [driverId, reqId, uSeq]
                    );
                }

                // 4. TB_AUCTION_REQ 마스터 상태도 'FINAL_APPROVAL_WAIT'로 변경
                await connection.execute(
                    `UPDATE TB_AUCTION_REQ SET DATA_STAT = 'FINAL_APPROVAL_WAIT', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ?`,
                    [driverId, reqId]
                );

                // 5. TB_MOM_MEMBER 사용량(USE_CNT) 증가 처리
                const yyyyMM = now.getFullYear().toString() + String(now.getMonth() + 1).padStart(2, '0');
                let basicCnt = 0;
                if (dynamic.feePolicy === 'DRIVER_GENERAL') {
                    basicCnt = 10;
                } else if (dynamic.feePolicy === 'DRIVER_MIDDLE') {
                    basicCnt = 20;
                } else if (dynamic.feePolicy === 'DRIVER_HIGH') {
                    basicCnt = 30;
                }

                if (['DRIVER_GENERAL', 'DRIVER_MIDDLE', 'DRIVER_HIGH'].includes(dynamic.feePolicy)) {
                    await connection.execute(
                        `INSERT INTO TB_MOM_MEMBER (
                            CUST_ID, YYYYMM, FEE_POLICY, BASIC_CNT, USE_CNT, REMAINING_CNT, REG_DT, REG_ID, MOD_DT, MOD_ID
                         ) VALUES (?, ?, ?, ?, 1, ?, NOW(), ?, NOW(), ?)
                         ON DUPLICATE KEY UPDATE
                            USE_CNT = USE_CNT + 1,
                            REMAINING_CNT = IF(BASIC_CNT > USE_CNT, BASIC_CNT - USE_CNT, 0),
                            MOD_DT = NOW(),
                            MOD_ID = ?`,
                        [driverId, yyyyMM, dynamic.feePolicy, basicCnt, basicCnt - 1, driverId, driverId, driverId, driverId]
                    );
                }
            }
        }
    };

    router.post('/ready', async (req, res) => {
        console.log('>>> [Payment Ready] Requested:', req.body);
        try {
            let { price, goodname, buyername, buyertel, buyeremail, resId, reqId, isDriver } = req.body;

            // 기사 수수료 결제 준비인 경우 동적 수수료 실시간 산출
            if (isDriver && resId) {
                const [bidRows] = await pool.execute(
                    'SELECT DRIVER_BIDDING_PRICE, DRIVER_ID FROM TB_BUS_RESERVATION WHERE RES_ID = ?',
                    [resId]
                );
                if (bidRows.length > 0) {
                    const biddingPrice = Number(bidRows[0].DRIVER_BIDDING_PRICE) || 0;
                    const driverId = bidRows[0].DRIVER_ID;
                    const dynamic = await calculateDriverDynamicFee(pool, driverId, biddingPrice);
                    price = dynamic.feeTotalAmt;
                }
            }

            if (!price) {
                console.warn('>>> [Payment Ready] Missing price');
                return res.status(400).json({ error: '결제 금액(price)이 필요합니다.' });
            }

            // 8월 17일까지 테스트 기간인 경우 카드 결제 요청 금액을 1,100원으로 오버라이드
            const now = new Date();
            const limitDate = new Date('2026-08-17T23:59:59');
            if (now <= limitDate) {
                console.log(`>>> [TEST PAYMENT OVERRIDE] Overriding price ${price} to 1,100 KRW until ${limitDate.toLocaleDateString()}`);
                price = 1100;
            }

            const timestamp = new Date().getTime();
            
            // 주문번호(oid) 생성: 결제 대상 정보를 포함하여 생성
            let oid = '';
            if (isDriver) {
                oid = `BUS_DRV_${resId}_${timestamp}`;
            } else if (resId) {
                oid = `BUS_RES_${resId}_${timestamp}`;
            } else if (reqId) {
                oid = `BUS_REQ_${reqId}_${timestamp}`;
                // 고객의 환불정책 동의 일자 업데이트 (한글 주석)
                await pool.execute(
                    'UPDATE TB_BUS_RESERVATION SET CUSTOMER_REFUND_AGREE_DT = NOW() WHERE REQ_ID = ?',
                    [reqId]
                );
            } else {
                oid = `BUS_PAY_${timestamp}`;
            }

            console.log(`>>> [Payment Ready] Generated OID: ${oid}, Price: ${price}`);

            // Signature 생성: SHA256(oid=...&price=...&timestamp=...)
            const signatureStr = `oid=${oid}&price=${price}&timestamp=${timestamp}`;
            const signature = crypto.createHash('sha256')
                .update(signatureStr)
                .digest('hex');

            // verification용 mKey 생성: SHA256(signKey)
            const mKey = crypto.createHash('sha256')
                .update(SIGN_KEY)
                .digest('hex');

            const host = req.get('x-forwarded-host') || req.get('host');
            const protocol = host.includes('cafe24.com') ? 'https' : (req.get('x-forwarded-proto') || req.protocol);
            // P_NEXT_URL은 반드시 백엔드 API 주소여야 함 (이니시스 POST 수신용)
            const returnUrl = `${protocol}://${host}/api/payment/mobile-return`;

            const responseData = {
                mid: MID,
                oid,
                price,
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

    /**
     * POST /api/payment/mobile-return
     * 이니시스 인증 완료 후 POST 방식으로 리다이렉트되는 경로 (P_NEXT_URL)
     */
    router.post('/mobile-return', async (req, res) => {
        console.log('>>> [Payment Return] Body:', req.body);
        
        // 헬퍼: HTML 응답 생성 (프론트엔드로 리다이렉트)
        const sendHtmlResponse = (msg, redirectPath) => {
            // Referer가 있으면 해당 오리진을 사용, 없으면 프로토콜+호스트 사용
            const referer = req.get('referer');
            let frontOrigin = '';
            const hostHeader = req.get('x-forwarded-host') || req.get('host');
            
            if (hostHeader.includes('cafe24.com')) {
                frontOrigin = 'https://bustaams.cafe24.com';
            } else if (referer) {
                const url = new URL(referer);
                frontOrigin = url.origin;
            } else {
                // 로컬 개발 환경용 (Vite)
                frontOrigin = `${req.get('x-forwarded-proto') || req.protocol}://${hostHeader.split(':')[0]}:5174`;
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
                        // WebView 멈춤 현상 방지를 위해 alert 제거, 직접 리다이렉트
                        window.location.replace("${finalUrl}");
                    </script>
                </body>
                </html>
            `);
        };

        // 1. 모바일 결제 처리 (P_STATUS가 있는 경우)
        if (req.body.P_STATUS !== undefined) {
            const { P_STATUS, P_RMESG1, P_TID, P_REQ_URL, P_MID, P_OID } = req.body;
            const isDriver = P_OID && P_OID.startsWith('BUS_DRV_');

            if (P_STATUS !== '00') {
                const errorRedirect = isDriver ? `/app/approval-pending-driver?tab=driver_pay&payError=${encodeURIComponent(P_RMESG1)}` : `/app/approval-list?payError=${encodeURIComponent(P_RMESG1)}`;
                return sendHtmlResponse(`결제 인증 실패: ${P_RMESG1}`, errorRedirect);
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
                        await updateDBAfterPayment(oid, connection, tid, amt);
                        await connection.commit();

                        // 결제 성공 시 메인 대시보드로 화면 전환
                        const redirectPath = isDriver ? '/app/driver-dashboard?payResult=success' : '/app/customer-dashboard?payResult=success';
                        sendHtmlResponse('결제가 성공적으로 완료되었습니다.', redirectPath);
                    } catch (dbErr) {
                        await connection.rollback();
                        console.error('>>> [Payment DB Update Error (Mobile)]:', dbErr);
                        const redirectPath = isDriver ? '/app/driver-dashboard' : '/app/customer-dashboard';
                        sendHtmlResponse(`결제 성공했으나 데이터 업데이트 중 오류가 발생했습니다. (오류: ${dbErr.message})`, redirectPath);
                    } finally {
                        connection.release();
                    }
                } else {
                    const errorRedirect = isDriver ? `/app/approval-pending-driver?tab=driver_pay&payError=${encodeURIComponent(msg || '알 수 없는 오류')}` : `/app/approval-list?payError=${encodeURIComponent(msg || '알 수 없는 오류')}`;
                    sendHtmlResponse(`모바일 결제 승인 실패: ${msg || '알 수 없는 오류'}`, errorRedirect);
                }
            } catch (err) {
                console.error('Mobile Approval Critical Error:', err);
                res.status(500).send('모바일 결제 승인 처리 중 오류 발생');
            }
            return;
        }

        // 2. PC 웹표준 결제 처리
        const { resultCode, resultMsg, authToken, authUrl, mid } = req.body;
        const isDriver = (req.body.orderNumber && req.body.orderNumber.startsWith('BUS_DRV_')) || (req.body.MOID && req.body.MOID.startsWith('BUS_DRV_'));

        if (resultCode !== '0000') {
            const errorRedirect = isDriver ? `/app/approval-pending-driver?tab=driver_pay&payError=${encodeURIComponent(resultMsg)}` : `/app/approval-list?payError=${encodeURIComponent(resultMsg)}`;
            return sendHtmlResponse(`결제 인증 실패: ${resultMsg}`, errorRedirect);
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
                    await updateDBAfterPayment(result.MOID, connection, result.TID, result.TotPrice);
                    await connection.commit();

                    // 결제 성공 시 메인 대시보드로 화면 전환
                    const redirectPath = isDriver ? '/app/driver-dashboard?payResult=success' : '/app/customer-dashboard?payResult=success';
                    sendHtmlResponse('결제가 성공적으로 완료되었습니다.', redirectPath);
                } catch (dbErr) {
                    await connection.rollback();
                    console.error('>>> [Payment DB Update Error (PC)]:', dbErr);
                    const redirectPath = isDriver ? '/app/driver-dashboard' : '/app/customer-dashboard';
                    sendHtmlResponse(`결제 성공했으나 데이터 업데이트 중 오류가 발생했습니다. (오류: ${dbErr.message})`, redirectPath);
                } finally {
                    connection.release();
                }
            } else {
                const errorRedirect = isDriver ? `/app/approval-pending-driver?tab=driver_pay&payError=${encodeURIComponent(result.resultMsg || '알 수 없는 오류')}` : `/app/approval-list?payError=${encodeURIComponent(result.resultMsg || '알 수 없는 오류')}`;
                sendHtmlResponse(`결제 승인 실패: ${result.resultMsg}`, errorRedirect);
            }
        } catch (err) {
            console.error('PC Approval Critical Error:', err);
            res.status(500).send('결제 승인 처리 중 오류가 발생했습니다.');
        }
    });

    return router;
};
