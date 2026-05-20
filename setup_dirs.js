// 원격 서버 디렉토리 생성 및 권한 설정 스크립트
const { Client } = require('ssh2');
const conn = new Client();

const commands = [
  'mkdir -p /var/www/bustaams/app',
  'mkdir -p /var/www/bustaams/server',
  'chown -R root:root /var/www/bustaams',
  'chmod -R 755 /var/www/bustaams',
  'echo "Directories created successfully!"'
];

conn.on('ready', () => {
  console.log('SSH Connected. Creating directories...');
  let currentCmdIndex = 0;
  
  function runNextCommand() {
    if (currentCmdIndex >= commands.length) {
      console.log('All directories set up!');
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
      stream.on('close', (code) => {
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
