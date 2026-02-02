const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Debug Middleware: Log all requests
app.use((req, res, next) => {
    console.log(`[DEBUG] Received ${req.method} request for: ${req.url}`);
    next();
});

// Database Connection
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected Successfully'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Routes
console.log('Mounting /api/auth routes...');
app.use('/api/auth', authRoutes);

console.log('Mounting /api/courses routes...');
app.use('/api/courses', require('./routes/course'));

app.use('/api/ai', require('./routes/ai')); // [NEW] AI Routes

console.log('Mounting /api/assignments routes...');
app.use('/api/assignments', require('./routes/assignment'));

console.log('Mounting /api/admin routes...');
app.use('/api/admin', require('./routes/admin'));

console.log('Mounting /api/announcements routes...');
app.use('/api/announcements', require('./routes/announcement'));

console.log('Mounting /api/live-class routes...');
app.use('/api/live-class', require('./routes/liveClass'));
app.use('/uploads', express.static('uploads'));

app.get('/ping', (req, res) => {
    console.log('[DEBUG] /ping called');
    res.send('pong v3-schema-test');
});

app.get('/', (req, res) => {
    res.send('LMS Backend is Running');
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Routes mounted.');
});
