const axios = require('axios');

async function test() {
    try {
        const res = await axios.get('http://localhost:5000/api/auth/citizens');
        console.log('Citizens result count:', res.data.length);
    } catch (err) {
        console.error('Citizens error:', err.response ? err.response.status : err.message);
    }
}

test();
