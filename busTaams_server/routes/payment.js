const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
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
    router.post('/ready', async (req, res) => {
        console.log('>>> [Payment Ready] Requested:', req.body);
        try {
            const { price, goodname, buyername, buyertel, buyeremail, resId, reqId } = req.body;

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

            // Signature 생성: SHA256(oid + price + timestamp + signKey)
            const signatureStr = `oid=${oid}&price=${price}&timestamp=${timestamp}`;
            const signature = crypto.createHmac('sha256', SIGN_KEY)
                .update(signatureStr)
                .digest('hex');

            // verification용 mKey 생성: SHA256(signKey)
            const mKey = crypto.createHash('sha256')
                .update(SIGN_KEY)
                .digest('hex');

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
                returnUrl: `${req.protocol}://${req.get('host')}/api/payment/return`
            };

            console.log('>>> [Payment Ready] Success response data prepared');
            res.json(responseData);
        } catch (err) {
            console.error('>>> [Payment Ready] Critical Error:', err);
            res.status(500).json({ error: '결제 준비 중 오류가 발생했습니다.', detail: err.message });
        }
    });

    /**
     * POST /api/payment/return
     * 이니시스 인증 완료 후 리다이렉트되는 경로
     */
    router.post('/return', async (req, res) => {
        console.log('Payment Return Data:', req.body);
        
        const { resultCode, resultMsg, authToken, authUrl, mid } = req.body;

        if (resultCode !== '0000') {
            return res.send(`
                <script>
                    alert('결제 인증 실패: ${resultMsg}');
                    window.location.href = '/approval-list';
                </script>
            `);
        }

        try {
            const timestamp = new Date().getTime();
            const signatureStr = `authToken=${authToken}&timestamp=${timestamp}`;
            const signature = crypto.createHmac('sha256', SIGN_KEY)
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

            console.log('Payment Approval Result:', result);

            if (result.resultCode === '0000') {
                // 결제 성공! DB 업데이트
                const oid = result.MOID; // 결제 시 보냈던 주문번호
                
                // oid 파싱: BUS_RES_{resId}_{ts} 또는 BUS_REQ_{reqId}_{ts}
                const parts = oid.split('_');
                const type = parts[1]; // RES 또는 REQ
                const targetId = parts[2]; // resId 또는 reqId

                const connection = await pool.getConnection();
                try {
                    await connection.beginTransaction();

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

                    await connection.commit();
                    
                    res.send(`
                        <script>
                            alert('결제가 성공적으로 완료되었습니다.');
                            window.location.href = '/customer-dashboard';
                        </script>
                    `);
                } catch (dbErr) {
                    await connection.rollback();
                    console.error('DB Update Error after payment:', dbErr);
                    res.send(`<script>alert('결제는 성공했으나 데이터 업데이트 중 오류가 발생했습니다. 고객센터에 문의해주세요.'); window.location.href = '/customer-dashboard';</script>`);
                } finally {
                    connection.release();
                }
            } else {
                res.send(`
                    <script>
                        alert('결제 승인 실패: ${result.resultMsg}');
                        window.location.href = '/approval-list';
                    </script>
                `);
            }
        } catch (err) {
            console.error('Payment Approval Error:', err);
            res.status(500).send('결제 승인 처리 중 오류가 발생했습니다.');
        }
    });

    return router;
};
