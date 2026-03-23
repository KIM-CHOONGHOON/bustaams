const pool = require('./db');

async function testTime() {
    try {
        const [rows] = await pool.execute('SELECT NOW() as now_time, @@session.time_zone as session_tz');
        console.log('--- Database Time Check ---');
        console.log('Current DB Time (NOW):', rows[0].now_time);
        console.log('Session Time Zone:', rows[0].session_tz);
        console.log('Current Local Time (Node):', new Date().toLocaleString());
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

testTime();
