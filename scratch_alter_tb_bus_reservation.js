const { pool } = require('./busTaams_server/db');

// 추가/확인할 14개 컬럼 정의
const targetColumns = [
    { name: 'DATA_STAT', sql: "ALTER TABLE TB_BUS_RESERVATION MODIFY COLUMN DATA_STAT VARCHAR(30) DEFAULT 'AUCTION' COMMENT '진행 단계 코드'" },
    { name: 'CUSTOMER_PAY_STAT', sql: "ALTER TABLE TB_BUS_RESERVATION ADD COLUMN CUSTOMER_PAY_STAT VARCHAR(10) DEFAULT 'N' COMMENT '고객 결제 상태 (N:미결제, Y:결제완료)'" },
    { name: 'CUSTOMER_PAY_AMT', sql: "ALTER TABLE TB_BUS_RESERVATION ADD COLUMN CUSTOMER_PAY_AMT DECIMAL(12,2) DEFAULT 0.00 COMMENT '고객 결제 금액'" },
    { name: 'CUSTOMER_PAY_DT', sql: "ALTER TABLE TB_BUS_RESERVATION ADD COLUMN CUSTOMER_PAY_DT DATETIME NULL COMMENT '고객 결제 완료 일시'" },
    { name: 'CUSTOMER_PAY_ID', sql: "ALTER TABLE TB_BUS_RESERVATION ADD COLUMN CUSTOMER_PAY_ID VARCHAR(100) NULL COMMENT '고객 PG 결제 승인 ID'" },
    { name: 'DRIVER_PAY_STAT', sql: "ALTER TABLE TB_BUS_RESERVATION ADD COLUMN DRIVER_PAY_STAT VARCHAR(10) DEFAULT 'N' COMMENT '기사 결제 상태 (N:미결제, Y:결제완료)'" },
    { name: 'DRIVER_PAY_AMT', sql: "ALTER TABLE TB_BUS_RESERVATION ADD COLUMN DRIVER_PAY_AMT DECIMAL(12,2) DEFAULT 0.00 COMMENT '기사 결제 금액'" },
    { name: 'DRIVER_PAY_DT', sql: "ALTER TABLE TB_BUS_RESERVATION ADD COLUMN DRIVER_PAY_DT DATETIME NULL COMMENT '기사 결제 완료 일시'" },
    { name: 'DRIVER_PAY_ID', sql: "ALTER TABLE TB_BUS_RESERVATION ADD COLUMN DRIVER_PAY_ID VARCHAR(100) NULL COMMENT '기사 PG 결제 승인 ID'" },
    { name: 'CUSTOMER_FINAL_APPROVAL_YN', sql: "ALTER TABLE TB_BUS_RESERVATION ADD COLUMN CUSTOMER_FINAL_APPROVAL_YN VARCHAR(1) DEFAULT 'N' COMMENT '고객 최종 승인 여부 (Y/N)'" },
    { name: 'CUSTOMER_FINAL_APPROVAL_DT', sql: "ALTER TABLE TB_BUS_RESERVATION ADD COLUMN CUSTOMER_FINAL_APPROVAL_DT DATETIME NULL COMMENT '고객 최종 승인 일시'" },
    { name: 'CUSTOMER_FEE_RATE', sql: "ALTER TABLE TB_BUS_RESERVATION ADD COLUMN CUSTOMER_FEE_RATE DECIMAL(5,2) DEFAULT 0.00 COMMENT '고객 수수료율(%)'" },
    { name: 'DRIVER_FEE_RATE', sql: "ALTER TABLE TB_BUS_RESERVATION ADD COLUMN DRIVER_FEE_RATE DECIMAL(5,2) DEFAULT 0.00 COMMENT '기사 수수료율(%)'" },
    { name: 'CUSTOMER_REFUND_AGREE_DT', sql: "ALTER TABLE TB_BUS_RESERVATION ADD COLUMN CUSTOMER_REFUND_AGREE_DT DATETIME NULL COMMENT '고객 환불정책 동의 일시'" }
];

async function alterTable() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('DB 커넥션 성공. 현재 TB_BUS_RESERVATION 컬럼 조회 중...');

        // 1. 기존 컬럼 목록 조회
        const [existingCols] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'TB_BUS_RESERVATION'
        `);
        const existingColNames = existingCols.map(c => c.COLUMN_NAME.toUpperCase());

        console.log('기존 컬럼 개수:', existingColNames.length);

        // 2. 컬럼별 추가/수정
        for (const col of targetColumns) {
            const colNameUpper = col.name.toUpperCase();
            if (existingColNames.includes(colNameUpper)) {
                if (colNameUpper === 'DATA_STAT') {
                    console.log(`[MODIFY] ${col.name} 컬럼 타입/기본값 확장 적용...`);
                    await connection.execute(col.sql);
                } else {
                    console.log(`[SKIP] ${col.name} 컬럼이 이미 존재합니다.`);
                }
            } else {
                console.log(`[ADD] ${col.name} 컬럼 추가 중...`);
                await connection.execute(col.sql);
                console.log(`[SUCCESS] ${col.name} 컬럼 추가 완료.`);
            }
        }

        // 3. 최종 변경 후 DESCRIBE 조회
        const [describeRows] = await connection.execute('DESCRIBE TB_BUS_RESERVATION');
        console.log('\n=== TB_BUS_RESERVATION 최종 스키마 정보 ===');
        const fourteenColsSummary = describeRows
            .filter(r => targetColumns.some(t => t.name.toUpperCase() === r.Field.toUpperCase()))
            .map(r => ({ Field: r.Field, Type: r.Type, Null: r.Null, Default: r.Default, Key: r.Key }));
        console.table(fourteenColsSummary);

        console.log('\n✅ 14개 컬럼 DB 반영 완료!');
    } catch (err) {
        console.error('❌ DB Alter 에러 발생:', err);
    } finally {
        if (connection) connection.release();
        process.exit(0);
    }
}

alterTable();
