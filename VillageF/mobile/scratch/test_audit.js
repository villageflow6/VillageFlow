const axios = require('axios');

async function test() {
    try {
        const res = await axios.get('http://localhost:5000/api/certificates/audit-logs');
        console.log('Audit logs result:', res.data);
    } catch (err) {
        console.error('Audit logs error:', err.response ? err.response.status : err.message);
    }
}

test();
