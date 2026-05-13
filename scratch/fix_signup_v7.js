import fs from 'fs';

const filePath = 'c:/Users/LG/AI자동화/project_bustaams/busTaams_app/src/pages/Signup.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix the marketing checkbox syntax error (line 553)
content = content.replace(/checked=\{marketing\.agree\}\s+handleMarketingAll\(e\);/, 'checked={marketing.agree}\n                                                    onChange={handleMarketingAll}');

// 2. Fix the missing < in various places
content = content.replace(/([^\s<])\/button>/g, '$1</button>');
content = content.replace(/([^\s<])\/p>/g, '$1</p>');
content = content.replace(/([^\s<])\/div>/g, '$1</div>');

// 3. Restore main Korean labels
const translations = {
    '?대찓??': '이메일',
    '?꾩씠??': '아이디',
    '??쑬?甕곕뜇??': '비밀번호',
    '??€???甕곕뜇??': '휴대폰 번호',
    '?紐꾩쵄': '인증',
    '?袁⑹쁽': '전자',
    '??뺤구': '서명',
    '?④쑴????밴쉐': '계정 생성',
    '?怨멸쉭癰귣떯由?': '자세히 보기',
    '?뺤씤??': '확인 완료',
    '以묐났?뺤씤': '중복 확인',
    '?紐꾩쵄?類ㅼ뵥': '인증 확인',
    '?紐꾩쵄?遺욧퍕': '인증 요청',
};

for (const [broken, clean] of Object.entries(translations)) {
    content = content.replaceAll(broken, clean);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed Signup.jsx completely (v7)');
