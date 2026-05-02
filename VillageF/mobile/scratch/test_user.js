const axios = require('axios');

async function test() {
    try {
        // Test with a dummy ID to see if it 404s on the route or the resource
        const res = await axios.get('http://localhost:5000/api/auth/user/65ea8ceb3c8bb2888cab3699');
        console.log('User detail result:', res.data);
    } catch (err) {
        console.error('User detail error:', err.response ? err.response.status : err.message);
    }
}

test();
