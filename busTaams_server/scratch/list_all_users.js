
const mysql = require('mysql2/promise');

async function check() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'bustaams'
    });

    try {
        const [rows] = await pool.execute('SELECT CUST_ID, USER_ID, USER_NM, EMAIL FROM TB_USER');
        console.log('--- User List ---');
        rows.forEach(r => {
            console.log(`ID: ${r.CUST_ID}, LoginID: ${r.USER_ID}, Name: ${r.USER_NM}, Email: ${r.EMAIL}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

check();
