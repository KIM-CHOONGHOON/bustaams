async function testLogin() {
    try {
        const response = await fetch('http://localhost:8080/api/app/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: 'testuser',
                password: 'testpassword'
            })
        });
        const data = await response.json();
        console.log('Login Response:', data);
    } catch (error) {
        console.error('Login Error:', error.message);
    }
}

testLogin();
