
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

async function checkModels() {
    const key = process.env.GEMINI_QUIZ_GENERATOR_KEY || process.env.GEMINI_API_KEY;
    if (!key) {
        console.error("No API Key found");
        return;
    }

    try {
        console.log(`Checking models for key: ${key.substring(0, 10)}...`);
        const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);

        const models = response.data.models || [];
        const contentModels = models.filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")).map(m => m.name);

        fs.writeFileSync('models_list_clean.json', JSON.stringify(contentModels, null, 2));
        console.log("Wrote models to models_list_clean.json");

    } catch (error) {
        console.error("Error fetching models:", error.response ? error.response.data : error.message);
        fs.writeFileSync('models_list_clean.json', JSON.stringify({ error: error.message }));
    }
}

checkModels();
