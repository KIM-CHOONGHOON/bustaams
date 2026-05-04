
const axios = require('axios');

async function testLogin() {
    try {
        const res = await axios.post('http://localhost:8080/api/users/login', {
            userId: 'test1', // I'll assume some test user id
            password: 'password1'
        });
        console.log('Login Response User:', res.data.user);
    } catch (e) {
        console.error('Login Failed:', e.response ? e.response.data : e.message);
    }
}

testLogin();
