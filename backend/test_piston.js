const axios = require('axios');

async function getPythonRuntime() {
    try {
        console.log("Fetching Piston Runtimes for Python...");
        const response = await axios.get('https://emkc.org/api/v2/piston/runtimes');
        const python = response.data.find(r => r.language === 'python');
        console.log("Python Runtime:", JSON.stringify(python, null, 2));
    } catch (err) {
        console.error("Error:", err.message);
    }
}

getPythonRuntime();
