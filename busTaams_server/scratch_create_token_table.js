const { pool } = require('./db');

async function createTable() {
    const sql = `
    CREATE TABLE IF NOT EXISTS TB_USER_DEVICE_TOKEN (
        USER_ID VARCHAR(50) NOT NULL,
        DEVICE_TOKEN VARCHAR(255) NOT NULL,
        OS_TYPE VARCHAR(10), -- 'ios', 'android', 'web'
        LAST_UPDATED TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (USER_ID, DEVICE_TOKEN)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `;

    try {
        await pool.execute(sql);
        console.log('✅ TB_USER_DEVICE_TOKEN table created successfully.');
    } catch (err) {
        console.error('❌ Error creating table:', err);
    } finally {
        process.exit();
    }
}

createTable();
