const pool = require('./db');

async function getSchemas() {
    const tables = ['TB_AUCTION_REQ', 'TB_AUCTION_REQ_BUS', 'TB_AUCTION_REQ_VIA'];
    for (const table of tables) {
        try {
            const [columns] = await pool.execute(`DESC ${table}`);
            console.log(`--- ${table} ---`);
            columns.forEach(col => {
                console.log(`${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
            });
            console.log('\n');
        } catch (e) {
            console.error(`Error with ${table}: ${e.message}`);
        }
    }
    process.exit();
}

getSchemas();
