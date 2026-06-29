
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
  
