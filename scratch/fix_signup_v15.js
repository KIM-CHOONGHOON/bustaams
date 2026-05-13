import fs from 'fs';

const filePath = 'c:/Users/LG/AI자동화/project_bustaams/busTaams_app/src/pages/Signup.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix required tags and 상세보기 buttons in loop
content = content.replace(
    /<span className="text-sm font-bold text-on-surface-variant flex gap-1">\s*<span className="text-primary">\[필수\]<\/span> {item\.label}\s*<\/span>/g,
    `<span className="text-sm font-bold text-on-surface-variant flex gap-1 min-w-0">
                                                <span className="text-primary whitespace-nowrap shrink-0">[필수]</span>
                                                <span className="truncate">{item.label}</span>
                                            </span>`
);

content = content.replace(
    /className="text-\[10px\] text-outline underline font-bold uppercase tracking-tighter"\s*>\s*상세보기/g,
    `className="text-[10px] text-outline underline font-bold uppercase tracking-tighter whitespace-nowrap shrink-0 ml-2"
                                        >
                                            상세보기`
);

// Fix optional tag and 상세보기 button in marketing section
content = content.replace(
    /<span className="text-sm font-bold text-on-surface-variant flex gap-1">\s*<span className="text-outline">\[선택\]<\/span> 마케팅 정보 수신 및 푸시 알림 동의\s*<\/span>/g,
    `<span className="text-sm font-bold text-on-surface-variant flex gap-1 min-w-0">
                                                <span className="text-outline whitespace-nowrap shrink-0">[선택]</span>
                                                <span className="truncate">마케팅 정보 수신 및 알림 동의</span>
                                            </span>`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully optimized terms agreement section layout.');
