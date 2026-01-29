const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Course = require('../models/Course');
const Progress = require('../models/Progress');
const Announcement = require('../models/Announcement');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Middleware to protect all admin routes
router.use(verifyToken, isAdmin);

// 1. DASHBOARD STATS
router.get('/stats', async (req, res) => {
    try {
        const totalStudents = await User.countDocuments({ role: 'student' });
        const totalTeachers = await User.countDocuments({ role: 'teacher' });
        const totalCourses = await Course.countDocuments();
        // Calculate total enrollments (sum of enrollees in all courses)
        const courses = await Course.find().select('enrolledStudents');
        const totalEnrollments = courses.reduce((acc, course) => acc + (course.enrolledStudents ? course.enrolledStudents.length : 0), 0);

        res.json({
            totalStudents,
            totalTeachers,
            totalCourses,
            totalEnrollments
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 2. USER MANAGEMENT
// Get all users
router.get('/users', async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update user (Role, Ban/Active status)
// Note: You might need to add a 'status' field to User model if not exists. 
// For now, we assume deleting or just changing role, but let's allow updating generic fields
router.put('/users/:id', async (req, res) => {
    try {
        const { role, name, email } = req.body;
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { role, name, email },
            { new: true }
        ).select('-password');
        res.json(updatedUser);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete User (Ban)
router.delete('/users/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 3. COURSE MANAGEMENT
// Get all courses with teacher info
router.get('/courses', async (req, res) => {
    try {
        const courses = await Course.find({ isPublished: true }).populate('teacher', 'name email');
        res.json(courses);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Toggle Publish Status
router.put('/courses/:id/publish', async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        course.isPublished = !course.isPublished;
        await course.save();

        res.json({ message: `Course ${course.isPublished ? 'published' : 'unpublished'} successfully`, isPublished: course.isPublished });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 4. REPORTS
// Student Progress Report
router.get('/reports/student-progress', async (req, res) => {
    console.log('[DEBUG] Student Progress Report: Using NEW Logic (Total Enrolled = Published Courses)');
    try {
        const students = await User.find({ role: 'student' }).select('name email enrollment');

        // Fetch all published courses once to use as the standard for "Total Active Courses"
        const publishedCourses = await Course.find({ isPublished: true }).select('title chapters isPublished');

        const report = await Promise.all(students.map(async (student) => {
            // Fetch progress for this student to check completion status
            const progressRecords = await Progress.find({ student: student._id });

            let completedCoursesCount = 0;
            const totalEnrolled = publishedCourses.length; // Assuming students see all published courses

            publishedCourses.forEach(course => {
                // Find progress record for this specific course
                const p = progressRecords.find(pr => pr.course && pr.course.toString() === course._id.toString());

                // If no progress record, they clearly haven't completed it.
                if (!p) return;

                // --- Replicate Frontend Calculation Logic ---
                const chapters = course.chapters || [];

                // 1. Calculate Total Items (Content + Quizzes)
                let totalItems = 0;
                let completedItems = 0;

                chapters.forEach(ch => {
                    if (ch.modules) {
                        ch.modules.forEach(m => {
                            // Content items
                            if (m.contents) {
                                totalItems += m.contents.length;
                                m.contents.forEach(c => {
                                    if (p.contentProgress && p.contentProgress.some(cp => cp.contentId.toString() === c._id.toString() && cp.isCompleted)) {
                                        completedItems++;
                                    }
                                });
                            }

                            // Quiz items
                            if (m.quiz && m.quiz.questions && m.quiz.questions.length > 0) {
                                totalItems++;
                                if (p.completedModules && p.completedModules.some(cm => cm.moduleId.toString() === m._id.toString())) {
                                    completedItems++;
                                }
                            }
                        });
                    }
                });

                // If user finished all items, count it as completed
                if (totalItems > 0 && completedItems >= totalItems) {
                    completedCoursesCount++;
                }
            });

            const percentage = totalEnrolled > 0 ? Math.round((completedCoursesCount / totalEnrolled) * 100) : 0;

            return {
                id: student._id,
                name: student.name,
                enrollment: student.enrollment,
                completedCourses: completedCoursesCount,
                totalCourses: totalEnrolled,
                percentage: percentage
            };
        }));

        res.json(report);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Teacher Portfolio
router.get('/reports/teachers', async (req, res) => {
    try {
        const teachers = await User.find({ role: 'teacher' }).select('name email employeeId');

        const report = await Promise.all(teachers.map(async (teacher) => {
            const courses = await Course.find({ teacher: teacher._id, isPublished: true }).select('title price category');
            return {
                id: teacher._id,
                name: teacher.name,
                employeeId: teacher.employeeId,
                email: teacher.email,
                courses: courses
            };
        }));

        res.json(report);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 5. ANNOUNCEMENTS
// Post Announcement
router.post('/announcements', async (req, res) => {
    try {
        const { title, content, target } = req.body;
        const announcement = new Announcement({
            title,
            content,
            target,
            author: req.user.id || req.user._id
        });
        await announcement.save();
        res.status(201).json(announcement);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all announcements
router.get('/announcements', async (req, res) => {
    try {
        const announcements = await Announcement.find()
            .populate('author', 'name')
            .sort({ createdAt: -1 });
        res.json(announcements);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete Announcement
router.delete('/announcements/:id', async (req, res) => {
    try {
        await Announcement.findByIdAndDelete(req.params.id);
        res.json({ message: 'Announcement deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
