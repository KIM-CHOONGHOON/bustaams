const axios = require('axios');

async function testApi() {
    try {
        // Need a token to call the API since it might be using authenticateToken
        // Wait, does /review-detail/:id use authenticateToken?
        // Let's check appCustomer.js again.
        
        const res = await axios.get('http://localhost:5000/api/app/customer/review-detail/0000000001');
        console.log('Success:', res.data);
    } catch (err) {
        if (err.response) {
            console.log('Error Status:', err.response.status);
            console.log('Error Data:', err.response.data);
        } else {
            console.log('Error Message:', err.message);
        }
    }
}

testApi();
