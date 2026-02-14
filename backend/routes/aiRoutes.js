const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const auth = require('../middleware/authMiddleware'); // Assuming you have auth middleware

// Protect this route so only logged-in users can use it
router.post('/summary', aiController.getPDFSummary);

// You might likely move the roadmap generation here too later, but for now keeping strictly to the requested task.

module.exports = router;
