const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { storage } = require('../config/cloudinary');
const Course = require('../models/Course');
const Progress = require('../models/Progress');
const fs = require('fs');

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
                questionsPerAttemptFastTrack: Number(quizConfig.questionsPerAttemptFastTrack) || Number(quizConfig.questionsPerAttempt) || 10
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
router.post('/:courseId/chapters/:chapterId/modules/:moduleId/content', upload.single('file'), async (req, res) => {
    try {
        const course = await Course.findById(req.params.courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        const chapter = course.chapters.id(req.params.chapterId);
        if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

        const module = chapter.modules.id(req.params.moduleId);
        if (!module) return res.status(404).json({ message: 'Module not found' });

        const { title, type, url: linkUrl, description, minTime } = req.body;
        let contentUrl = linkUrl;
        let originalName = '';

        if (req.file) {
            contentUrl = req.file.path; // Cloudinary returns the full URL in .path
            originalName = req.file.originalname;
        }

        module.contents.push({
            title,
            type,
            url: contentUrl,
            originalName,
            description,
            minTime: Number(minTime) || 0
        });

        await course.save();
        res.json(course);
    } catch (err) {
        res.status(400).json({ message: err.message });
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
        const course = await Course.findByIdAndDelete(req.params.courseId);
        if (!course) {
            console.log('Course not found for deletion:', req.params.courseId);
            return res.status(404).json({ message: 'Course not found' });
        }

        // Also clean up any associated progress records (optional but good practice)
        await Progress.deleteMany({ course: req.params.courseId });

        console.log('Course deleted successfully');
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
        if (!course) {
            console.log('Course not found for module deletion');
            return res.status(404).json({ message: 'Course not found' });
        }

        const chapter = course.chapters.id(req.params.chapterId);
        if (!chapter) {
            console.log('Chapter not found for module deletion');
            return res.status(404).json({ message: 'Chapter not found' });
        }

        const module = chapter.modules.id(req.params.moduleId);
        if (!module) {
            console.log('Module not found for deletion');
            return res.status(404).json({ message: 'Module not found' });
        }

        chapter.modules.pull(req.params.moduleId);
        await course.save();
        console.log('Module deleted successfully');
        res.json(course);
    } catch (err) {
        console.error('DELETE Module error:', err);
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
