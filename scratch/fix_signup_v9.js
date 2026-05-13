import fs from 'fs';

const filePath = 'c:/Users/LG/AI자동화/project_bustaams/busTaams_app/src/pages/Signup.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix missing < before /label>, /p>, /button>, /div>, etc.
content = content.replace(/([^\s<])\/label>/g, '$1</label>');
content = content.replace(/([^\s<])\/button>/g, '$1</button>');
content = content.replace(/([^\s<])\/p>/g, '$1</p>');
content = content.replace(/([^\s<])\/div>/g, '$1</div>');
content = content.replace(/([^\s<])\/span>/g, '$1</span>');
content = content.replace(/([^\s<])\/h1>/g, '$1</h1>');
content = content.replace(/([^\s<])\/header>/g, '$1</header>');

// Fix the input tag unclosed bracket (line 336)
content = content.replace(/placeholder="怨좎쑀\?\?\?\?꾩씠\?붾\? \?낅젰\?\꽭\?\? className="/, 'placeholder="아이디를 입력하세요" className="');

// Fix any remaining broken Korean in input placeholders
content = content.replace(/placeholder="\?\?살구\?\?\?\?\?낆젾\?\?뤾쉭\?\?"/g, 'placeholder="실명을 입력하세요"');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed Signup.jsx finally (v9)');
