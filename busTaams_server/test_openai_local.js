const fs = require('fs');
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');

// .env 로드
const envPath = path.resolve(__dirname, '.env');
if (!fs.existsSync(envPath)) {
    console.error('.env file not found at:', envPath);
    process.exit(1);
}

const envConfig = dotenv.parse(fs.readFileSync(envPath));
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const apiKey = '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';
console.log('Testing with key (-- version):', apiKey.substring(0, 25) + '...');

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
    console.log('\n======================================');
    console.log('OpenAI API Call SUCCESS!');
    console.log('Response:', JSON.stringify(res.data.choices[0].message));
    console.log('======================================');
}).catch(err => {
    console.log('\n======================================');
    console.error('OpenAI API Call FAILED!');
    if (err.response) {
        console.error('Status:', err.response.status);
        console.error('Data:', JSON.stringify(err.response.data));
    } else {
        console.error('Error:', err.message);
    }
    console.log('======================================');
});
