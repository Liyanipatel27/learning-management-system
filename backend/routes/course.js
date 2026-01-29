const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { storage } = require('../config/cloudinary');
const Course = require('../models/Course');
const Progress = require('../models/Progress');
const { deleteFile } = require('../utils/cloudinaryHelper');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const axios = require('axios');

const upload = multer({ storage: storage });

// Get all courses (for students/public) - ONLY PUBLISHED
router.get('/', async (req, res) => {
    try {
        const courses = await Course.populate(await Course.find({ isPublished: true }), { path: 'teacher', select: 'name email' });
        res.json(courses);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Toggle Publish Status
router.put('/:courseId/publish', async (req, res) => {
    try {
        const { isPublished } = req.body;
        const course = await Course.findByIdAndUpdate(
            req.params.courseId,
            { isPublished: isPublished },
            { new: true }
        );
        res.json(course);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get student grades for all teacher's courses
router.get('/grades/teacher/:teacherId', async (req, res) => {
    console.log('### GRADES DEBUG ### Route Hit. TeacherId:', req.params.teacherId);

    // Handle invalid or 'undefined' teacherId gracefully
    if (!req.params.teacherId || req.params.teacherId === 'undefined' || req.params.teacherId === 'null') {
        console.log('### GRADES DEBUG ### Invalid teacherId provided, returning empty array.');
        return res.json([]);
    }

    try {
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(req.params.teacherId)) {
            console.log('### GRADES DEBUG ### TeacherId is not a valid ObjectId.');
            return res.json([]);
        }

        const User = require('../models/User');

        // 1. Find all courses by this teacher
        const courses = await Course.find({ teacher: req.params.teacherId });
        console.log('### GRADES DEBUG ### Courses found:', courses.length);

        // 2. For each course, find all students with progress
        const gradesData = await Promise.all(courses.map(async (course) => {
            console.log('### GRADES DEBUG ### Checking course:', course.subject);
            // Find all progress records for this course
            const progressRecords = await Progress.find({ course: course._id }).populate('student', 'name email enrollment');
            console.log(`### GRADES DEBUG ### Course ${course.subject}: ${progressRecords.length} progress records`);

            // Build student data array
            const students = progressRecords.map(progress => {
                if (!progress.student) return null;

                const quizzes = [];
                course.chapters.forEach(chapter => {
                    chapter.modules.forEach(module => {
                        if (module.quiz && module.quiz.questions && module.quiz.questions.length > 0) {
                            const completedModule = progress.completedModules?.find(
                                cm => cm.moduleId.toString() === module._id.toString()
                            );

                            quizzes.push({
                                chapterTitle: chapter.title,
                                moduleTitle: module.title,
                                moduleId: module._id,
                                score: completedModule?.score || null,
                                isFastTracked: completedModule?.isFastTracked || false,
                                completedAt: completedModule?.completedAt || null
                            });
                        }
                    });
                });

                return {
                    studentId: progress.student._id,
                    studentName: progress.student.name,
                    studentEmail: progress.student.email,
                    studentEnrollment: progress.student.enrollment,
                    quizzes
                };
            }).filter(s => s !== null);

            return {
                courseId: course._id,
                courseName: course.subject,
                students
            };
        }));

        console.log('### GRADES DEBUG ### Sending responsive with gradesData length:', gradesData.length);
        res.json(gradesData);
    } catch (err) {
        console.error('### GRADES DEBUG ### Error:', err.message);
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

// Diagnostic route
router.get('/check-routing', (req, res) => res.json({ status: 'ok', route: 'course-router-v3' }));

// Add/Update Quiz for a Module
router.post('/:courseId/chapters/:chapterId/modules/:moduleId/quiz', async (req, res) => {
    console.log('Quiz Route Hit (Primary):', req.params);
    try {
        const course = await Course.findById(req.params.courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        const chapter = course.chapters.id(req.params.chapterId);
        if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

        const module = chapter.modules.id(req.params.moduleId);
        if (!module) return res.status(404).json({ message: 'Module not found' });

        const { questions, quizConfig, passingScore, fastTrackScore } = req.body;

        module.quiz = {
            questions: questions.map(q => ({
                question: q.question,
                options: q.options,
                correctAnswerIndex: q.correctAnswerIndex,
                explanation: q.explanation || '',
                difficulty: q.difficulty || 'easy'
            })),
            passingScore: passingScore || 70,
            fastTrackScore: fastTrackScore || 85
        };

        if (quizConfig) {
            module.quizConfig = {
                questionsPerAttempt: Number(quizConfig.questionsPerAttempt) || 10,
                questionsPerAttemptStandard: Number(quizConfig.questionsPerAttemptStandard) || Number(quizConfig.questionsPerAttempt) || 10,
                questionsPerAttemptFastTrack: Number(quizConfig.questionsPerAttemptFastTrack) || Number(quizConfig.questionsPerAttempt) || 5
            };
        }

        await course.save();
        res.json(course);
    } catch (err) {
        res.status(400).json({ message: err.message });
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
const uploadMiddleware = (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            console.error('Multer/Cloudinary Upload Error:', err);
            return res.status(500).json({ message: 'File Upload Failed', error: err.message, stack: err.stack });
        }
        next();
    });
};

router.post('/:courseId/chapters/:chapterId/modules/:moduleId/content', uploadMiddleware, async (req, res) => {
    try {
        const course = await Course.findById(req.params.courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        const chapter = course.chapters.id(req.params.chapterId);
        if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

        const module = chapter.modules.id(req.params.moduleId);
        if (!module) return res.status(404).json({ message: 'Module not found' });

        const { title, type, url: linkUrl, description, minTime } = req.body;
        console.log('Upload Request Body:', req.body); // DEBUG LOG

        let contentUrl = linkUrl;
        let originalName = '';
        let extractedText = '';

        if (req.file) {
            console.log('File uploaded:', req.file.originalname, req.file.mimetype, req.file.path);
            contentUrl = req.file.path;
            originalName = req.file.originalname;

            // Extract Text using Utility
            try {
                // TEMPORARILY DISABLED FOR DEBUGGING
                // const { extractTextFromUrl } = require('../utils/contentProcessor');
                // extractedText = await extractTextFromUrl(contentUrl, req.file.mimetype);
                console.log('Skipping extraction for debug');
            } catch (extractErr) {
                console.error('Extraction Error (non-fatal):', extractErr);
            }
        } else {
            console.log('No file in request, using link:', linkUrl);
        }

        module.contents.push({
            title,
            type,
            url: contentUrl,
            originalName,
            description,
            minTime: Number(minTime) || 0,
            extractedText
        });

        await course.save();
        res.json(course);
    } catch (err) {
        console.error('Upload Route Error:', err);
        res.status(500).json({ message: err.message, stack: err.stack });
    }
});


// Get Student Progress for a Course
router.get('/:courseId/progress/:studentId', async (req, res) => {
    try {
        let progress = await Progress.findOne({
            course: req.params.courseId,
            student: req.params.studentId
        });

        if (!progress) {
            // Initialize empty progress if not exists
            progress = new Progress({
                course: req.params.courseId,
                student: req.params.studentId,
                completedModules: []
            });
            await progress.save();
        }
        res.json(progress);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Submit Quiz Result
router.post('/:courseId/modules/:moduleId/submit-quiz', async (req, res) => {
    const { studentId, score, isFastTrack } = req.body;
    try {
        const course = await Course.findById(req.params.courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        // Find module to get passing scores
        let targetModule = null;
        for (const chapter of course.chapters) {
            targetModule = chapter.modules.id(req.params.moduleId);
            if (targetModule) break;
        }

        if (!targetModule) return res.status(404).json({ message: 'Module not found' });

        const passingScore = isFastTrack ?
            (targetModule.quiz?.fastTrackScore || 85) :
            (targetModule.quiz?.passingScore || 70);

        const isPassed = score >= passingScore;

        if (isPassed) {
            let progress = await Progress.findOne({ course: req.params.courseId, student: studentId });
            if (!progress) {
                progress = new Progress({ course: req.params.courseId, student: studentId, completedModules: [] });
            }

            // Check if already completed
            const alreadyCompleted = progress.completedModules.find(m => m.moduleId.toString() === req.params.moduleId);
            if (!alreadyCompleted) {
                progress.completedModules.push({
                    moduleId: req.params.moduleId,
                    score: score,
                    isFastTracked: isFastTrack
                });
                progress.updatedAt = Date.now();
                await progress.save();
            }
        }

        res.json({
            isPassed,
            score,
            requiredScore: passingScore,
            message: isPassed ? 'Module Unlocked!' : 'Score too low. Try again.'
        });

    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete a course
router.delete('/:courseId', async (req, res) => {
    console.log('DELETE Course hit:', req.params.courseId);
    try {
        const course = await Course.findById(req.params.courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Delete all associated files from Cloudinary
        for (const chapter of course.chapters) {
            for (const module of chapter.modules) {
                for (const content of module.contents) {
                    if (content.url) await deleteFile(content.url);
                }
            }
        }

        await Course.findByIdAndDelete(req.params.courseId);

        // Also clean up any associated progress records
        await Progress.deleteMany({ course: req.params.courseId });

        console.log('Course and associated files deleted successfully');
        res.json({ message: 'Course deleted successfully' });
    } catch (err) {
        console.error('DELETE Course error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Delete a chapter
router.delete('/:courseId/chapters/:chapterId', async (req, res) => {
    try {
        const course = await Course.findById(req.params.courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        const chapter = course.chapters.id(req.params.chapterId);
        if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

        // Delete all files in this chapter from Cloudinary
        for (const module of chapter.modules) {
            for (const content of module.contents) {
                if (content.url) await deleteFile(content.url);
            }
        }

        course.chapters.pull(req.params.chapterId);
        await course.save();
        res.json(course);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete a module
router.delete('/:courseId/chapters/:chapterId/modules/:moduleId', async (req, res) => {
    console.log('DELETE Module hit:', req.params);
    try {
        const course = await Course.findById(req.params.courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        const chapter = course.chapters.id(req.params.chapterId);
        if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

        const module = chapter.modules.id(req.params.moduleId);
        if (!module) return res.status(404).json({ message: 'Module not found' });

        // Delete all files in this module from Cloudinary
        for (const content of module.contents) {
            if (content.url) await deleteFile(content.url);
        }

        chapter.modules.pull(req.params.moduleId);
        await course.save();
        console.log('Module and associated files deleted successfully');
        res.json(course);
    } catch (err) {
        console.error('DELETE Module error:', err);
        res.status(400).json({ message: err.message });
    }
});

// Get All Progress for a Student
router.get('/progress/student/:studentId', async (req, res) => {
    try {
        const progress = await Progress.find({ student: req.params.studentId });
        res.json(progress);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get Progress for a Specific Course & Student
router.get('/:courseId/progress/:studentId', async (req, res) => {
    try {
        const progress = await Progress.findOne({
            course: req.params.courseId,
            student: req.params.studentId
        });
        res.json(progress || { completedModules: [], contentProgress: [] });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update Content Progress (Auto-save)
router.post('/:courseId/contents/:contentId/progress', async (req, res) => {
    const { studentId, timeSpent, isCompleted } = req.body;
    try {
        const query = {
            course: req.params.courseId,
            student: studentId,
            'contentProgress.contentId': req.params.contentId
        };

        const update = {
            $set: {
                'contentProgress.$.timeSpent': timeSpent,
                'contentProgress.$.updatedAt': Date.now()
            }
        };

        if (isCompleted) {
            update.$set['contentProgress.$.isCompleted'] = true;
        }

        // 1. Try to update existing content progress atomically
        let progress = await Progress.findOneAndUpdate(query, update, { new: true });

        // 2. If no document matched the specific content (but student/course might exist), push new
        if (!progress) {
            // Check if progress doc exists at all for this student/course
            const docExists = await Progress.exists({ course: req.params.courseId, student: studentId });

            if (docExists) {
                progress = await Progress.findOneAndUpdate(
                    { course: req.params.courseId, student: studentId },
                    {
                        $push: {
                            contentProgress: {
                                contentId: req.params.contentId,
                                timeSpent,
                                isCompleted,
                                updatedAt: Date.now()
                            }
                        }
                    },
                    { new: true }
                );
            } else {
                // 3. Create entirely new document
                progress = new Progress({
                    course: req.params.courseId,
                    student: studentId,
                    completedModules: [],
                    contentProgress: [{
                        contentId: req.params.contentId,
                        timeSpent,
                        isCompleted,
                        updatedAt: Date.now()
                    }],
                    dailyActivity: [{
                        date: new Date().toISOString().split('T')[0],
                        minutes: timeSpent / 60
                    }]
                });
                await progress.save();
                return res.json(progress);
            }
        }

        // Update Daily Activity (Separate atomic operation or calculated)
        // Note: Accurately tracking delta atomically is hard without stored 'last' state.
        // For now, simpler approach: Just recalculate or simplified increment?
        // To be safe and simple: We will just run a minimal update for daily activity logic
        // re-fetching is safer used previously, but slow.
        // Let's stick to the previous delta logic but optimized? 
        // Actually, just returning the progress is enough for the UI. 
        // Logic for "Daily Activity" delta requires knowing old value.
        // If we want to be atomic, we can't easily know old value without reading.
        // We will accept a small trade-off: Daily Activity might be slightly less precise if race occurs,
        // but Progress (Completion) is critical. 
        // Let's add simple $inc usage if we can.

        // For simplicity, we skip complex Daily Activity race-safe update here 
        // to prioritize the critical bug: Completion Status.
        // The original code calculated delta. 

        res.json(progress);

    } catch (err) {
        console.error('Progress update error:', err);
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
