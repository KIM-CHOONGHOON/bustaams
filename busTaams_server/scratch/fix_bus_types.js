const { pool } = require('../db');

async function checkAndInsertBusTypes() {
    try {
        console.log('>>> [Diagnostic] Checking BUS_TYPE codes in TB_COMMON_CODE...');
        const [rows] = await pool.execute(
            "SELECT * FROM TB_COMMON_CODE WHERE GRP_CD = 'BUS_TYPE'"
        );

        if (rows.length === 0) {
            console.log('⚠️ BUS_TYPE codes are missing in this environment. Inserting default standardized codes...');
            
            const insertSql = `
                INSERT INTO TB_COMMON_CODE (GRP_CD, DTL_CD, CD_NM_KO, CD_NM_EN, USE_YN, DISP_ORD, CD_DESC)
                VALUES 
                ('BUS_TYPE', 'NORMAL_45',      '일반 버스 (45석)',     'Standard Bus',     'Y', 1, '45석 표준 시트'),
                ('BUS_TYPE', 'PRESTIGE_28',    '우등 버스 (28석)',     'Deluxe Bus',       'Y', 2, '28석 넓은 레그룸 전용 시트'),
                ('BUS_TYPE', 'PREMIUM_21',     '프리미엄 골드 (21석)', 'Premium Gold',      'Y', 3, '21석 최상급 프라이빗 독립시트'),
                ('BUS_TYPE', 'VVIP_16',        'V-VIP (16석)',        'V-VIP Limousine',  'Y', 4, '16석 최고급 리무진 (벤츠 스프린터급)'),
                ('BUS_TYPE', 'MINI_25',        '중형/미니 버스 (25석)', 'Mid-size Bus',     'Y', 5, '소규모 단체용 버스 (카운티/레스타급)'),
                ('BUS_TYPE', 'VAN_11',         '대형 밴 (11석)',      'Large Van',        'Y', 6, '프리미엄 비즈니스 밴 (쏠라티급)')
            `;
            
            await pool.execute(insertSql);
            console.log('✅ Successfully inserted 6 default BUS_TYPE codes.');
        } else {
            console.log(`✅ BUS_TYPE codes already exist: ${rows.length} records found.`);
            // 상세 내용 출력 (디버깅용)
            rows.forEach(r => console.log(` - [${r.DTL_CD}] ${r.CD_NM_KO} (USE_YN: ${r.USE_YN})`));
        }
    } catch (error) {
        console.error('❌ Error during BUS_TYPE diagnostics/insertion:', error.message);
    } finally {
        process.exit();
    }
}

checkAndInsertBusTypes();
