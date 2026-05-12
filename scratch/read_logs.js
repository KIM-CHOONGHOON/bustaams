
const fs = require('fs');

try {
    const content = fs.readFileSync('c:/Users/LG/AI자동화/project_bustaams/busTaams_server/server.log', 'utf16le');
    console.log('--- server.log (Last 50 lines) ---');
    const lines = content.split('\n');
    console.log(lines.slice(-50).join('\n'));
} catch (err) {
    console.error('Error reading log:', err);
}
