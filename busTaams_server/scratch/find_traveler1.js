
const mysql = require('mysql2/promise');

async function check() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'bustaams'
    });

    try {
        const [rows] = await pool.execute("SELECT CUST_ID, USER_ID, USER_NM, EMAIL FROM TB_USER WHERE USER_NM LIKE '%여행자1%'");
        console.log('--- Found Users ---');
        console.table(rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

check();
