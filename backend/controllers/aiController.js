const aiService = require('../services/aiService');
const Course = require('../models/Course');
const Progress = require('../models/Progress');
const { extractTextFromUrl } = require('../utils/contentProcessor');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");
const fs = require('fs');
const crypto = require('crypto');
const User = require('../models/User');

// Initialize Gemini for Quiz Generation (using specific key if available, or fallback)
// Initialize Gemini
// Prioritize CV_GEMINI_API_KEYS or GEMINI_API_KEYS
const keys = (process.env.CV_GEMINI_API_KEYS || process.env.GEMINI_API_KEYS || '').split(',').map(k => k.trim()).filter(k => k);
// Use 3rd key if available, else 2nd, else 1st, else fallback to single env var
const activeKey = keys[2] || keys[1] || keys[0] || process.env.GEMINI_QUIZ_GENERATOR_KEY || process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(activeKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
const fileManager = new GoogleAIFileManager(activeKey);

// Helper to upload file to Gemini
async function uploadToGemini(path, mimeType) {
    const uploadResult = await fileManager.uploadFile(path, {
        mimeType,
        displayName: path,
    });
    const file = uploadResult.file;
    console.log(`Uploaded file ${file.displayName} as: ${file.name}`);
    return file;
}

// Helper to wait for file to be active
async function waitForFilesActive(files) {
    console.log("Waiting for file processing...");
    for (const name of files.map((file) => file.name)) {
        let file = await fileManager.getFile(name);
        while (file.state === "PROCESSING") {
            process.stdout.write(".");
            await new Promise((resolve) => setTimeout(resolve, 10_000));
            file = await fileManager.getFile(name);
        }
        if (file.state !== "ACTIVE") {
            throw Error(`File ${file.name} failed to process`);
        }
    }
    console.log("...all files ready\n");
}

// 1. Generate Summary
exports.getSummary = async (req, res) => {
    try {
        const { content, type, fileUrl } = req.body;
        // Functionality: If fileUrl is provided, use it as content
        const finalContent = fileUrl || content;

        if (!finalContent) return res.status(400).json({ message: "Content or File URL is required" });

        const summary = await aiService.generateSubjectSummary(finalContent, type || 'text');
        res.json({ summary });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 2. Generate Roadmap
exports.createRoadmap = async (req, res) => {
    try {
        const { courseIds, goal, dailyHours, weekendHours, startDate, targetDate } = req.body;

        // [MODIFIED] Fetch actual course details to give AI context
        const courses = await Course.find({ _id: { $in: courseIds } }).select('title subject modules');

        const subjectsList = courses.map(c => c.subject || c.title).join(', ');
        const goalContext = goal || `Master ${subjectsList}`;

        const studentData = {
            goal: goalContext,
            dailyHours: dailyHours || 2,
            weekendHours: weekendHours || 4,
            subjects: courses.map(c => ({
                title: c.title,
                subject: c.subject,
                moduleCount: c.modules ? c.modules.length : 0
            }))
        };

        const roadmapMarkdown = await aiService.generateRoadmap(studentData, targetDate, startDate);
        res.json({ roadmap: roadmapMarkdown });
    } catch (err) {
        console.error("Roadmap Error:", err);
        res.status(500).json({ message: err.message });
    }
};

// 3. Performance Analysis - Detailed with Grades
exports.getPerformanceAnalysis = async (req, res) => {
    try {
        const { studentId } = req.params;

        const progressData = await Progress.find({ student: studentId }).populate('course');

        // Transform for AI consumption - detailed grades data
        const analysisData = progressData.map(p => ({
            course: p.course.title,
            subject: p.course.subject,
            completedModules: p.completedModules.length,
            scores: p.completedModules.map(m => ({
                moduleId: m.moduleId,
                score: m.score,
                isFastTracked: m.isFastTracked,
                completedAt: m.completedAt
            })),
            averageScore: p.completedModules.length > 0
                ? (p.completedModules.reduce((sum, m) => sum + m.score, 0) / p.completedModules.length).toFixed(2)
                : 0
        }));

        const analysis = await aiService.analyzePerformance(analysisData);
        res.json({
            grades: analysisData,
            analysis: analysis
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 3b. Get Grades Only (for graphs)
exports.getGrades = async (req, res) => {
    try {
        const { studentId } = req.params;

        const progressData = await Progress.find({ student: studentId }).populate('course');

        // Transform for graphs - detailed grades data
        const gradesData = progressData.map(p => {
            const scores = p.completedModules.map(m => m.score);
            const averageScore = scores.length > 0
                ? (scores.reduce((sum, s) => sum + s, 0) / scores.length).toFixed(2)
                : 0;

            return {
                courseId: p.course._id,
                course: p.course.title,
                subject: p.course.subject,
                totalModules: p.completedModules.length,
                scores: p.completedModules.map(m => ({
                    moduleId: m.moduleId,
                    score: m.score,
                    isFastTracked: m.isFastTracked,
                    completedAt: m.completedAt
                })),
                averageScore: parseFloat(averageScore),
                highestScore: scores.length > 0 ? Math.max(...scores) : 0,
                lowestScore: scores.length > 0 ? Math.min(...scores) : 0
            };
        });

        res.json({ grades: gradesData });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 3c. Analyze Performance (new format for My Grades data)
exports.analyzePerformanceNew = async (req, res) => {
    try {
        const { studentId, performanceData } = req.body;
        console.log(`[Performance Analysis] Request received for studentId: ${studentId}`);

        if (!studentId) {
            console.warn('[Performance Analysis] Missing studentId in request body');
            return res.status(400).json({ message: "Student ID is required for performance analysis." });
        }

        // 1. Generate Hash of current performance data
        const dataString = JSON.stringify(performanceData);
        const currentHash = crypto.createHash('sha256').update(dataString).digest('hex');

        let analysis = null;

        // 2. Check User's Cached Analysis
        const user = await User.findById(studentId);
        if (user && user.performanceAnalysis && user.performanceAnalysis.hash === currentHash) {
            console.log(`[AI Cache] Returning cached analysis for student ${studentId}`);
            analysis = user.performanceAnalysis.data;
        } else {
            console.log(`[AI Cache] Miss or Stale for student ${studentId}. Generating new analysis...`);

            // 3. Generate New Analysis (Cache Miss)
            analysis = await aiService.analyzePerformance(performanceData);

            // 4. Update Cache
            if (user) {
                user.performanceAnalysis = {
                    hash: currentHash,
                    data: analysis,
                    lastAnalyzed: new Date()
                };
                await user.save();
                console.log(`[AI Cache] Saved new analysis for student ${studentId}`);
            }
        }

        // SANITIZATION (Safety Net for Frontend)
        const sanitizeArray = (arr) => {
            if (!Array.isArray(arr)) return [];
            return arr.map(item => {
                if (typeof item === 'string') return item;
                if (typeof item === 'object' && item !== null) {
                    return Object.values(item).join(': ');
                }
                return String(item);
            });
        };

        if (analysis) {
            analysis.strengths = sanitizeArray(analysis.strengths);
            analysis.weaknesses = sanitizeArray(analysis.weaknesses);
            analysis.improvementSuggestions = sanitizeArray(analysis.improvementSuggestions);
        }

        res.json(analysis);
    } catch (err) {
        console.error("Performance Analysis Error:", err);
        res.status(500).json({ message: err.message });
    }
};
exports.chatWithAI = async (req, res) => {
    try {
        const { message, history, studentLevel, fileUrl, context } = req.body;
        // Determine context source
        const contextData = fileUrl || context;

        // Use resolveDoubt if context is present, otherwise fallback to chat (which also calls resolveDoubt now but without context)
        // But better to call resolveDoubt directly to be explicit
        const response = await aiService.resolveDoubt(message, history || [], contextData, studentLevel || 'Average');
        res.json({ response });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 5. Generate Notes
exports.generateStudyNotes = async (req, res) => {
    try {
        const { topic, level } = req.body;
        const notes = await aiService.generateNotes(topic, level || 'Average');

        // In a real app, we might generate a PDF here using a library like PDFKit
        // For now, return text which frontend can convert to PDF
        res.json({ notes });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Helper to fetch and prepare context from the database
async function getCourseContext(courseId, moduleId) {
    if (!courseId || !moduleId) return "";
    try {
        const course = await Course.findById(courseId);
        if (!course) return "";

        let context = "";
        let contentUpdated = false;

        // Find specific module
        // We need to look through all chapters to find the module
        let foundModule = null;
        for (const chapter of course.chapters) {
            const module = chapter.modules.id(moduleId);
            if (module) {
                foundModule = module;
                break;
            }
        }

        if (foundModule) {
            for (const content of foundModule.contents) {
                // Prioritize PDF content for context if available
                context += `\nResource: ${content.title}\nDescription: ${content.description || 'N/A'}\nType: ${content.type}\n`;

                if (content.extractedText) {
                    context += `Content: ${content.extractedText.substring(0, 30000)}\n`;
                } else if (content.type === 'pdf' && content.url) {
                    // LAZY EXTRACTION LOGIC
                    console.log(`[AI] Extracting text for: ${content.title}`);
                    // Ensure the URL is absolute or accessible
                    // refined logic for relative URLs if stored locally vs cloudinary
                    const text = await extractTextFromUrl(content.url, 'application/pdf');

                    if (text) {
                        content.extractedText = text;
                        context += `Content: ${text.substring(0, 30000)}\n`;
                        contentUpdated = true;
                    }
                }
            }
        }

        if (contentUpdated) await course.save(); // Save extracted text for next time
        return context;
    } catch (error) {
        console.error("Context fetch error:", error);
        return "";
    }
}

exports.generateQuiz = async (req, res) => {
    try {
        const { topic, count = 5, courseId, moduleId } = req.body;

        // 1. Get Context
        let context = await getCourseContext(courseId, moduleId);

        // 2. Construct Prompt
        const prompt = `Create a quiz with ${count} multiple-choice questions (MCQs) based on the following context.
        Topic: "${topic}"
        Context: "${context ? context.substring(0, 50000) : "No specific context provided, generate based on topic."}"
       
        Return ONLY a JSON array of objects with this structure (no markdown, just raw JSON):
        [
            {
                "question": "Question text",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correctAnswer": 0, // Index (0-3)
                "explanation": "Brief explanation of the answer",
                "difficulty": "medium"
            }
        ]`;

        // 3. Call AI
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // 4. Clean and Parse
        text = text.replace(/```json|```/g, "").trim();
        // Sometimes AI adds extra text, try to find the array
        const firstBracket = text.indexOf('[');
        const lastBracket = text.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1) {
            text = text.substring(firstBracket, lastBracket + 1);
        }

        const quizData = JSON.parse(text);

        // Map to ensure compatibility with our frontend expected structure if needed
        // Our Course model expects 'correctAnswerIndex', User prompt says 'correctAnswer'
        // Let's standarize to what our model expects: 'correctAnswerIndex'
        const mappedQuizData = quizData.map(q => ({
            ...q,
            correctAnswerIndex: q.correctAnswer !== undefined ? q.correctAnswer : 0 // Handle both
        }));

        res.json({ success: true, data: mappedQuizData });
    } catch (error) {
        console.error("Quiz generation error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 6. Generate Quiz (Legacy/General)
exports.createQuiz = async (req, res) => {
    try {
        const { subject, topic, difficulty, content, fileUrl } = req.body;
        // Prioritize fileUrl if available
        const contextData = fileUrl || content;

        const quiz = await aiService.generateQuiz(subject, topic, difficulty || 'medium', contextData);
        res.json(quiz);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ============ TEACHER DASHBOARD CONTROLLERS ============

// 7. Assignment Feedback
exports.getAssignmentFeedback = async (req, res) => {
    try {
        const { question, answer, plagiarismScore } = req.body;
        if (!question || !answer) return res.status(400).json({ message: "Question and Answer are required." });

        const feedback = await aiService.generateAssignmentFeedback(question, answer, plagiarismScore || 0);
        res.json(feedback);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 8. Question Quality Analysis
exports.analyzeQuestionQuality = async (req, res) => {
    try {
        const { question, options, correctAnswer } = req.body;

        const analysis = await aiService.analyzeQuestionQuality(question, options, correctAnswer);
        res.json(analysis);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 9. Teacher Risk Prediction
exports.getTeacherRiskPrediction = async (req, res) => {
    try {
        const { studentId } = req.body;
        if (!studentId) return res.status(400).json({ message: "Student ID is required" });

        // Reuse logic to fetch student progress/performance
        const progressData = await Progress.find({ student: studentId }).populate('course');

        // Transform data for Risk Predictor
        const studentData = {
            totalCourses: progressData.length,
            completedModules: progressData.reduce((acc, curr) => acc + curr.completedModules.length, 0),
            averageScore: progressData.length > 0
                ? (progressData.reduce((acc, p) => acc + (p.completedModules.length ? (p.completedModules.reduce((sum, m) => sum + m.score, 0) / p.completedModules.length) : 0), 0) / progressData.length).toFixed(2)
                : 0,
            courses: progressData.map(p => ({
                title: p.course.title,
                progress: p.completedModules.length
            }))
        };

        const riskAnalysis = await aiService.predictStudentRisk(studentData);
        res.json(riskAnalysis);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 10. AI Class Insights
exports.generateClassInsights = async (req, res) => {
    try {
        const { teacherId } = req.body;
        if (!teacherId) return res.status(400).json({ message: "Teacher ID is required" });

        // 1. Fetch Teacher's Courses
        const courses = await Course.find({ teacher: teacherId });
        if (courses.length === 0) return res.json({ message: "No courses found for analysis." });

        // 2. Fetch Progress for all courses
        const courseIds = courses.map(c => c._id);
        const progressRecords = await Progress.find({ course: { $in: courseIds } }).populate('course');

        // 3. Aggregate Data
        const aggregatedData = courses.map(course => {
            const courseProgress = progressRecords.filter(p => p.course._id.toString() === course._id.toString());
            const totalStudents = courseProgress.length;

            if (totalStudents === 0) return null;

            const avgScore = courseProgress.reduce((acc, p) => {
                const pTotal = p.completedModules.reduce((sum, m) => sum + m.score, 0);
                return acc + (p.completedModules.length ? pTotal / p.completedModules.length : 0);
            }, 0) / totalStudents;

            return {
                courseName: course.title,
                studentCount: totalStudents,
                averageScore: avgScore.toFixed(1),
                moduleCompletionRate: (courseProgress.reduce((acc, p) => acc + p.completedModules.length, 0) / (totalStudents * (course.modules?.length || 1))).toFixed(2) * 100 + "%"
            };
        }).filter(Boolean);

        if (aggregatedData.length === 0) return res.json({ message: "Insufficient data for analysis." });

        // 4. Generate AI Report
        const insights = await aiService.generateClassInsights(aggregatedData);
        res.json(insights);

    } catch (err) {
        console.error("Class Insights Controller Error:", err);
        res.status(500).json({ message: err.message });
    }
};

// 11. Video Summary
exports.generateVideoSummary = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No video file uploaded." });
        }

        const videoPath = req.file.path;
        console.log("Processing video:", videoPath);

        // 1. Upload to Gemini
        const uploadResponse = await uploadToGemini(videoPath, req.file.mimetype);

        // 2. Wait for processing (Gemini needs time to process video)
        await waitForFilesActive([uploadResponse]);

        // 3. Generate Content
        const prompt = "Analyze this educational video and provide a comprehensive summary. Include key points, main concepts discussed, and a final conclusion. Return the result in JSON format with fields: 'summary', 'keyPoints' (array), and 'concepts' (array).";

        const result = await model.generateContent([
            {
                fileData: {
                    mimeType: uploadResponse.mimeType,
                    fileUri: uploadResponse.uri
                }
            },
            { text: prompt },
        ]);

        const response = await result.response;
        let text = response.text();

        // 4. Cleanup Logic
        // Clean up local file
        fs.unlinkSync(videoPath);
        // Delete from Gemini to save storage
        try {
            await fileManager.deleteFile(uploadResponse.name);
            console.log(`Deleted file ${uploadResponse.name} from Gemini`);
        } catch (e) {
            console.warn("Failed to delete file from Gemini:", e.message);
        }


        // 5. Parse JSON
        text = text.replace(/```json|```/g, "").trim();
        const firstBracket = text.indexOf('{');
        const lastBracket = text.lastIndexOf('}');
        if (firstBracket !== -1 && lastBracket !== -1) {
            text = text.substring(firstBracket, lastBracket + 1);
        }

        try {
            const data = JSON.parse(text);
            res.json(data);
        } catch (parseError) {
            console.error("JSON Parse Error:", parseError);
            // Fallback to raw text if JSON parsing fails
            res.json({ summary: text, keyPoints: [], concepts: [] });
        }

    } catch (err) {
        console.error("Video Summary Error:", err);
        // Clean up local file if error occurred and file exists
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: err.message });
    }
};
