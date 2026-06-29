const { Client } = require('ssh2');

const SSH_CONFIG = {
  host: '1.234.65.153',
  port: 22,
  username: 'root',
  password: 'Bus7878!'
};

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH Connection Ready. Creating test script on remote server...');
  
  // 원격 서버에 임시 테스트 스크립트 생성
  // .env를 로드하고 axios를 사용하여 OpenAI API를 호출해 봅니다.
  const remoteScript = `
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');

// .env 로드
const envPath = path.resolve('/var/www/bustaams/server', '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const apiKey = process.env.OPENAI_API_KEY;
console.log('OPENAI_API_KEY length:', apiKey ? apiKey.length : 0);
console.log('OPENAI_API_KEY preview:', apiKey ? apiKey.substring(0, 15) + '...' + apiKey.substring(apiKey.length - 10) : 'none');

if (!apiKey) {
    console.error('API Key is empty.');
    process.exit(1);
}

axios.post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'hello' }],
    max_tokens: 5
}, {
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
    }
}).then(res => {
    console.log('OpenAI API Call SUCCESS!');
    console.log('Response:', JSON.stringify(res.data.choices[0].message));
}).catch(err => {
    console.error('OpenAI API Call FAILED!');
    if (err.response) {
        console.error('Status:', err.response.status);
        console.error('Data:', JSON.stringify(err.response.data));
    } else {
        console.error('Error:', err.message);
    }
});
  `;

  // 원격 서버에 임시 파일로 쓰기
  conn.exec(`cat << 'EOF' > /var/www/bustaams/server/scratch_test_openai_tmp.js\n${remoteScript}\nEOF`, (err, stream) => {
    if (err) {
      console.error('Failed to create remote script:', err);
      conn.end();
      return;
    }
    
    stream.on('close', () => {
      console.log('Remote script created. Running...');
      
      // 원격 서버에서 실행
      conn.exec('node /var/www/bustaams/server/scratch_test_openai_tmp.js', (err2, runStream) => {
        if (err2) {
          console.error('Failed to run remote script:', err2);
          conn.end();
          return;
        }
        
        let runOutput = '';
        runStream.on('data', (data) => {
          runOutput += data.toString();
        });
        
        runStream.on('close', () => {
          console.log('\n--- Remote Test Output ---');
          console.log(runOutput);
          
          // 임시 파일 삭제
          conn.exec('rm -f /var/www/bustaams/server/scratch_test_openai_tmp.js', () => {
            conn.end();
          });
        });
      });
    });
  });
}).on('error', (err) => {
  console.error('SSH Connection Error:', err);
}).connect(SSH_CONFIG);
