
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
    console.log("Checking available models...");
    const key = process.env.GEMINI_QUIZ_GENERATOR_KEY || process.env.GEMINI_API_KEY;

    if (!key) {
        console.error("No API Key found in .env");
        return;
    }

    const genAI = new GoogleGenerativeAI(key);

    try {
        // Accessing the model listing via the API directly if SDK helper is obscure, 
        // but typically genAI.getGenerativeModel is for instantiation. 
        // We might need to use the specific API call if the SDK doesn't expose listModels on the top level clearly in all versions.
        // Actually, older SDK versions might not have listModels easily accessible. 
        // Let's try checking a model directly or just creating a model and asking properties?
        // Wait, standard way:
        // Not all SDK versions expose listModels readily.

        // Let's try to verify if gemini-1.5-flash works by running a generation.
        const modelNames = ["gemini-1.5-flash", "gemini-1.5-flash-001", "gemini-1.5-pro", "gemini-pro", "gemini-1.0-pro"];

        for (const modelName of modelNames) {
            console.log(`Testing model: ${modelName}`);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hello");
                const response = await result.response;
                console.log(`✅ SUCCESS: ${modelName} is working.`);
                return; // Found one!
            } catch (e) {
                console.log(`❌ FAILED: ${modelName}. Error: ${e.message.split('\n')[0]}`);
            }
        }
        console.log("No working model found in standard list.");

    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();
