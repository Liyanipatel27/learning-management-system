const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const axios = require('axios');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');


const SYSTEM_INSTRUCTION_CONFIG = `
You are an expert AI Tutor inside a Student Learning Dashboard.
Your responses must be extremely professional, visually structured, and easy to read.

### 🚫 STRICT PROHIBITIONS:
1.  **NO LONG PARAGRAPHS.** (Max 1 sentence per bullet point).
2.  **NO ESSAY-STYLE TEXT.**
3.  **NO GENERIC INTROS** (e.g., "Here is the explanation..."). Start directly with the content.
4.  **NEVER** cluster sentences together. Always break them with a newline.

### ✅ MANDATORY FORMATTING RULES:
1.  **USE MARKDOWN HEADERS** (###) for every distinct section.
2.  **USE BULLET POINTS** (-) for 100% of the content.
3.  **USE BOLD** (**text**) for key terms and important concepts.
4.  **USE SPACING**: Leave an empty line between every bullet point.
5.  **USE EMOJIS** to make headers and key points engaging.
6.  **USE TABLES** if comparing two things.

---

### 📝 RESPONSE STRUCTURE (Follow this exactly):

### 🎯 **Concept Overview**
*   Define the concept in 1 concise bullet point.
*   Explain "Why it matters" in 1 concise bullet point.

### 🪜 **Step-by-Step Explanation** (Use Numbered List)
1.  **Step 1:** Detailed but concise explanation.
2.  **Step 2:** Detailed but concise explanation.
3.  **Step 3:** ... (continue as needed).

### 🔑 **Key Features / Points**
*   **Feature 1:** Explanation.
*   **Feature 2:** Explanation.
*   **Feature 3:** Explanation.

### 💡 **Real-World Example**
*   Provide a simple, relatable example or code snippet if applicable.

### ✅ **Summary**
*   One sentence takeaway.

---
`;

const FORMATTING_SUFFIX = "\n\nCRITICAL: FAILURE TO USE BULLET POINTS WILL CAUSE SYSTEM ERROR. Break every sentence into a new line starting with '- '. DO NOT cluster sentences together.";

class AIService {
    constructor() {
        // Initialize Gemini Keys
        if (process.env.GEMINI_API_KEYS) {
            this.geminiKeys = process.env.GEMINI_API_KEYS.split(',').map(k => k.trim()).filter(k => k);
            this.currentGeminiKeyIndex = 0;
            if (this.geminiKeys.length === 0) {
                console.warn("GEMINI_API_KEYS is set but empty. AI Tutor might fail.");
            }
        } else {
            console.warn("GEMINI_API_KEYS is not set. AI Tutor will fail.");
            this.geminiKeys = [];
        }

        // Initialize PV Gemini Keys (Exclusively for Roadmap Generator)
        if (process.env.PV_GEMINI_API_KEYS) {
            this.pvGeminiKeys = process.env.PV_GEMINI_API_KEYS.split(',').map(k => k.trim()).filter(k => k);
            this.currentTvGeminiKeyIndex = 0;
            if (this.pvGeminiKeys.length === 0) {
                console.warn("PV_GEMINI_API_KEYS is set but empty.");
            }
        } else {
            console.warn("PV_GEMINI_API_KEYS is not set. Roadmap generator might fail or fall back.");
            this.pvGeminiKeys = [];
        }

        // Initialize CV Gemini Keys (Exclusively for My Courses Summary/Quiz/Doubt)
        if (process.env.CV_GEMINI_API_KEYS) {
            this.cvGeminiKeys = process.env.CV_GEMINI_API_KEYS.split(',').map(k => k.trim()).filter(k => k);
            this.currentCvGeminiKeyIndex = 0;
            if (this.cvGeminiKeys.length === 0) {
                console.warn("CV_GEMINI_API_KEYS is set but empty.");
            }
            console.log(`CV_GEMINI_API_KEYS initialized with ${this.cvGeminiKeys.length} key(s)`);
        } else {
            console.warn("CV_GEMINI_API_KEYS is not set. Summary/Quiz/Doubt features might fail or fall back.");
            this.cvGeminiKeys = [];
        }

        // ============ TEACHER DASHBOARD KEYS ============

        // 1. Assignment Feedback Keys
        if (process.env.TEACHER_ASSIGNMENT_GEMINI_KEYS) {
            this.teacherAssignmentKeys = process.env.TEACHER_ASSIGNMENT_GEMINI_KEYS.split(',').map(k => k.trim()).filter(k => k);
            this.currentAssignmentKeyIndex = 0;
        } else {
            this.teacherAssignmentKeys = [];
        }

        // 2. Question Analyzer Keys
        if (process.env.TEACHER_QUESTION_ANALYZER_GEMINI_KEYS) {
            this.teacherQuestionKeys = process.env.TEACHER_QUESTION_ANALYZER_GEMINI_KEYS.split(',').map(k => k.trim()).filter(k => k);
            this.currentQuestionKeyIndex = 0;
        } else {
            this.teacherQuestionKeys = [];
        }

        // 3. Risk Predictor Keys (OpenAI)
        if (process.env.TEACHER_RISK_OPENAI_KEYS) {
            this.teacherRiskKeys = process.env.TEACHER_RISK_OPENAI_KEYS.split(',').map(k => k.trim()).filter(k => k);
        } else {
            this.teacherRiskKeys = [];
        }

        // 4. Performance Analyzer Keys (OpenAI)
        if (process.env.TEACHER_PERFORMANCE_OPENAI_KEYS) {
            this.teacherPerformanceKeys = process.env.TEACHER_PERFORMANCE_OPENAI_KEYS.split(',').map(k => k.trim()).filter(k => k);
        } else {
            this.teacherPerformanceKeys = [];
        }
    }

    // ============ HELPER METHODS ============
    async getTextFromPDF(url) {
        try {
            let dataBuffer;
            let mimeType = "application/pdf"; // Default

            // Check if it's a local file URL (e.g., /uploads/...) or localhost URL
            const isLocalUpload = url.includes('/uploads/');

            if (isLocalUpload) {
                // Extract filename from URL
                const filename = url.split('/uploads/').pop();
                // Construct absolute path (assuming aiService is in backend/services and uploads is in backend/uploads)
                const filePath = path.join(__dirname, '..', 'uploads', filename); // Decoded automatically by path join? No, need to decode URI components
                const decodedPath = decodeURI(filePath);

                console.log(`Reading local PDF from disk: ${decodedPath}`);

                if (fs.existsSync(decodedPath)) {
                    dataBuffer = fs.readFileSync(decodedPath);
                } else {
                    console.warn(`Local file not found at ${decodedPath}, falling back to network request.`);
                    const response = await axios.get(url, { responseType: 'arraybuffer' });
                    dataBuffer = response.data;
                }
            } else {
                // External URL
                console.log(`Fetching remote PDF: ${url}`);
                const response = await axios.get(url, { responseType: 'arraybuffer' });
                dataBuffer = response.data;
            }

            // 1. Try Standard Text Extraction (pdf-parse)
            try {
                const data = await pdfParse(dataBuffer);
                const text = data.text.trim();

                // If text is sufficient, return it
                if (text.length > 50) {
                    return text;
                }
                console.log("PDF parsed text is empty or too short. Falling back to Gemini OCR.");
            } catch (pdfError) {
                console.warn("pdf-parse failed:", pdfError.message);
            }

            // 2. Fallback to Gemini 1.5 Flash (OCR)
            return await this.extractTextWithGemini(dataBuffer, mimeType);

        } catch (error) {
            console.error("Error extracting text from PDF:", error.message);
            // Return empty string instead of throwing, so the process doesn't crash? 
            // Better to throw so the caller knows it failed, or return empty string and handle upstream?
            // Existing implementation threw error, so let's keep it consistent but maybe add a specific message.
            throw new Error(`Failed to extract text from PDF: ${error.message}`);
        }
    }

    async extractTextWithGemini(buffer, mimeType) {
        try {
            console.log("Starting Gemini OCR extraction...");
            // Encode buffer to base64
            const base64Data = buffer.toString('base64');

            // Use Gemini 1.5 Flash for speed and efficiency
            const model = this._getGenerativeModel(0, this.geminiKeys); // Uses default keys
            if (!model) throw new Error("No Gemini keys available for OCR.");

            const result = await model.generateContent([
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: mimeType
                    }
                },
                {
                    text: "Extract all text from this document. Return ONLY the extracted text, preserving structure where possible. Do not add any introductory or concluding remarks."
                }
            ]);

            const response = await result.response;
            const text = response.text();
            console.log("Gemini OCR extraction successful.");
            console.log("--- GEMINI OCR EXTRACTED TEXT START ---");
            console.log(text);
            console.log("--- GEMINI OCR EXTRACTED TEXT END ---");
            return text;

        } catch (error) {
            console.error("Gemini OCR failed:", error.message);
            // If this fails, we really can't get text.
            // Return empty string implies "no text found".
            return "";
        }
    }

    // ============ GEMINI METHODS ============
    _getGenerativeModel(keyIndex, keys = this.geminiKeys, systemInstruction = null) {
        if (!keys || keys.length === 0) return null;
        const key = keys[keyIndex];
        const genAI = new GoogleGenerativeAI(key);
        // Using gemini-2.5-flash model which is supported by the current API version
        const modelParams = { model: "gemini-2.5-flash" };
        if (systemInstruction) {
            modelParams.systemInstruction = systemInstruction;
        }
        return genAI.getGenerativeModel(modelParams);
    }

    getUsageCount() {
        return this.geminiCallCount || 0;
    }

    // Generic LLM Call (Uses default keys)
    async callLLM(prompt, systemInstruction = "", jsonMode = false) {
        // Append suffix only if NOT in JSON mode (to avoid breaking JSON structure with markdown instructions)
        const finalPrompt = jsonMode ? prompt : (prompt + FORMATTING_SUFFIX);
        return this._executeGeminiCall(finalPrompt, systemInstruction, jsonMode, this.geminiKeys, 'Default');
    }

    // Dedicated PV Key LLM Call (Uses PV keys)
    async callPVLLM(prompt, systemInstruction = "", jsonMode = false) {
        if (this.pvGeminiKeys.length === 0) throw new Error("No PV Gemini API keys configured for Roadmap Generator.");
        return this._executeGeminiCall(prompt, systemInstruction, jsonMode, this.pvGeminiKeys, 'PV');
    }

    // Dedicated CV Key LLM Call (Uses CV keys - Exclusively for My Courses Summary/Quiz/Doubt)
    async callCVLLM(prompt, systemInstruction = "", jsonMode = false) {
        if (this.cvGeminiKeys.length === 0) {
            console.warn("No CV Gemini API keys configured. Falling back to default keys.");
            return this.callLLM(prompt, systemInstruction, jsonMode);
        }
        const finalPrompt = jsonMode ? prompt : (prompt + FORMATTING_SUFFIX);
        return this._executeGeminiCall(finalPrompt, systemInstruction, jsonMode, this.cvGeminiKeys, 'CV');
    }

    // Dedicated Teacher Assignment Feedback Call
    async callAssignmentFeedbackLLM(prompt, systemInstruction = "", jsonMode = false) {
        if (this.teacherAssignmentKeys.length === 0) throw new Error("No Teacher Assignment Gemini keys configured.");
        return this._executeGeminiCall(prompt, systemInstruction, jsonMode, this.teacherAssignmentKeys, 'TeacherAssignment');
    }

    // Dedicated Teacher Question Analyzer Call
    async callQuestionAnalyzerLLM(prompt, systemInstruction = "", jsonMode = false) {
        if (this.teacherQuestionKeys.length === 0) throw new Error("No Teacher Question Analyzer Gemini keys configured.");
        return this._executeGeminiCall(prompt, systemInstruction, jsonMode, this.teacherQuestionKeys, 'TeacherQuestion');
    }

    // Unified Gemini Execution Logic
    async _executeGeminiCall(prompt, systemInstruction, jsonMode, keys, keyType) {
        if (!keys || keys.length === 0) {
            console.warn(`No ${keyType} Gemini API keys configured. Using fallback response.`);
            return this.getFallbackResponse(prompt, jsonMode);
        }

        // Merge Global Instruction with specific instruction
        let combinedSystemInstruction = SYSTEM_INSTRUCTION_CONFIG;
        if (systemInstruction) {
            combinedSystemInstruction += `\n\n${systemInstruction}`;
        }

        // If JSON mode is requested, we strictly enforce JSON as the FINAL instruction to override any formatting nuances
        if (jsonMode) {
            combinedSystemInstruction += `\n\nIMPORTANT: Ignore the Markdown formatting rules for the FINAL OUTPUT structure. Return ONLY valid JSON.`;
        }

        // Determine current index based on key type (simple load balancing)
        let currentIndexName = 'currentGeminiKeyIndex';
        let callCountName = 'geminiCallCount';

        if (keyType === 'PV') {
            currentIndexName = 'currentTvGeminiKeyIndex';
            callCountName = 'pvGeminiCallCount';
        } else if (keyType === 'TeacherAssignment') {
            currentIndexName = 'currentAssignmentKeyIndex';
            callCountName = 'assignmentCallCount';
        } else if (keyType === 'TeacherQuestion') {
            currentIndexName = 'currentQuestionKeyIndex';
            callCountName = 'questionCallCount';
        } else if (keyType === 'QuizGenerator') {
            // Single key, no rotation index needed, but we keep structure
            currentIndexName = 'currentQuizKeyIndex';
            callCountName = 'quizGenCallCount';
            if (this[currentIndexName] === undefined) this[currentIndexName] = 0;
        } else if (keyType === 'CV') {
            currentIndexName = 'currentCvGeminiKeyIndex';
            callCountName = 'cvGeminiCallCount';
            if (this[currentIndexName] === undefined) this[currentIndexName] = 0;
        }

        // Rotate Key - REMOVED for Sticky Session (Only rotate on failure)
        // this[currentIndexName] = (this[currentIndexName] + 1) % keys.length;

        this[callCountName] = (this[callCountName] || 0) + 1;
        console.log(`[Gemini ${keyType} Usage] Call #${this[callCountName]} | Initial Key Index: ${this[currentIndexName]} (Key ending: ...${keys[this[currentIndexName]].slice(-4)})`);

        const maxAttempts = keys.length;
        let attempts = 0;
        let currentTryIndex = this[currentIndexName];

        while (attempts < maxAttempts) {
            try {
                // Pass combined system instruction to model initialization
                const model = this._getGenerativeModel(currentTryIndex, keys, combinedSystemInstruction);

                // Prompt is now just the user prompt, system instruction is handled by the model
                let result = await model.generateContent(prompt);
                let response = result.response.text();

                if (jsonMode) {
                    response = response.replace(/```json/g, '').replace(/```/g, '').trim();
                }
                return response;

            } catch (err) {
                console.error(`Gemini ${keyType} Error (Key Index ${currentTryIndex}):`, err.message);

                // Rotate to next key on error
                currentTryIndex = (currentTryIndex + 1) % keys.length;
                this[currentIndexName] = currentTryIndex; // Update global index to stick to new key
                attempts++;
                console.log(`Retrying with ${keyType} Key Index: ${currentTryIndex}`);

                // Add delay between retries
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // Fallback Logic when all keys fail
        console.log(`All ${keyType} Gemini API keys exhausted. Using fallback response.`);
        return this.getFallbackResponse(prompt, jsonMode);
    }

    // Fallback response generator for when AI API fails
    getFallbackResponse(prompt, jsonMode) {
        if (jsonMode) {
            return JSON.stringify({
                message: "Sorry, I'm having trouble processing your request right now. Please try again later.",
                fallback: true
            });
        }

        return "### 🎯 AI Service Unavailable\n\n- I'm having trouble connecting to the AI service right now.\n- Please check your internet connection and try again in a few moments.\n- If the problem persists, the AI service might be temporarily unavailable.\n\n### ✅ Suggestions\n- Try rephrasing your question\n- Check your internet connection\n- Wait a minute and try again";
    }

    // ============ FEATURE METHODS ============

    // Feature 1: Subject & Video Summaries
    // Feature 1: Subject & Video Summaries (Uses CV keys exclusively)
    async generateSubjectSummary(content, type) {
        let textToAnalyze = content;

        if (type === 'pdf' || (typeof content === 'string' && content.startsWith('http') && content.endsWith('.pdf'))) {
            console.log("Detected PDF URL. Extracting text...");
            try {
                textToAnalyze = await this.getTextFromPDF(content);
                // Sanitize text: remove excessive newlines and spaces
                textToAnalyze = textToAnalyze.replace(/\n\s*\n/g, '\n').replace(/\s+/g, ' ');

                // Truncate to avoid token limits (max ~30k chars for safety, though 1.5 flash handles more)
                if (textToAnalyze.length > 50000) textToAnalyze = textToAnalyze.substring(0, 50000);
            } catch (e) {
                console.error("PDF Text Extraction Failed:", e);
                return "Failed to extract text from the PDF document. Please check if the URL is accessible.";
            }
        }

        const prompt = `Analyze the following content and generate a concise summary with bullet points. 
        Content: ${textToAnalyze.substring(0, 20000)}... (truncated if too long)${FORMATTING_SUFFIX}`;

        return await this.callCVLLM(prompt, "You are an expert educational assistant. Summarize the content clearly/concisely.");
    }

    async generateCommonSummary(summaries) {
        const prompt = `Combine the following subject summaries into one overall summary highlighting key learning concepts: ${JSON.stringify(summaries)}`;
        return await this.callLLM(prompt, "Summarize key insights across all subjects.");
    }

    // Feature 2: Study Roadmap (USES PV KEYS EXCLUSIVELY)
    async generateRoadmap(studentData, targetDate, startDate) {
        const prompt = `Create a DETAILED, CHAPTER-BY-CHAPTER study roadmap URL for the following student goal: "${studentData.goal}".
        
        Selected Subjects: ${JSON.stringify(studentData.subjects)}
        Daily Study Time: ${studentData.dailyHours} hours (Weekdays), ${studentData.weekendHours} hours (Weekends).
        Start Date: ${startDate || 'Today'}
        Target Date: ${targetDate || '2 weeks from now'}

        RULES:
        1. Break down EVERY subject into its specific chapters/topics.
        2. Assign specific topics to specific days.
        3. BE VERY SPECIFIC. Instead of "Maths", say "Maths: Calculus - Limits and Continuity".
        4. Output format must be strictly MARKDOWN.
        5. Structure it clearly with Days (e.g., ## Day 1: [Date]).

        FORMAT TEMPLATE:
        # 🚀 Personalized Study Roadmap: [Goal]

        ## 📅 Week 1 Strategy
        Brief overview...

        ### Day 1: [Topic Name]
        - **Subject**: [Subject]
        - **Focus**: [Specific Chapter/Concept]
        - **Action Items**:
          - [ ] Read Chapter X
          - [ ] Solve 5 problems on Y
          - [ ] Watch video on Z
          - [ ] Practice questions on A
        - **Estimated Time**: [Time]

        ... (Repeat for all days)

        ## 🎯 Final Review Strategy
        ...
        
        Do NOT wrap in JSON. Return raw Markdown text.`;

        try {
            // [MODIFIED] Uses callPVLLM to enforce exclusive PV key usage
            console.log("Generating Roadmap using PV Keys...");
            const response = await this.callPVLLM(prompt, "You are a senior academic counselor. Create a detailed, actionable, day-by-day study plan in Markdown.", false);
            return response;
        } catch (e) {
            console.error("Failed to generate roadmap or PV keys failed", e);
            if (e.message.includes("PV Gemini keys failed")) {
                throw new Error("Roadmap generation failed: High demand on specialized AI service.");
            }
            throw new Error("Failed to generate roadmap");
        }
    }

    // Feature 3: Performance Analyzer (Now using OpenAI)
    async analyzePerformance(performanceData) {
        // OpenAI Keys from environment variables
        let openAIKeys = [];
        if (process.env.OPENAI_API_KEYS) {
            openAIKeys = process.env.OPENAI_API_KEYS.split(',').map(k => k.trim()).filter(k => k);
        } else if (process.env.OPENAI_API_KEY) {
            openAIKeys = [process.env.OPENAI_API_KEY];
        }

        if (openAIKeys.length === 0) {
            console.warn("No OpenAI API keys configured, falling back to Gemini");
            return this.analyzePerformanceWithGemini(performanceData);
        }

        const prompt = `Analyze this student performance data in detail: ${JSON.stringify(performanceData)}.
        
        Provide a comprehensive analysis including:
        1. overallLevel: Performance level (High: 90-100%, Good: 70-89%, Average: 50-69%, Low: <50%)
        2. overallScore: Overall percentage (0-100)
        3. overallPerformance: Brief summary of overall performance
        4. strengths: Array of 3-5 strengths with specific subject examples
        5. weaknesses: Array of 3-5 weaknesses with specific subject examples
        6. improvementSuggestions: Array of 5-7 actionable improvement tips
        7. subjectAnalysis: Array of objects with subject name, average score, trend (improving/declining/stable), and specific feedback
        8. futurePrediction: Object with predictedScore (next performance), trend (Upward/Stable/Downward), and insight paragraph
        
        Output ONLY valid JSON with this structure:
        {
            "overallLevel": "Good",
            "overallScore": 82,
            "overallPerformance": "Brief performance summary",
            "strengths": ["Strength 1", "Strength 2", "Strength 3"],
            "weaknesses": ["Weakness 1", "Weakness 2"],
            "improvementSuggestions": ["Tip 1", "Tip 2", "Tip 3", "Tip 4", "Tip 5"],
            "subjectAnalysis": [
                {
                    "subject": "Mathematics",
                    "averageScore": 85,
                    "trend": "Improving",
                    "feedback": "Specific feedback for Mathematics"
                }
            ],
            "futurePrediction": {
                "predictedScore": 87,
                "trend": "Upward",
                "insight": "Detailed insight about future performance"
            }
        }`;

        // Simple Random Load Balancing
        const randomKey = openAIKeys[Math.floor(Math.random() * openAIKeys.length)];
        const openai = new OpenAI({ apiKey: randomKey });

        try {
            const completion = await openai.chat.completions.create({
                messages: [
                    { role: "system", content: SYSTEM_INSTRUCTION_CONFIG + "\n\nYou are a performance analyst. Return ONLY valid JSON." },
                    { role: "user", content: prompt }
                ],
                model: "gpt-3.5-turbo",
            });

            const responseText = completion.choices[0].message.content;
            // Clean markdown if present
            const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);

        } catch (e) {
            console.error("Failed to analyze performance with OpenAI:", e.message);
            throw new Error("Failed to analyze performance");
        }
    }

    // Fallback: Analyze performance using Gemini if OpenAI keys are not configured
    async analyzePerformanceWithGemini(performanceData) {
        const prompt = `Analyze this student performance data in detail: ${JSON.stringify(performanceData)}.
        
        Provide a comprehensive analysis including:
        1. overallLevel: Performance level (High: 90-100%, Good: 70-89%, Average: 50-69%, Low: <50%)
        2. overallScore: Overall percentage (0-100)
        3. overallPerformance: Brief summary of overall performance
        4. strengths: Array of 3-5 strengths with specific subject examples
        5. weaknesses: Array of 3-5 weaknesses with specific subject examples
        6. improvementSuggestions: Array of 5-7 actionable improvement tips
        7. subjectAnalysis: Array of objects with subject name, average score, trend (improving/declining/stable), and specific feedback
        8. futurePrediction: Object with predictedScore (number), trend (Upward/Flat/Declining), and insight (text)

        Return ONLY valid JSON.`;

        try {
            const response = await this.callLLM(prompt, "You are a performance analyst. Return ONLY valid JSON.", true);
            return JSON.parse(response);
        } catch (e) {
            console.error("Failed to parse performance analysis JSON", e);
            // Return fallback static analysis if both APIs fail
            return {
                overallLevel: "Average",
                overallScore: 72,
                overallPerformance: "Student shows average performance across subjects",
                strengths: ["Consistent attendance", "Basic concept understanding", "Timely submissions"],
                weaknesses: ["Need to improve problem-solving skills", "Lack of in-depth analysis", "Time management issues"],
                improvementSuggestions: [
                    "Practice solving more complex problems daily",
                    "Review mistakes from previous quizzes",
                    "Create a study schedule with dedicated practice time",
                    "Seek help from teachers for challenging topics",
                    "Participate in group study sessions"
                ],
                subjectAnalysis: [
                    {
                        subject: "Mathematics",
                        averageScore: 75,
                        trend: "Stable",
                        feedback: "Good understanding of basic concepts but struggles with advanced topics"
                    }
                ],
                futurePrediction: {
                    predictedScore: 78,
                    trend: "Upward",
                    insight: "With consistent practice, student can improve by 6-8% in next 3 months"
                }
            };
        }
    }

    // Feature 4: AI Tutor Chat
    // Feature 4: AI Tutor Chat / Doubt Solver
    async chat(message, history, studentLevel) {
        // ... (existing chat logic if needed, but we are adding resolveDoubt)
        return this.resolveDoubt(message, history, null, studentLevel);
    }

    async resolveDoubt(question, history = [], contextUrl = null, studentLevel = 'Average') {
        let contextText = "";
        if (contextUrl && contextUrl.startsWith('http')) {
            try {
                if (contextUrl.endsWith('.pdf')) {
                    contextText = await this.getTextFromPDF(contextUrl);
                } else {
                    // Assume it's a regular text file or handled otherwise, for now just skip or fetch text
                    // contextText = await axios.get(contextUrl).then(r => r.data); 
                }
                if (contextText.length > 30000) contextText = contextText.substring(0, 30000);
            } catch (e) {
                console.error("Context extraction failed:", e);
            }
        }

        let systemPrompt = "You are an expert AI Tutor. Your responses must be extremely professional, visually structured, and easy to read. STRICTLY follow these rules:\n\n";
        systemPrompt += "🚫 PROHIBITIONS:\n";
        systemPrompt += "1. NO LONG PARAGRAPHS (Max 2 lines per block)\n";
        systemPrompt += "2. NO ESSAY-STYLE TEXT\n";
        systemPrompt += "3. NO GENERIC INTROS (e.g., 'Here is the explanation...')\n\n";
        systemPrompt += "✅ MANDATORY FORMATTING:\n";
        systemPrompt += "1. USE MARKDOWN HEADERS (###) for every distinct section\n";
        systemPrompt += "2. USE BULLET POINTS (-) for 90% of content\n";
        systemPrompt += "3. USE BOLD (**text**) for key terms\n";
        systemPrompt += "4. USE NUMBERED LISTS (1., 2., 3.) for steps/processes\n";
        systemPrompt += "5. USE EMOJIS to make headers engaging\n\n";
        systemPrompt += "📝 RESPONSE STRUCTURE (FOLLOW EXACTLY):\n";
        systemPrompt += "### 🎯 Concept Overview\n";
        systemPrompt += "- Define the concept in 1 concise bullet point\n";
        systemPrompt += "- Explain 'Why it matters' in 1 concise bullet point\n\n";
        systemPrompt += "### 🪜 Step-by-Step Explanation\n";
        systemPrompt += "1. **Step 1:** Detailed but concise explanation\n";
        systemPrompt += "2. **Step 2:** Detailed but concise explanation\n";
        systemPrompt += "3. **Step 3:** ... (continue as needed)\n\n";
        systemPrompt += "### 🔑 Key Features / Points\n";
        systemPrompt += "- **Feature 1:** Explanation\n";
        systemPrompt += "- **Feature 2:** Explanation\n\n";
        systemPrompt += "### 💡 Real-World Example\n";
        systemPrompt += "- Provide a simple, relatable example or code snippet\n\n";
        systemPrompt += "### ✅ Summary\n";
        systemPrompt += "- One sentence takeaway\n\n";

        if (contextText) {
            systemPrompt += `SOURCE MATERIAL (Answer based on this, but KEEP THE STRICT FORMAT):\n${contextText}\n\nIf the answer is not in the source material, use general knowledge but mention it.\n\n`;
        }

        if (studentLevel === 'Low') systemPrompt += "ADAPTATION: Explain simply with examples, BUT MAINTAIN THE STRICT STRUCTURE.\n";
        if (studentLevel === 'High') systemPrompt += "ADAPTATION: Be concise and advanced, BUT MAINTAIN THE STRICT STRUCTURE.\n";

        const historyContext = history.map(h => `${h.role}: ${h.content}`).join('\n');
        const prompt = `History:\n${historyContext}\n\nStudent: ${question}\n\nIMPORTANT: FORCE the output into the 'RESPONSE STRUCTURE' defined above. Use ### Headers, Bullet points, and **Bold** text. DO NOT WRITE PARAGRAPHS.`;

        // First try CV Gemini with timeout, then fall back to simple responses
        try {
            const cvResult = await Promise.race([
                this.callCVLLM(prompt, systemPrompt),
                new Promise((_, reject) => setTimeout(() => reject(new Error("CV Gemini timeout")), 15000))
            ]);
            return cvResult;
        } catch (cvError) {
            console.error("CV Gemini fallback failed:", cvError.message);
            // If CV Gemini fails or times out, use simple fallback responses
            return this.getSimpleFallbackResponse(question);
        }
    }

    // OpenAI API call method
    async callOpenAI(prompt, systemPrompt) {
        let openAIKeys = [];
        if (process.env.TEACHER_RISK_OPENAI_KEYS) {
            openAIKeys = process.env.TEACHER_RISK_OPENAI_KEYS.split(',').map(k => k.trim()).filter(k => k);
        }
        if (process.env.TEACHER_PERFORMANCE_OPENAI_KEYS) {
            openAIKeys = [...openAIKeys, ...process.env.TEACHER_PERFORMANCE_OPENAI_KEYS.split(',').map(k => k.trim()).filter(k => k)];
        }
        if (process.env.OPENAI_API_KEY) {
            openAIKeys.push(process.env.OPENAI_API_KEY.trim());
        }

        if (openAIKeys.length === 0) {
            throw new Error("No OpenAI API keys configured");
        }

        const randomKey = openAIKeys[Math.floor(Math.random() * openAIKeys.length)];
        const openai = new OpenAI({ apiKey: randomKey });

        try {
            const completion = await openai.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ],
                model: "gpt-3.5-turbo",
                timeout: 10000 // 10 second timeout
            });

            return completion.choices[0].message.content;
        } catch (error) {
            console.error("OpenAI API Error:", error);
            throw new Error("OpenAI API failed to respond");
        }
    }

    // Simple fallback responses based on question keywords
    getSimpleFallbackResponse(question) {
        const q = question.toLowerCase();

        if (q.includes('hello') || q.includes('hi')) {
            return "### 🎯 Hello!\n\n- I'm your AI Tutor, ready to help with your studies!\n\n### ✅ How I can assist\n- Explain complex concepts\n- Help with homework\n- Answer questions\n- Provide study tips\n\nJust ask me anything!";
        }

        if (q.includes('explain') || q.includes('what is')) {
            return "### 🎯 Concept Explanation\n\n- I can help you understand this concept\n- Let me break it down step by step\n\n### 🪜 How it works\n1. **First, I need to understand your question better**\n2. **Then I'll explain with examples**\n3. **We'll practice together if you want**\n\n### ✅ Ready to start?\nAsk me to explain specific topics like \"photosynthesis\", \"calculus\", or \"history of India\"!";
        }

        if (q.includes('help') || q.includes('need')) {
            return "### 🎯 I'm here to help!\n\n- Tell me what you need assistance with\n- I can explain concepts, solve problems, or check your work\n\n### 🔑 Common topics I help with:\n- Math problems\n- Science concepts  \n- History facts\n- Language learning\n- Test preparation\n\n### ✅ Just ask\nWhat specific help do you need today?";
        }

        if (q.includes('math') || q.includes('calculus') || q.includes('algebra')) {
            return "### 🎯 Math Help\n\n- I can help with various math topics\n- Let's break down problems step by step\n\n### 🔑 Topics I can help with:\n- Algebra (equations, functions)\n- Geometry (shapes, theorems)\n- Calculus (derivatives, integrals)\n- Statistics and probability\n\n### ✅ Example questions\n\"Solve for x: 2x + 5 = 15\"\n\"Explain the Pythagorean theorem\"\n\"What is the derivative of x²?\"";
        }

        if (q.includes('science') || q.includes('physics') || q.includes('chemistry') || q.includes('biology')) {
            return "### 🎯 Science Help\n\n- I can explain various scientific concepts\n- From physics to biology, chemistry to earth science\n\n### 🔑 Topics I cover:\n- Physics (motion, energy, forces)\n- Chemistry (atoms, reactions, periodic table)\n- Biology (cells, genetics, ecosystems)\n- Earth science (weather, rocks, space)\n\n### ✅ Example questions\n\"Explain photosynthesis\"\n\"How does gravity work?\"\n\"What is the water cycle?\"";
        }

        // Default response for other questions
        return "### 🎯 I'm ready to help!\n\n- I can help you with various subjects and topics\n- My expertise includes math, science, history, and more\n\n### ✅ How to use me\n1. Ask a specific question\n2. I'll explain with examples\n3. We can practice together\n\n### 💡 Try asking\n\"Explain photosynthesis in plants\"\n\"Solve this math problem: 2+2×2\"\n\"What happened in the American Revolution?\"\n\nWhat would you like to learn today?";
    }

    // Feature 5: Grade-Based Notes
    async generateNotes(topic, level) {
        let instruction = "";
        if (level === 'Low') instruction = "Create very simple notes with basic concepts and easy examples.";
        else if (level === 'Average') instruction = "Create detailed notes with practice questions.";
        else if (level === 'Good') instruction = "Create exam-oriented summar notes.";
        else instruction = "Create advanced, competitive-level insights.";

        return await this.callLLM(`Generate study notes for: ${topic}`, instruction);
    }

    // Feature 6: Quiz Generator (Uses CV keys exclusively)
    async generateQuiz(subject, topic, difficulty, content = null) {
        let prompt = "";

        if (content) {
            let textContext = content;
            if (content.startsWith('http') && content.endsWith('.pdf')) {
                try {
                    textContext = await this.getTextFromPDF(content);
                    if (textContext.length > 30000) textContext = textContext.substring(0, 30000);
                } catch (e) {
                    console.error("Failed to extract PDF for quiz:", e);
                }
            }

            prompt = `Generate a quiz based on the following content context:
             "${textContext.substring(0, 10000)}..."
             
             Subject: ${subject}
             Topic: ${topic}
             Difficulty: ${difficulty}`;
        } else {
            prompt = `Generate a quiz for ${subject} - ${topic} at ${difficulty} level.`;
        }

        prompt += `
        Output ONLY valid JSON with 5 questions:
        Output ONLY valid JSON with 5 questions:
        {
            "questions": [
                {
                    "question": "...",
                    "options": ["A", "B", "C", "D"],
                    "correctAnswerIndex": 0,
                    "explanation": "..."
                }
            ]
        }`;

        try {
            const res = await this.callCVLLM(prompt, "You are a quiz generator. Return ONLY valid JSON.", true);
            return JSON.parse(res);
        } catch (e) {
            throw new Error("Failed to generate quiz");
        }
    }

    // ============ TEACHER DASHBOARD FEATURES ============

    // Feature 1: Assignment Feedback Generator (Gemini)
    async generateAssignmentFeedback(assignmentQuestion, studentAnswer, plagiarismScore) {
        const prompt = `Analyze the student's answer for the following question and provide structured feedback.
        
        Question: ${assignmentQuestion}
        Student Answer: ${studentAnswer}
        Plagiarism Score: ${plagiarismScore}%

        STRICT SCORING RULES BASED ON PLAGIARISM:
        1. If Plagiarism is 0% (No Risk): Suggested Score MUST be between 90-100.
        2. If Plagiarism is 1% - 25% (Safe): Suggested Score MUST be between 70-89.
        3. If Plagiarism is 26% - 50% (Low Risk): Suggested Score MUST be between 50-69.
        4. If Plagiarism is 51% - 100% (High Risk): Suggested Score MUST be between 0-49. AND "Re-write assignment" MUST be included in 'areasForImprovement'.

        Provide feedback in the following JSON format:
        {
            "score": "A number between 0-100 strictly following the rules above",
            "strengths": ["List of strong points (only if plagiarism is low)"],
            "areasForImprovement": ["List of areas to improve"],
            "detailedFeedback": "A comprehensive paragraph giving constructive feedback. Mention plagiarism impact if score is low."
        }
        Return ONLY valid JSON.`;

        try {
            const response = await this.callAssignmentFeedbackLLM(prompt, "You are a strict academic evaluator. You MUST prioritize the Plagiarism Score rules over content quality for the maximum score cap.", true);
            return JSON.parse(response);
        } catch (e) {
            console.error("Assignment Feedback Error:", e);
            throw new Error("Failed to generate assignment feedback.");
        }
    }

    // Feature 2: Question Quality Analyzer (Gemini)
    async analyzeQuestionQuality(question, options, correctAnswer) {
        const prompt = `Analyze this multiple-choice question for quality, difficulty, and Bloom's taxonomy level.

        Question: ${question}
        Options: ${JSON.stringify(options)}
        Correct Answer: ${correctAnswer}

        Provide analysis in the following JSON format:
        {
            "difficultyLevel": "Easy/Medium/Hard",
            "bloomsTaxonomy": "Recall/Understand/Apply/Analyze/Evaluate/Create",
            "qualityScore": "0-10",
            "suggestions": ["List of suggestions to improve clarity or distractors"],
            "isRepetitive": false
        }
        Return ONLY valid JSON.`;

        try {
            const response = await this.callQuestionAnalyzerLLM(prompt, "You are an expert in psychometrics and educational assessment.", true);
            return JSON.parse(response);
        } catch (e) {
            console.error("Question Analysis Error:", e);
            throw new Error("Failed to analyze question quality.");
        }
    }

    // Feature 3: Student Risk Predictor (OpenAI)
    async predictStudentRisk(studentData) {
        // Use Teacher Risk OpenAI Keys
        let keys = this.teacherRiskKeys;
        if (!keys || keys.length === 0) {
            if (process.env.OPENAI_API_KEYS) keys = process.env.OPENAI_API_KEYS.split(',');
        }

        if (!keys || keys.length === 0) {
            console.warn("No OpenAI keys available for Risk Prediction. Falling back to Gemini.");
            return this.predictStudentRiskWithGemini(studentData);
        }

        const prompt = `Predict the risk level for the following student based on their data:
        ${JSON.stringify(studentData)}

        Risk Levels:
        - Low: Doing well.
        - Medium: Needs attention.
        - High: At risk of failing or dropping out.

        Return JSON:
        {
            "riskLevel": "Low/Medium/High",
            "riskScore": "0-100 (probability of risk)",
            "primaryFactors": ["List of factors contributing to risk"],
            "interventionPlan": ["Suggested actions for the teacher"],
            "copyLikelihood": "0-100 (Simulated likelihood of 'Copy' vs 'Own Written' based on performance consistency)",
            "breakdown": {
                "copy": "0-100",
                "ownWritten": "0-100",
                "aiRefined": "0-100"
            },
            "contributors": [
                { "factor": "Factor Name (e.g., 'Writing Style Mismatch')", "impact": "High/Medium/Low", "description": "Brief explanation" }
            ],
            "detailedAnalysis": "A comprehensive paragraph explaining the results, mimicking a 'Understanding your results' section."
        }`;

        // Simple Random Load Balancing for OpenAI
        const randomKey = keys[Math.floor(Math.random() * keys.length)].trim();
        const openai = new OpenAI({ apiKey: randomKey });

        try {
            const completion = await openai.chat.completions.create({
                messages: [
                    { role: "system", content: SYSTEM_INSTRUCTION_CONFIG + "\n\nYou are an educational data scientist. Return ONLY valid JSON." },
                    { role: "user", content: prompt }
                ],
                model: "gpt-3.5-turbo",
            });

            const responseText = completion.choices[0].message.content;
            const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);

        } catch (e) {
            console.error("Risk Prediction Error (OpenAI):", e.message);
            console.log("Falling back to Gemini for Risk Prediction...");
            return this.predictStudentRiskWithGemini(studentData);
        }
    }

    // Fallback: Predict Risk using Gemini
    async predictStudentRiskWithGemini(studentData) {
        const prompt = `Predict the risk level for the following student based on their data:
        ${JSON.stringify(studentData)}

        Risk Levels:
        - Low: Doing well.
        - Medium: Needs attention.
        - High: At risk of failing or dropping out.

        Return ONLY valid JSON with this structure:
        {
            "riskLevel": "Low/Medium/High",
            "riskScore": "0-100 (probability of risk)",
            "primaryFactors": ["List of factors contributing to risk"],
            "interventionPlan": ["Suggested actions for the teacher"],
            "copyLikelihood": "0-100 (Simulated likelihood of 'Copy' vs 'Own Written')",
            "breakdown": {
                "copy": "0-100",
                "ownWritten": "0-100",
                "aiRefined": "0-100"
            },
            "contributors": [
                { "factor": "Factor Name", "impact": "High/Medium/Low", "description": "Brief explanation" }
            ],
            "detailedAnalysis": "Detailed explanation paragraph."
        }`;

        try {
            const response = await this.callLLM(prompt, "You are an educational data scientist. Return ONLY valid JSON.", true);
            return JSON.parse(response);
        } catch (e) {
            console.error("Risk Prediction Gemini Fallback Failed:", e);
            throw new Error("Risk prediction failed on both OpenAI and Gemini.");
        }
    }
    // Feature 4: AI Class Insights (Teacher Dashboard)
    async generateClassInsights(classData) {
        // Use Teacher Performance OpenAI Keys
        let keys = this.teacherPerformanceKeys;
        if (!keys || keys.length === 0) {
            if (process.env.OPENAI_API_KEYS) keys = process.env.OPENAI_API_KEYS.split(',');
        }

        const prompt = `Analyze the following class performance data and generate a comprehensive insight report:
        ${JSON.stringify(classData)}

        Provide the report in the following JSON format:
        {
            "overview": "A brief summary of how the classes are performing overall.",
            "learningGaps": ["List of specific topics or modules where students are struggling"],
            "recommendations": ["Actionable advice for the teacher to improve results"],
            "engagementAnalysis": "Analysis of student participation and completion rates.",
            "topPerformingCourses": ["List of courses doing well"],
            "needsAttentionCourses": ["List of courses needing intervention"]
        }
        Return ONLY valid JSON.`;

        // Strategy: Try OpenAI first, then Gemini
        if (keys && keys.length > 0) {
            const randomKey = keys[Math.floor(Math.random() * keys.length)].trim();
            const openai = new OpenAI({ apiKey: randomKey });

            try {
                const completion = await openai.chat.completions.create({
                    messages: [
                        { role: "system", content: SYSTEM_INSTRUCTION_CONFIG + "\n\nYou are an educational data analyst. Return ONLY valid JSON." },
                        { role: "user", content: prompt }
                    ],
                    model: "gpt-3.5-turbo",
                });
                const responseText = completion.choices[0].message.content;
                const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(jsonStr);
            } catch (e) {
                console.error("Class Insights Error (OpenAI):", e.message);
                console.log("Falling back to Gemini for Class Insights...");
            }
        } else {
            console.warn("No OpenAI keys for Class Insights. Using Gemini.");
        }

        // Fallback to Gemini
        try {
            const response = await this.callLLM(prompt, "You are an educational data analyst. Return ONLY valid JSON.", true);
            return JSON.parse(response);
        } catch (e) {
            console.error("Class Insights Gemini Error:", e);
            throw new Error("Failed to generate class insights.");
        }
    }

    // Feature 5: Quiz Generator from PDF (Teacher Dashboard)
    async generateQuizFromPDF(text, numQuestions = 10, difficultyDistribution = { easy: 30, average: 40, hard: 30 }) {
        // Use Quiz Generator Key
        let keys = [process.env.GEMINI_QUIZ_GENERATOR_KEY];

        const prompt = `Generate a quiz strictly based on the following content context. Do not use any external knowledge.
        
        Content: "${text.substring(0, 50000)}..."
        
        Requirements:
        1. Total Questions: ${numQuestions}
        2. Difficulty Distribution:
           - Easy: ${difficultyDistribution.easy}%
           - Average: ${difficultyDistribution.average}%
           - Hard: ${difficultyDistribution.hard}%
        3. Format: Multiple Choice Questions (MCQs) only.
        4. Output JSON format:
        {
            "questions": [
                {
                    "question": "Question text",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correctAnswerIndex": 0,
                    "explanation": "Brief explanation of why this is correct",
                    "difficulty": "easy/medium/hard"
                }
            ],
             "passingScore": 70,
             "fastTrackScore": 85
        }
        
        Ensure equal distribution of difficulties as requested. Return ONLY valid JSON.`;

        try {
            return await this._executeGeminiCall(prompt, "You are an expert quiz generator. Return ONLY valid JSON.", true, keys, 'QuizGenerator');
        } catch (e) {
            console.error("PDF Quiz Generation Error:", e);
            throw new Error("Failed to generate quiz from PDF: " + e.message);
        }
    }
}


module.exports = new AIService();
