const { GoogleGenerativeAI } = require("@google/generative-ai");
const Course = require("../models/Course");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Helper: Fetch context from Course
async function getCourseContext(courseId, moduleId) {
    if (!courseId || !moduleId) return "";

    try {
        const course = await Course.findById(courseId).select('+chapters.modules.contents.extractedText');
        if (!course) return "";

        let context = "";

        // Iterate to find the module and aggregate text
        for (const chapter of course.chapters) {
            const module = chapter.modules.id(moduleId);
            if (module) {
                module.contents.forEach(content => {
                    if (content.extractedText) {
                        context += `\nResource: ${content.title}\nContent: ${content.extractedText}\n`;
                    }
                });
                break;
            }
        }
        return context;
    } catch (error) {
        console.error("Context fetch error:", error);
        return "";
    }
}

// 1. Summarize & Notes
exports.summarizeContent = async (req, res) => {
    try {
        const { text, type, courseId, moduleId } = req.body; // type: 'document' or 'video'

        let inputContent = text || "";

        // If courseId/moduleId provided, fetch DB context
        if (courseId && moduleId) {
            console.log(`Fetching context for Course: ${courseId}, Module: ${moduleId}`);
            const dbContext = await getCourseContext(courseId, moduleId);
            if (dbContext) {
                inputContent += `\n\n--- Source Material from Course ---\n${dbContext}`;
            }
        }

        if (!inputContent.trim()) {
            return res.status(400).json({ success: false, message: "No content to summarize" });
        }

        const prompt = `Analyze the following content and provide:
        1. A concise 3-sentence summary.
        2. A structured set of detailed study notes in bullet points.
        3. 3 key takeaways.
        
        Content: ${inputContent.substring(0, 30000)}`; // Basic truncation to prevent token overflow

        const result = await model.generateContent(prompt);
        const response = await result.response;
        res.json({ success: true, data: response.text() });
    } catch (error) {
        console.error("Summarize error:", error);
        if (error.response) {
            console.error("Error details:", JSON.stringify(error.response, null, 2));
        }
        res.status(500).json({ success: false, message: error.message, details: error.toString() });
    }
};

// 2. Quiz Generator
exports.generateQuiz = async (req, res) => {
    try {
        const { topic, context, count = 5 } = req.body;
        const prompt = `Create a quiz with ${count} MCQs based on the following context: "${context}".
        The quiz should be about "${topic}".
        Return ONLY a JSON array of objects with this structure:
        [{ "question": "", "options": ["", "", "", ""], "correctAnswer": index, "explanation": "Detailed solution describe" }]`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let quizData = response.text();
        // Clean markdown if AI returns it
        quizData = quizData.replace(/```json|```/g, "").trim();
        res.json({ success: true, data: JSON.parse(quizData) });
    } catch (error) {
        console.error("Quiz generation error:", error);
        res.status(500).json({ success: false, message: error.message, details: error.toString() });
    }
};

// 3. Doubt Solver
exports.solveDoubt = async (req, res) => {
    try {
        const { question, context, courseId, moduleId } = req.body;

        let learningContext = context || "";

        // If context missing but IDs provided, fetch from DB
        if (!learningContext && courseId && moduleId) {
            learningContext = await getCourseContext(courseId, moduleId);
        }

        const prompt = `Role: Helpful LMS Tutor.
        Context: ${learningContext.substring(0, 30000)}
        Student Question: ${question}
        Answer the question accurately based on the context. If the answer is not in the context, use your general knowledge but mention that it's additional info.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        res.json({ success: true, data: response.text() });
    } catch (error) {
        console.error("Doubt solve error:", error);
        res.status(500).json({ success: false, message: error.message, details: error.toString() });
    }
};

// 4. Learning Roadmap
exports.generateRoadmap = async (req, res) => {
    try {
        const { goal } = req.body;
        const prompt = `Create a detailed learning roadmap for: "${goal}".
        Provide a step-by-step path with milestones and approximate time for each step. 
        Format as a clean markdown list.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        res.json({ success: true, data: response.text() });
    } catch (error) {
        console.error("Roadmap generation error:", error);
        res.status(500).json({ success: false, message: error.message, details: error.toString() });
    }
};
