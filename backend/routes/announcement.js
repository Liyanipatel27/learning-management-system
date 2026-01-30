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
            target: { $in: ['all', userRole + 's'] } // Handling plural 'students' or 'teachers' 
        })
            .populate('author', 'name')
            .sort({ createdAt: -1 });

        // For now, the AdminDashboard uses target: 'all', 'students', 'teachers'
        // Let's adjust the query to match what's in models/Announcement.js target enum: ['all', 'students', 'teachers']

        const announcementsV2 = await Announcement.find({
            $or: [
                { target: 'all' },
                { target: userRole === 'student' ? 'students' : (userRole === 'teacher' ? 'teachers' : '') }
            ]
        })
            .populate('author', 'name')
            .sort({ createdAt: -1 });

        res.json(announcementsV2);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
