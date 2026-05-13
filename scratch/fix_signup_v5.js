import fs from 'fs';

const filePath = 'c:/Users/LG/AI자동화/project_bustaams/busTaams_app/src/pages/Signup.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix syntax errors like "?/button>"
content = content.replace(/\?[^<]*?\/button>/g, '확인</button>');
content = content.replace(/\?⑥쥒而쇽쭪\?\?\?\/button>/g, '고객지원</button>');

// Fix other broken Korean labels
content = content.replace(/筌ㅼ뮄\?\?\?疫꿸퀬\?\?/g, '최고의 기회');
content = content.replace(/\?\?덉쨮\?\?/g, '새로운');
content = content.replace(/\?\?六\?\?\?\?\?뽰삂\./g, '여행의 시작.');

// Fix line 297 specifically
content = content.replace(/<button className="text-outline font-bold text-xs">.*?\/button>/, '<button className="text-outline font-bold text-xs">고객지원</button>');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed Signup.jsx syntax and labels (v5)');
