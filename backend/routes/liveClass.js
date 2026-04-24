const express = require('express');
const router = express.Router();
const LiveClass = require('../models/LiveClass');

// Get all active live classes
router.get('/active', async (req, res) => {
    try {
        const activeClasses = await LiveClass.find({ isActive: true }).populate('teacher', 'name');
        res.json(activeClasses);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new live class
router.post('/create', async (req, res) => {
    try {
        const { title, roomId, teacherId, teacherName } = req.body;

        // Deactivate any old classes by this teacher
        console.log(`[LIVE CLASS DEBUG] Creating/Restarting class for teacher ${teacherId}. Title: ${title}`);
        await LiveClass.updateMany({ teacher: teacherId }, { isActive: false });

        const newClass = new LiveClass({
            title,
            roomId,
            teacher: teacherId,
            teacherName,
            isActive: true
        });

        await newClass.save();
        res.status(201).json(newClass);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// End a live class
router.post('/end', async (req, res) => {
    try {
        const { roomId } = req.body;
        console.log(`[LIVE CLASS DEBUG] Ending class for room: ${roomId} at ${new Date().toISOString()}`);
        await LiveClass.findOneAndUpdate({ roomId }, { isActive: false });
        res.json({ message: "Class ended successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get current state of a live class
router.get('/state/:roomId', async (req, res) => {
    try {
        const { roomId } = req.params;
        const liveClass = await LiveClass.findOne({ roomId });
        if (!liveClass) return res.status(404).json({ message: "Class not found" });
        res.json({
            slides: liveClass.slides,
            currentSlideIndex: liveClass.currentSlideIndex,
            code: liveClass.code,
            language: liveClass.language
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update state of a live class (Teacher only)
router.post('/update/:roomId', async (req, res) => {
    try {
        const { roomId } = req.params;
        const { slides, currentSlideIndex, code, language } = req.body;

        const updateData = {};
        if (slides !== undefined) updateData.slides = slides;
        if (currentSlideIndex !== undefined) updateData.currentSlideIndex = currentSlideIndex;
        if (code !== undefined) updateData.code = code;
        if (language !== undefined) updateData.language = language;

        await LiveClass.findOneAndUpdate({ roomId }, updateData);
        res.json({ message: "State updated" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
