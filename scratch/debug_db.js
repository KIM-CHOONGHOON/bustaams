const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../busTaams_server/.env' });

async function debugDB() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '1234',
        database: process.env.DB_NAME || 'bustaams',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        console.log('--- TB_USER Check ---');
        const [users] = await pool.execute('SELECT USER_ID, CUST_ID, USER_NM FROM TB_USER');
        console.table(users);

        console.log('\n--- TB_AUCTION_REQ Check ---');
        const [requests] = await pool.execute('SELECT REQ_ID, TRAVELER_ID, TRIP_TITLE, DATA_STAT FROM TB_AUCTION_REQ');
        console.table(requests);

        if (requests.length > 0) {
            console.log('\n--- Checking matches for first user ---');
            const targetUserId = users[0].USER_ID;
            const targetCustId = users[0].CUST_ID;
            console.log(`User ID: ${targetUserId}, Cust ID: ${targetCustId}`);
            
            const [matches] = await pool.execute(
                'SELECT * FROM TB_AUCTION_REQ WHERE TRAVELER_ID = ? OR TRAVELER_ID = ?',
                [targetUserId, targetCustId]
            );
            console.log(`Found ${matches.length} matches for this user.`);
            console.table(matches);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

debugDB();
