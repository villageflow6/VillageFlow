const axios = require('axios');

async function test() {
    try {
        const res = await axios.get('http://localhost:5000/api/test');
        console.log('Test result:', res.data);
    } catch (err) {
        console.error('Test error:', err.response ? err.response.status : err.message);
    }
}

test();
