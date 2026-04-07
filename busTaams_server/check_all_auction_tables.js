const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchema() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: 3306,
        user: process.env.DB_USER || 'master',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'bustaams',
    });

    try {
        const tables = ['TB_AUCTION_REQ', 'TB_AUCTION_REQ_BUS', 'TB_AUCTION_REQ_VIA'];
        for (const table of tables) {
            const [columns] = await pool.execute(`DESC ${table}`);
            console.log(`--- ${table} Columns ---`);
            console.table(columns);
        }
    } catch (error) {
        console.error('Error fetching schema:', error);
    } finally {
        await pool.end();
    }
}

checkSchema();
