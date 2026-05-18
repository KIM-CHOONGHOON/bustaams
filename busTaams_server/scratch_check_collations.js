const { pool } = require('./db');

async function checkCollations() {
    try {
        const [rows] = await pool.execute("SHOW FULL COLUMNS FROM TB_USER LIKE 'CUST_ID'");
        console.log('TB_USER.CUST_ID:', rows[0].Collation);
        
        const [rows2] = await pool.execute("SHOW FULL COLUMNS FROM TB_MOM_MEMBER LIKE 'CUST_ID'");
        console.log('TB_MOM_MEMBER.CUST_ID:', rows2[0].Collation);

        const [rows3] = await pool.execute("SHOW FULL COLUMNS FROM TB_PAYMENT_CARD LIKE 'CUST_ID'");
        console.log('TB_PAYMENT_CARD.CUST_ID:', rows3[0].Collation);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkCollations();
