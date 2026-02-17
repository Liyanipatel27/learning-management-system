try {
    const { GoogleAIFileManager } = require("@google/generative-ai/server");
    console.log("GoogleAIFileManager imported successfully from @google/generative-ai/server");
} catch (e) {
    console.error("Failed to import from @google/generative-ai/server:", e.message);
    try {
        const { GoogleAIFileManager } = require("@google/generative-ai");
        console.log("GoogleAIFileManager imported successfully from @google/generative-ai");
    } catch (e2) {
        console.error("Failed to import from @google/generative-ai:", e2.message);
    }
}
