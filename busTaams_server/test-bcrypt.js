console.log('>>> STARTING TEST...');
try {
    console.log('>>> Loading bcryptjs...');
    const bcrypt = require('bcryptjs');
    console.log('>>> bcryptjs LOADED');
    
    console.log('>>> Loading crypto...');
    const crypto = require('crypto');
    console.log('>>> crypto LOADED');
    
    console.log('>>> Testing bcrypt hash...');
    const hash = bcrypt.hashSync('test', 10);
    console.log('>>> Hash created:', hash);
    
    console.log('>>> Testing bcrypt compare...');
    const match = bcrypt.compareSync('test', hash);
    console.log('>>> Match:', match);
    
    console.log('>>> TEST SUCCESSFUL');
} catch (e) {
    console.error('>>> TEST FAILED:', e);
}
process.exit(0);
