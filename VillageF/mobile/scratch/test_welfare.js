const axios = require('axios');

async function test() {
    try {
        const res = await axios.get('http://localhost:5000/api/welfare/all');
        console.log('Welfare all result count:', res.data.length);
    } catch (err) {
        console.error('Welfare all error:', err.response ? err.response.status : err.message);
    }
}

test();
