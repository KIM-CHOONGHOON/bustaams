const { pool } = require('../db');

async function check() {
    try {
        const [req] = await pool.execute('SELECT * FROM TB_AUCTION_REQ WHERE REQ_ID = "0000000001"');
        console.log('Request:', req);
        const [vias] = await pool.execute('SELECT * FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = "0000000001"');
        console.log('Vias:', vias);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
