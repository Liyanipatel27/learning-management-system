const fs = require('fs');
const path = require('path');

// Manually load .env variables
console.log("Loading .env...");
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            if (key && !key.startsWith('#')) {
                process.env[key] = value;
                // console.log(`Set ${key}: ${value.substring(0, 5)}...`);
            }
        }
    });
} else {
    console.error(".env file not found at", envPath);
    process.exit(1);
}

console.log("GEMINI_API_KEYS present?", !!process.env.GEMINI_API_KEYS);
if (process.env.GEMINI_API_KEYS) {
    console.log("First key start:", process.env.GEMINI_API_KEYS.split(',')[0].trim().substring(0, 5));
}

const aiService = require('./services/aiService');

async function testAIResponse() {
    console.log("Initializing AIService...");

    // Check if keys are loaded
    if (!aiService.geminiKeys || aiService.geminiKeys.length === 0) {
        console.error("Gemini keys not loaded in AIService instance!");
        // Force load if needed for testing (hack)
        if (process.env.GEMINI_API_KEYS) {
            aiService.geminiKeys = process.env.GEMINI_API_KEYS.split(',').map(k => k.trim()).filter(k => k);
            console.log("Force loaded keys into AIService.");
        } else {
            return;
        }
    }
    console.log(`AIService has ${aiService.geminiKeys.length} keys.`);

    const question = "Explain how photosynthesis works in plants in a step-by-step way.";
    const history = [];

    try {
        console.log("Testing AI Response for question:", question);
        console.log("Waiting for response...");

        // Create a mock callOpenAI to test fallback directly
        aiService.callOpenAI = async () => {
            return new Promise((_, reject) => setTimeout(() => reject(new Error("Mock timeout")), 1000));
        };

        const response = await aiService.resolveDoubt(question, history, null, 'Average');
        console.log("\n--- AI RESPONSE START ---\n");
        console.log(response);
        console.log("\n--- AI RESPONSE END ---\n");
    } catch (error) {
        console.error("Error testing AI response:", error);
    }
}

testAIResponse();
