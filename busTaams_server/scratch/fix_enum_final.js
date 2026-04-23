const { pool } = require('../db');

async function fixEnum() {
    try {
        const sql = `ALTER TABLE TB_SMS_LOG 
                     MODIFY SEND_CATEGORY ENUM(
                        'AUCTION', 'BIDDING', 'CONFIRM', 'DONE', 'TRAVELER_CANCEL', 
                        'DRIVER_CANCEL', 'BUS_CHANGE', 'BUS_CANCEL', 'SIGN_UP', 
                        'NEW_PASSWORD', 'OTHER', 'REQ_REG', 'NEW_BID', 'RES_CANCEL', 
                        'ETC', 'JOIN', 'NEWPW'
                     ) NOT NULL DEFAULT 'ETC'`;
        await pool.execute(sql);
        console.log('TB_SMS_LOG ENUM updated successfully! ✅');
    } catch (err) {
        console.error('Failed to update ENUM:', err.message);
    } finally {
        process.exit();
    }
}

fixEnum();
