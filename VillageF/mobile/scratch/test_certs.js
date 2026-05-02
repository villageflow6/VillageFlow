const axios = require('axios');

async function test() {
    try {
        const res = await axios.get('http://localhost:5000/api/certificates/all');
        console.log('Certificates all result count:', res.data.length);
    } catch (err) {
        console.error('Certificates all error:', err.response ? err.response.status : err.message);
    }
}

test();
