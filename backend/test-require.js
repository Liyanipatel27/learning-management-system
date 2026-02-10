try {
    console.log("Requiring aiService...");
    const aiService = require('./services/aiService');
    console.log("aiService loaded successfully:", aiService);
} catch (error) {
    console.error("Failed to require aiService:", error);
}
