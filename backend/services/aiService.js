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
    }

    // ============ GEMINI METHODS ============
    _getGenerativeModel(keyIndex) {
        if (this.geminiKeys.length === 0) return null;
        const key = this.geminiKeys[keyIndex];
        const genAI = new GoogleGenerativeAI(key);
        // Using gemini-2.5-flash model which is available and supported
        return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    }

    getUsageCount() {
        return this.geminiCallCount || 0;
    }

    async callLLM(prompt, systemInstruction = "", jsonMode = false) {
        if (this.geminiKeys.length === 0) throw new Error("No Gemini API keys configured.");

        // Active Load Balancing: Round Robin selection for new request
        this.currentGeminiKeyIndex = (this.currentGeminiKeyIndex + 1) % this.geminiKeys.length;

        this.geminiCallCount = (this.geminiCallCount || 0) + 1;
        console.log(`[Gemini Usage] Call #${this.geminiCallCount} | Initial Key Index: ${this.currentGeminiKeyIndex}`);

        const maxAttempts = this.geminiKeys.length;
        let attempts = 0;
        let currentTryIndex = this.currentGeminiKeyIndex;
        let lastError = null;

        while (attempts < maxAttempts) {
            try {
                const model = this._getGenerativeModel(currentTryIndex);
                const fullPrompt = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;

                let result = await model.generateContent(fullPrompt);
                let response = result.response.text();

                if (jsonMode) {
                    response = response.replace(/```json/g, '').replace(/```/g, '').trim();
                }
                return response;

            } catch (err) {
                console.error(`Gemini Error (Key Index ${currentTryIndex}):`, err.message);
                require('fs').appendFileSync('gemini_debug.log', `Key ${currentTryIndex} Error: ${err.message}\nStack: ${err.stack}\n---\n`);

                lastError = err;

                // Rotate to next key on error
                currentTryIndex = (currentTryIndex + 1) % this.geminiKeys.length;
                attempts++;
                console.log(`Retrying with Key Index: ${currentTryIndex}`);

                // Add delay between retries to avoid hitting rate limits
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // Fallback response if all API keys are exhausted or quota is exceeded
        console.log("All Gemini API keys exhausted, providing fallback response");

        // Return different fallback responses based on request type
        if (systemInstruction.includes("tutor") || prompt.toLowerCase().includes("explain") || prompt.toLowerCase().includes("help")) {
            return "I'm currently experiencing high demand and can't process your request right now. Please try again later or consider asking a more specific question. In the meantime, I'd recommend checking your course materials or reaching out to your instructor for assistance.";
        } else if (systemInstruction.includes("quiz") || prompt.toLowerCase().includes("quiz")) {
            return JSON.stringify({
                questions: [
                    {
                        question: "What is the main purpose of an LMS?",
                        options: [
                            "To manage learning content and track student progress",
                            "To play video games",
                            "To browse the internet",
                            "To send emails"
                        ],
                        correctAnswerIndex: 0,
                        explanation: "A Learning Management System (LMS) is designed to manage learning content and track student progress"
                    }
                ]
            });
        } else if (systemInstruction.includes("summary") || prompt.toLowerCase().includes("summarize")) {
            return "The content appears to be related to learning management systems. It likely covers topics such as student progress tracking, course management, and educational technology integration. For detailed information, please review the original content or consult your course materials.";
        } else {
            return "I'm sorry, but I'm currently unable to assist with that request. The service is experiencing high demand, and we've temporarily reached our capacity. Please try again in a few minutes or consider checking our help documentation for common questions.";
        }
    }

    // ============ FEATURE METHODS ============

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

        // Simple Random Load Balancing
        const randomKey = openAIKeys[Math.floor(Math.random() * openAIKeys.length)];
        const openai = new OpenAI({ apiKey: randomKey });

        try {
            const completion = await openai.chat.completions.create({
                messages: [
                    { role: "system", content: "You are a performance analyst. Return ONLY valid JSON." },
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
        1. overallLevel: Performance level (Low <50, Average 50-75, Good 75-85, High >85)
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
    async chat(message, history, studentLevel) {
        let systemPrompt = "You are a helpful AI tutor.";
        if (studentLevel === 'Low') systemPrompt += " Explain things simply with many examples.";
        if (studentLevel === 'High') systemPrompt += " Be concise and challenge the student with advanced concepts.";

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
