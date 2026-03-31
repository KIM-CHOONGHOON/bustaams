const fetch = require('node-fetch');

async function checkLoginResponse() {
    const API_BASE = 'http://127.0.0.1:8080';
    console.log('--- Logging in as test-final@bustams.com ---');
    const res = await fetch(`${API_BASE}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: 'test-final@bustams.com',
            password: 'Password1!'
        })
    });
    const data = await res.json();
    console.log('--- RAW RESPONSE DATA ---');
    console.log(JSON.stringify(data, null, 2));
}

checkLoginResponse();
