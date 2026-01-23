const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_change_in_production'; // Best practice: put in .env

// Register Route
router.post('/register', async (req, res) => {
    try {
        console.log('[REGISTER DEBUG] Received body:', req.body);
        const { name, email, password, role, enrollment, branch, employeeId } = req.body;

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
            employeeId
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

module.exports = router;
