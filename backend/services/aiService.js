const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

class AIService {
    constructor() {
        // Initialize Gemini
        if (process.env.GEMINI_API_KEY) {
            this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            this.geminiModel = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        } else {
            console.warn("GEMINI_API_KEY is not set.");
        }

        // Initialize OpenAI
        if (process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        } else {
            console.warn("OPENAI_API_KEY is not set.");
        }
    }

    async callLLM(prompt, systemInstruction = "", jsonMode = false) {
        let errorLog = [];

        // 1. Try Gemini first (Primary)
        if (this.geminiModel) {
            try {
                // Gemini doesn't support system instructions in the same way as OpenAI in all SDK versions,
                // but we can prepend it to the prompt.
                const fullPrompt = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;

                let result = await this.geminiModel.generateContent(fullPrompt);
                let response = result.response.text();

                if (jsonMode) {
                    // Cleanup markdown code blocks if present
                    response = response.replace(/```json/g, '').replace(/```/g, '').trim();
                }
                return response;
            } catch (err) {
                console.error("Gemini Error:", err.message);
                errorLog.push(`Gemini: ${err.message}`);
            }
        }

        // 2. Fallback to OpenAI (Secondary)
        if (this.openai) {
            try {
                const completion = await this.openai.chat.completions.create({
                    messages: [
                        { role: "system", content: systemInstruction },
                        { role: "user", content: prompt }
                    ],
                    model: "gpt-3.5-turbo",
                    response_format: jsonMode ? { type: "json_object" } : { type: "text" }
                });
                return completion.choices[0].message.content;
            } catch (err) {
                console.error("OpenAI Error:", err.message);
                errorLog.push(`OpenAI: ${err.message}`);
            }
        }

        throw new Error(`AI Service Failed. Errors: ${errorLog.join(', ')}`);
    }

    // Feature 1: Subject & Video Summaries
    async generateSubjectSummary(content, type) {
        const prompt = `Analyze the following ${type} content and generate a concise summary with bullet points. 
        Content: ${content.substring(0, 10000)}... (truncated if too long)`;

        return await this.callLLM(prompt, "You are an expert educational assistant. Summarize the content clearly/concisely.");
    }

    async generateCommonSummary(summaries) {
        const prompt = `Combine the following subject summaries into one overall summary highlighting key learning concepts: ${JSON.stringify(summaries)}`;
        return await this.callLLM(prompt, "Summarize key insights across all subjects.");
    }

    // Feature 2: Study Roadmap
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
            const response = await this.callLLM(prompt, "You are a study planning assistant. return ONLY valid JSON.", true);
            return JSON.parse(response);
        } catch (e) {
            console.error("Failed to parse roadmap JSON", e);
            throw new Error("Failed to generate valid roadmap JSON");
        }
    }

    // Feature 3: Performance Analyzer
    async analyzePerformance(performanceData) {
        const prompt = `Analyze this student performance data: ${JSON.stringify(performanceData)}.
        Deterine the performance level (Low <50, Average 50-75, Good 75-80, High >80).
        Identify strengths and weaknesses.
        
        Output valid JSON:
        {
            "overallLevel": "Average",
            "overallScore": 65,
            "strengths": ["..."],
            "weaknesses": ["..."],
            "improvementTips": ["..."],
            "futurePrediction": {
                "predictedScore": 70,
                "trend": "Stable/Upward/Downward",
                "insight": "Based on recent quiz scores..."
            }
        }`;

        try {
            const response = await this.callLLM(prompt, "You are a performance analyst. Return ONLY valid JSON.", true);
            return JSON.parse(response);
        } catch (e) {
            throw new Error("Failed to analyze performance");
        }
    }

    // Feature 4: AI Tutor Chat
    async chat(message, history, studentLevel) {
        let systemPrompt = "You are a helpful AI tutor.";
        if (studentLevel === 'Low') systemPrompt += " Explain things simply with many examples.";
        if (studentLevel === 'High') systemPrompt += " Be concise and challenge the student with advanced concepts.";

        // Format history for context (simplified)
        const historyContext = history.map(h => `${h.role}: ${h.content}`).join('\n');

        const prompt = `History:\n${historyContext}\n\nStudent: ${message}`;

        return await this.callLLM(prompt, systemPrompt);
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

    // Feature 6: Quiz Generator
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
            const res = await this.callLLM(prompt, "You are a quiz generator. Return ONLY valid JSON.", true);
            return JSON.parse(res);
        } catch (e) {
            throw new Error("Failed to generate quiz");
        }
    }
}

module.exports = new AIService();
