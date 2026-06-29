const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkColumns() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'bustaams'
    });

    try {
        const [columns] = await pool.execute("SHOW COLUMNS FROM TB_AUCTION_REQ");
        console.log('--- Columns in TB_AUCTION_REQ ---');
        console.table(columns.map(c => ({ Field: c.Field, Type: c.Type })));
        
        const [data] = await pool.execute("SELECT * FROM TB_AUCTION_REQ ORDER BY REG_DT DESC LIMIT 1");
        console.log('--- Latest Row Data ---');
        console.log(data[0]);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkColumns();
