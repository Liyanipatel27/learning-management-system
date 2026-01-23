const { GoogleGenerativeAI } = require("@google/generative-ai");
const Course = require("../models/Course");

// Multi-Key Support for Load Balancing
const apiKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3
].filter(key => key && key.trim() !== ""); // Filter out undefined/empty keys

console.log(`[AI Controller] Loaded ${apiKeys.length} API Keys.`);

// Helper to get a random model instance
const getModel = () => {
    if (apiKeys.length === 0) throw new Error("No API Keys found in environment variables.");
    const randomKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];
    const genAI = new GoogleGenerativeAI(randomKey);
    return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
};

// Helper function with retry logic
const generateWithRetry = async (prompt, maxRetries = 3) => {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[AI Controller] Generate attempt ${attempt}/${maxRetries}`);
            const model = getModel();
            const result = await model.generateContent(prompt);
            return result;
        } catch (error) {
            console.error(`[AI Controller] Attempt ${attempt} failed:`, error.message);
            lastError = error;

            // Wait before retrying (exponential backoff)
            if (attempt < maxRetries) {
                const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
                console.log(`[AI Controller] Retrying in ${waitTime / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    throw lastError;
};

const { extractTextFromUrl } = require('../utils/contentProcessor');

// Helper: Fetch context from Course with Lazy Extraction
async function getCourseContext(courseId, moduleId) {
    if (!courseId || !moduleId) return "";

    try {
        const course = await Course.findById(courseId).select('+chapters.modules.contents.extractedText');
        if (!course) return "";

        let context = "";
        let contentUpdated = false;

        // Iterate to find the module and aggregate text
        for (const chapter of course.chapters) {
            const module = chapter.modules.id(moduleId);
            if (module) {
                // Use a standard for loop to support await inside
                for (const content of module.contents) {
                    // Always add metadata
                    context += `\nResource: ${content.title}\nDescription: ${content.description || 'N/A'}\nType: ${content.type}\n`;

                    if (content.extractedText) {
                        context += `Content: ${content.extractedText.substring(0, 50000)}\n`;
                    } else if (content.type === 'pdf' && content.url) {
                        // LAZY EXTRACTION: If text missing, extract now
                        console.log(`[AI Controller] Lazy extracting text for: ${content.title}`);
                        const text = await extractTextFromUrl(content.url, 'application/pdf');

                        if (text) {
                            content.extractedText = text;
                            context += `Content: ${text.substring(0, 50000)}\n`;
                            contentUpdated = true;
                        } else {
                            context += `(Content extraction failed, relying on description)\n`;
                        }
                    }
                }
                break;
            }
        }

        // Save if we performed any lazy extraction
        if (contentUpdated) {
            await course.save();
            console.log("[AI Controller] Saved lazy-extracted text to DB.");
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

        const result = await generateWithRetry(prompt);
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
        const { topic, context, count = 5, courseId, moduleId } = req.body;

        let inputContext = context || "";

        // If context missing but IDs provided, fetch from DB
        if (courseId && moduleId) {
            const dbContext = await getCourseContext(courseId, moduleId);
            if (dbContext) {
                inputContext += `\n\n--- Source Material from Course ---\n${dbContext}`;
            }
        }

        const prompt = `Create a quiz with ${count} MCQs based on the following context: "${inputContext.substring(0, 30000)}".
        The quiz should be about "${topic}".
        Return ONLY a JSON array of objects with this structure:
        [{ "question": "", "options": ["", "", "", ""], "correctAnswer": index, "explanation": "Detailed solution describe" }]`;

        const result = await generateWithRetry(prompt);
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

        const result = await generateWithRetry(prompt);
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
        const { goal, courseIds = [], revisionMode = false, dailyHours = 2, weekendHours = 4, courseProgressData = [], missedDays = 0 } = req.body;
        let context = "";
        let courseNames = [];

        if (courseIds && courseIds.length > 0) {
            const courses = await Course.find({ _id: { $in: courseIds } });

            let combinedSyllabus = "";
            courses.forEach(course => {
                courseNames.push(course.subject);

                // Find progress for this specific course
                const progress = courseProgressData.find(p => p.courseId === course._id.toString());
                const completedModules = progress ? progress.completedModules : [];

                const courseSyllabus = course.chapters.map(ch => {
                    const modules = ch.modules.map(m => {
                        const isCompleted = completedModules.includes(m._id.toString());
                        const status = isCompleted ? "[COMPLETED]" : "[PENDING]";
                        return `- Module: ${m.title} ${status}`;
                    }).join('\n');
                    return `Chapter: ${ch.title}\n${modules}`;
                }).join('\n\n');

                combinedSyllabus += `\n--- COURSE: ${course.subject} ---\n${courseSyllabus}\n`;
            });

            let modeInstruction = "";
            if (revisionMode) {
                modeInstruction = "The student is in REVISION MODE (Exam Preparation). Create a comprehensive roadmap that includes ALL modules from ALL selected subjects. Treat [COMPLETED] modules as quick refreshers and [PENDING] modules as primary learning targets.";
            } else {
                modeInstruction = "The student is in CATCH UP MODE. Focus PRIMARILY on [PENDING] modules across all subjects to help them complete their courses efficiently. Skip or minimize [COMPLETED] modules.";
            }

            if (missedDays > 0) {
                modeInstruction += `\nCRITICAL READJUSTMENT: The student has missed ${missedDays} full days of expected study. You MUST intensify the schedule for the remaining time. Increase the modules per day significantly to compensate for the lost ${missedDays} days while still respecting the daily/weekend hours. Mark these days as "INTENSIVE CATCH-UP PHASE".`;
            }

            context = `\nCONTEXT (MULTI-COURSE SYLLABUS):\n${combinedSyllabus}\n\nINSTRUCTION: ${modeInstruction} You must STRICTLY limit the roadmap to ONLY the modules and topics listed in the syllabi above. Distribute the available study hours fairly across these ${courses.length} subjects: ${courseNames.join(', ')}.`;
        }

        const now = new Date();
        const currentDate = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
        const currentYear = now.getFullYear();

        // Enhanced prompt with strict timeframe enforcement
        const prompt = `### SYSTEM INSTRUCTION ###
You are an ELITE ACADEMIC PLANNER. You are working in the real-time year of ${currentYear}.
CRITICAL: If you mention the year 2022, the plan is WRONG. You must use ${currentYear}.

### USER CONTEXT ###
TODAY'S DATE: ${currentDate}
STUDENT AVAILABILITY: ${dailyHours}h (Weekdays), ${weekendHours}h (Weekends)
USER'S STATED GOAL/EXAM DATE: "${goal}"

${context}

### TASK ###
1. **Timeframe Extraction**: Analyze the User Goal "${goal}". Look for any dates. 
   - NOTE: The student often uses the format **dd/mm/yy** (Day/Month/Year). 
   - Example: "2/2/26" means **February 2, ${currentYear}**.
   - Example: "22/1/26" means **January 22, ${currentYear}**.
2. **Day Calculation**: Calculate the EXACT number of days from TODAY (${currentDate}) until the target date mentioned in the goal. 
   - If the exam is on Feb 2, and today is Jan 22, that is a **11-day window**.
   - The roadmap MUST finish exactly on the day before the exam.
3. **Pacing**: Distribute ALL modules from the syllabus into these EXACT number of days.
   - If there are many modules and few days, provide a "Condensed Revision Plan" for each day.
   - Do NOT extend the roadmap beyond the exam date.

### OUTPUT RULES ###
- START the roadmap with "SCHEDULE OVERVIEW: [Target Date] | Total Days: [X] | Daily Hours: ${dailyHours}h".
- Use Day-wise headers (e.g., **Day 1: [Date]**, **Day 2: [Date]**). 
- STICK TO THE CALENDAR. Today is ${currentDate}.
- Format as clean Markdown.
- Ensure the LAST day of the roadmap is the day before the exam.`;

        const result = await generateWithRetry(prompt);
        const response = await result.response;
        res.json({ success: true, data: response.text() });
    } catch (error) {
        console.error("Roadmap generation error:", error);
        res.status(500).json({ success: false, message: error.message, details: error.toString() });
    }
};
