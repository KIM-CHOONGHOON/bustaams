const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkCollation() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER || 'master',
        password: process.env.DB_PASSWORD || '!QAZ2wsx2026@',
        database: process.env.DB_NAME || 'bustaams'
    });

    try {
        console.log('--- Database Table Collations ---');
        const [tables] = await pool.execute('SHOW TABLE STATUS');
        const collationInfo = tables.map(t => ({
            Table: t.Name,
            Collation: t.Collation
        }));
        console.table(collationInfo);

        console.log('\n--- Column Collations ---');
        const tableNames = tables.map(t => t.Name);
        for (const tableName of tableNames) {
            const [columns] = await pool.execute(`SHOW FULL COLUMNS FROM ${tableName}`);
            const mixed = columns.filter(c => c.Collation && c.Collation !== collationInfo.find(t => t.Table === tableName).Collation);
            if (mixed.length > 0) {
                console.log(`Table ${tableName} has columns with mixed collations:`);
                console.table(mixed.map(c => ({ Column: c.Field, Collation: c.Collation })));
            }
        }

    } catch (err) {
        console.error('Collation Check Error:', err);
    } finally {
        await pool.end();
    }
}

checkCollation();
