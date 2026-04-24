const axios = require('axios');

const API_KEY = 'AIzaSyDSYR3H3X5SgHOfdsErfdWkDlBPOD0ZFC0';

// Test 1: List available models in v1beta
console.log('=== Testing v1beta API ===');
axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`)
    .then(response => {
        console.log('v1beta Models available:', response.data.models.map(m => ({
            name: m.name,
            supportedMethods: m.supportedGenerationMethods
        })));
    })
    .catch(error => {
        console.error('v1beta API error:', error.response?.data || error.message);
    });

// Test 2: Check v1 API
console.log('\n=== Testing v1 API ===');
axios.get(`https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`)
    .then(response => {
        console.log('v1 Models available:', response.data.models.map(m => ({
            name: m.name,
            supportedMethods: m.supportedGenerationMethods
        })));
    })
    .catch(error => {
        console.error('v1 API error:', error.response?.data || error.message);
    });
