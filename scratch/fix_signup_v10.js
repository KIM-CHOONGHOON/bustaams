import fs from 'fs';

const filePath = 'c:/Users/LG/AI자동화/project_bustaams/busTaams_app/src/pages/Signup.jsx';
let content = fs.readFileSync(filePath, 'utf8').split('\n');

// Index 335 (Line 336)
content[335] = '                                <input value={userId} onChange={e=>setUserId(e.target.value)} type="text" placeholder="아이디를 입력하세요" className="flex-grow bg-slate-100 rounded-xl py-4 px-5 outline-none font-medium" />';

fs.writeFileSync(filePath, content.join('\n'), 'utf8');
console.log('Fixed line 336 in Signup.jsx');
