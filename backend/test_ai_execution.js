const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const aiService = require('./services/aiService');

async function testAIExecution() {
    try {
        console.log("Testing AI Code Execution...");

        // Test Python
        const pythonResult = await aiService.executeCode('python', 'for i in range(3): print("AI Python Loop " + str(i))', '');
        console.log("Python Result:", pythonResult);

        // Test JS
        const jsResult = await aiService.executeCode('javascript', 'console.log("AI JS Test");', '');
        console.log("JS Result:", jsResult);

        // Test Error
        const errorResult = await aiService.executeCode('python', 'print(undefined_variable)', '');
        console.log("Error Result:", errorResult);

    } catch (err) {
        console.error("Test Failed:", err);
    }
}

testAIExecution();
