const mysql = require('mysql2/promise');
const { decrypt } = require('./crypto');
require('dotenv').config();

async function diag() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER || 'master',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'bustaams',
        waitForConnections: true,
        connectionLimit: 1,
    });

    try {
        const [rows] = await pool.execute('SELECT BIN_TO_UUID(USER_UUID) as UUID, USER_ID, USER_ID_ENC, USER_NM FROM TB_USER');
        console.log(`Found ${rows.length} users:`);
        for (const row of rows) {
            let d1 = '?', d2 = '?', dNm = '?';
            try { d1 = row.USER_ID ? decrypt(row.USER_ID) : 'NULL'; } catch(e) { d1 = 'ERR'; }
            try { d2 = row.USER_ID_ENC ? decrypt(row.USER_ID_ENC) : 'NULL'; } catch(e) { d2 = 'ERR'; }
            try { dNm = row.USER_NM ? decrypt(row.USER_NM) : 'NULL'; } catch(e) { dNm = 'ERR'; }
            console.log(`UUID: ${row.UUID}`);
            console.log(`  - USER_ID (dec): ${d1}`);
            console.log(`  - USER_ID_ENC (dec): ${d2}`);
            console.log(`  - Name (dec): ${dNm}`);
        }
    } catch (error) {
        console.error('Diag error:', error);
    } finally {
        await pool.end();
    }
}

diag();
