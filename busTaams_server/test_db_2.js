const mysql = require('mysql2/promise');
const { decrypt } = require('./crypto');
require('dotenv').config();

async function test() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const [rows] = await pool.execute('SELECT TB_USER.* FROM TB_USER');
    for (const r of rows) {
        try { r.USER_NM ? decrypt(r.USER_NM) : null; } catch(e) { console.error("NM ERR:", r.USER_ID_ENC, e.message); }
        try { r.HP_NO ? decrypt(r.HP_NO) : null; } catch(e) { console.error("HP_NO ERR:", r.USER_ID_ENC, e.message); throw e; }
    }
    console.log("All clear");
    process.exit(0);
}
test().catch(console.error);
