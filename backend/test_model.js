require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const key = process.env.GEMINI_API_KEYS.split(',')[0].trim();
const genAI = new GoogleGenerativeAI(key);

async function test() {
    console.log("Testing Key 1...");

    try {
        console.log("Trying gemini-1.5-flash...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        await model.generateContent("Hi");
        console.log("SUCCESS: gemini-1.5-flash");
    } catch (e) {
        console.log("FAIL: gemini-1.5-flash - " + e.message);
    }

    try {
        console.log("Trying gemini-2.5-flash...");
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        await model.generateContent("Hi");
        console.log("SUCCESS: gemini-2.5-flash");
    } catch (e) {
        console.log("FAIL: gemini-2.5-flash - " + e.message);
    }
}
test();
