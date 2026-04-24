const axios = require('axios');

console.log('Testing AI chat API...');
axios.post('http://localhost:5000/api/ai/chat', {
    message: 'Hello',
    history: [],
    studentLevel: 'Average'
}, {
    headers: { 'Content-Type': 'application/json' }
})
    .then(response => {
        console.log('✅ API Response received');
        console.log('Status:', response.status);
        console.log('Data:', response.data);
    })
    .catch(error => {
        console.error('❌ API Error');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
            console.error('Headers:', error.response.headers);
        } else if (error.request) {
            console.error('No response received:', error.request);
        } else {
            console.error('Error:', error.message);
        }
    })
    .finally(() => {
        console.log('\nTest completed');
    });
