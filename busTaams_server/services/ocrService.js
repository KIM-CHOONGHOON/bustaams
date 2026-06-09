const fs = require('fs');
const path = require('path');
const axios = require('axios');

// 한글 주석: OpenAI API Key 환경변수 체크 및 획득
const getOpenAiApiKey = () => {
    return process.env.OPENAI_API_KEY || '';
};

/**
 * 통장 사본 이미지를 OpenAI gpt-4o를 통해 분석하여 은행명, 계좌번호, 예금주를 추출합니다.
 * @param {Buffer} imageBuffer 이미지 파일 버퍼
 * @returns {Promise<{bankName: string, accountNumber: string, accountHolder: string}>}
 */
async function processBankbookOcr(imageBuffer) {
    const apiKey = getOpenAiApiKey();
    
    // 한글 주석: API Key가 유효하지 않으면 즉시 공란 데이터 반환 (실패 시 공란 룰 적용)
    if (!apiKey) {
        console.warn('[OCR Service] OpenAI API Key가 설정되지 않았습니다. 공란을 반환합니다.');
        return { bankName: '', accountNumber: '', accountHolder: '' };
    }

    try {
        console.log('[OCR Service] OpenAI gpt-4o 통장사본 분석 요청 중...');
        const base64Image = imageBuffer.toString('base64');

        const payload = {
            model: 'gpt-4o',
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: `이 이미지는 은행 통장 사본입니다. 이미지에서 다음 세 가지 필드를 정밀하게 찾아서 추출한 뒤 아래의 JSON 구조로만 반환해 주세요.
{
  "bankName": "은행명 (예: 신한은행, 하나은행, NH농협은행 등 한국의 주요 은행 중 하나)",
  "accountNumber": "계좌번호 (하이픈 포함)",
  "accountHolder": "예금주 성명 (한글 이름)"
}
만약 이미지에서 특정 필드를 찾을 수 없거나 분석에 실패하면 해당 필드값은 빈 문자열("")로 입력해 주세요. JSON 외에 어떠한 설명이나 텍스트도 반환하지 마세요.`
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Image}`
                            }
                        }
                    ]
                }
            ],
            temperature: 0.1
        };

        const response = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            timeout: 10000 // 10초 타임아웃 설정 (한글 주석)
        });

        const content = response.data?.choices?.[0]?.message?.content;
        if (!content) throw new Error('OpenAI 응답에서 콘텐츠를 찾을 수 없습니다.');

        const parsed = JSON.parse(content);
        console.log('[OCR Service] OpenAI 통장 사본 분석 완료:', parsed);

        return {
            bankName: parsed.bankName || '',
            accountNumber: parsed.accountNumber || '',
            accountHolder: parsed.accountHolder || ''
        };

    } catch (error) {
        console.error('[OCR Service] OpenAI 통장 사본 분석 실패:', error.message);
        // 한글 주석: 오류 발생 시 빈 문자열이 포함된 객체를 안전하게 반환
        return { bankName: '', accountNumber: '', accountHolder: '' };
    }
}

/**
 * 사업자 등록증 이미지를 OpenAI gpt-4o를 통해 분석하여 주요 사업자 정보를 추출합니다.
 * @param {Buffer} imageBuffer 이미지 파일 버퍼
 * @returns {Promise<{bizNo: string, bizNm: string, ceoNm: string, bizAddr: string, bizType: string, bizItem: string}>}
 */
async function processBizRegOcr(imageBuffer) {
    const apiKey = getOpenAiApiKey();

    // 한글 주석: API Key가 유효하지 않으면 즉시 공란 데이터 반환 (실패 시 공란 룰 적용)
    if (!apiKey) {
        console.warn('[OCR Service] OpenAI API Key가 설정되지 않았습니다. 공란을 반환합니다.');
        return { bizNo: '', bizNm: '', ceoNm: '', bizAddr: '', bizType: '', bizItem: '' };
    }

    try {
        console.log('[OCR Service] OpenAI gpt-4o 사업자등록증 분석 요청 중...');
        const base64Image = imageBuffer.toString('base64');

        const payload = {
            model: 'gpt-4o',
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: `이 이미지는 대한민국의 사업자등록증입니다. 이미지에서 다음 필드들을 정밀하게 찾아서 추출한 뒤 아래의 JSON 구조로만 반환해 주세요.
{
  "bizNo": "사업자등록번호 (예: 120-00-00000)",
  "bizNm": "상호 (법인명)",
  "ceoNm": "대표자 성명",
  "bizAddr": "사업장 소재지 주소",
  "bizType": "업태",
  "bizItem": "종목"
}
만약 이미지에서 특정 필드를 찾을 수 없거나 분석에 실패하면 해당 필드값은 빈 문자열("")로 입력해 주세요. JSON 외에 어떠한 설명이나 텍스트도 반환하지 마세요.`
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Image}`
                            }
                        }
                    ]
                }
            ],
            temperature: 0.1
        };

        const response = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            timeout: 10000 // 10초 타임아웃 설정 (한글 주석)
        });

        const content = response.data?.choices?.[0]?.message?.content;
        if (!content) throw new Error('OpenAI 응답에서 콘텐츠를 찾을 수 없습니다.');

        const parsed = JSON.parse(content);
        console.log('[OCR Service] OpenAI 사업자등록증 분석 완료:', parsed);

        return {
            bizNo: parsed.bizNo || '',
            bizNm: parsed.bizNm || '',
            ceoNm: parsed.ceoNm || '',
            bizAddr: parsed.bizAddr || '',
            bizType: parsed.bizType || '',
            bizItem: parsed.bizItem || ''
        };

    } catch (error) {
        console.error('[OCR Service] OpenAI 사업자등록증 분석 실패:', error.message);
        // 한글 주석: 오류 발생 시 빈 문자열이 포함된 객체를 안전하게 반환
        return { bizNo: '', bizNm: '', ceoNm: '', bizAddr: '', bizType: '', bizItem: '' };
    }
}

module.exports = {
    processBankbookOcr,
    processBizRegOcr
};
