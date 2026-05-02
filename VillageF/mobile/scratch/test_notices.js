const axios = require('axios');

async function test() {
    try {
        const res = await axios.get('http://localhost:5000/api/notices/all');
        console.log('Notices all result count:', res.data.length);
    } catch (err) {
        console.error('Notices all error:', err.response ? err.response.status : err.message);
    }
}

test();
