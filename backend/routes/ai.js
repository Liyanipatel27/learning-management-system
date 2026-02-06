const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// 1. Subject & Video Summary
router.post('/summary', aiController.getSummary);

// 2. Study Roadmap
router.post('/roadmap', aiController.createRoadmap);

// 3. Performance Analysis
router.get('/performance/:studentId', aiController.getPerformanceAnalysis);

// 3b. Get Grades for Graphs
router.get('/grades/:studentId', aiController.getGrades);

// 3c. Analyze Performance (new format)
router.post('/analyze-performance', aiController.analyzePerformanceNew);

// 4. AI Tutor Chat
router.post('/chat', aiController.chatWithAI);

// 5. Grade-Based Notes
router.post('/notes', aiController.generateStudyNotes);

// 6. Quiz Generator
router.post('/quiz', aiController.createQuiz);

// ============ TEACHER DASHBOARD ROUTES ============
router.post('/teacher/feedback', aiController.getAssignmentFeedback);
router.post('/teacher/question-analysis', aiController.analyzeQuestionQuality);
router.post('/teacher/risk-prediction', aiController.getTeacherRiskPrediction);
router.post('/teacher/class-insights', aiController.generateClassInsights);

module.exports = router;
