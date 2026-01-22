require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testModel(modelName) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        console.log(`Testing model: ${modelName} with key ending in ...${apiKey.slice(-5)}`);
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello");
        const response = await result.response;
        console.log(`Success with ${modelName}:`, response.text());
        return true;
    } catch (error) {
        console.error(`Failed with ${modelName}:`);
        console.error(error.message);
        // console.error(JSON.stringify(error, null, 2));
        return false;
    }
}

async function run() {
    let success = await testModel("gemini-1.5-flash");
    if (!success) {
        console.log("Retrying with gemini-pro...");
        await testModel("gemini-pro");
    }
}

run();
