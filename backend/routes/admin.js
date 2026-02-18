const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Course = require('../models/Course');
const Progress = require('../models/Progress');
const Announcement = require('../models/Announcement');
const Class = require('../models/Class');
const { normalizeBranch } = require('../utils/branchHelpers');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Middleware to protect all admin routes
router.use(verifyToken, isAdmin);

// 1. DASHBOARD STATS
router.get('/stats', async (req, res) => {
    try {
        const totalStudents = await User.countDocuments({ role: 'student' });
        const totalTeachers = await User.countDocuments({ role: 'teacher' });
        const totalCourses = await Course.countDocuments({ isPublished: true });
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

const bcrypt = require('bcryptjs');

// Update user (Role, Ban/Active status, Password)
router.put('/users/:id', async (req, res) => {
    console.log(`[DEBUG] Updating user ${req.params.id}`, req.body);
    try {
        const { role, name, email, enrollment, branch, employeeId, password } = req.body;

        let updateData = { role, name, email, enrollment, branch, employeeId };

        // If password is provided and not empty, hash it and add to updateData
        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        // If branch is being updated, we must update enrolledClass
        if (role === 'student' && branch) {
            const normalizedBranch = normalizeBranch(branch);
            let studentClass = await Class.findOne({ name: normalizedBranch });
            if (!studentClass) {
                studentClass = new Class({ name: normalizedBranch, type: 'Branch' });
                await studentClass.save();
            }
            updateData.enrolledClass = studentClass._id;
            updateData.branch = branch; // Keep original if needed, or normalized? Usually keep original input but link to normalized class
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).select('-password');

        if (!updatedUser) {
            console.log(`[DEBUG] User ${req.params.id} not found`);
            return res.status(404).json({ message: 'User not found' });
        }

        console.log(`[DEBUG] User ${req.params.id} updated successfully`);
        res.json(updatedUser);
    } catch (err) {
        console.error(`[DEBUG] Error updating user ${req.params.id}:`, err);
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

// 5. ANNOUNCEMENTS routes moved to announcement.js

// 6. ACCOUNT REQUEST MANAGEMENT

// Email Transporter (Reuse from auth.js or create new)
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const AccountRequest = require('../models/AccountRequest');

// Get all pending requests
router.get('/account-requests', async (req, res) => {
    try {
        const requests = await AccountRequest.find({ status: 'Pending' }).sort({ createdAt: -1 });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update Request Details
router.put('/account-requests/:id', async (req, res) => {
    try {
        const { email, password } = req.body; // We can update email. Password isn't stored in request, but good to know if we want to. 
        // Actually, AccountRequest model doesn't store password. We only use it during approval.
        // So we only update fields that exist in AccountRequest model.

        const request = await AccountRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ message: 'Request not found' });

        if (email) request.email = email;
        // If we want to persist other fields like name, we can add them here.
        // request.name = req.body.name; 

        await request.save();
        res.json({ message: 'Request updated successfully', request });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Approve Request
router.post('/approve-request/:id', async (req, res) => {
    try {
        const request = await AccountRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ message: 'Request not found' });

        if (request.status !== 'Pending') return res.status(400).json({ message: 'Request already processed' });

        // Generate Credentials
        const { email, password: providedPassword } = req.body;

        const createUsername = (name) => {
            const cleanName = name.toLowerCase().replace(/\s+/g, '');
            const year = new Date().getFullYear();
            return `${cleanName}.${request.role}.${year}`;
        };

        const generatePassword = () => {
            const length = 10;
            const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
            let retVal = "";
            for (let i = 0, n = charset.length; i < length; ++i) {
                retVal += charset.charAt(Math.floor(Math.random() * n));
            }
            return retVal;
        };

        const username = createUsername(request.name);
        const finalEmail = email || request.email;
        const password = providedPassword || generatePassword();

        // Hash password
        const bcrypt = require('bcryptjs'); // Need to import this at top if not present, but locally ok here
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Determine Class for Student
        let classId;
        if (request.role === 'student' && request.course) { // utilizing 'course' field as 'branch' for students from request
            const normalizedBranch = normalizeBranch(request.course);
            let studentClass = await Class.findOne({ name: normalizedBranch });
            if (!studentClass) {
                studentClass = new Class({ name: normalizedBranch, type: 'Branch' });
                await studentClass.save();
            }
            classId = studentClass._id;
        }

        // Create User
        const newUser = new User({
            name: request.name,
            email: finalEmail,
            password: hashedPassword,
            role: request.role,
            enrollment: request.enrollment,
            branch: request.course, // Mapping course to branch
            employeeId: request.employeeId,
            enrolledClass: classId
            // Add other fields if necessary
        });

        await newUser.save();

        // Update Request Status
        request.status = 'Approved';
        await request.save();

        // Send Email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: finalEmail,
            subject: 'LMS Account Approved - Login Credentials',
            text: `Dear ${request.name},\n\nYour request for an LMS account has been approved.\n\nHere are your login credentials:\nEmail: ${finalEmail}\nPassword: ${password}\n\nPlease change your password after your first login.\n\nLogin here: http://localhost:5173/login\n\nBest regards,\nLMS Admin Team`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) console.log("Email error:", error);
            else console.log('Email sent: ' + info.response);
        });

        res.json({ message: 'Request approved and user created successfully.' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

// Reject Request
router.post('/reject-request/:id', async (req, res) => {
    try {
        const request = await AccountRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ message: 'Request not found' });

        request.status = 'Rejected';
        await request.save();

        // Optional: Send Rejection Email

        res.json({ message: 'Request rejected.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
