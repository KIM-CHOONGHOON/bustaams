const mysql = require('mysql2/promise');
async function check() {
    const conn = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'bustaams',
        port: 3307
    });
    try {
        const [rows1] = await conn.execute('DESCRIBE TB_DRIVER_BUS');
        console.log('TB_DRIVER_BUS:', rows1.map(r => r.Field));
        
        const [rows2] = await conn.execute('DESCRIBE TB_BUS_DRIVER_VEHICLE');
        console.log('TB_BUS_DRIVER_VEHICLE:', rows2.map(r => r.Field));
    } catch (e) {
        console.error(e);
    } finally {
        await conn.end();
    }
}
check();
