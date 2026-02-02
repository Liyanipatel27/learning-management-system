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
        await LiveClass.findOneAndUpdate({ roomId }, { isActive: false });
        res.json({ message: "Class ended successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
