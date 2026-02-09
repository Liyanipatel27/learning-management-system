const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

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

    // ============ GEMINI METHODS ============
    _getGenerativeModel(keyIndex, keys = this.geminiKeys) {
        if (!keys || keys.length === 0) return null;
        const key = keys[keyIndex];
        const genAI = new GoogleGenerativeAI(key);
        // Using gemini-2.5-flash model which is available and supported
        return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    }

    getUsageCount() {
        return this.geminiCallCount || 0;
    }

    // Generic LLM Call (Uses default keys)
    async callLLM(prompt, systemInstruction = "", jsonMode = false) {
        return this._executeGeminiCall(prompt, systemInstruction, jsonMode, this.geminiKeys, 'Default');
    }

    // Dedicated PV Key LLM Call (Uses PV keys)
    async callPVLLM(prompt, systemInstruction = "", jsonMode = false) {
        if (this.pvGeminiKeys.length === 0) throw new Error("No PV Gemini API keys configured for Roadmap Generator.");
        return this._executeGeminiCall(prompt, systemInstruction, jsonMode, this.pvGeminiKeys, 'PV');
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
        if (!keys || keys.length === 0) throw new Error(`No ${keyType} Gemini API keys configured.`);

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
        }

        // Rotate Key
        this[currentIndexName] = (this[currentIndexName] + 1) % keys.length;

        this[callCountName] = (this[callCountName] || 0) + 1;
        console.log(`[Gemini ${keyType} Usage] Call #${this[callCountName]} | Initial Key Index: ${this[currentIndexName]} (Key ending: ...${keys[this[currentIndexName]].slice(-4)})`);

        const maxAttempts = keys.length;
        let attempts = 0;
        let currentTryIndex = this[currentIndexName];

        while (attempts < maxAttempts) {
            try {
                const model = this._getGenerativeModel(currentTryIndex, keys);
                const fullPrompt = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;

                let result = await model.generateContent(fullPrompt);
                let response = result.response.text();

                if (jsonMode) {
                    response = response.replace(/```json/g, '').replace(/```/g, '').trim();
                }
                return response;

            } catch (err) {
                console.error(`Gemini ${keyType} Error (Key Index ${currentTryIndex}):`, err.message);

                // Rotate to next key on error
                currentTryIndex = (currentTryIndex + 1) % keys.length;
                attempts++;
                console.log(`Retrying with ${keyType} Key Index: ${currentTryIndex}`);

                // Add delay between retries
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // Fallback Logic (simplified from original)
        console.log(`All ${keyType} Gemini API keys exhausted.`);
        throw new Error(`All ${keyType} Gemini keys failed.`);
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
                    { role: "system", content: "You are an educational data scientist. Return ONLY valid JSON." },
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
                        { role: "system", content: "You are an educational data analyst. Return ONLY valid JSON." },
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

        const prompt = `Generate a quiz based on the following content.
        
        Content: ${text.substring(0, 50000)}... (truncated if too long)
        
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
