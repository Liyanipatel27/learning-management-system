const axios = require('axios');
const pdfParse = require('pdf-parse');

/**
 * Extracts text from a file at a given URL.
 * Currently supports PDF files.
 * 
 * @param {string} url - The URL of the file (e.g., Cloudinary URL).
 * @param {string} mimetype - The mime type of the file.
 * @returns {Promise<string>} - The extracted text or an empty string.
 */
exports.extractTextFromUrl = async (url, mimetype) => {
    if (mimetype === 'application/pdf') {
        try {
            console.log(`[ContentProcessor] Downloading PDF from ${url}...`);
            const response = await axios.get(url, { responseType: 'arraybuffer' });

            console.log(`[ContentProcessor] Extracting text...`);
            const pdfData = await pdfParse(response.data);

            // Limit to ~50k chars to avoid database bloat and token limits
            const text = pdfData.text.substring(0, 50000);
            console.log(`[ContentProcessor] Extracted ${text.length} characters.`);
            return text;
        } catch (error) {
            console.error('[ContentProcessor] Extraction Failed:', error.message);
            return "";
        }
    } else if (mimetype === 'text/plain') {
        try {
            console.log(`[ContentProcessor] Downloading Text from ${url}...`);
            const response = await axios.get(url);
            // Axios automatically handles text response, but ensure it's a string
            const text = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

            // Limit to ~50k chars
            const truncated = text.substring(0, 50000);
            console.log(`[ContentProcessor] Extracted ${truncated.length} characters.`);
            return truncated;
        } catch (error) {
            console.error('[ContentProcessor] Text Extraction Failed:', error.message);
            return "";
        }
    }

    return "";
};
