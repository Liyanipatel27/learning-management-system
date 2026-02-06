const aiService = require('../services/aiService');
const Course = require('../models/Course');
const Progress = require('../models/Progress');

// 1. Generate Summary
exports.getSummary = async (req, res) => {
    try {
        const { content, type } = req.body;
        if (!content) return res.status(400).json({ message: "Content is required" });

        const summary = await aiService.generateSubjectSummary(content, type || 'text');
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

        // Analyze the performance data with AI
        const analysis = await aiService.analyzePerformance(performanceData);
        res.json(analysis);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.chatWithAI = async (req, res) => {
    try {
        const { message, history, studentLevel } = req.body;
        const response = await aiService.chat(message, history || [], studentLevel || 'Average');
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

// 6. Generate Quiz
exports.createQuiz = async (req, res) => {
    try {
        const { subject, topic, difficulty } = req.body;
        const quiz = await aiService.generateQuiz(subject, topic, difficulty || 'medium');
        res.json(quiz);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ============ TEACHER DASHBOARD CONTROLLERS ============

// 7. Assignment Feedback
exports.getAssignmentFeedback = async (req, res) => {
    try {
        const { question, answer } = req.body;
        if (!question || !answer) return res.status(400).json({ message: "Question and Answer are required." });

        const feedback = await aiService.generateAssignmentFeedback(question, answer);
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
