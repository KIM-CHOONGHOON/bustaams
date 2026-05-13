import fs from 'fs';

const filePath = 'c:/Users/LG/AI자동화/project_bustaams/busTaams_app/src/pages/Signup.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix handleCheckEmail syntax error and Korean
content = content.replace(/const handleCheckEmail = async \(\) => \{[\s\S]*?catch \(err\) \{\} \};/, `const handleCheckEmail = async () => {
        if (!email) return notify.warn('이메일을 입력해 주세요.');
        try {
            const res = await checkEmailDuplicate(email);
            if (res.isAvailable) {
                notify.success('사용 가능', '사용 가능한 이메일입니다.');
                setIsEmailChecked(true);
            } else {
                notify.error('중복 이메일', '이미 사용 중인 이메일입니다.');
            }
        } catch (err) {}
    };`);

// Fix handleCheckId syntax error and Korean
content = content.replace(/const handleCheckId = async \(\) => \{[\s\S]*?catch \(err\) \{\} \};/, `const handleCheckId = async () => {
        if (!userId) return notify.warn('아이디를 입력해 주세요.');
        try {
            const res = await checkIdDuplicate(userId);
            if (res.isAvailable) {
                notify.success('사용 가능', '사용 가능한 아이디입니다.');
                setIsIdChecked(true);
            } else {
                notify.error('중복 아이디', '이미 가입된 아이디입니다.');
            }
        } catch (err) {}
    };`);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed Signup.jsx syntax errors');
