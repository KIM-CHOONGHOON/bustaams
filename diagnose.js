// Cafe24 VPS 가상서버 구동 상태 진단 스크립트 (diagnose.js)
// 배포 후 PM2의 상태, 백엔드 최근 로그, HTTP 포트 반응을 진단합니다.

const { Client } = require('ssh2');
const conn = new Client();

const SSH_CONFIG = {
  host: '1.234.65.153',
  port: 22,
  username: 'root',
  password: 'Bus7878!'
};

const commands = [
  'echo "=== [1] PM2 프로세스 리스트 및 상태 ==="',
  'pm2 list',
  'echo "\n=== [2] 백엔드 최근 30줄 로그 ==="',
  'pm2 logs bustaams-backend --lines 30 --err --out --raw --no-daemon & sleep 3; kill $!',
  'echo "\n=== [3] Nginx 정적 파일 서빙 응답 테스트 (80 포트) ==="',
  'curl -I http://127.0.0.1/',
  'echo "\n=== [4] Nginx 리버스 프록시 /api 응답 테스트 (80 포트 -> 8080 백엔드) ==="',
  'curl -I http://127.0.0.1/api'
];

conn.on('ready', () => {
  console.log('✔ SSH 진단 연결 성공! 상태 진단을 시작합니다.');
  
  let currentCmdIndex = 0;
  
  function runNextCommand() {
    if (currentCmdIndex >= commands.length) {
      console.log('\n✔ 모든 상태 진단 완료!');
      conn.end();
      return;
    }
    
    const cmd = commands[currentCmdIndex];
    conn.exec(cmd, (err, stream) => {
      if (err) {
        console.error(`❌ 명령 실행 실패: ${cmd}`, err);
        conn.end();
        return;
      }
      
      stream.on('close', (code) => {
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
  console.error('❌ SSH 접속 오류:', err);
}).connect(SSH_CONFIG);
