const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Course = require('../models/Course');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Get all courses (for students/public)
router.get('/', async (req, res) => {
    try {
        const courses = await Course.populate(await Course.find(), { path: 'teacher', select: 'name email' });
        res.json(courses);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get courses by teacher
router.get('/teacher/:teacherId', async (req, res) => {
    try {
        const courses = await Course.find({ teacher: req.params.teacherId });
        res.json(courses);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new course
// Create or Find a course (Subject based)
router.post('/create', async (req, res) => {
    const { subject, teacherId } = req.body; // Removed title, description
    try {
        // Check if course with this subject exists for this teacher
        let course = await Course.findOne({ subject: subject, teacher: teacherId });

        if (course) {
            return res.status(200).json(course); // Return existing course
        }

        // Create new if not exists
        const newCourse = new Course({
            title: subject, // specific requirement: use subject as title/main identifier
            subject: subject,
            description: '', // removed as per requirement
            teacher: teacherId
        });
        const savedCourse = await newCourse.save();
        res.status(201).json(savedCourse);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Add Chapter
router.post('/:courseId/chapters', async (req, res) => {
    try {
        const course = await Course.findById(req.params.courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        course.chapters.push({ title: req.body.title, modules: [] });
        await course.save();
        res.json(course);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Add Module
router.post('/:courseId/chapters/:chapterId/modules', async (req, res) => {
    try {
        const course = await Course.findById(req.params.courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        const chapter = course.chapters.id(req.params.chapterId);
        if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

        chapter.modules.push({ title: req.body.title, contents: [] });
        await course.save();
        res.json(course);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Upload Content
router.post('/:courseId/chapters/:chapterId/modules/:moduleId/content', upload.single('file'), async (req, res) => {
    try {
        const course = await Course.findById(req.params.courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        const chapter = course.chapters.id(req.params.chapterId);
        if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

        const module = chapter.modules.id(req.params.moduleId);
        if (!module) return res.status(404).json({ message: 'Module not found' });

        const { title, type, url: linkUrl, description } = req.body;
        let contentUrl = linkUrl;
        let originalName = '';

        if (req.file) {
            contentUrl = '/uploads/' + req.file.filename;
            originalName = req.file.originalname;
        }

        module.contents.push({
            title,
            type,
            url: contentUrl,
            originalName,
            description
        });

        await course.save();
        res.json(course);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
