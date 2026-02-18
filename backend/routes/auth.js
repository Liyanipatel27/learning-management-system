const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const multer = require('multer');
const xlsx = require('xlsx');
const nodemailer = require('nodemailer');
const {
    forgotPassword,
    verifyOTP,
    resetPassword,
} = require("../controllers/authController");

// Multer setup
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_change_in_production'; // Best practice: put in .env

// Register Route
router.post('/register', async (req, res) => {
    try {
        console.log('[REGISTER DEBUG] Received body:', req.body);
        const { name, email, password, role, enrollment, branch, employeeId } = req.body;

        // Role-based mandatory fields validation
        if (role === 'student') {
            if (!enrollment) return res.status(400).json({ message: 'Enrollment Number is mandatory for students.' });
            if (!branch) return res.status(400).json({ message: 'Branch is mandatory for students.' });
        } else if (role === 'teacher' || role === 'admin') {
            if (!employeeId) return res.status(400).json({ message: 'Employee ID is mandatory for instructors and admins.' });
        }

        // Email validation: restrict to @gmail.com
        if (!email || !email.toLowerCase().endsWith('@gmail.com')) {
            return res.status(400).json({ message: 'Invalid email. Only @gmail.com addresses are allowed.' });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        console.log(`[REGISTER DEBUG] Hashing password for ${email}. Hash: ${hashedPassword}`);

        // Create new user
        const user = new User({
            name,
            email,
            password: hashedPassword,
            role,
            enrollment,
            branch,
            employeeId,
            plainPassword: password
        });

        console.log('[REGISTER DEBUG] Saving user with fields:', {
            name, email, role, enrollment, branch, employeeId
        });
        await user.save();
        console.log('[REGISTER DEBUG] User saved successfully:', user._id);

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Login Route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check password
        console.log(`[LOGIN DEBUG] Attempting login for: ${email}`);
        console.log(`[LOGIN DEBUG] Plain password received: ${password}`);
        console.log(`[LOGIN DEBUG] Stored hash in DB: ${user.password}`);

        const isMatch = await bcrypt.compare(password, user.password);
        console.log(`[LOGIN DEBUG] Password match result: ${isMatch}`);

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate Token
        const token = jwt.sign(
            { id: user._id, role: user.role },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        // Return user info and token
        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                enrollment: user.enrollment,
                branch: user.branch,
                employeeId: user.employeeId
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get all students
router.get('/students', async (req, res) => {
    console.log('[STUDENTS DEBUG] Fetching all students');
    try {
        const students = await User.find({ role: 'student' }).select('-password');
        console.log(`[STUDENTS DEBUG] Found ${students.length} students`);
        res.json(students);
    } catch (err) {
        console.error('[STUDENTS DEBUG] Error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get profile by ID
router.get('/profile/:id', async (req, res) => {
    console.log(`[PROFILE DEBUG] Fetching profile for ID: ${req.params.id}`);
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            console.log(`[PROFILE DEBUG] User not found for ID: ${req.params.id}`);
            return res.status(404).json({ message: 'User not found' });
        }
        console.log(`[PROFILE DEBUG] Successfully found user: ${user.name}`);
        console.log(`[PROFILE DEBUG] Full user data from DB:`, {
            name: user.name,
            role: user.role,
            enrollment: user.enrollment,
            branch: user.branch,
            employeeId: user.employeeId
        });
        res.json(user);
    } catch (err) {
        console.error(`[PROFILE DEBUG] Error for ID ${req.params.id}:`, err.message);
        res.status(500).json({ message: err.message });
    }
});

// Bulk Import Route
router.post('/bulk-import', upload.single('file'), async (req, res) => {
    try {
        const { role, commonPassword } = req.body;
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
        if (!commonPassword) return res.status(400).json({ message: 'Common password is required' });

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (data.length === 0) return res.status(400).json({ message: 'Excel sheet is empty' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(commonPassword, salt);

        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        for (const [index, row] of data.entries()) {
            try {
                const { name, email, enrollment, branch, employeeId } = row;

                // Validation
                if (!name || !email) {
                    throw new Error('Name and Email are required');
                }

                if (!email.toLowerCase().endsWith('@gmail.com')) {
                    throw new Error('Only @gmail.com addresses allowed');
                }

                if (role === 'student' && (!enrollment || !branch)) {
                    throw new Error('Enrollment and Branch required for students');
                }

                if (role === 'teacher' && !employeeId) {
                    throw new Error('Employee ID required for teachers');
                }

                const existingUser = await User.findOne({ email });
                if (existingUser) {
                    throw new Error('User already exists');
                }

                const user = new User({
                    name,
                    email,
                    password: hashedPassword,
                    role,
                    enrollment: role === 'student' ? enrollment : undefined,
                    branch: role === 'student' ? branch : (branch || undefined),
                    employeeId: role === 'teacher' ? employeeId : undefined,
                    plainPassword: commonPassword
                });

                await user.save();
                results.success++;
            } catch (err) {
                results.failed++;
                results.errors.push(`Row ${index + 2}: ${err.message}`);
            }
        }

        res.status(200).json({
            message: `Import completed. Success: ${results.success}, Failed: ${results.failed}`,
            results
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Route to get Sample Excel
router.get('/sample-excel/:role', (req, res) => {
    const { role } = req.params;
    let sampleData = [];

    if (role === 'student') {
        sampleData = [
            { name: 'John Doe', email: 'john@gmail.com', enrollment: 12345, branch: 'Computer' },
            { name: 'Jane Smith', email: 'jane@gmail.com', enrollment: 67890, branch: 'IT' }
        ];
    } else if (role === 'teacher') {
        sampleData = [
            { name: 'Prof. Miller', email: 'miller@gmail.com', employeeId: 901 },
            { name: 'Dr. Watson', email: 'watson@gmail.com', employeeId: 902 }
        ];
    } else {
        return res.status(400).json({ message: 'Invalid role' });
    }

    const worksheet = xlsx.utils.json_to_sheet(sampleData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Sample");

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=sample_${role}.xlsx`);
    res.send(buffer);
});

// --- FORGOT PASSWORD ROUTES ---
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

// --- ACCOUNT REQUEST ROUTE ---
const AccountRequest = require('../models/AccountRequest');
const aiServiceInstance = require('../services/aiService'); // IT EXPORTS AN INSTANCE

router.post('/request-account', async (req, res) => {
    try {
        const { name, email, role, course, qualification, enrollment, employeeId } = req.body;

        console.log('[ACCOUNT REQUEST] Received:', req.body);

        if (!name || !email || !role) {
            return res.status(400).json({ message: 'Name, Email, and Role are mandatory' });
        }

        if (role === 'student' && !enrollment) {
            return res.status(400).json({ message: 'Enrollment Number is required for Students' });
        }

        if (role === 'teacher' && !employeeId) {
            return res.status(400).json({ message: 'Employee ID is required for Teachers' });
        }

        // 2. Duplicate Check (User Table + Request Table)
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'Email already registered as a User.' });

        const existingRequest = await AccountRequest.findOne({ email, status: 'Pending' });
        if (existingRequest) return res.status(400).json({ message: 'A pending request already exists for this email.' });

        // 3. AI Verification
        console.log('[ACCOUNT REQUEST] Calling AI Verification...');
        const aiResult = await aiServiceInstance.verifyRegistrationRequest({
            name, email, role, course, qualification, enrollment, employeeId
        });
        console.log('[ACCOUNT REQUEST] AI Result:', aiResult);

        // 4. Save Request
        const newRequest = new AccountRequest({
            name,
            email,
            enrollment: role === 'student' ? enrollment : undefined,
            employeeId: role === 'teacher' ? employeeId : undefined,
            role,
            course: role === 'student' ? course : undefined,
            qualification: role === 'teacher' ? qualification : undefined,

            status: 'Pending',
            aiTrustScore: aiResult.trustScore,
            aiRiskLevel: aiResult.riskLevel,
            aiAnalysis: aiResult.analysis
        });

        await newRequest.save();

        res.status(201).json({
            message: 'Request submitted successfully. Admin will review it shortly.',
            requestId: newRequest._id,
            trustScore: aiResult.trustScore // Optional: return to UI for demo purposes? Maybe not.
        });

    } catch (err) {
        console.error('[ACCOUNT REQUEST ERROR]', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
