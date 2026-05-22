const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'bustaams',
    port: process.env.DB_PORT || 3306
});

async function checkSchema() {
    try {
        const tables = ['TB_USER', 'TB_DRIVER_DETAIL', 'TB_DRIVER_DOCS', 'TB_DRIVER_BUS'];
        for (const table of tables) {
            console.log(`--- Schema for ${table} ---`);
            const [rows] = await pool.query(`DESCRIBE ${table}`);
            console.log(rows);
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
