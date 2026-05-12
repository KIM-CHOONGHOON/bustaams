const mysql = require('mysql2/promise');

async function checkReservation(id) {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3307,
        user: 'master',
        password: '!QAZ2wsx2026@',
        database: 'bustaams'
    });

    try {
        console.log(`Checking ID: ${id}`);
        
        // Check if it's REQ_ID
        const [req] = await connection.query('SELECT * FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [id]);
        if (req.length > 0) {
            console.log('Found in TB_AUCTION_REQ:');
            console.log(JSON.stringify(req[0], null, 2));
            
            const [vias] = await connection.query('SELECT * FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = ? ORDER BY VIA_SEQ', [id]);
            console.log(`Found ${vias.length} waypoints in TB_AUCTION_REQ_VIA:`);
            console.log(JSON.stringify(vias, null, 2));
        } else {
            console.log('NOT found in TB_AUCTION_REQ');
        }

        // Check if it's RES_ID
        const [res] = await connection.query('SELECT * FROM TB_BUS_RESERVATION WHERE RES_ID = ?', [id]);
        if (res.length > 0) {
            console.log('Found in TB_BUS_RESERVATION:');
            console.log(JSON.stringify(res[0], null, 2));
            
            const reqId = res[0].REQ_ID;
            console.log(`Associated REQ_ID: ${reqId}`);
            
            const [req2] = await connection.query('SELECT * FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [reqId]);
            console.log('Associated TB_AUCTION_REQ:');
            console.log(JSON.stringify(req2[0], null, 2));

            const [vias2] = await connection.query('SELECT * FROM TB_AUCTION_REQ_VIA WHERE REQ_ID = ? ORDER BY VIA_SEQ', [reqId]);
            console.log(`Found ${vias2.length} waypoints in TB_AUCTION_REQ_VIA:`);
            console.log(JSON.stringify(vias2, null, 2));
        } else {
            console.log('NOT found in TB_BUS_RESERVATION');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

checkReservation('0000000005');
