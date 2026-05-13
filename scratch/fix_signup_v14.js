import fs from 'fs';

const filePath = 'c:/Users/LG/AI자동화/project_bustaams/busTaams_app/src/pages/Signup.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Find the specific block for authCode input and apply the fix
const targetBlock = /<div className="flex-grow relative">\s*<span className="material-symbols-outlined absolute left-4 top-1\/2 -translate-y-1\/2 text-outline text-lg">verified_user<\/span>\s*<input\s*value={authCode}\s*onChange={e=>setAuthCode\(e\.target\.value\)}\s*type="text"\s*placeholder="6자리 인증번호"\s*className="w-full bg-slate-100 rounded-xl py-3 pl-12 pr-4 outline-none font-medium"\s*\/>\s*<\/div>/;

const replacement = `                                <div className="flex-grow min-w-0 relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">verified_user</span>
                                    <input 
                                        value={authCode} 
                                        onChange={e=>setAuthCode(e.target.value)} 
                                        type="text" 
                                        placeholder="인증번호 6자리" 
                                        className="w-full bg-slate-100 rounded-xl py-3 pl-10 pr-3 outline-none font-medium text-sm" 
                                    />
                                </div>`;

if (content.match(targetBlock)) {
    content = content.replace(targetBlock, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully fixed authCode input section layout.');
} else {
    // Try a more flexible match if the first one fails
    console.log('Precise match failed, trying flexible match...');
    const flexibleTarget = /<div className="flex-grow relative">[\s\S]*?verified_user[\s\S]*?{authCode}[\s\S]*?<\/div>/;
    if (content.match(flexibleTarget)) {
        content = content.replace(flexibleTarget, replacement);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Successfully fixed authCode input section layout (flexible match).');
    } else {
        console.log('Could not find the target block even with flexible match.');
    }
}
