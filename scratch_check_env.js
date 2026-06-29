const { Client } = require('ssh2');

const SSH_CONFIG = {
  host: '1.234.65.153',
  port: 22,
  username: 'root',
  password: 'Bus7878!'
};

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH Connection Ready. Diagnostics starting...');
  
  // 원격 서버에 업로드된 test_openai_local.js를 직접 구동하여 결과 출력
  const checkCmd = `node /var/www/bustaams/server/test_openai_local.js`;
  
  conn.exec(checkCmd, (err, stream) => {
    if (err) {
      console.error('Command execution failed:', err);
      conn.end();
      return;
    }
    
    let output = '';
    stream.on('data', (data) => {
      output += data.toString();
    });
    
    stream.on('close', () => {
      console.log('\n--- Remote Env Raw Output ---');
      console.log(output);
      conn.end();
    });
  });
}).on('error', (err) => {
  console.error('SSH Connection Error:', err);
}).connect(SSH_CONFIG);
