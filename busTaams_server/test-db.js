const mysql = require('mysql2/promise');
require('dotenv').config();
async function main() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });
    try {
        const [rows] = await conn.query("DESCRIBE TB_BATCH_JOB_MST");
        console.log("TB_BATCH_JOB_MST SCHEMA:");
        console.table(rows);
    } catch(e) { console.error(e.message); }
    try {
        const [rows] = await conn.query("DESCRIBE TB_BATCH_SCHED");
        console.log("TB_BATCH_SCHED SCHEMA:");
        console.table(rows);
    } catch(e) { console.error(e.message); }
    conn.end();
}
main();
