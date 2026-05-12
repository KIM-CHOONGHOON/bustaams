const { pool } = require('../db');

async function check() {
    try {
        const [rows] = await pool.query("SELECT @@collation_connection as collation");
        console.log("Current Session Collation:", rows[0].collation);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
