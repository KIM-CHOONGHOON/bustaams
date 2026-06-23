const fs = require('fs');
const path = require('path');
const axios = require('axios');

// 한글 주석: OpenAI API Key 환경변수 체크 및 획득
const getOpenAiApiKey = () => {
    return process.env.OPENAI_API_KEY || '';
};

/**
 * 통장 사본 이미지를 OpenAI gpt-4o를 통해 분석하여 은행명, 계좌번호, 예금주를 추출합니다.
 * PDF 파일 업로드 및 텍스트 기반 추출도 지원합니다.
 * @param {Buffer} imageBuffer 이미지 또는 PDF 파일 버퍼
 * @returns {Promise<{bankName: string, accountNumber: string, accountHolder: string}>}
 */
async function processBankbookOcr(imageBuffer) {
    const apiKey = getOpenAiApiKey();
    
    if (!apiKey) {
        console.warn('[OCR Service] OpenAI API Key가 설정되지 않았습니다. 공란을 반환합니다.');
        return { bankName: '', accountNumber: '', accountHolder: '' };
    }

    try {
        // PDF 여부 검사 및 텍스트 추출 처리 (한글 주석)
        const isPdf = imageBuffer && imageBuffer.length > 4 && imageBuffer.toString('ascii', 0, 4) === '%PDF';
        let pdfText = '';
        if (isPdf) {
            console.log('[OCR Service] PDF 통장사본 감지. 텍스트 추출 중...');
            let parser = null;
            try {
                const { PDFParse } = require('pdf-parse');
                parser = new PDFParse({ data: imageBuffer });
                const parsedPdf = await parser.getText();
                pdfText = parsedPdf.text || '';
            } catch (pdfErr) {
                console.error('[OCR Service] PDF 텍스트 추출 실패, 이미지 분석으로 폴백합니다:', pdfErr.message);
            } finally {
                if (parser) {
                    try {
                        await parser.destroy();
                    } catch (destroyErr) {
                        console.error('[OCR Service] PDF 파서 해제 중 오류 (무시):', destroyErr.message);
                    }
                }
            }
        }

        console.log('[OCR Service] OpenAI gpt-4o 통장사본 분석 요청 중...');
        
        let payload;
        if (pdfText && pdfText.trim().length > 0) {
            // PDF 텍스트가 추출된 경우 텍스트 기반 요청 생성
            payload = {
                model: 'gpt-4o',
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'user',
                        content: `이 텍스트는 은행 통장 사본에서 추출한 텍스트 데이터입니다. 텍스트에서 다음 세 가지 필드를 정밀하게 찾아서 추출한 뒤 아래의 JSON 구조로만 반환해 주세요.
{
  "bankName": "은행명 (예: 신한은행, 하나은행, NH농협은행 등 한국의 주요 은행 중 하나)",
  "accountNumber": "계좌번호 (하이픈 포함)",
  "accountHolder": "예금주 성명 (한글 이름)"
}
만약 텍스트에서 특정 필드를 찾을 수 없거나 분석에 실패하면 해당 필드값은 빈 문자열("")로 입력해 주세요. JSON 외에 어떠한 설명이나 텍스트도 반환하지 마세요.

[텍스트 데이터]
${pdfText}`
                    }
                ],
                temperature: 0.1
            };
        } else {
            // 이미지 혹은 스캔본 PDF인 경우 Vision API 요청 생성
            const base64Image = imageBuffer.toString('base64');
            payload = {
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
        }

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
        if (error.response) {
            console.error('[OCR Service] OpenAI 통장 사본 API 에러 응답:', JSON.stringify(error.response.data));
        }
        console.error('[OCR Service] OpenAI 통장 사본 분석 실패:', error.message);
        return { bankName: '', accountNumber: '', accountHolder: '' };
    }
}

/**
 * 사업자 등록증 이미지를 OpenAI gpt-4o를 통해 분석하여 주요 사업자 정보를 추출합니다.
 * PDF 파일 업로드 및 텍스트 기반 추출도 지원합니다.
 * @param {Buffer} imageBuffer 이미지 또는 PDF 파일 버퍼
 * @returns {Promise<{bizNo: string, bizNm: string, ceoNm: string, bizAddr: string, bizType: string, bizItem: string}>}
 */
async function processBizRegOcr(imageBuffer) {
    const apiKey = getOpenAiApiKey();

    if (!apiKey) {
        console.warn('[OCR Service] OpenAI API Key가 설정되지 않았습니다. 공란을 반환합니다.');
        return { bizNo: '', bizNm: '', ceoNm: '', bizAddr: '', bizType: '', bizItem: '' };
    }

    try {
        // PDF 여부 검사 및 텍스트 추출 처리 (한글 주석)
        const isPdf = imageBuffer && imageBuffer.length > 4 && imageBuffer.toString('ascii', 0, 4) === '%PDF';
        let pdfText = '';
        if (isPdf) {
            console.log('[OCR Service] PDF 사업자등록증 감지. 텍스트 추출 중...');
            let parser = null;
            try {
                const { PDFParse } = require('pdf-parse');
                parser = new PDFParse({ data: imageBuffer });
                const parsedPdf = await parser.getText();
                pdfText = parsedPdf.text || '';
            } catch (pdfErr) {
                console.error('[OCR Service] PDF 텍스트 추출 실패, 이미지 분석으로 폴백합니다:', pdfErr.message);
            } finally {
                if (parser) {
                    try {
                        await parser.destroy();
                    } catch (destroyErr) {
                        console.error('[OCR Service] PDF 파서 해제 중 오류 (무시):', destroyErr.message);
                    }
                }
            }
        }

        console.log('[OCR Service] OpenAI gpt-4o 사업자등록증 분석 요청 중...');
        
        let payload;
        if (pdfText && pdfText.trim().length > 0) {
            // PDF 텍스트가 추출된 경우 텍스트 기반 요청 생성
            payload = {
                model: 'gpt-4o',
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'user',
                        content: `이 텍스트는 대한민국의 사업자등록증에서 추출한 텍스트 데이터입니다. 텍스트에서 다음 필드들을 정밀하게 찾아서 추출한 뒤 아래의 JSON 구조로만 반환해 주세요.
{
  "bizNo": "사업자등록번호 (예: 120-00-00000)",
  "bizNm": "상호 (법인명)",
  "ceoNm": "대표자 성명",
  "bizAddr": "사업장 소재지 주소",
  "bizType": "업태",
  "bizItem": "종목"
}
만약 텍스트에서 특정 필드를 찾을 수 없거나 분석에 실패하면 해당 필드값은 빈 문자열("")로 입력해 주세요. JSON 외에 어떠한 설명이나 텍스트도 반환하지 마세요.

[텍스트 데이터]
${pdfText}`
                    }
                ],
                temperature: 0.1
            };
        } else {
            // 이미지 혹은 스캔본 PDF인 경우 Vision API 요청 생성
            const base64Image = imageBuffer.toString('base64');
            payload = {
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
        }

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
        if (error.response) {
            console.error('[OCR Service] OpenAI 사업자등록증 API 에러 응답:', JSON.stringify(error.response.data));
        }
        console.error('[OCR Service] OpenAI 사업자등록증 분석 실패:', error.message);
        return { bizNo: '', bizNm: '', ceoNm: '', bizAddr: '', bizType: '', bizItem: '' };
    }
}

module.exports = {
    processBankbookOcr,
    processBizRegOcr
};
