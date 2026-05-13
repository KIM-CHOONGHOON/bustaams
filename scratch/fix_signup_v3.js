import fs from 'fs';

const filePath = 'c:/Users/LG/AI자동화/project_bustaams/busTaams_app/src/pages/Signup.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix handleSendCode
const sendCodeRegex = /const handleSendCode = async \(\) => \{[\s\S]*?catch \(err\) \{[\s\S]*?\} \};/;
content = content.replace(sendCodeRegex, `const handleSendCode = async () => {
        if (!phoneNo) return notify.warn('번호를 입력해 주세요.');
        
        try {
            const res = await sendAuthCode(phoneNo, 'signup');
            if (res.success) {
                setIsCodeSent(true);
                notify.success('인증번호 발송', '인증번호가 발송되었습니다.');
            } else {
                notify.error('발송 실패', res.error || '인증번호 발송 중 오류가 발생했습니다.');
            }
        } catch (err) {
            console.error('Send Code Error:', err);
            notify.error('발송 실패', '인증번호 발송 중 오류가 발생했습니다.');
        }
    };`);

// Fix handleSubmit labels (already mostly fixed but just in case)
content = content.replace(/notify\.error\('揶쎛€\?\?\?\?쎈솭', res\.error\);/, "notify.error('가입 실패', res.error);");

// Clean up any remaining broken strings in notify calls
content = content.replace(/notify\.warn\('\?\?€李\?\?깆뱽 \?\?낆젾\?\?뤾쉭\?\?'\)/g, "notify.warn('이메일을 입력해 주세요.')");
content = content.replace(/notify\.warn\('\?袁⑹뵠\?遺\? \?\?낆젾\?\?뤾쉭\?\?'\)/g, "notify.warn('아이디를 입력해 주세요.')");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed Signup.jsx syntax errors (v3)');
