const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../busTaams_server/.env' });

async function updateSchema() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '1234',
        database: process.env.DB_NAME || 'bustaams_db'
    });

    try {
        console.log('--- DB Schema Update Started ---');

        // 1. TB_DRIVER_BUS 컬럼 추가 (중복 체크 포함)
        console.log('1. Updating TB_DRIVER_BUS columns...');
        const [columns] = await pool.execute('SHOW COLUMNS FROM TB_DRIVER_BUS');
        const columnNames = columns.map(c => c.Field);

        const addQueries = [
            { name: 'INSPECT_EXP_DT', sql: 'ADD COLUMN INSPECT_EXP_DT DATE COMMENT "차량 정기검사 유효기간" AFTER INSUR_EXP_DT' },
            { name: 'BUS_SIZE', sql: 'ADD COLUMN BUS_SIZE VARCHAR(50) COMMENT "차량 규격 (전장x전폭x전고)"' },
            { name: 'MIC_YN', sql: 'ADD COLUMN MIC_YN ENUM("Y", "N") DEFAULT "N"' },
            { name: 'KITCHEN_YN', sql: 'ADD COLUMN KITCHEN_YN ENUM("Y", "N") DEFAULT "N"' },
            { name: 'WATER_YN', sql: 'ADD COLUMN WATER_YN ENUM("Y", "N") DEFAULT "N"' },
            { name: 'CURTAIN_YN', sql: 'ADD COLUMN CURTAIN_YN ENUM("Y", "N") DEFAULT "N"' },
            { name: 'AIR_PURIFIER_YN', sql: 'ADD COLUMN AIR_PURIFIER_YN ENUM("Y", "N") DEFAULT "N"' },
            { name: 'CAR_SEAT_YN', sql: 'ADD COLUMN CAR_SEAT_YN ENUM("Y", "N") DEFAULT "N"' },
            { name: 'AEBS_YN', sql: 'ADD COLUMN AEBS_YN ENUM("Y", "N") DEFAULT "N"' }
        ];

        for (const q of addQueries) {
            if (!columnNames.includes(q.name)) {
                await pool.execute(`ALTER TABLE TB_DRIVER_BUS ${q.sql}`);
                console.log(`- Column [${q.name}] added.`);
            }
        }

        // 2. TB_DRIVER_BUS_FILE_HIST 재생성
        console.log('2. Re-creating TB_DRIVER_BUS_FILE_HIST...');
        await pool.execute('DROP TABLE IF EXISTS TB_DRIVER_BUS_FILE_HIST');
        await pool.execute(`
            CREATE TABLE TB_DRIVER_BUS_FILE_HIST (
                FILE_HIST_ID BIGINT AUTO_INCREMENT PRIMARY KEY,
                BUS_UUID BINARY(16) NOT NULL,
                FILE_UUID BINARY(16) NOT NULL COMMENT 'TB_FILE_MASTER 참조',
                FILE_TYPE ENUM('PHOTO', 'BIZ_REG', 'TRANS_PERMIT', 'INSUR_CERT') NOT NULL,
                REG_DT DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '등록 일시',
                REG_ID VARCHAR(30) COMMENT '등록자 ID',
                MOD_DT DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '수정 일시',
                MOD_ID VARCHAR(30) COMMENT '수정자 ID',
                CONSTRAINT FK_FILE_HIST_BUS FOREIGN KEY (BUS_UUID) REFERENCES TB_DRIVER_BUS (BUS_UUID) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='버스 관련 파일(사진/서류) 관리 이력'
        `);
        console.log('- Table [TB_DRIVER_BUS_FILE_HIST] created successfully.');

        console.log('--- DB Schema Update Completed ---');
    } catch (error) {
        console.error('Error updating schema:', error);
    } finally {
        await pool.end();
    }
}

updateSchema();
