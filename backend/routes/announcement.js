const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { verifyToken } = require('../middleware/authMiddleware');

// Get announcements for the current user's role
router.get('/', verifyToken, async (req, res) => {
    try {
        const userRole = req.user.role;

        // Fetch announcements targeted at 'all' OR the user's specific role
        const announcements = await Announcement.find({
            $or: [
                { target: 'all' },
                { target: userRole === 'student' ? 'students' : (userRole === 'teacher' ? 'teachers' : '') }
            ]
        })
            .populate('author', 'name')
            .sort({ createdAt: -1 });

        res.json(announcements);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Post Announcement (Both Admin AND Teacher can post)
router.post('/', verifyToken, async (req, res) => {
    try {
        const { title, content, target } = req.body;
        const userRole = req.user.role;

        if (userRole !== 'admin' && userRole !== 'teacher') {
            return res.status(403).json({ message: "Only Admins and Teachers can post announcements" });
        }

        const announcement = new Announcement({
            title,
            content,
            target: target || 'all',
            author: req.user.id || req.user._id
        });

        await announcement.save();

        // Return populated announcement
        const populatedAnn = await Announcement.findById(announcement._id).populate('author', 'name');
        res.status(201).json(populatedAnn);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete Announcement
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);
        if (!announcement) return res.status(404).json({ message: "Announcement not found" });

        // Only author or admin can delete
        if (announcement.author.toString() !== (req.user.id || req.user._id).toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Not authorized to delete this announcement" });
        }

        await Announcement.findByIdAndDelete(req.params.id);
        res.json({ message: 'Announcement deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
