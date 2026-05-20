// Cafe24 VPS 가상서버 배포 자동화 스크립트 (deploy.js)
// 로컬 파일들을 원격 서버로 SFTP 전송하고, 백엔드 의존성 설치, Nginx 설정, PM2 프로세스 구동을 수행합니다.

const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const SSH_CONFIG = {
  host: '1.234.65.153',
  port: 22,
  username: 'root',
  password: 'Bus7878!'
};

const REMOTE_APP_DIR = '/var/www/bustaams/app';
const REMOTE_SERVER_DIR = '/var/www/bustaams/server';

const LOCAL_APP_DIST = path.join(__dirname, 'busTaams_app', 'dist');
const LOCAL_SERVER_DIR = path.join(__dirname, 'busTaams_server');

// 백엔드 업로드 시 제외할 파일 및 폴더 목록
const EXCLUDE_SERVER_LIST = [
  'node_modules',
  '.env',
  '.env.bak',
  'debug_stats.log',
  '.git',
  '.gcloudignore',
  'Dockerfile',
  'uploads'
];

const conn = new Client();

conn.on('ready', () => {
  console.log('✔ SSH 연결 성공! 배포를 시작합니다.');
  
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('❌ SFTP 세션 생성 실패:', err);
      conn.end();
      return;
    }
    
    console.log('✔ SFTP 세션이 시작되었습니다.');
    
    // 파일 및 디렉토리 업로드 도우미 함수
    async function uploadDir(localDir, remoteDir, excludeList = []) {
      const items = fs.readdirSync(localDir);
      
      // 원격 디렉토리 생성 시도
      try {
        await new Promise((resolve, reject) => {
          sftp.mkdir(remoteDir, (mkdirErr) => {
            // 이미 존재하는 경우는 무시
            resolve();
          });
        });
      } catch (e) {
        // 무시
      }
      
      for (const item of items) {
        if (excludeList.includes(item)) {
          continue;
        }
        
        const localPath = path.join(localDir, item);
        const remotePath = path.join(remoteDir, item).replace(/\\/g, '/'); // 리눅스 경로 포맷 준수
        const stats = fs.statSync(localPath);
        
        if (stats.isDirectory()) {
          // 재귀적으로 폴더 생성 및 업로드
          await uploadDir(localPath, remotePath, excludeList);
        } else if (stats.isFile()) {
          console.log(`전송 중: ${localPath} -> ${remotePath}`);
          await new Promise((resolve, reject) => {
            sftp.fastPut(localPath, remotePath, (putErr) => {
              if (putErr) {
                console.error(`❌ 파일 전송 실패: ${localPath}`, putErr);
                reject(putErr);
              } else {
                resolve();
              }
            });
          });
        }
      }
    }
    
    // 순차적 배포 흐름 제어
    (async () => {
      try {
        console.log('\n--- [1] 프론트엔드 빌드 아티팩트 업로드 시작 ---');
        if (!fs.existsSync(LOCAL_APP_DIST)) {
          throw new Error('로컬 프론트엔드 dist 폴더가 존재하지 않습니다. 먼저 npm run build를 완료해야 합니다.');
        }
        await uploadDir(LOCAL_APP_DIST, REMOTE_APP_DIR);
        console.log('✔ 프론트엔드 업로드 완료!');
        
        console.log('\n--- [2] 백엔드 소스 코드 업로드 시작 (node_modules 제외) ---');
        await uploadDir(LOCAL_SERVER_DIR, REMOTE_SERVER_DIR, EXCLUDE_SERVER_LIST);
        console.log('✔ 백엔드 업로드 완료!');
        
        console.log('\n--- [3] 원격 서버 전용 .env 파일 구성 및 업로드 ---');
        const localEnvContent = fs.readFileSync(path.join(LOCAL_SERVER_DIR, '.env'), 'utf-8');
        // DB_HOST를 원격 로컬인 127.0.0.1로 교체
        const remoteEnvContent = localEnvContent.replace(/DB_HOST\s*=\s*[^\r\n]+/g, 'DB_HOST=127.0.0.1');
        
        const remoteEnvPath = `${REMOTE_SERVER_DIR}/.env`;
        await new Promise((resolve, reject) => {
          const stream = sftp.createWriteStream(remoteEnvPath);
          stream.on('close', () => {
            console.log('✔ 원격 .env 생성 완료 (DB_HOST=127.0.0.1 설정 반영)');
            resolve();
          });
          stream.on('error', (writeErr) => {
            reject(writeErr);
          });
          stream.write(remoteEnvContent);
          stream.end();
        });
        
        console.log('\n--- [4] 원격 서버 터미널 설정 및 서비스 구동 ---');
        runRemoteCommands();
        
      } catch (err) {
        console.error('❌ 배포 중 오류 발생:', err);
        conn.end();
      }
    })();
  });
}).on('error', (err) => {
  console.error('❌ SSH 접속 오류:', err);
}).connect(SSH_CONFIG);

// 원격 서버 쉘 명령 실행 리스트
const remoteCommands = [
  // 1. 백엔드 의존 패키지 프로덕션 모드로 설치
  `cd ${REMOTE_SERVER_DIR} && npm install --production`,
  
  // 2. PM2로 백엔드 서비스 실행 및 재시작 설정
  `pm2 delete bustaams-backend || true`,
  `cd ${REMOTE_SERVER_DIR} && pm2 start server.js --name bustaams-backend`,
  `pm2 save`,
  
  // 3. Nginx 설정 덮어쓰기를 제거하고, 단순히 Nginx 리로드만 수행 (SSL 설정 보존)
  'systemctl reload nginx',
  'echo "✔ PM2 구동 및 Nginx 리로드가 성공적으로 완료되었습니다!"'
];

function runRemoteCommands() {
  let cmdIndex = 0;
  
  function executeNext() {
    if (cmdIndex >= remoteCommands.length) {
      console.log('\n======================================================');
      console.log('🎉 모든 배포 및 서버 구동이 완료되었습니다!');
      console.log('도메인: http://bustaams.cafe24.com');
      console.log('서버 IP: http://1.234.65.153');
      console.log('======================================================');
      conn.end();
      return;
    }
    
    const cmd = remoteCommands[cmdIndex];
    console.log(`원격 실행 중 [${cmdIndex + 1}/${remoteCommands.length}]: ${cmd}`);
    
    conn.exec(cmd, (err, stream) => {
      if (err) {
        console.error(`❌ 원격 명령 실행 실패: ${cmd}`, err);
        conn.end();
        return;
      }
      
      stream.on('close', (code) => {
        if (code !== 0) {
          console.warn(`⚠ 경고: 명령이 종료 코드 ${code}로 끝났습니다.`);
        }
        cmdIndex++;
        executeNext();
      }).on('data', (data) => {
        process.stdout.write(data);
      }).stderr.on('data', (data) => {
        process.stderr.write(data);
      });
    });
  }
  
  executeNext();
}
