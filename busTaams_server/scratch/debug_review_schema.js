const mysql = require('mysql2/promise');

async function checkSchema() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3307,
        user: 'master',
        password: '!QAZ2wsx2026@',
        database: 'bustaams'
    });

    try {
        const tables = ['TB_TRIP_REVIEW', 'TB_BUS_RESERVATION', 'TB_AUCTION_REQ', 'TB_AUCTION_REQ_VIA', 'TB_BUS_DRIVER_VEHICLE'];
        for (const table of tables) {
            try {
                const [desc] = await connection.execute(`DESCRIBE ${table}`);
                console.log(`--- ${table} ---`);
                console.table(desc);
            } catch (e) {
                console.error(`Table ${table} does not exist or error:`, e.message);
            }
        }

        console.log('\n--- Checking data for RES_ID 0000000001 ---');
        const [rows] = await connection.execute(`
            SELECT 
                rev.RES_ID,
                b.REQ_ID,
                b.DRIVER_ID,
                b.BUS_ID
            FROM TB_TRIP_REVIEW rev
            LEFT JOIN TB_BUS_RESERVATION b ON rev.RES_ID = b.RES_ID
            WHERE rev.RES_ID = '0000000001'
        `);
        console.log('Reservation Linkage:', JSON.stringify(rows, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

checkSchema();
