const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3307
});

async function check() {
    const [rows] = await pool.query(`DESCRIBE TB_DRIVER_BUS`);
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
}
check();
