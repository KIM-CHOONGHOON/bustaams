'use strict';

require('./loadEnv');
const { pool } = require('./db');

async function main() {
    console.log('[apply_tax_invoice_schema] Connecting to database...');
    const connection = await pool.getConnection();
    try {
        console.log('[apply_tax_invoice_schema] Starting schema migration...');
        
        // ⚠️ DDL 구문(CREATE TABLE)은 Git 저장소 DDL 가드 정책 준수 및 안정성을 위해 제거되었습니다.
        // 스키마 반영은 DBA 또는 별도 승인된 마이그레이션 도구를 이용해 수동으로 실행해야 합니다.
        console.log('[apply_tax_invoice_schema] Schema migration skipped (DDL code removed for CI compliance).');
    } catch (error) {
        console.error('[apply_tax_invoice_schema] Schema migration failed:', error);
        process.exitCode = 1;
    } finally {
        connection.release();
        await pool.end();
    }
}

main().catch((error) => {
    console.error('[apply_tax_invoice_schema] Fatal error:', error);
    process.exit(1);
});
