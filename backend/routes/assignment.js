const express = require('express');
const router = express.Router();
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const axios = require('axios');
const { deleteFile } = require('../utils/cloudinaryHelper');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { storage } = require('../config/cloudinary');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const https = require('https'); // To download file for parsing if needed, but pdf-parse can handle buffers.
// We need to fetch the file from the URL if it's a file upload.
// Since the file is uploaded to Cloudinary, we have a URL.
// We need to download it to a buffer to parse it.

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

// Get all assignments (or filter by query if needed)
router.get('/', async (req, res) => {
    try {
        const assignments = await Assignment.find().sort({ createdAt: -1 });
        res.json(assignments);
    } catch (err) {
        res.status(500).json({ message: err.message });
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

        // 1. Extract Text
        let extractedText = '';
        if (code) {
            extractedText = code;
        } else if (fileUrl && fileUrl.endsWith('.pdf')) {
            try {
                // Fetch PDF from URL
                const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
                const data = await pdfParse(response.data);
                extractedText = data.text;
            } catch (pdfErr) {
                console.error('Error extracting text from PDF:', pdfErr);
                // Continue without text extraction (plagiarism check will be skipped for this sub)
            }
        }

        // 2. Prepare Submission Data
        const submissionData = {
            assignment: assignmentId,
            student: studentId,
            course: courseId,
            fileUrl,
            code,
            language,
            extractedText,
            submittedAt: Date.now(),
            status: 'Pending'
        };

        // 3. Perform Plagiarism Check (if text exists)
        if (extractedText && extractedText.length > 50) { // Min length check
            try {
                // Fetch previous submissions for this assignment (excluding this student's previous attempts if any, but actually we compare with EVERYONE else)
                const previousSubmissions = await Submission.find({
                    assignment: assignmentId,
                    student: { $ne: studentId }, // Don't compare with self
                    extractedText: { $exists: true, $ne: '' }
                }).select('student extractedText turnedInAt');

                if (previousSubmissions.length > 0) {
                    const corpus = previousSubmissions.map(sub => ({
                        id: sub.student.toString(),
                        submissionId: sub._id.toString(),
                        text: sub.extractedText
                    }));

                    // Call AI Service
                    const aiResponse = await axios.post('http://127.0.0.1:8001/plagiarism/check', {
                        target_text: extractedText,
                        corpus: corpus
                    });

                    if (aiResponse.data) {
                        submissionData.plagiarismResult = {
                            similarityPercentage: aiResponse.data.highest_similarity,
                            riskLevel: aiResponse.data.risk_level,
                            matchedWith: aiResponse.data.matches, // Expecting array of { studentId, similarity }
                            isAiVerified: aiResponse.data.is_ai_verified,
                            checkedAt: new Date()
                        };
                    }
                }
            } catch (aiErr) {
                console.error('Plagiarism check failed:', aiErr.message);
                // Fail silently, don't block submission
            }
        }

        // 4. Save/Update Submission
        let submission = await Submission.findOne({ assignment: assignmentId, student: studentId });
        if (submission) {
            // Update existing
            Object.assign(submission, submissionData);
            await submission.save();
        } else {
            // Create new
            submission = new Submission(submissionData);
            await submission.save();
        }

        res.status(201).json(submission);
    } catch (err) {
        console.error("Submission error:", err);
        res.status(400).json({ message: err.message });
    }
});

// Request Re-write (Teacher)
router.put('/request-rewrite/:submissionId', async (req, res) => {
    try {
        const { feedback } = req.body;
        const submission = await Submission.findByIdAndUpdate(
            req.params.submissionId,
            {
                status: 'Re-write',
                feedback: feedback || 'Please re-write this assignment due to high plagiarism detected.'
            },
            { new: true }
        );
        res.json(submission);
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

// Execute code against multiple test cases
router.post('/execute-tests', async (req, res) => {
    try {
        const { language, code, testCases } = req.body;

        const langMap = {
            'javascript': 'javascript',
            'python': 'python3',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c'
        };

        const pistonLang = langMap[language] || language;

        const runTestCase = async (testCase) => {
            try {
                const response = await axios.post('https://emkc.org/api/v2/piston/execute', {
                    language: pistonLang,
                    version: '*',
                    files: [{ content: code }],
                    stdin: (testCase.input || '') + '\n' // Append newline to ensure readLine() doesn't hang
                });

                const rawOutput = response.data.run.stdout || '';
                const actual = rawOutput.trim();
                const expected = (testCase.output || '').trim();

                // Allow some flexibility (e.g., trailing newlines handled by trim)
                // Also handle simple number comparisons if strings match
                const passed = actual === expected;

                return {
                    input: testCase.input,
                    expectedOutput: testCase.output,
                    actualOutput: rawOutput, // Keep raw formatting for display
                    passed,
                    error: response.data.run.stderr
                };
            } catch (e) {
                return {
                    input: testCase.input,
                    expectedOutput: testCase.output,
                    actualOutput: '',
                    passed: false,
                    error: e.message
                };
            }
        };

        // Run all test cases sequentially to avoid 429 Rate Limits
        const results = [];
        for (const testCase of testCases) {
            const result = await runTestCase(testCase);
            results.push(result);
            // Optional: small delay to be safe
            await new Promise(r => setTimeout(r, 500));
        }

        res.json({ results });

    } catch (err) {
        console.error('Test execution error:', err);
        res.status(500).json({ message: 'Error executing tests', error: err.message });
    }
});

module.exports = router;
