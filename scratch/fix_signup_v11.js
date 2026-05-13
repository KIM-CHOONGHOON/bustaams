import fs from 'fs';

const filePath = 'c:/Users/LG/AI자동화/project_bustaams/busTaams_app/src/pages/Signup.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the typo "초기화<</button>" or "초기화<</button>"
content = content.replace(/초기화<+<\/button>/g, '초기화</button>');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed extra < in Signup.jsx line 77');
