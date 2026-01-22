const express = require("express");
const router = express.Router();
const aiController = require("../controllers/aiController");
const { protect } = require("../middleware/authMiddleware");

// All AI routes protected by auth
router.post("/summarize", protect, aiController.summarizeContent);
router.post("/generate-quiz", protect, aiController.generateQuiz);
router.post("/solve-doubt", protect, aiController.solveDoubt);
router.post("/generate-roadmap", protect, aiController.generateRoadmap);

module.exports = router;
