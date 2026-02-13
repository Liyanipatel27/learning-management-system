const axios = require('axios');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

/**
 * Extracts text from a file at a given URL (Supports PDF).
 */
exports.extractTextFromUrl = async (url, mimetype) => {
    // Only process PDFs for now
    if (mimetype === 'application/pdf' || url.endsWith('.pdf')) {
        try {
            let buffer;
            if (url.startsWith('http')) {
                console.log(`[ContentProcessor] Downloading PDF from ${url}...`);
                const response = await axios.get(url, { responseType: 'arraybuffer' });
                buffer = response.data;
            } else {
                // Handle local file path (Uploads folder)
                console.log(`[ContentProcessor] Reading local PDF from ${url}...`);
                // construct absolute path if it is relative. 
                // Assuming url is like '/uploads/file.pdf' or 'uploads\\file.pdf'
                const filePath = path.join(__dirname, '..', url.startsWith('/') ? url.slice(1) : url);

                if (fs.existsSync(filePath)) {
                    buffer = fs.readFileSync(filePath);
                } else if (fs.existsSync(url)) {
                    // specific absolute path
                    buffer = fs.readFileSync(url);
                } else {
                    console.warn(`[ContentProcessor] Local file not found: ${filePath}`);
                    return "";
                }
            }

            console.log(`[ContentProcessor] Extracting text...`);
            const pdfData = await pdfParse(buffer);

            // Limit to ~50k chars to avoid token limits. 
            // 50k chars is roughly 12-15k tokens, well within Gemini 1.5 Flash limit (1M tokens), 
            // but keeping it reasonable for speed and relevance.
            const text = pdfData.text.substring(0, 50000);
            return text;
        } catch (error) {
            console.error('[ContentProcessor] Extraction Failed:', error.message);
            return "";
        }
    }
    return "";
};
