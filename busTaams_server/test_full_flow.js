const fetch = require('node-fetch');

async function testFlow() {
    const API_BASE = 'http://127.0.0.1:8080';
    
    console.log('--- Step 1: Signup ---');
    const signupRes = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: 'final@example.com',
            password: 'Password1!',
            userName: 'FinalTestUser',
            phoneNo: '01011119999',
            smsAuthYn: 'Y',
            userType: 'CUSTOMER',
            agreedTerms: [1, 2, 3],
            signatureBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
        })
    });
    console.log('Signup Status:', signupRes.status);
    const signupData = await signupRes.json();
    console.log('Signup Response:', signupData);

    if (signupRes.status !== 201 && signupRes.status !== 409) {
        console.error('Signup failed stop.');
        return;
    }

    console.log('\n--- Step 2: Login ---');
    const loginRes = await fetch(`${API_BASE}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: 'final@example.com',
            password: 'Password1!'
        })
    });
    console.log('Login Status:', loginRes.status);
    const loginData = await loginRes.json();
    console.log('Login Response User:', loginData.user);
}

testFlow();
