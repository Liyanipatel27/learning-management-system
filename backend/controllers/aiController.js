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

// 3. Performance Analysis
exports.getPerformanceAnalysis = async (req, res) => {
    try {
        const { studentId } = req.params;

        const progressData = await Progress.find({ student: studentId }).populate('course');

        // Transform for AI consumption
        const analysisData = progressData.map(p => ({
            course: p.course.title,
            completedModules: p.completedModules.length,
            scores: p.completedModules.map(m => m.score)
        }));

        const analysis = await aiService.analyzePerformance(analysisData);
        res.json(analysis);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 4. Chat
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
