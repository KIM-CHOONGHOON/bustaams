import fs from 'fs';

const filePath = 'c:/Users/LG/AI자동화/project_bustaams/busTaams_app/src/pages/Signup.jsx';
let content = fs.readFileSync(filePath, 'utf8').split('\n');

// Line 219 (index 218)
content[218] = "        if (!phoneNo) return notify.warn('인증번호를 입력해 주세요.');";
// Line 225 (index 224)
content[224] = "                notify.success('인증번호 발송', '인증번호가 발송되었습니다.');";
// Line 227 (index 226)
content[226] = "                notify.error('발송 실패', res.error || '인증번호 발송 중 오류가 발생했습니다.');";
// Line 231 (index 230)
content[230] = "            notify.error('발송 실패', '인증번호 발송 중 오류가 발생했습니다.');";

fs.writeFileSync(filePath, content.join('\n'), 'utf8');
console.log('Fixed specific lines in Signup.jsx');
