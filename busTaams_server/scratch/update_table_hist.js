const pool = require('../db');

async function updateTable() {
    try {
        console.log('--- Updating TB_BUS_DRIVER_VEHICLE_FILE_HIST ---');
        await pool.execute('DROP TABLE IF EXISTS `TB_BUS_DRIVER_VEHICLE_FILE_HIST`');
        await pool.execute(`
            CREATE TABLE \`TB_BUS_DRIVER_VEHICLE_FILE_HIST\` (
              \`HIST_ID\` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
              \`BUS_ID\` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'FK TB_BUS_DRIVER_VEHICLE.BUS_ID',
              \`FILE_ID\` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
              \`FILE_CATEGORY\` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
              \`REG_DT\` datetime DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (\`HIST_ID\`),
              KEY \`IDX_BUS_FILE\` (\`BUS_ID\`,\`FILE_ID\`),
              KEY \`IDX_FILE_ID\` (\`FILE_ID\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Success: Table recreated with IDX_FILE_ID');
    } catch (err) {
        console.error('❌ Error updating table:', err);
    } finally {
        process.exit();
    }
}

updateTable();
