const express = require("express");
const axios = require("axios");

const router = express.Router();

router.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

<<<<<<< HEAD
// 1b. Video To Summary
router.post('/video-summary', aiController.generateVideoSummary);
=======
    const aiResponse = await axios.post(
      "http://127.0.0.1:8000/chat",
      { message: userMessage }
    );
>>>>>>> 67e39a27764d3d219983805c3dd39f96aeb6529f

    res.json({
      reply: aiResponse.data.reply
    });
  } catch (error) {
    res.status(500).json({ error: "AI service error" });
  }
});

module.exports = router;
