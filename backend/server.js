const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
const MONGO_URI = 'mongodb+srv://patelliyani:admin@cluster0.xt9t4.mongodb.net/lms_new?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected Successfully'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', require('./routes/course'));
app.use('/uploads', express.static('uploads'));

app.get('/ping', (req, res) => {
    res.send('pong v2');
});

app.get('/', (req, res) => {
    res.send('LMS Backend is Running');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
