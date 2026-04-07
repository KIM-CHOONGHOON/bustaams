const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchema() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'bustaams',
    });

    try {
        const [cols] = await pool.execute('SHOW COLUMNS FROM TB_USER_TERMS_HIST');
        cols.forEach(c => {
            console.log(`${c.Field} | ${c.Type} | ${c.Null} | ${c.Key}`);
        });
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

checkSchema();
