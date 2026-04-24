require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const keys = (process.env.GEMINI_API_KEYS || '').split(',').map(k => k.trim()).filter(k => k);

async function checkKeys() {
    console.log(`Checking ${keys.length} keys...`);

    for (const [index, key] of keys.entries()) {
        console.log(`\n--- Checking Key ${index + 1} ---`);
        try {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Try 1.5 first
            const result = await model.generateContent("Test");
            console.log(`[PASS] Key ${index + 1}: 1.5-flash works. Response: ${result.response.text().substring(0, 10)}...`);
        } catch (e) {
            console.log(`[FAIL] Key ${index + 1} (1.5-flash): ${e.message}`);
        }

        try {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Try 2.5
            const result = await model.generateContent("Test");
            console.log(`[PASS] Key ${index + 1}: 2.5-flash works. Response: ${result.response.text().substring(0, 10)}...`);
        } catch (e) {
            console.log(`[FAIL] Key ${index + 1} (2.5-flash): ${e.message}`);
        }

        try {
            // List models? (requires listModels permission which API keys might not have? strictly they do usually)
            // Not easily doable with simple generateContent check, but let's try assuming standard models
        } catch (e) { }
    }
}

checkKeys();
