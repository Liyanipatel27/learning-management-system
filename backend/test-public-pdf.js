require('dotenv').config();
const aiService = require('./services/aiService');

const PUBLIC_PDF_URL = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

async function testPDFHandling() {
    console.log("1. Testing PDF Text Extraction...");
    try {
        const text = await aiService.getTextFromPDF(PUBLIC_PDF_URL);
        console.log("Extracted Text:", text.substring(0, 100));
        console.log("Text Extraction: SUCCESS");

        console.log("\n2. Testing AI Summary from PDF...");
        const summary = await aiService.generateSubjectSummary(PUBLIC_PDF_URL, 'pdf');
        console.log("Summary:\n", summary);
        console.log("AI Summary: SUCCESS");

        console.log("\n3. Testing AI Quiz from PDF...");
        const quiz = await aiService.generateQuiz('Dummy Subject', 'Dummy Topic', 'medium', PUBLIC_PDF_URL);
        console.log("Quiz:\n", JSON.stringify(quiz, null, 2));
        console.log("AI Quiz: SUCCESS");

        console.log("\n4. Testing AI Doubt from PDF...");
        const doubtRes = await aiService.resolveDoubt("What is this document about?", [], PUBLIC_PDF_URL);
        console.log("Doubt Response:\n", doubtRes);
        console.log("AI Doubt: SUCCESS");

    } catch (error) {
        console.error("Test Failed:", error);
    }
}

testPDFHandling();
