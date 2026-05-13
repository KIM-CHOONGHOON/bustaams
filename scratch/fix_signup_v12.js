import fs from 'fs';

const filePath = 'c:/Users/LG/AI자동화/project_bustaams/busTaams_app/src/pages/Signup.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the typo "라벨<</button>" or "라벨<</p>" etc.
content = content.replace(/([^<])<+<\/button>/g, '$1</button>');
content = content.replace(/([^<])<+<\/p>/g, '$1</p>');
content = content.replace(/([^<])<+<\/div>/g, '$1</div>');
content = content.replace(/([^<])<+<\/span>/g, '$1</span>');
content = content.replace(/([^<])<+<\/label>/g, '$1</label>');
content = content.replace(/([^<])<+<\/h1>/g, '$1</h1>');
content = content.replace(/([^<])<+<\/header>/g, '$1</header>');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed all tag typos (<) in Signup.jsx');
