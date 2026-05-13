import fs from 'fs';

const filePath = 'c:/Users/LG/AI자동화/project_bustaams/busTaams_app/src/pages/Signup.jsx';
let content = fs.readFileSync(filePath, 'utf8').split('\n');

// Line 352 (index 351)
content[351] = '                                        placeholder="비밀번호를 입력하세요 (8자 이상, 숫자, 특수문자 포함)"';
// Line 375 (index 374)
content[374] = '                                        placeholder="비밀번호를 다시 한번 입력해 주세요"';
// Line 403 (index 402)
content[402] = '                                        placeholder="휴대폰 번호를 입력하세요"';
// Line 427 (index 426)
content[426] = '                                            placeholder="6자리 인증번호"';

fs.writeFileSync(filePath, content.join('\n'), 'utf8');
console.log('Fixed unclosed placeholders in Signup.jsx');
