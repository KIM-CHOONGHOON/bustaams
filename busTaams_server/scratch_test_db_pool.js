const { pool } = require('./db');

async function test() {
    try {
        console.log("Testing connection via db.js pool...");
        const [rows] = await pool.execute("SELECT 1");
        console.log("Success! Result:", rows);
    } catch (err) {
        console.error("Pool execute failed:", err);
    } finally {
        await pool.end();
    }
}

test();
