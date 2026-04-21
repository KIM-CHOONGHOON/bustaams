const { pool } = require('../db');

async function updateEnum() {
    try {
        const sql = `ALTER TABLE TB_SMS_LOG MODIFY SEND_CATEGORY ENUM('REQ_REG','NEW_BID','CONFIRM','REQ_CANCEL','RES_CANCEL','ETC','JOIN','NEWPW') NOT NULL DEFAULT 'ETC'`;
        await pool.execute(sql);
        console.log('TB_SMS_LOG ENUM Updated successfully! ✅');
        process.exit(0);
    } catch (err) {
        console.error('Error updating ENUM:', err.message);
        process.exit(1);
    }
}

updateEnum();
