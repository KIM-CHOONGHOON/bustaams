const mysql = require('mysql2/promise');
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '', // Assuming default or common dev env
    database: 'bustaams'
};

async function checkTable() {
    let connection;
    try {
        // Try to read db config from the project's db.js if possible
        // But for now, let's just try to connect to the pool defined in the project
        const { pool } = require('../busTaams_server/db');
        const [rows] = await pool.execute("SHOW TABLES LIKE 'TB_USER_CANCEL_MANAGE'");
        if (rows.length > 0) {
            console.log('Table TB_USER_CANCEL_MANAGE exists.');
        } else {
            console.log('Table TB_USER_CANCEL_MANAGE does not exist.');
        }
    } catch (err) {
        console.error('Error checking table:', err.message);
    } finally {
        process.exit();
    }
}

checkTable();
