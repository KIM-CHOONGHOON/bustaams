const dateStr = '2026.05.29 23:00';
const d = new Date(dateStr);
console.log(`Input: ${dateStr}`);
console.log(`Date: ${d}`);
console.log(`Is valid: ${!isNaN(d.getTime())}`);
