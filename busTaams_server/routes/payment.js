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

/**
 * TB_PAYMENT_MASTER 결제 성공 이력 적재 헬퍼 함수
 */
async function insertPaymentMaster(connection, p) {
    try {
        const {
            orderNo,
            reqId,
            custId,
            pgMid,
            payAmount,
            pgTid,
            cardCode = null,
            cardName = null,
            cardMaskNo = null,
            pgResultCode = '0000',
            pgResultMsg = '정상결제'
        } = p;

        const payId = 'PAY' + Date.now() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');

        await connection.execute(
            `INSERT INTO TB_PAYMENT_MASTER (
                PAY_ID, ORDER_NO, PAY_TYPE, REQ_ID, CUST_ID, PG_MID, 
                CARD_CODE, CARD_NAME, CARD_MASK_NO, PAY_YYMM, PLAN_DATE, 
                PAY_AMOUNT, PAY_STATUS, PG_TID, PG_RESULT_CODE, PG_RESULT_MSG, 
                COMPLETE_DT, REG_ID, REG_DT, MOD_ID, MOD_DT
            ) VALUES (
                ?, ?, 'ONETIME', ?, ?, ?, 
                ?, ?, ?, DATE_FORMAT(NOW(), '%Y%m'), CURDATE(), 
                ?, 'SUCCESS', ?, ?, ?, 
                NOW(), ?, NOW(), ?, NOW()
            )`,
            [
                payId, orderNo || `ORD-${Date.now()}`, reqId || null, custId || 'UNKNOWN', pgMid || process.env.INICIS_MID || 'INIpayTest',
                cardCode, cardName, cardMaskNo,
                payAmount || 0, pgTid || null, pgResultCode, pgResultMsg,
                custId || 'UNKNOWN', custId || 'UNKNOWN'
            ]
        );
        console.log(`>>> [TB_PAYMENT_MASTER] Inserted PAY_ID: ${payId} for Order: ${orderNo}, Amount: ${payAmount}`);
        return payId;
    } catch (err) {
        console.error('>>> [TB_PAYMENT_MASTER] Insert Error:', err);
        return null;
    }
}

/**
 * TB_PAYMENT_CANCEL_HISTORY 카드 결제 취소 이력 적재 및 TB_PAYMENT_MASTER 상태 변경 헬퍼 함수
 */
async function insertPaymentCancelHistory(connection, p) {
    try {
        const {
            payId,
            reqId,
            cancelAmount,
            cancelReason,
            pgTid,
            regId
        } = p;

        const cancelId = 'CN' + Date.now() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');

        await connection.execute(
            `INSERT INTO TB_PAYMENT_CANCEL_HISTORY (
                CANCEL_ID, BAT_ID, CANCEL_AMOUNT, CANCEL_REASON, CANCEL_STATUS, 
                PG_TID, REG_ID, REG_DT, MOD_ID, MOD_DT
            ) VALUES (
                ?, ?, ?, ?, 'SUCCESS', 
                ?, ?, NOW(), ?, NOW()
            )`,
            [
                cancelId, payId || reqId || 'CANCEL_NONE', cancelAmount || 0, cancelReason || '여행 취소',
                pgTid || null, regId || 'SYSTEM', regId || 'SYSTEM'
            ]
        );

        if (pgTid) {
            await connection.execute(
                `UPDATE TB_PAYMENT_MASTER SET PAY_STATUS = 'FAIL', MOD_ID = ?, MOD_DT = NOW() WHERE PG_TID = ?`,
                [regId || 'SYSTEM', pgTid]
            );
        } else if (reqId) {
            await connection.execute(
                `UPDATE TB_PAYMENT_MASTER SET PAY_STATUS = 'FAIL', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ?`,
                [regId || 'SYSTEM', reqId]
            );
        }

        console.log(`>>> [TB_PAYMENT_CANCEL_HISTORY] Inserted CANCEL_ID: ${cancelId} for Amount: ${cancelAmount}`);
        return cancelId;
    } catch (err) {
        console.error('>>> [TB_PAYMENT_CANCEL_HISTORY] Insert Error:', err);
        return null;
    }
}

/**
 * TB_AUCTION_REQ_BUS의 개별 차량들의 DATA_STAT를 검사하여 
 * 마스터 TB_AUCTION_REQ 상태를 업데이트합니다.
 */
async function checkAndUpdateMasterStatus(connection, reqId, modId = 'SYSTEM') {
    const [busRows] = await connection.execute(
        `SELECT DATA_STAT, COUNT(*) as cnt 
         FROM TB_AUCTION_REQ_BUS 
         WHERE REQ_ID = ? 
         GROUP BY DATA_STAT`,
        [reqId]
    );

    const statusCounts = {};
    let totalBuses = 0;
    for (const r of busRows) {
        statusCounts[r.DATA_STAT] = Number(r.cnt);
        totalBuses += Number(r.cnt);
    }

    if (totalBuses === 0) return;

    if (statusCounts['CONFIRM'] === totalBuses) {
        await connection.execute(
            `UPDATE TB_AUCTION_REQ SET DATA_STAT = 'CONFIRM', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ?`,
            [modId, reqId]
        );
    } else if ((statusCounts['FINAL_APPROVAL_WAIT'] || 0) > 0 && (statusCounts['FINAL_APPROVAL_WAIT'] || 0) + (statusCounts['CONFIRM'] || 0) === totalBuses) {
        await connection.execute(
            `UPDATE TB_AUCTION_REQ SET DATA_STAT = 'FINAL_APPROVAL_WAIT', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ?`,
            [modId, reqId]
        );
    } else if ((statusCounts['DRIVER_PAY_WAIT'] || 0) > 0 || (statusCounts['FINAL_APPROVAL_WAIT'] || 0) > 0) {
        // 기사 결제 대기 또는 최종 승인 대기 단계 버스가 존재할 경우 마스터도 DRIVER_PAY_WAIT 이상으로 유지
        await connection.execute(
            `UPDATE TB_AUCTION_REQ SET DATA_STAT = 'DRIVER_PAY_WAIT', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ?`,
            [modId, reqId]
        );
    } else if ((statusCounts['CUSTOMER_PAY_WAIT'] || 0) > 0) {
        await connection.execute(
            `UPDATE TB_AUCTION_REQ SET DATA_STAT = 'CUSTOMER_PAY_WAIT', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ?`,
            [modId, reqId]
        );
    } else {
        await connection.execute(
            `UPDATE TB_AUCTION_REQ SET DATA_STAT = 'AUCTION', MOD_ID = ?, MOD_DT = NOW() WHERE REQ_ID = ?`,
            [modId, reqId]
        );
    }
}

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
            console.log(`>>> [updateDBAfterPayment RES] Updating customer payment to DRIVER_PAY_WAIT for RES_ID: ${targetId}`);
            
            const [bidRows] = await connection.execute('SELECT REQ_ID, REQ_BUS_SEQ FROM TB_BUS_RESERVATION WHERE RES_ID = ?', [targetId]);
            if (bidRows.length > 0) {
                const { REQ_ID: reqId, REQ_BUS_SEQ: unitSeq } = bidRows[0];

                // 1. TB_BUS_RESERVATION 결제 정보 적재 및 상태 전이 (해당 버스 개별)
                await connection.execute(
                    `UPDATE TB_BUS_RESERVATION 
                     SET DATA_STAT = 'DRIVER_PAY_WAIT',
                         CUSTOMER_PAY_STAT = 'Y',
                         CUSTOMER_PAY_AMT = ?,
                         CUSTOMER_PAY_DT = NOW(),
                         CUSTOMER_PAY_ID = ?,
                         MOD_DT = NOW() 
                     WHERE RES_ID = ?`,
                    [finalAmt, tid || `PAY-CUST-${Date.now()}`, targetId]
                );

                // 2. TB_AUCTION_REQ_BUS 상태를 DRIVER_PAY_WAIT으로 변경 (해당 버스 슬롯 개별)
                await connection.execute(
                    `UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = 'DRIVER_PAY_WAIT', MOD_DT = NOW() 
                     WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?`,
                    [reqId, unitSeq]
                );

                // 3. TB_PAYMENT_MASTER 결제 이력 저장 (고객 단건 결제)
                const [custRows] = await connection.execute('SELECT CUST_ID FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [reqId]);
                const custId = custRows.length > 0 ? custRows[0].CUST_ID : 'CUSTOMER';
                await insertPaymentMaster(connection, {
                    orderNo: oid,
                    reqId: reqId,
                    custId: custId,
                    payAmount: finalAmt,
                    pgTid: tid
                });

                // 4. TB_AUCTION_REQ 마스터 상태 변경
                await checkAndUpdateMasterStatus(connection, reqId, 'CUSTOMER');

                // 5. 해당 버스 기사에게 PUSH 알림 전송
                await sendDriverPaymentPushNotification(connection, reqId, unitSeq, targetId);
            }
        } else if (type === 'REQ') {
            if (now <= limitDate && finalAmt === 1100) {
                console.log(`>>> [TEST PAYMENT OVERRIDE] Restoring database recorded amount to 33,000 KRW (paid: 1,100 KRW)`);
                finalAmt = 33000;
            }
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
                 WHERE REQ_ID = ? AND DATA_STAT NOT IN ('FINAL_APPROVAL_WAIT', 'CONFIRM', 'DONE')`,
                [finalAmt, tid || `PAY-CUST-${Date.now()}`, targetId]
            );

            // 2. TB_AUCTION_REQ_BUS 상태를 DRIVER_PAY_WAIT으로 변경
            await connection.execute(
                `UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = 'DRIVER_PAY_WAIT', MOD_DT = NOW() 
                 WHERE REQ_ID = ? AND DATA_STAT NOT IN ('FINAL_APPROVAL_WAIT', 'CONFIRM', 'DONE')`,
                [targetId]
            );

            // 3. TB_PAYMENT_MASTER 결제 이력 저장 (고객 전체 결제)
            const [custRows] = await connection.execute('SELECT CUST_ID FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [targetId]);
            const custId = custRows.length > 0 ? custRows[0].CUST_ID : 'CUSTOMER';
            await insertPaymentMaster(connection, {
                orderNo: oid,
                reqId: targetId,
                custId: custId,
                payAmount: finalAmt,
                pgTid: tid
            });

            // 4. TB_AUCTION_REQ 마스터 상태 변경
            await checkAndUpdateMasterStatus(connection, targetId, 'CUSTOMER');

            // 5. 전체 예약 건에 연동된 기사들에게 각각 PUSH 알림 전송
            const [bids] = await connection.execute(
                `SELECT RES_ID, REQ_BUS_SEQ FROM TB_BUS_RESERVATION WHERE REQ_ID = ?`,
                [targetId]
            );
            for (const bid of bids) {
                await sendDriverPaymentPushNotification(connection, targetId, bid.REQ_BUS_SEQ, bid.RES_ID);
            }
        } else if (type === 'DRV') {
            // 기사 데이터 이용료 결제 완료 처리 -> 기사 개별 레코드 FINAL_APPROVAL_WAIT 변경 및 마스터 상태 체크
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

                // 1. TB_BUS_RESERVATION 기사 결제 완료 업데이트 및 개별 상태를 'FINAL_APPROVAL_WAIT' (고객 최종 승인대기)로 변경
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

                // 2. TB_AUCTION_REQ_BUS 개별 차량 슬롯 상태도 'FINAL_APPROVAL_WAIT'로 변경
                const [bRows] = await connection.execute('SELECT REQ_BUS_SEQ FROM TB_BUS_RESERVATION WHERE RES_ID = ?', [targetId]);
                if (bRows.length > 0) {
                    const { REQ_BUS_SEQ: uSeq } = bRows[0];
                    await connection.execute(
                        `UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = 'FINAL_APPROVAL_WAIT', MOD_ID = ?, MOD_DT = NOW() 
                         WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?`,
                        [driverId, reqId, uSeq]
                    );
                }

                // 3. TB_PAYMENT_MASTER 결제 이력 저장 (기사 결제)
                await insertPaymentMaster(connection, {
                    orderNo: oid,
                    reqId: reqId,
                    custId: driverId,
                    payAmount: dynamic.feeTotalAmt,
                    pgTid: tid
                });

                // 4. TB_AUCTION_REQ 마스터 상태도 모든 버스가 결제 완료되었을 때만 'FINAL_APPROVAL_WAIT'로 변경
                await checkAndUpdateMasterStatus(connection, reqId, driverId);

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
    /**
     * 이니시스 인증 완료 후 POST 방식으로 리다이렉트되는 경로 (/return, /pc-return, /mobile-return)
     */
    const handlePaymentReturn = async (req, res) => {
        console.log('>>> [Payment Return] Body:', req.body);
        
        // 헬퍼: HTML 응답 생성 (프론트엔드로 리다이렉트)
        const sendHtmlResponse = (msg, redirectPath) => {
            const referer = req.get('referer');
            let frontOrigin = '';
            const hostHeader = req.get('x-forwarded-host') || req.get('host');
            
            if (hostHeader && hostHeader.includes('cafe24.com')) {
                frontOrigin = 'https://bustaams.cafe24.com';
            } else if (referer) {
                const url = new URL(referer);
                frontOrigin = url.origin;
            } else {
                frontOrigin = `${req.get('x-forwarded-proto') || req.protocol}://${hostHeader ? hostHeader.split(':')[0] : 'bustaams.cafe24.com'}:5174`;
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
                const targetMid = P_MID || MID;
                console.log(`>>> [Mobile Approval Request] URL: ${P_REQ_URL}, MID: ${targetMid}, TID: ${P_TID}, OID: ${P_OID}`);

                const approvalRes = await axios.post(P_REQ_URL, 
                    `P_MID=${targetMid}&P_TID=${P_TID}`, 
                    { 
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        responseType: 'arraybuffer'
                    }
                );

                const resultStr = iconv.decode(Buffer.from(approvalRes.data), 'euc-kr');
                console.log('>>> [Payment Mobile Approval] Result:', resultStr);

                const resultParams = new URLSearchParams(resultStr);
                const status = resultParams.get('P_STATUS');
                const amt = resultParams.get('P_AMT');
                const msg = resultParams.get('P_RMESG1');
                const tid = resultParams.get('P_TID') || P_TID;
                const oid = resultParams.get('P_OID') || P_OID;

                if (status === '00') {
                    const connection = await pool.getConnection();
                    try {
                        await connection.beginTransaction();
                        await updateDBAfterPayment(oid, connection, tid, amt);
                        await connection.commit();

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
    };

    router.post('/return', handlePaymentReturn);
    router.post('/pc-return', handlePaymentReturn);
    router.post('/mobile-return', handlePaymentReturn);

    return router;
};
