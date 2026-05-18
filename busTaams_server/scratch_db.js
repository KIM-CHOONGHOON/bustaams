const { pool } = require('./db');

async function test() {
    try {
        const [rows] = await pool.execute('SELECT * FROM TB_USER WHERE USER_ID = ?', ['oasis1']);
        console.log('--- USER DATA ---');
        console.log(rows);
        process.exit(0);
    } catch (err) {
        console.error('Error fetching user:', err);
        process.exit(1);
    }
}

test();
