// 운수종사자 자격증 진위 API 연동 테스트 스크립트
const { verifyTsWorkerQualification } = require('./driverVerification');
require('./loadEnv'); // .env 환경 변수를 로드합니다.

async function runTest() {
    console.log('=== 🚌 운수종사자 자격 API 테스트 스크립트 🚌 ===');
    console.log('현재 .env 설정 상태:');
    console.log('- TS_QUAL_VERIFY_ENABLED:', process.env.TS_QUAL_VERIFY_ENABLED);
    console.log('- TS_QUAL_VERIFY_URL:', process.env.TS_QUAL_VERIFY_URL);
    console.log('- PUBLIC_DATA_SERVICE_KEY:', process.env.PUBLIC_DATA_SERVICE_KEY ? `입력됨 (끝 4자리: ${process.env.PUBLIC_DATA_SERVICE_KEY.slice(-4)})` : '없음');
    console.log('- TS_QUAL_SERVICE_KEY:', process.env.TS_QUAL_SERVICE_KEY ? '입력됨' : '없음(PUBLIC_DATA_SERVICE_KEY 공유)');
    console.log('- TS_QUAL_SKIP_SERVICE_KEY_DECODE:', process.env.TS_QUAL_SKIP_SERVICE_KEY_DECODE);
    console.log('- KOTSA_QUAL_API_KEY:', process.env.KOTSA_QUAL_API_KEY ? '입력됨' : '없음(공공데이터포털 사용)');
    console.log('--------------------------------------------------\n');

    // 테스트용 샘플 데이터
    // 401 Unauthorized 인증 성공 여부를 테스트하는 것이므로 임의의 값으로 시도해도 됩니다.
    // 만약 실제 진위 검증까지 성공하고 싶다면 실제 운전자의 이름, 생년월일, 자격번호, 주민등록번호를 넣으셔야 합니다.
    const testData = {
        driverName: '테스트',
        birthYmd: '19900101',
        qualCertNo: '11-22-333333',
        rrn: '900101-1000000'
    };

    console.log('임시 테스트 데이터:', testData);
    console.log('🚀 API 요청 전송 중...');

    try {
        const result = await verifyTsWorkerQualification(testData);

        console.log('\n================ 🎯 테스트 결과 🎯 ================');
        console.log('API 연동 성공 여부 (ok):', result.ok);
        console.log('결과 코드 (code):', result.code);
        console.log('에러/안내 메시지 (message):', result.message);
        if (result.detail) {
            console.log('상세 데이터 (detail):');
            console.dir(result.detail, { depth: null });
        }
        console.log('==================================================');
    } catch (error) {
        console.error('❌ 테스트 도중 오류가 발생했습니다:', error);
    }
}

runTest();
