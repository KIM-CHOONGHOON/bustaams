const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3307
});

async function check() {
    const tables = ['TB_DRIVER_DETAIL', 'TB_DRIVER_DOCS', 'TB_DRIVER_BUS'];
    let result = '';
    for (const table of tables) {
        try {
            const [rows] = await pool.query(`DESCRIBE ${table}`);
            result += `--- ${table} ---\n` + JSON.stringify(rows, null, 2) + '\n\n';
        } catch (e) {
            result += `--- ${table} (NOT FOUND) ---\n\n`;
        }
    }
    fs.writeFileSync('driver_schemas_utf8.txt', result, 'utf8');
    process.exit(0);
}
check();
