const axios = require('axios');

async function test() {
    try {
        const res = await axios.get('http://localhost:5000/api/assets/requests/all');
        console.log('Asset requests result count:', res.data.length);
    } catch (err) {
        console.error('Asset requests error:', err.response ? err.response.status : err.message);
    }
}

test();
