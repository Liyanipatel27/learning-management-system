const axios = require('axios');

async function testPlagiarism() {
    console.log("Testing Plagiarism API...");
    try {
        const response = await axios.post('http://127.0.0.1:8001/plagiarism/check', {
            target_text: "The quick brown fox jumps over the lazy dog.",
            corpus: [
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
        });

        console.log("Response:", JSON.stringify(response.data, null, 2));

        if (response.data.highest_similarity > 90) {
            console.log("SUCCESS: High similarity detected.");
        } else {
            console.log("FAILURE: Expected high similarity.");
        }

    } catch (error) {
        console.error("Error:", error.message);
        if (error.response) {
            console.error("Data:", error.response.data);
        }
    }
}

testPlagiarism();
