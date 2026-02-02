const axios = require('axios');

// Test AI Tutor with various messages
const testMessages = [
    "Explain quantum physics simply",
    "Create a study schedule for math",
    "Quiz me on history",
    "Summarize the last lesson",
    "How to improve my coding skills?"
];

async function testAITutor() {
    console.log('=== Testing AI Tutor ===');
    console.log('Frontend URL:', 'http://localhost:5174');
    console.log('Backend API URL:', 'http://localhost:5000/api/ai/chat');
    console.log('=======================\n');

    for (let i = 0; i < testMessages.length; i++) {
        const message = testMessages[i];
        console.log(`\n📩 Test ${i + 1}: "${message}"`);

        try {
            const startTime = Date.now();
            const response = await axios.post('http://localhost:5000/api/ai/chat', {
                message: message,
                history: [],
                studentLevel: 'Average'
            }, {
                headers: { 'Content-Type': 'application/json' }
            });

            const duration = Date.now() - startTime;
            console.log(`✅ Success (${duration}ms)`);

            // Truncate long responses for readability
            let responseText = response.data.response;
            if (responseText.length > 200) {
                responseText = responseText.substring(0, 200) + '...';
            }
            console.log('📝 Response:', responseText);

        } catch (error) {
            console.log('❌ Error');
            if (error.response) {
                console.log('   Status:', error.response.status);
                console.log('   Data:', error.response.data);
            } else {
                console.log('   Message:', error.message);
            }
        }
    }

    console.log('\n=== Test Complete ===');
}

testAITutor().catch(console.error);
