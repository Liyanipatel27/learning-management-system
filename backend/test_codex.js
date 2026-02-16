const axios = require('axios');

async function testCodex() {
    try {
        console.log("Testing Codex API...");
        // Test Python
        const response = await axios.post('https://api.codex.jaagrav.in', {
            code: 'print("Hello from Codex")',
            language: 'py',
            input: ''
        });
        console.log("Codex Python Success!");
        console.log("Output:", response.data.output);

        // Test JS
        const jsRes = await axios.post('https://api.codex.jaagrav.in', {
            code: 'console.log("Hello JS")',
            language: 'js',
            input: ''
        });
        console.log("Codex JS Success!");
        console.log("Output:", jsRes.data.output);

    } catch (err) {
        console.error("Codex API Failed:", err.message);
        if (err.response) {
            console.log("Data:", JSON.stringify(err.response.data, null, 2));
        }
    }
}

testCodex();
