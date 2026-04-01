const pool = require('./db');

async function migrate() {
    try {
        console.log('Adding CALC_BUS_CNT column to TB_BID_REQUEST...');
        await pool.execute("ALTER TABLE TB_BID_REQUEST ADD COLUMN CALC_BUS_CNT INT NOT NULL DEFAULT 1 COMMENT '계산된 필요 차량 대수' AFTER PASSENGER_CNT");
        console.log('Successfully added CALC_BUS_CNT column!');
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('Column already exists.');
        } else {
            console.error('Migration failed:', error);
        }
    } finally {
        process.exit();
    }
}

migrate();
