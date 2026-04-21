const { pool } = require('./db');

async function updateSchema() {
    try {
        console.log('Updating TB_SMS_LOG Enum...');
        const sql = `
            ALTER TABLE TB_SMS_LOG 
            MODIFY COLUMN SEND_CATEGORY ENUM('REQ_REG','NEW_BID','CONFIRM','REQ_CANCEL','RES_CANCEL','ETC','JOIN') 
            NOT NULL DEFAULT 'ETC'
        `;
        await pool.execute(sql);
        console.log('Successfully updated SEND_CATEGORY enum.');
    } catch (err) {
        console.error('Update Schema Error:', err);
    } finally {
        await pool.end();
    }
}

updateSchema();
