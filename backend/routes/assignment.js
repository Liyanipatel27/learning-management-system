const express = require('express');
const router = express.Router();
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const axios = require('axios');
const { deleteFile } = require('../utils/cloudinaryHelper');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { storage } = require('../config/cloudinary');

const upload = multer({ storage: storage });

// Single file upload endpoint for assignments
router.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    res.json({ url: req.file.path || req.file.secure_url });
});

// --- ASSIGNMENTS ---

// Create assignment (Teacher only)
router.post('/', async (req, res) => {
    try {
        const assignment = new Assignment(req.body);
        await assignment.save();
        res.status(201).json(assignment);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get all assignments for a course
router.get('/course/:courseId', async (req, res) => {
    try {
        const assignments = await Assignment.find({ course: req.params.courseId }).sort({ createdAt: -1 });
        res.json(assignments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get assignment by ID
router.get('/:id', async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
        res.json(assignment);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update assignment
router.put('/:id', async (req, res) => {
    try {
        const assignment = await Assignment.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(assignment);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete assignment
router.delete('/:id', async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

        // Delete file from Cloudinary (using newly created helper)
        if (assignment.type === 'file' && assignment.fileDetails && assignment.fileDetails.instructionFileUrl) {
            await deleteFile(assignment.fileDetails.instructionFileUrl);
        }

        await Assignment.findByIdAndDelete(req.params.id);
        // Also delete associated submissions
        await Submission.deleteMany({ assignment: req.params.id });
        res.json({ message: 'Assignment deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- SUBMISSIONS ---

// Submit an assignment (Student)
router.post('/submit', async (req, res) => {
    try {
        const { assignmentId, studentId, courseId, fileUrl, code, language } = req.body;

        // Check if already submitted
        const existing = await Submission.findOne({ assignment: assignmentId, student: studentId });
        if (existing) {
            // Update existing submission
            existing.fileUrl = fileUrl;
            existing.code = code;
            existing.language = language;
            existing.submittedAt = Date.now();
            await existing.save();
            return res.json(existing);
        }

        const submission = new Submission({
            assignment: assignmentId,
            student: studentId,
            course: courseId,
            fileUrl,
            code,
            language
        });
        await submission.save();
        res.status(201).json(submission);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get submission for a student for a specific assignment
router.get('/student/:studentId/assignment/:assignmentId', async (req, res) => {
    try {
        const submission = await Submission.findOne({
            student: req.params.studentId,
            assignment: req.params.assignmentId
        });
        res.json(submission);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all submissions for a student
router.get('/submissions/student/:studentId', async (req, res) => {
    try {
        const submissions = await Submission.find({ student: req.params.studentId });
        res.json(submissions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all submissions for an assignment (Teacher)
router.get('/assignment/:assignmentId', async (req, res) => {
    try {
        const submissions = await Submission.find({ assignment: req.params.assignmentId })
            .populate('student', 'name email enrollment branch')
            .sort({ submittedAt: -1 });
        res.json(submissions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Grade a submission (Teacher)
router.put('/grade/:submissionId', async (req, res) => {
    try {
        const { score, feedback } = req.body;
        const submission = await Submission.findByIdAndUpdate(
            req.params.submissionId,
            { score, feedback, status: 'Graded' },
            { new: true }
        );
        res.json(submission);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Execute code (Piston API proxy)
router.post('/execute', async (req, res) => {
    try {
        const { language, code, stdin } = req.body;

        // Map frontend language to Piston language keys
        const langMap = {
            'javascript': 'javascript',
            'python': 'python3',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c'
        };

        const pistonLang = langMap[language] || language;

        const response = await axios.post('https://emkc.org/api/v2/piston/execute', {
            language: pistonLang,
            version: '*', // Use latest available version
            files: [
                {
                    content: code
                }
            ],
            stdin: stdin || ''
        });

        res.json({
            output: response.data.run.output,
            stdout: response.data.run.stdout,
            stderr: response.data.run.stderr,
            code: response.data.run.code,
            signal: response.data.run.signal
        });
    } catch (err) {
        console.error('Code execution error:', err.response?.data || err.message);
        res.status(500).json({ message: 'Error executing code', error: err.message });
    }
});

module.exports = router;
