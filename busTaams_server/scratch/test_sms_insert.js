const { pool } = require('../db');

async function testSmsInsert() {
    try {
        const phoneNo = '01012345678';
        const authCode = '123456';
        const sendCategory = 'NEW_PASSWORD';
        const msgContent = `[busTaams] 본인확인 인증번호 [${authCode}]를 입력해주세요.`;

        console.log('Testing TB_SMS_LOG insertion...');
        
        const logQuery = `
            INSERT INTO TB_SMS_LOG (
                SEND_CATEGORY, RECEIVER_ID, RECEIVER_PHONE, MSG_CONTENT, MSG_TYPE, SEND_STAT, REG_DT
            ) VALUES (?, '0000000000', ?, ?, 'SMS', 'SUCCESS', NOW())
        `;

        const [result] = await pool.execute(logQuery, [sendCategory, phoneNo, msgContent]);
        
        console.log('Insertion successful! ✅');
        console.log('Inserted ID (LOG_SEQ):', result.insertId);

        // Verify the record
        const [rows] = await pool.execute('SELECT * FROM TB_SMS_LOG WHERE LOG_SEQ = ?', [result.insertId]);
        console.log('Inserted record:', rows[0]);

    } catch (err) {
        console.error('Insertion failed: ❌', err);
    } finally {
        process.exit();
    }
}

testSmsInsert();
