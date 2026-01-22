require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');

const candidates = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-exp",
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-pro-latest",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-pro"
];

async function testAll() {
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);
    let output = "";

    console.log("Testing models...");
    for (const modelName of candidates) {
        try {
            process.stdout.write(`Testing ${modelName}... `);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hi");
            const response = await result.response;
            const msg = `SUCCESS: ${modelName}\n`;
            console.log("✅");
            output += msg;
        } catch (error) {
            const msg = `FAILED: ${modelName} (${error.status || error.message})\n`;
            console.log("❌");
            output += msg;
        }
    }
    fs.writeFileSync('model-results.txt', output);
}

testAll();
