const mysql = require('mysql2/promise');

async function checkColumns() {
    const pool = mysql.createPool({
        host: 'localhost',
        port: 3307,
        user: 'root',
        password: '',
        database: 'bustaams'
    });

    try {
        const [columns] = await pool.execute("SHOW COLUMNS FROM TB_AUCTION_REQ");
        console.log('Columns in TB_AUCTION_REQ:');
        console.table(columns.map(c => ({ Field: c.Field, Type: c.Type })));
    } catch (err) {
        console.error('Error checking columns:', err);
    } finally {
        await pool.end();
    }
}

checkColumns();
