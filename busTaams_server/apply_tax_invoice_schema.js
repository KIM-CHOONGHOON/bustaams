'use strict';

require('./loadEnv');
const { pool } = require('./db');

async function main() {
    console.log('[apply_tax_invoice_schema] Connecting to database...');
    const connection = await pool.getConnection();
    try {
        console.log('[apply_tax_invoice_schema] Starting schema migration...');
        
        // 1. Create TB_PARTNER_BIZ_INFO table
        const createPartnerBizInfoQuery = `
            CREATE TABLE IF NOT EXISTS \`TB_PARTNER_BIZ_INFO\` (
              \`TARGET_TYPE\` enum('DRIVER', 'SALES') NOT NULL COMMENT '대상 구분 (DRIVER: 기사, SALES: 영업)',
              \`TARGET_ID\` varchar(50) NOT NULL COMMENT '대상 식별자 (CUST_ID 또는 ADMIN_ID)',
              \`BIZ_NO\` varchar(20) NOT NULL COMMENT '사업자등록번호',
              \`BIZ_NM\` varchar(100) NOT NULL COMMENT '상호 (법인명)',
              \`CEO_NM\` varchar(50) NOT NULL COMMENT '대표자 성명',
              \`BIZ_ADDR\` varchar(255) NOT NULL COMMENT '사업장 주소',
              \`BIZ_TYPE\` varchar(100) DEFAULT NULL COMMENT '업태',
              \`BIZ_ITEM\` varchar(100) DEFAULT NULL COMMENT '종목',
              \`EMAIL\` varchar(100) DEFAULT NULL COMMENT '세금계산서 수신용 이메일',
              \`REG_DT\` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '등록 일시',
              \`REG_ID\` varchar(50) DEFAULT NULL COMMENT '등록자 ID',
              \`MOD_DT\` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
              \`MOD_ID\` varchar(50) DEFAULT NULL COMMENT '수정자 ID',
              PRIMARY KEY (\`TARGET_TYPE\`, \`TARGET_ID\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='영업사원 및 운전기사 사업자 등록 정보';
        `;
        
        await connection.query(createPartnerBizInfoQuery);
        console.log('[apply_tax_invoice_schema] TB_PARTNER_BIZ_INFO table checked/created.');

        // 2. Create TB_TAX_INVOICE table
        const createTaxInvoiceQuery = `
            CREATE TABLE IF NOT EXISTS \`TB_TAX_INVOICE\` (
              \`TAX_INVOICE_ID\` varchar(20) NOT NULL COMMENT '세금계산서 고유식별자 (TAX-YYYYMM-XXXX)',
              \`TARGET_TYPE\` enum('SALES','DRIVER') NOT NULL COMMENT '대상구분 (영업사원, 운전기사)',
              \`TARGET_ID\` varchar(50) NOT NULL COMMENT '대상자 식별자 (CUST_ID 또는 ADMIN_ID)',
              \`YYYYMM\` varchar(6) NOT NULL COMMENT '정산 귀속월 (YYYYMM)',
              \`SUPPLY_AMT\` decimal(13,0) NOT NULL DEFAULT '0' COMMENT '공급가액',
              \`TAX_AMT\` decimal(13,0) NOT NULL DEFAULT '0' COMMENT '세액',
              \`TOTAL_AMT\` decimal(13,0) NOT NULL DEFAULT '0' COMMENT '합계금액',
              \`INVOICE_STAT\` enum('READY','ISSUED','CANCELLED') NOT NULL DEFAULT 'READY' COMMENT '계산서 상태',
              \`SUPPLIER_BIZ_NO\` varchar(20) DEFAULT NULL COMMENT '공급자 등록번호',
              \`SUPPLIER_NM\` varchar(100) DEFAULT NULL COMMENT '공급자 상호(법인명)',
              \`SUPPLIER_CEO\` varchar(50) DEFAULT NULL COMMENT '공급자 성명',
              \`SUPPLIER_ADDR\` varchar(255) DEFAULT NULL COMMENT '공급자 사업장 주소',
              \`SUPPLIER_BIZ_TYPE\` varchar(100) DEFAULT NULL COMMENT '공급자 업태',
              \`SUPPLIER_ITEM\` varchar(100) DEFAULT NULL COMMENT '공급자 종목',
              \`NTS_APPROVE_NO\` varchar(50) DEFAULT NULL COMMENT '국세청 승인번호',
              \`ISSUE_DT\` datetime DEFAULT NULL COMMENT '발행일시',
              \`REMARKS\` varchar(500) DEFAULT NULL COMMENT '비고',
              \`REG_DT\` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '등록일시',
              \`REG_ID\` varchar(50) DEFAULT NULL COMMENT '등록자ID',
              \`MOD_DT\` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
              \`MOD_ID\` varchar(50) DEFAULT NULL COMMENT '수정자ID',
              PRIMARY KEY (\`TAX_INVOICE_ID\`),
              KEY \`IDX_TAX_INV_TARGET\` (\`TARGET_TYPE\`, \`TARGET_ID\`),
              KEY \`IDX_TAX_INV_YYYYMM\` (\`YYYYMM\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='영업사원/기사 수당 세금계산서 관리';
        `;

        await connection.query(createTaxInvoiceQuery);
        console.log('[apply_tax_invoice_schema] TB_TAX_INVOICE table checked/created.');

        console.log('[apply_tax_invoice_schema] Schema migration completed successfully!');
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
