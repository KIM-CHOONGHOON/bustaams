const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER || 'master',
        password: process.env.DB_PASSWORD || '!QAZ2wsx2026@',
        database: process.env.DB_NAME || 'bustaams'
    });

    try {
        const [rows] = await pool.execute('DESC TB_USER');
        console.log('--- TB_USER Structure ---');
        console.table(rows);
        
        // Check for USER_IMAGE specifically
        const hasUserImage = rows.some(r => r.Field === 'USER_IMAGE');
        console.log('\nHas USER_IMAGE column?', hasUserImage ? 'YES ✅' : 'NO ❌');
        
        if (!hasUserImage) {
            console.log('Attempting to add USER_IMAGE column...');
            await pool.execute('ALTER TABLE TB_USER ADD COLUMN USER_IMAGE VARCHAR(255) AFTER HP_NO');
            console.log('USER_IMAGE column added successfully! ✨');
        }

    } catch (err) {
        console.error('DB Check Error:', err);
    } finally {
        await pool.end();
    }
}

check();
