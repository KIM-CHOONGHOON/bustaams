import fs from 'fs';

const filePath = 'c:/Users/LG/AI자동화/project_bustaams/busTaams_app/src/pages/Signup.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix missing < before /p>, /button>, /div>, etc.
content = content.replace(/([^\s<])\/p>/g, '$1</p>');
content = content.replace(/([^\s<])\/button>/g, '$1</button>');
content = content.replace(/([^\s<])\/div>/g, '$1</div>');
content = content.replace(/([^\s<])\/span>/g, '$1</span>');
content = content.replace(/([^\s<])\/h1>/g, '$1</h1>');
content = content.replace(/([^\s<])\/header>/g, '$1</header>');

// Fix the specific broken line in section
content = content.replace(/<h1 className="font-headline font-black text-5xl leading-tight">새로운<br\/><span className="text-primary">.*?<\/span><\/h1>/, '<h1 className="font-headline font-black text-5xl leading-tight">새로운<br/><span className="text-primary">여행의 시작.</span></h1>');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed all tag syntax errors in Signup.jsx');
