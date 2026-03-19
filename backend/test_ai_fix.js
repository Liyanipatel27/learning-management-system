require('dotenv').config();
const aiService = require('./services/aiService');

async function testFix() {
    console.log("--- AI SERVICE FIX VERIFICATION ---");
    
    // Check if keys are loaded
    console.log("Default Keys Count:", aiService.geminiKeys.length);
    console.log("CV Keys Count:", aiService.cvGeminiKeys.length);
    console.log("PV Keys Count:", aiService.pvGeminiKeys.length);
    
    if (aiService.geminiKeys.length > 0) {
        console.log("Testing CallLLM (Default/Notes Generator path)...");
        try {
            const response = await aiService.callLLM("Who are you?", "You are a helpful assistant.");
            console.log("\n[SUCCESS] AI Response received:");
            console.log(response);
        } catch (error) {
            console.error("\n[FAILED] AI Response failed:", error.message);
        }
    } else {
        console.error("\n[FAILED] No keys loaded. Check .env mapping.");
    }
    
    console.log("\n--- VERIFICATION COMPLETE ---");
}

testFix();
