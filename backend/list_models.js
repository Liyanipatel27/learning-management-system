require('dotenv').config();
const fs = require('fs');

async function listModels() {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            const names = data.models
                .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent"))
                .map(m => m.name.replace('models/', ''))
                .join('\n');
            fs.writeFileSync('models_clean.txt', names);
            console.log("Wrote models to models_clean.txt");
        } else {
            console.log("No models found or error:", JSON.stringify(data));
            fs.writeFileSync('models_clean.txt', "ERROR: " + JSON.stringify(data));
        }

    } catch (error) {
        console.error("Error listing models:", error);
        fs.writeFileSync('models_clean.txt', "EXCEPTION: " + error.message);
    }
}

listModels();
