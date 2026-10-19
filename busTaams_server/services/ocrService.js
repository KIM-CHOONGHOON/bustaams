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
        
        const promptInstructions = `이 이미지/텍스트는 대한민국의 사업자등록증입니다. 아래의 필드들을 정밀하게 찾아서 추출한 뒤 JSON 구조로만 반환해 주세요.
{
  "bizNo": "사업자등록번호 (예: 120-00-00000)",
  "bizNm": "상호 또는 법인명 (상호명, 법인명, 단체명 등 사업자등록증의 '상호' 또는 '법인명(단체명)' 란에 적힌 명칭)",
  "ceoNm": "대표자 성명",
  "bizAddr": "사업장 소재지 주소",
  "bizType": "업태",
  "bizItem": "종목"
}

[필수 요구사항]
1. 사업자등록증의 '상호(법인명)', '상호', '법인명(단체명)' 옆에 기재된 기업/법인/상호 명칭을 정확히 "bizNm" 필드에 넣어주세요.
2. 필드를 찾을 수 없거나 추출에 실패한 경우 해당 필드값은 빈 문자열("")로 설정하세요.
3. 설명 없이 JSON 데이터만 반환하세요.`;

        let payload;
        if (pdfText && pdfText.trim().length > 0) {
            // PDF 텍스트가 추출된 경우 텍스트 기반 요청 생성
            payload = {
                model: 'gpt-4o',
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'user',
                        content: `${promptInstructions}\n\n[텍스트 데이터]\n${pdfText}`
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
                                text: promptInstructions
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

        const extractedBizNm = parsed.bizNm || parsed.companyName || parsed.tradeName || parsed.corpName || parsed.firmName || parsed['상호'] || parsed['법인명'] || parsed['상호명'] || '';

        return {
            bizNo: parsed.bizNo || parsed.businessNumber || '',
            bizNm: extractedBizNm,
            ceoNm: parsed.ceoNm || parsed.representativeName || parsed.ceoName || '',
            bizAddr: parsed.bizAddr || parsed.address || '',
            bizType: parsed.bizType || parsed.businessType || '',
            bizItem: parsed.bizItem || parsed.businessItem || ''
        };

    } catch (error) {
        if (error.response) {
            console.error('[OCR Service] OpenAI 사업자등록증 API 에러 응답:', JSON.stringify(error.response.data));
        }
        console.error('[OCR Service] OpenAI 사업자등록증 분석 실패:', error.message);
        return { bizNo: '', bizNm: '', ceoNm: '', bizAddr: '', bizType: '', bizItem: '' };
    }
}

/**
 * 운전면허증 이미지를 OpenAI gpt-4o를 통해 분석하여 면허번호, 발급일, 면허종류, 주민등록번호, 성명을 추출합니다.
 * @param {Buffer} imageBuffer 이미지 또는 PDF 파일 버퍼
 * @returns {Promise<{licenseNo: string, licenseIssueDt: string, licenseType: string, residentNo: string, name: string}>}
 */
async function processLicenseOcr(imageBuffer) {
    const apiKey = getOpenAiApiKey();
    if (!apiKey) {
        return { licenseNo: '', licenseIssueDt: '', licenseType: '', residentNo: '', name: '' };
    }

    try {
        const isPdf = imageBuffer && imageBuffer.length > 4 && imageBuffer.toString('ascii', 0, 4) === '%PDF';
        let pdfText = '';
        if (isPdf) {
            let parser = null;
            try {
                const { PDFParse } = require('pdf-parse');
                parser = new PDFParse({ data: imageBuffer });
                const parsedPdf = await parser.getText();
                pdfText = parsedPdf.text || '';
            } catch (pdfErr) {
                console.error('[OCR Service] PDF 텍스트 추출 실패 (면허증):', pdfErr.message);
            } finally {
                if (parser) {
                    try { await parser.destroy(); } catch (e) {}
                }
            }
        }

        const promptText = `이 이미지/텍스트는 대한민국의 운전면허증입니다. 텍스트/이미지에서 다음 필드들을 정밀하게 찾아서 추출한 뒤 아래의 JSON 구조로만 반환해 주세요.
{
  "licenseNo": "면허번호 (예: 11-12-345678-90, 숫자 및 하이픈)",
  "licenseIssueDt": "발급일자 (YYYY-MM-DD 형식, 예: 2020-05-15)",
  "licenseType": "면허 종류 (예: 1종대형, 1종보통 등)",
  "residentNo": "주민등록번호 (예: 800101-1234567)",
  "name": "성명 (한글 이름)"
}
만약 특정 필드를 찾을 수 없거나 분석에 실패하면 해당 필드값은 빈 문자열("")로 입력해 주세요. JSON 외에 어떠한 설명이나 텍스트도 반환하지 마세요.`;

        let payload;
        if (pdfText && pdfText.trim().length > 0) {
            payload = {
                model: 'gpt-4o',
                response_format: { type: 'json_object' },
                messages: [{ role: 'user', content: `${promptText}\n\n[텍스트 데이터]\n${pdfText}` }],
                temperature: 0.1
            };
        } else {
            const base64Image = imageBuffer.toString('base64');
            payload = {
                model: 'gpt-4o',
                response_format: { type: 'json_object' },
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'text', text: promptText },
                        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                    ]
                }],
                temperature: 0.1
            };
        }

        const response = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            timeout: 10000
        });

        const content = response.data?.choices?.[0]?.message?.content;
        if (!content) return { licenseNo: '', licenseIssueDt: '', licenseType: '', residentNo: '', name: '' };

        const parsed = JSON.parse(content);
        return {
            licenseNo: parsed.licenseNo || '',
            licenseIssueDt: parsed.licenseIssueDt || '',
            licenseType: parsed.licenseType || '',
            residentNo: parsed.residentNo || '',
            name: parsed.name || ''
        };
    } catch (error) {
        console.error('[OCR License Service] Exception:', error.message);
        return { licenseNo: '', licenseIssueDt: '', licenseType: '', residentNo: '', name: '' };
    }
}

/**
 * 버스운전자격증 이미지를 OpenAI gpt-4o를 통해 분석하여 자격증번호, 취득일자, 성명을 추출합니다.
 * @param {Buffer} imageBuffer 이미지 또는 PDF 파일 버퍼
 * @returns {Promise<{busLicenseNo: string, qualAcquisitionDt: string, name: string}>}
 */
async function processBusLicenseOcr(imageBuffer) {
    const apiKey = getOpenAiApiKey();
    if (!apiKey) {
        return { busLicenseNo: '', qualAcquisitionDt: '', name: '' };
    }

    try {
        const isPdf = imageBuffer && imageBuffer.length > 4 && imageBuffer.toString('ascii', 0, 4) === '%PDF';
        let pdfText = '';
        if (isPdf) {
            let parser = null;
            try {
                const { PDFParse } = require('pdf-parse');
                parser = new PDFParse({ data: imageBuffer });
                const parsedPdf = await parser.getText();
                pdfText = parsedPdf.text || '';
            } catch (pdfErr) {
                console.error('[OCR Service] PDF 텍스트 추출 실패 (버스자격증):', pdfErr.message);
            } finally {
                if (parser) {
                    try { await parser.destroy(); } catch (e) {}
                }
            }
        }

        const promptText = `이 이미지/텍스트는 대한민국의 버스운전자격증(또는 버스운전 자격증명)입니다. 텍스트/이미지에서 다음 필드들을 정밀하게 찾아서 추출한 뒤 아래의 JSON 구조로만 반환해 주세요.
{
  "busLicenseNo": "버스운전자격증 번호 (예: 12-34-567890 또는 자격번호)",
  "qualAcquisitionDt": "취득일자 또는 교부일자 (YYYY-MM-DD 형식, 예: 2015-08-20)",
  "name": "성명 (한글 이름)"
}
만약 특정 필드를 찾을 수 없거나 분석에 실패하면 해당 필드값은 빈 문자열("")로 입력해 주세요. JSON 외에 어떠한 설명이나 텍스트도 반환하지 마세요.`;

        let payload;
        if (pdfText && pdfText.trim().length > 0) {
            payload = {
                model: 'gpt-4o',
                response_format: { type: 'json_object' },
                messages: [{ role: 'user', content: `${promptText}\n\n[텍스트 데이터]\n${pdfText}` }],
                temperature: 0.1
            };
        } else {
            const base64Image = imageBuffer.toString('base64');
            payload = {
                model: 'gpt-4o',
                response_format: { type: 'json_object' },
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'text', text: promptText },
                        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                    ]
                }],
                temperature: 0.1
            };
        }

        const response = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            timeout: 10000
        });

        const content = response.data?.choices?.[0]?.message?.content;
        if (!content) return { busLicenseNo: '', qualAcquisitionDt: '', name: '' };

        const parsed = JSON.parse(content);
        return {
            busLicenseNo: parsed.busLicenseNo || '',
            qualAcquisitionDt: parsed.qualAcquisitionDt || '',
            name: parsed.name || ''
        };
    } catch (error) {
        console.error('[OCR BusLicense Service] Exception:', error.message);
        return { busLicenseNo: '', qualAcquisitionDt: '', name: '' };
    }
}

module.exports = {
    processBankbookOcr,
    processBizRegOcr,
    processLicenseOcr,
    processBusLicenseOcr
};
