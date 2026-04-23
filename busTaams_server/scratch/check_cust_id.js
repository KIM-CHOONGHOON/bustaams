const { pool } = require('../db');

async function checkUsers() {
    try {
        const [rows] = await pool.execute('SELECT CUST_ID, USER_ID, USER_NM FROM TB_USER');
        console.log('--- TB_USER Data Check ---');
        console.table(rows);
        
        const nullCount = rows.filter(r => !r.CUST_ID).length;
        console.log(`\nTotal Users: ${rows.length}`);
        console.log(`Users without CUST_ID: ${nullCount}`);
    } catch (err) {
        console.error('Check failed:', err);
    } finally {
        process.exit();
    }
}

checkUsers();
