const { pool } = require('./db');

async function checkSchema() {
    try {
        const [rows] = await pool.execute("DESC TB_MOM_MEMBER");
        console.log('TB_MOM_MEMBER schema:');
        console.table(rows);
        
        const [userRows] = await pool.execute("DESC TB_USER");
        console.log('TB_USER schema:');
        console.table(userRows);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkSchema();
