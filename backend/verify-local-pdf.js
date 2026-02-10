require('dotenv').config();
const aiService = require('./services/aiService');
const path = require('path');

// This URL mimics what the frontend sends for an uploaded file
const fs = require('fs');

const LOCAL_PDF_URL = 'http://localhost:5000/uploads/test.pdf';
const LOG_FILE = 'verification.log';

function log(msg) {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

async function verifyLocalPDF() {
    fs.writeFileSync(LOG_FILE, "STARTING Verification...\n");
    log(`Verifying local PDF extraction from: ${LOCAL_PDF_URL}`);

    try {
        log("Calling aiService.getTextFromPDF...");
        const text = await aiService.getTextFromPDF(LOCAL_PDF_URL);
        log("Returned from aiService.getTextFromPDF.");

        if (text && text.length > 0) {
            log("\n[SUCCESS] Text extracted successfully!");
            log("Extracted Text Length: " + text.length);
            log("First 100 chars: " + text.substring(0, 100).replace(/\n/g, ' '));
        } else {
            log("\n[FAILURE] Text extraction returned empty string/null.");
        }

    } catch (error) {
        log("\n[FAILURE] Verification failed with error.");
        log(error.stack || error.toString());
    }
}

process.on('unhandledRejection', (reason, p) => {
    log('Unhandled Rejection at: Promise ' + p + ' reason: ' + reason);
    // application specific logging, throwing an error, or other logic here
});

verifyLocalPDF();
