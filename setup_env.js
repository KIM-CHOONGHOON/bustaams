const { Client } = require('ssh2');
const conn = new Client();

const commands = [
  'echo "=== Updating packages ==="',
  'apt-get update -y',
  'echo "=== Installing curl and build-essential ==="',
  'apt-get install -y curl build-essential',
  'echo "=== Setting up Node.js v20 repository ==="',
  'curl -fsSL https://deb.nodesource.com/setup_20.x | bash -',
  'echo "=== Installing Node.js ==="',
  'apt-get install -y nodejs',
  'echo "=== Installing PM2 globally ==="',
  'npm install -g pm2',
  'echo "=== Installing Nginx ==="',
  'apt-get install -y nginx',
  'echo "=== Verifying installations ==="',
  'node -v',
  'npm -v',
  'pm2 -v',
  'nginx -v'
];

conn.on('ready', () => {
  console.log('SSH Connected. Starting Node.js and Nginx setup...');
  
  let currentCmdIndex = 0;
  
  function runNextCommand() {
    if (currentCmdIndex >= commands.length) {
      console.log('All setup commands completed!');
      conn.end();
      return;
    }
    
    const cmd = commands[currentCmdIndex];
    console.log(`Running: ${cmd}`);
    
    conn.exec(cmd, (err, stream) => {
      if (err) {
        console.error(`Error executing: ${cmd}`, err);
        conn.end();
        return;
      }
      
      stream.on('close', (code, signal) => {
        if (code !== 0) {
          console.warn(`Command "${cmd}" exited with code ${code}`);
        }
        currentCmdIndex++;
        runNextCommand();
      }).on('data', (data) => {
        process.stdout.write(data);
      }).stderr.on('data', (data) => {
        process.stderr.write(data);
      });
    });
  }
  
  runNextCommand();
}).on('error', (err) => {
  console.error('Connection error:', err);
}).connect({
  host: '1.234.65.153',
  port: 22,
  username: 'root',
  password: 'Bus7878!'
});
