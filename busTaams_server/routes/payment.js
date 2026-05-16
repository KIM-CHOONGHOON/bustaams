const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const iconv = require('iconv-lite');
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
    
    /**
     * POST /api/payment/ready
     * 결제 요청 전 서명 및 필수 데이터 생성
     */
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
            const [bidRows] = await connection.execute('SELECT REQ_ID, REQ_BUS_SEQ FROM TB_BUS_RESERVATION WHERE RES_ID = ?', [targetId]);
            if (bidRows.length > 0) {
                const { REQ_ID: reqId, REQ_BUS_SEQ: unitSeq } = bidRows[0];
                await connection.execute('UPDATE TB_BUS_RESERVATION SET DATA_STAT = "CONFIRM", CONFIRM_DT = NOW() WHERE RES_ID = ?', [targetId]);
                await connection.execute('UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = "CONFIRM" WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?', [reqId, unitSeq]);

                // 모든 차량 확정 확인
                const [busStats] = await connection.execute(
                    'SELECT COUNT(*) as total, SUM(CASE WHEN DATA_STAT = "CONFIRM" THEN 1 ELSE 0 END) as confirmed FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ?',
                    [reqId]
                );
                if (busStats[0].total > 0 && busStats[0].total === busStats[0].confirmed) {
                    await connection.execute('UPDATE TB_AUCTION_REQ SET DATA_STAT = "CONFIRM", MOD_DT = NOW() WHERE REQ_ID = ?', [reqId]);
                }
            }
        } else if (type === 'REQ') {
            // 전체 승인 로직 (reqId)
            const [bids] = await connection.execute(`
                SELECT RES_ID, REQ_BUS_SEQ 
                FROM TB_BUS_RESERVATION 
                WHERE REQ_ID = ? AND DATA_STAT = 'BIDDING'
                GROUP BY REQ_BUS_SEQ
            `, [targetId]);

            for (const bid of bids) {
                await connection.execute('UPDATE TB_BUS_RESERVATION SET DATA_STAT = "CONFIRM", CONFIRM_DT = NOW() WHERE RES_ID = ?', [bid.RES_ID]);
                await connection.execute('UPDATE TB_AUCTION_REQ_BUS SET DATA_STAT = "CONFIRM" WHERE REQ_ID = ? AND REQ_BUS_SEQ = ?', [targetId, bid.REQ_BUS_SEQ]);
            }
            await connection.execute('UPDATE TB_AUCTION_REQ SET DATA_STAT = "CONFIRM" WHERE REQ_ID = ?', [targetId]);
        }
    };

    router.post('/ready', async (req, res) => {
        console.log('>>> [Payment Ready] Requested:', req.body);
        try {
            let { price, goodname, buyername, buyertel, buyeremail, resId, reqId } = req.body;
            // price = 1000; // 실제 금액 사용을 위해 하드코딩 주석 처리 또는 제거

            if (!price) {
                console.warn('>>> [Payment Ready] Missing price');
                return res.status(400).json({ error: '결제 금액(price)이 필요합니다.' });
            }

            const timestamp = new Date().getTime();
            
            // 주문번호(oid) 생성: 결제 대상 정보를 포함하여 생성
            let oid = '';
            if (resId) {
                oid = `BUS_RES_${resId}_${timestamp}`;
            } else if (reqId) {
                oid = `BUS_REQ_${reqId}_${timestamp}`;
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
            const protocol = req.get('x-forwarded-proto') || req.protocol;
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
                        await connection.commit();

                        // oid에서 reqId 또는 resId 추출 (예: BUS_REQ_123_timestamp)
                        const parts = oid.split('_');
                        const type = parts[1];
                        const targetId = parts[2];
                        let redirectPath = '/customer-dashboard';
                        
                        if (type === 'REQ') {
                            redirectPath = `/customer/approval-list?reqId=${targetId}&payResult=success`;
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
                    sendHtmlResponse(`모바일 결제 승인 실패: ${msg || '알 수 없는 오류'}`, '/approval-list');
                }
            } catch (err) {
                console.error('Mobile Approval Critical Error:', err);
                res.status(500).send('모바일 결제 승인 처리 중 오류 발생');
            }
            return;
        }

        // 2. PC 웹표준 결제 처리
        const { resultCode, resultMsg, authToken, authUrl, mid } = req.body;

        if (resultCode !== '0000') {
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
                    await connection.commit();

                    const oid = result.MOID;
                    const parts = oid.split('_');
                    const targetId = parts[2];
                    const redirectPath = parts[1] === 'REQ' 
                        ? `/customer/approval-list?reqId=${targetId}&payResult=success`
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
                sendHtmlResponse(`결제 승인 실패: ${result.resultMsg}`, '/approval-list');
            }
        } catch (err) {
            console.error('PC Approval Critical Error:', err);
            res.status(500).send('결제 승인 처리 중 오류가 발생했습니다.');
        }
    });

    return router;
};
