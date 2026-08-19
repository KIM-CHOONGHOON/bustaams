const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [rows] = await pool.execute(`SELECT * FROM TB_PAYMENT_MASTER ORDER BY REG_DT DESC LIMIT 3`);
        console.log("Recent payments:");
        console.table(rows);
    } catch(e) {
        console.error('ERROR:', e.message);
    }
    process.exit(0);
}

check();
