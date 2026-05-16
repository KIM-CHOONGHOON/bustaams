const { pool } = require('../db');

async function checkData() {
    try {
        const [rows] = await pool.execute('SELECT * FROM TB_BUS_RESERVATION WHERE RES_ID = ?', ['0000000003']);
        console.log('TB_BUS_RESERVATION:', JSON.stringify(rows, null, 2));

        if (rows.length > 0) {
            const reqId = rows[0].REQ_ID;
            const [reqRows] = await pool.execute('SELECT * FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [reqId]);
            console.log('TB_AUCTION_REQ:', JSON.stringify(reqRows, null, 2));

            const [reqBusRows] = await pool.execute('SELECT * FROM TB_AUCTION_REQ_BUS WHERE REQ_ID = ?', [reqId]);
            console.log('TB_AUCTION_REQ_BUS:', JSON.stringify(reqBusRows, null, 2));
        } else {
            console.log('No reservation found for RES_ID 0000000003');
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkData();
