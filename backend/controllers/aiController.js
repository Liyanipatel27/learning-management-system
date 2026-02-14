const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const axios = require('axios');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

exports.getPDFSummary = async (req, res) => {
    try {
        const { pdfUrl } = req.body;

        if (!pdfUrl) {
            return res.status(400).json({ message: "PDF URL is required" });
        }

        let pdfBuffer;

        // Check if it's a local file or remote URL
        if (pdfUrl.startsWith('http')) {
            // Fetch remote PDF
            const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
            pdfBuffer = Buffer.from(response.data);
        } else {
            // Local file path (assuming relative to 'uploads' or public dir)
            // Adjust this path resolution based on how your server serves files
            // If the URL is like /uploads/file.pdf, we need to map it to the file system
            const localPath = path.join(__dirname, '..', pdfUrl); // Basic assumption
            if (fs.existsSync(localPath)) {
                pdfBuffer = fs.readFileSync(localPath);
            } else {
                // Try removing leading slash
                const altPath = path.join(__dirname, '..', pdfUrl.startsWith('/') ? pdfUrl.slice(1) : pdfUrl);
                if (fs.existsSync(altPath)) {
                    pdfBuffer = fs.readFileSync(altPath);
                } else {
                    return res.status(404).json({ message: "PDF file not found on server" });
                }
            }
        }

        // Extract text from PDF
        const data = await pdf(pdfBuffer);
        const text = data.text;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ message: "Could not extract text from this PDF. It might be scanned or empty." });
        }

        // Limit text length to avoid token limits (Gemini 1.5 has large context, but good to be safe/efficient)
        // 1.5 Flash has 1M context window, so we can send a LOT. But let's keep it reasonable.
        const truncatedText = text.slice(0, 100000);

        const prompt = `Please provide a concise and helpful summary of the following educational content from a course module. 
        Focus on key concepts, definitions, and important takeaways for a student.
        
        Content:
        ${truncatedText}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const summary = response.text();

        res.status(200).json({ summary });

    } catch (error) {
        console.error("Error generating PDF summary:", error);
        res.status(500).json({ message: "Failed to generate summary", error: error.message });
    }
};
