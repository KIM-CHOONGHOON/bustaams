const mysql = require('mysql2/promise');
require('dotenv').config();

async function test() {
    const pool = mysql.createPool({ host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
    const [rows] = await pool.execute('SELECT BIN_TO_UUID(USER_UUID) as uuid, USER_ID_ENC, PASSWORD, SNS_TYPE FROM TB_USER');
    console.log(rows);
    process.exit(0);
}
test().catch(e => { console.error("ERR:", e); process.exit(1); });
