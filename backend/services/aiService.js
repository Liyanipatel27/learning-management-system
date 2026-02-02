const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');


class AIService {
    constructor() {
        // Initialize Gemini Keys
        if (process.env.GEMINI_API_KEYS) {
            this.geminiKeys = process.env.GEMINI_API_KEYS.split(',').map(k => k.trim()).filter(k => k);
            this.currentGeminiKeyIndex = 0;
            if (this.geminiKeys.length === 0) {
                console.warn("GEMINI_API_KEYS is set but empty.");
            }
        } else if (process.env.GEMINI_API_KEY) {
            // Fallback for backward compatibility
            this.geminiKeys = [process.env.GEMINI_API_KEY];
            this.currentGeminiKeyIndex = 0;
        } else {
            console.warn("GEMINI_API_KEYS is not set.");
            this.geminiKeys = [];
        }

        // Initialize OpenAI Keys (for Performance Analysis)
        if (process.env.OPENAI_API_KEYS) {
            this.openaiKeys = process.env.OPENAI_API_KEYS.split(',').map(k => k.trim()).filter(k => k);
            this.currentOpenAIKeyIndex = 0;
            if (this.openaiKeys.length === 0) {
                console.warn("OPENAI_API_KEYS is set but empty.");
            }
            // Initialize OpenAI client with first key
            this.openai = new OpenAI({ apiKey: this.openaiKeys[0] });
        } else {
            console.warn("OPENAI_API_KEYS is not set.");
            this.openaiKeys = [];
            this.openai = null;
        }
    }

    // ============ GEMINI METHODS ============
    _getGenerativeModel() {
        if (this.geminiKeys.length === 0) return null;
        const key = this.geminiKeys[this.currentGeminiKeyIndex];
        const genAI = new GoogleGenerativeAI(key);
        return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    }

    _rotateGeminiKey() {
        if (this.geminiKeys.length <= 1) return false;
        this.currentGeminiKeyIndex = (this.currentGeminiKeyIndex + 1) % this.geminiKeys.length;
        console.log(`Switching to Gemini Key Index: ${this.currentGeminiKeyIndex}`);
        return true;
    }

    async callGemini(prompt, systemInstruction = "", jsonMode = false) {
        if (this.geminiKeys.length === 0) throw new Error("No Gemini API keys configured.");

        this.geminiCallCount = (this.geminiCallCount || 0) + 1;
        console.log(`[Gemini Usage] Call #${this.geminiCallCount} | Key Index: ${this.currentGeminiKeyIndex}`);

        const maxAttempts = this.geminiKeys.length;
        let attempts = 0;
        let lastError = null;

        while (attempts < maxAttempts) {
            try {
                const model = this._getGenerativeModel();
                const fullPrompt = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;

                let result = await model.generateContent(fullPrompt);
                let response = result.response.text();

                if (jsonMode) {
                    response = response.replace(/```json/g, '').replace(/```/g, '').trim();
                }
                return response;

            } catch (err) {
                console.error(`Gemini Error (Key Index ${this.currentGeminiKeyIndex}):`, err.message);
                lastError = err;
                const rotated = this._rotateGeminiKey();
                if (!rotated) break;
                attempts++;
            }
        }

        throw new Error(`Gemini Service Failed after trying ${attempts + 1} keys.`);
    }

    // ============ OPENAI METHODS (For Performance Analysis) ============
    _rotateOpenAIKey() {
        if (this.openaiKeys.length <= 1) return false;
        this.currentOpenAIKeyIndex = (this.currentOpenAIKeyIndex + 1) % this.openaiKeys.length;
        this.openai = new OpenAI({ apiKey: this.openaiKeys[this.currentOpenAIKeyIndex] });
        console.log(`Switching to OpenAI Key Index: ${this.currentOpenAIKeyIndex}`);
        return true;
    }

    async callOpenAI(prompt, systemInstruction = "", jsonMode = false) {
        if (!this.openai || this.openaiKeys.length === 0) {
            throw new Error("No OpenAI API keys configured.");
        }

        this.openaiCallCount = (this.openaiCallCount || 0) + 1;
        console.log(`[OpenAI Usage] Call #${this.openaiCallCount} | Key Index: ${this.currentOpenAIKeyIndex}`);

        const maxAttempts = this.openaiKeys.length;
        let attempts = 0;
        let lastError = null;

        while (attempts < maxAttempts) {
            try {
                const messages = [];

                // Add system instruction if provided
                if (systemInstruction) {
                    messages.push({ role: "system", content: systemInstruction });
                }

                // Add user prompt
                messages.push({ role: "user", content: prompt });

                const response = await this.openai.chat.completions.create({
                    model: "gpt-3.5-turbo",
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 2000
                });

                let textResponse = response.choices[0].message.content;

                if (jsonMode) {
                    textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
                }
                return textResponse;

            } catch (err) {
                console.error(`OpenAI Error (Key Index ${this.currentOpenAIKeyIndex}):`, err.message);
                lastError = err;

                // Check if it's a quota error or other retryable error
                if (err.status === 429 || err.status >= 500) {
                    const rotated = this._rotateOpenAIKey();
                    if (!rotated) break;
                    attempts++;
                } else {
                    // For other errors, try rotating anyway
                    const rotated = this._rotateOpenAIKey();
                    if (!rotated) break;
                    attempts++;
                }
            }
        }

        throw new Error(`OpenAI Service Failed after trying ${attempts + 1} keys. Last Error: ${lastError ? lastError.message : 'Unknown'}`);
    }

    // ============ FEATURE METHODS ============

    // Feature 1: Subject & Video Summaries (uses Gemini)
    async generateSubjectSummary(content, type) {
        const prompt = `Analyze the following ${type} content and generate a concise summary with bullet points. 
        Content: ${content.substring(0, 10000)}... (truncated if too long)`;

        return await this.callGemini(prompt, "You are an expert educational assistant. Summarize the content clearly/concisely.");
    }

    async generateCommonSummary(summaries) {
        const prompt = `Combine the following subject summaries into one overall summary highlighting key learning concepts: ${JSON.stringify(summaries)}`;
        return await this.callGemini(prompt, "Summarize key insights across all subjects.");
    }

    // Feature 2: Study Roadmap (uses Gemini)
    async generateRoadmap(studentData, targetDate, startDate) {
        const prompt = `Create a detailed study roadmap starting from ${startDate || 'today'} and ending on ${targetDate}.
        Student Data: ${JSON.stringify(studentData)}
        
        Output a valid JSON object with this structure:
        {
            "roadmap": [
                {
                    "date": "YYYY-MM-DD",
                    "day": 1,
                    "tasks": [
                        { "subject": "Subject Name", "topic": "Topic Name", "hours": 2, "description": "Details" }
                    ]
                }
            ]
        }`;

        try {
            const response = await this.callGemini(prompt, "You are a study planning assistant. return ONLY valid JSON.", true);
            return JSON.parse(response);
        } catch (e) {
            console.error("Failed to parse roadmap JSON", e);
            throw new Error("Failed to generate valid roadmap JSON");
        }
    }

    // Feature 3: Performance Analyzer (USES OPENAI)
    async analyzePerformance(performanceData) {
        const prompt = `Analyze this student performance data in detail: ${JSON.stringify(performanceData)}.
        
        Provide a comprehensive analysis including:
        1. overallLevel: Performance level (Low <50, Average 50-75, Good 75-85, High >85)
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

        try {
            // Use OpenAI for performance analysis (as requested by user)
            const response = await this.callOpenAI(prompt, "You are a performance analyst. Return ONLY valid JSON.", true);
            return JSON.parse(response);
        } catch (e) {
            console.error("Failed to analyze performance with OpenAI, falling back to Gemini:", e.message);
            // Fallback to Gemini if OpenAI fails
            try {
                const response = await this.callGemini(prompt, "You are a performance analyst. Return ONLY valid JSON.", true);
                return JSON.parse(response);
            } catch (geminiError) {
                console.error("Failed to analyze performance with Gemini fallback:", geminiError);
                throw new Error("Failed to analyze performance");
            }
        }
    }

    // Feature 4: AI Tutor Chat (uses Gemini)
    async chat(message, history, studentLevel) {
        let systemPrompt = "You are a helpful AI tutor.";
        if (studentLevel === 'Low') systemPrompt += " Explain things simply with many examples.";
        if (studentLevel === 'High') systemPrompt += " Be concise and challenge the student with advanced concepts.";

        const historyContext = history.map(h => `${h.role}: ${h.content}`).join('\n');
        const prompt = `History:\n${historyContext}\n\nStudent: ${message}`;

        return await this.callGemini(prompt, systemPrompt);
    }

    // Feature 5: Grade-Based Notes (uses Gemini)
    async generateNotes(topic, level) {
        let instruction = "";
        if (level === 'Low') instruction = "Create very simple notes with basic concepts and easy examples.";
        else if (level === 'Average') instruction = "Create detailed notes with practice questions.";
        else if (level === 'Good') instruction = "Create exam-oriented summar notes.";
        else instruction = "Create advanced, competitive-level insights.";

        return await this.callGemini(`Generate study notes for: ${topic}`, instruction);
    }

    // Feature 6: Quiz Generator (uses Gemini)
    async generateQuiz(subject, topic, difficulty) {
        const prompt = `Generate a quiz for ${subject} - ${topic} at ${difficulty} level.
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
            const res = await this.callGemini(prompt, "You are a quiz generator. Return ONLY valid JSON.", true);
            return JSON.parse(res);
        } catch (e) {
            throw new Error("Failed to generate quiz");
        }
    }
}

module.exports = new AIService();
