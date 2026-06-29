const https = require('https');
const querystring = require('querystring');
const { pool } = require('../db');

/**
 * BusTaams 통신 처리 서비스
 */
const btCommHandler = {
    /**
     * 외부 통신(SMS 등) 발송 및 로그 기록
     * @param {object} params 
     * @param {string} params.receiver 수신번호 (숫자만)
     * @param {string} params.message 메시지 내용
     * @param {string} params.category 발송 카테고리 (JOIN, AUTH, NOTICE 등)
     * @param {string} [params.senderId] 발송자 CUST_ID
     * @param {string} [params.receiverId] 수신자 CUST_ID
     * @param {string} [params.reqId] 연관 REQ_ID
     */
    sendSms: async (params) => {
        const { receiver, message, category, senderId, receiverId, reqId } = params;
        
        const userId = process.env.ALIGO_USER_ID;
        const apiKey = process.env.ALIGO_API_KEY;
        const sender = process.env.ALIGO_SENDER; // Antigravity_env.env의 ALIGO_SENDER 사용
        const testMode = process.env.ALIGO_TEST_MODE === 'true';

        console.log(`[COMM] Attempting to notify ${receiver}: ${message.substring(0, 20)}...`);

        let sendStat = 'PENDING';
        let errorMsg = null;

        // 1. API Key가 없거나 테스트 모드인 경우 실제 발송 스킵
        if (!apiKey || testMode) {
            console.log('[COMM] Test Mode or Missing API Key. Skipping actual network call.');
            sendStat = 'SUCCESS'; 
            errorMsg = !apiKey ? '(테스트) Key 미등록' : '(테스트) TEST_MODE 활성화';
            
            await btCommHandler.saveLog({
                reqId,
                category,
                senderId,
                receiverId,
                receiverPhone: receiver,
                content: message,
                stat: sendStat,
                error: errorMsg
            });
            
            return { success: true, message: '알림 처리 완료 (DB 기록 완료)' };
        }

        // 2. 실제 API 호출
        return new Promise((resolve, reject) => {
            const postData = querystring.stringify({
                key: apiKey,
                userid: userId,
                sender: sender,
                receiver: receiver,
                msg: message,
                msg_type: message.length > 90 ? 'LMS' : 'SMS'
            });

            const options = {
                hostname: 'apis.aligo.in',
                path: '/send/',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', async () => {
                    try {
                        const result = JSON.parse(body);
                        const isSuccess = result.result_code === '1';
                        
                        await btCommHandler.saveLog({
                            reqId,
                            category,
                            senderId,
                            receiverId,
                            receiverPhone: receiver,
                            content: message,
                            stat: isSuccess ? 'SUCCESS' : 'FAIL',
                            error: isSuccess ? null : `Code: ${result.result_code}, Msg: ${result.message}`,
                            msgType: message.length > 90 ? 'LMS' : 'SMS'
                        });

                        resolve({ success: isSuccess, data: result });
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            req.on('error', async (e) => {
                await btCommHandler.saveLog({
                    reqId,
                    category,
                    senderId,
                    receiverId,
                    receiverPhone: receiver,
                    content: message,
                    stat: 'FAIL',
                    error: `Network Error: ${e.message}`
                });
                reject(e);
            });

            req.write(postData);
            req.end();
        });
    },

    /**
     * TB_SMS_LOG 테이블에 기록 저장
     */
    saveLog: async (data) => {
        const { reqId, category, senderId, receiverId, receiverPhone, content, stat, error, msgType = 'SMS' } = data;
        try {
            const query = `
                INSERT INTO TB_SMS_LOG (
                    REQ_ID, SEND_CATEGORY, SENDER_ID, RECEIVER_ID, 
                    RECEIVER_PHONE, MSG_CONTENT, MSG_TYPE, SEND_STAT, ERROR_MSG, 
                    REG_DT, REG_ID
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
            `;
            await pool.execute(query, [
                reqId || null,
                category || 'ETC',
                senderId || null,
                receiverId || null,
                receiverPhone,
                content,
                msgType,
                stat,
                error || null,
                senderId || 'SYSTEM'
            ]);
        } catch (e) {
            console.error('[COMM_LOG_ERROR]', e);
        }
    }
};

module.exports = btCommHandler;
