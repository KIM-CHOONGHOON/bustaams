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

    const [rows] = await pool.execute('SELECT BIN_TO_UUID(USER_UUID) as uuid, TB_USER.* FROM TB_USER');
    console.log("Total Users in DB:", rows.length);
    for (const r of rows) {
        let decId;
        try { decId = r.USER_ID_ENC ? decrypt(r.USER_ID_ENC) : null; } catch(e) { decId = 'ERR:' + e.message; }
        let decNm;
        try { decNm = r.USER_NM ? decrypt(r.USER_NM) : null; } catch(e) { decNm = 'ERR:' + e.message; }
        console.log(`Row: UUID=${r.uuid}, IdDec=${decId}, NmDec=${decNm}`);
    }
    process.exit(0);
}
test().catch(console.error);
