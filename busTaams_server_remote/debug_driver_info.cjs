const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function checkData() {
    let connection;
    try {
        console.log(`Connecting to ${process.env.DB_HOST}:${process.env.DB_PORT} as ${process.env.DB_USER}, DB: ${process.env.DB_NAME}`);
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: parseInt(process.env.DB_PORT)
        });

        console.log('--- TB_AUCTION_REQ (DONE 상태) ---');
        const [reqs] = await connection.execute(
            'SELECT REQ_ID, TRIP_TITLE, TRAVELER_ID, DATA_STAT FROM TB_AUCTION_REQ WHERE DATA_STAT = "DONE" LIMIT 5'
        );
        console.table(reqs);

        for (const req of reqs) {
            const reqId = req.REQ_ID;
            console.log(`\n--- TB_BUS_RESERVATION (REQ_ID: ${reqId}) ---`);
            const [res] = await connection.execute(
                'SELECT RES_ID, REQ_ID, REQ_BUS_SEQ, DRIVER_ID, DATA_STAT FROM TB_BUS_RESERVATION WHERE REQ_ID = ?',
                [reqId]
            );
            console.table(res);

            for (const r of res) {
                if (r.DRIVER_ID) {
                    console.log(`  -> TB_USER (CUST_ID: ${r.DRIVER_ID})`);
                    const [users] = await connection.execute(
                        'SELECT CUST_ID, USER_ID, USER_NM FROM TB_USER WHERE CUST_ID = ?',
                        [r.DRIVER_ID]
                    );
                    if (users.length > 0) {
                        console.table(users);
                    } else {
                        console.log(`     !!! 경고: CUST_ID [${r.DRIVER_ID}] 매칭 실패 !!!`);
                    }
                }
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        if (connection) await connection.end();
    }
}

checkData();
