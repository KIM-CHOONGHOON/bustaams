const fs = require('fs');
const content = fs.readFileSync('c:/Users/LG/AI자동화/project_bustaams/busTaams_app/src/api.js', 'utf8');
try {
    // This is a very rough check, but better than nothing
    // We can't use eval because of ESM exports
    console.log('File length:', content.length);
    if (content.includes('export const request')) {
        console.log('request is exported');
    } else {
        console.log('request is NOT exported');
    }
} catch (e) {
    console.error(e);
}
