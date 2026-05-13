import fs from 'fs';

const filePath = 'c:/Users/LG/AI자동화/project_bustaams/busTaams_app/src/pages/Signup.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix ternary operator quotes (lines 321, 338, 414)
content = content.replace(/\{isEmailChecked \? '.*? : '.*?'\}/g, "{isEmailChecked ? '확인 완료' : '중복 확인'}");
content = content.replace(/\{isIdChecked \? '.*? : '.*?'\}/g, "{isIdChecked ? '확인 완료' : '중복 확인'}");
content = content.replace(/\{isCodeSent \? '.*? : '.*?'\}/g, "{isCodeSent ? '재발송' : '인증 요청'}");

// Additional fix for the suspected line 324 area
content = content.replace(/<\/div> \/>/g, '</div>');

// Ensure all buttons are closed correctly
content = content.replace(/<button([^>]*?)>(.*?)\/button>/g, '<button$1>$2</button>');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed Signup.jsx (v8)');
