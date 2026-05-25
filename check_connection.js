const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection successful!');
  conn.exec('find /usr -name "node" -type f -executable 2>/dev/null; echo "--- PORTS ---"; ss -tuln; echo "--- ROOT ---"; ls -la /root; echo "--- HOME ---"; ls -la /home;', (err, stream) => {
    if (err) {
      console.error('Exec error:', err);
      conn.end();
      return;
    }
    stream.on('close', (code, signal) => {
      console.log('Stream closed with code: ' + code);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT:\n' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR:\n' + data);
    });
  });
}).on('error', (err) => {
  console.error('Connection error:', err);
}).connect({
  host: '1.234.65.153',
  port: 22,
  username: 'root',
  password: 'Bus7878!'
});
