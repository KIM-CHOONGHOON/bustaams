const { pool } = require('./db');

async function checkSchema() {
    try {
        const [rows] = await pool.execute('DESC TB_MOM_MEMBER');
        console.log('--- TB_MOM_MEMBER Schema ---');
        console.table(rows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
