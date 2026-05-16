const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config({ path: './busTaams_server/.env' });

async function checkSchema() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('--- TB_BUS_RESERVATION ---');
        const [rows1] = await connection.execute('DESCRIBE TB_BUS_RESERVATION');
        console.table(rows1);

        console.log('--- TB_AUCTION_REQ ---');
        const [rows2] = await connection.execute('DESCRIBE TB_AUCTION_REQ');
        console.table(rows2);

        console.log('--- TB_AUCTION_REQ_BUS ---');
        const [rows3] = await connection.execute('DESCRIBE TB_AUCTION_REQ_BUS');
        console.table(rows3);
        
        console.log('--- Data for REQ_ID 0000000003 ---');
        const [data] = await connection.execute('SELECT * FROM TB_AUCTION_REQ WHERE REQ_ID = "0000000003"');
        console.log(data);

        console.log('--- TB_BUS_RESERVATION for REQ_ID 0000000003 ---');
        const [resData] = await connection.execute('SELECT * FROM TB_BUS_RESERVATION WHERE REQ_ID = "0000000003"');
        console.table(resData);

        console.log('--- TB_AUCTION_REQ_VIA for REQ_ID 0000000003 ---');
        const [viaData] = await connection.execute('SELECT * FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = "0000000003"');
        console.table(viaData);

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

checkSchema();
