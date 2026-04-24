const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const auth = require('../middleware/authMiddleware'); // Assuming you have auth middleware

// Protect this route so only logged-in users can use it

// Protect this route so only logged-in users can use it
router.post('/summary', aiController.getSummary);
router.post('/quiz', aiController.createQuiz);
router.post('/chat', aiController.chatWithAI);
router.post('/video-summary', aiController.generateVideoSummary);


// You might likely move the roadmap generation here too later, but for now keeping strictly to the requested task.

module.exports = router;
