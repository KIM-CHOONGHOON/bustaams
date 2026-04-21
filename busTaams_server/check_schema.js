const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchema() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'bustaams',
        waitForConnections: true,
        connectionLimit: 10,
    });

    try {
        console.log('--- TB_USER Schema ---');
        const [rows] = await pool.execute('DESCRIBE TB_USER');
        console.table(rows);
        
        console.log('\n--- ALL TABLES ---');
        const [tables] = await pool.execute('SHOW TABLES');
        console.table(tables);
    } catch (error) {
        console.error('Error fetching schema:', error);
    } finally {
        await pool.end();
    }
}

checkSchema();
