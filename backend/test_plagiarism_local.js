const plagiarismService = require('./services/plagiarismService');

async function testPlagiarism() {
    console.log("Testing Local Plagiarism Service...");

    // Test 1: Exact match
    console.log("\n1. Testing exact match:");
    const result1 = plagiarismService.checkPlagiarism(
        "The quick brown fox jumps over the lazy dog.",
        [
            {
                id: "student1",
                submissionId: "sub1",
                text: "The quick brown fox jumps over the lazy dog." // Exact match
            },
            {
                id: "student2",
                submissionId: "sub2",
                text: "Different text entirely."
            }
        ]
    );
    console.log("Result:", JSON.stringify(result1, null, 2));

    // Test 2: High similarity
    console.log("\n2. Testing high similarity:");
    const result2 = plagiarismService.checkPlagiarism(
        "The quick brown fox jumps over the lazy dog.",
        [
            {
                id: "student1",
                submissionId: "sub1",
                text: "The quick brown fox jumps over the lazy dog and runs away." // Very similar
            },
            {
                id: "student2",
                submissionId: "sub2",
                text: "A fast brown fox leaps over the sleepy dog." // Somewhat similar
            }
        ]
    );
    console.log("Result:", JSON.stringify(result2, null, 2));

    // Test 3: Low similarity
    console.log("\n3. Testing low similarity:");
    const result3 = plagiarismService.checkPlagiarism(
        "The quick brown fox jumps over the lazy dog.",
        [
            {
                id: "student1",
                submissionId: "sub1",
                text: "Artificial intelligence is transforming the world of technology." // Different topic
            },
            {
                id: "student2",
                submissionId: "sub2",
                text: "Climate change is a pressing global issue that requires immediate attention." // Different topic
            }
        ]
    );
    console.log("Result:", JSON.stringify(result3, null, 2));

    console.log("\n✅ All tests completed!");
}

testPlagiarism();
