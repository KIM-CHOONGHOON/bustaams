
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../busTaams_server/.env' });

async function check() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });

    try {
        const idParam = '0000000005';
        console.log(`idParam: '${idParam}'`);

        const [reqCheck] = await pool.execute('SELECT REQ_ID FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [idParam]);
        console.log(`reqCheck length: ${reqCheck.length}`);

        if (reqCheck.length === 0) {
            const [resCheck] = await pool.execute('SELECT REQ_ID FROM TB_BUS_RESERVATION WHERE RES_ID = ?', [idParam]);
            console.log(`resCheck length: ${resCheck.length}`);
            if (resCheck.length > 0) {
                const reqId = resCheck[0].REQ_ID;
                console.log(`Resolved reqId: '${reqId}' (type: ${typeof reqId})`);
                
                const [rows] = await pool.execute('SELECT REQ_ID FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [reqId]);
                console.log(`Final query rows length: ${rows.length}`);
                if (rows.length > 0) {
                    console.log(`Matched REQ_ID: '${rows[0].REQ_ID}'`);
                }
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

check();
