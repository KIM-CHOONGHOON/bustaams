const mysql = require('mysql2/promise');
const dbConfig = {
    host: '127.0.0.1',
    port: 3307,
    user: 'master',
    password: '!QAZ2wsx2026@',
    database: 'bustaams'
};

async function sync() {
    const connection = await mysql.createConnection(dbConfig);
    try {
        console.log('Syncing USER_UUID and USER_TYPE in TB_USER_CANCEL_MANAGE...');
        
        // Update TRAVELERs
        await connection.execute(`
            UPDATE TB_USER_CANCEL_MANAGE m
            JOIN TB_USER u ON m.CUST_ID = u.CUST_ID
            SET m.USER_UUID = u.USER_UUID,
                m.USER_TYPE = u.USER_TYPE
            WHERE m.USER_UUID IS NULL OR m.USER_TYPE = 'TRAVELER'
        `);

        // If a user is a driver but has no entry in CANCEL_MANAGE with DRIVER type, create it?
        // Actually, the current logic seems to create a 'DRIVER' row on the fly in appDriver.js if missing.
        // Let's check appDriver.js line 1483.
        
        console.log('Sync completed.');
    } catch (err) {
        console.error('Sync failed:', err);
    } finally {
        await connection.end();
    }
}
sync();
