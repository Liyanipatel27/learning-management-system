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
        const { studentId, targetDate, startDate, dailyHours, subjects } = req.body; // [MODIFIED] Added startDate

        // Fetch current student performance/progress to personalize
        // (Simplified for now, just passing basic info)
        const studentData = {
            id: studentId,
            subjects: subjects || [],
            dailyHours: dailyHours || 2
        };

        const roadmap = await aiService.generateRoadmap(studentData, targetDate, startDate); // [MODIFIED] Pass startDate
        res.json(roadmap);
    } catch (err) {
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
