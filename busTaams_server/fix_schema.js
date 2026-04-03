const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixSchema() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER || 'master',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'bustaams',
    });

    try {
        const tables = ['TB_AUCTION_REQ', 'TB_AUCTION_REQ_BUS', 'TB_AUCTION_REQ_VIA'];
        for (const table of tables) {
            console.log(`Fixing table: ${table}...`);
            await pool.execute(`ALTER TABLE ${table} MODIFY REG_ID VARCHAR(50)`);
            await pool.execute(`ALTER TABLE ${table} MODIFY MOD_ID VARCHAR(50)`);
        }
        console.log('✅ All tables fixed.');
    } catch (error) {
        console.error('Error fixing schema:', error);
    } finally {
        await pool.end();
    }
}

fixSchema();
