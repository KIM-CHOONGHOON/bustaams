const fs = require('fs');
let code = fs.readFileSync('routes/payment.js', 'utf8');

// replace all exact matches of '/approval-list' to '/app/approval-list'
code = code.split("'/approval-list'").join("'/app/approval-list'");
// replace all exact matches of '/customer-dashboard' to '/app/customer-dashboard'
code = code.split("'/customer-dashboard'").join("'/app/customer-dashboard'");

fs.writeFileSync('routes/payment.js', code, 'utf8');
console.log('Fixed routing paths.');
