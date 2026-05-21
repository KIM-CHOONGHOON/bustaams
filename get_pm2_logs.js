const { Client } = require('ssh2');

const SSH_CONFIG = {
  host: '1.234.65.153',
  port: 22,
  username: 'root',
  password: 'Bus7878!'
};

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH Connection Ready. Fetching logs...');
  conn.exec('pm2 logs bustaams-backend --lines 100 --raw', (err, stream) => {
    if (err) {
      console.error('Command execution failed:', err);
      conn.end();
      return;
    }
    // 5초 후에 강제로 닫기 위해 타이머 설정
    const timer = setTimeout(() => {
      console.log('\nClosing stream due to timeout...');
      conn.end();
    }, 5000);

    stream.on('close', (code) => {
      console.log(`\nStream closed with code ${code}`);
      clearTimeout(timer);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).on('error', (err) => {
  console.error('SSH Connection Error:', err);
}).connect(SSH_CONFIG);
