const pool = require('../db');

async function checkRecentSmsLogs() {
    try {
        const [rows] = await pool.execute('SELECT * FROM TB_SMS_LOG ORDER BY REG_DT DESC LIMIT 10');
        console.log('--- Recent SMS Logs ---');
        rows.forEach(row => {
            console.log(`[${row.REG_DT}] To: ${row.RECEIVER_PHONE}, Stat: ${row.SEND_STAT}, Category: ${row.SEND_CATEGORY}`);
            if (row.ERROR_MSG) console.log(`   Error: ${row.ERROR_MSG}`);
            console.log(`   Content: ${row.MSG_CONTENT.substring(0, 30)}...`);
            console.log('---');
        });
    } catch (e) {
        console.error('Error fetching logs:', e);
    } finally {
        process.exit();
    }
}

checkRecentSmsLogs();
