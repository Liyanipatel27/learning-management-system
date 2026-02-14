const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const authRoutes = require('./routes/auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Adjust this for production
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));



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

console.log('Mounting /api/ai routes...');
app.use('/api/ai', require('./routes/aiRoutes'));

app.get('/ping', (req, res) => {
    console.log('[DEBUG] /ping called');
    res.send('pong v3-schema-test');
});

app.get('/', (req, res) => {
    res.send('LMS Backend is Running');
});

// --- Socket.io Logic ---
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);
    });

    socket.on('draw-event', ({ roomId, ...drawData }) => {
        socket.to(roomId).emit('incoming-draw', drawData);
    });

    socket.on('clear-canvas', (roomId) => {
        socket.to(roomId).emit('canvas-cleared');
    });

    socket.on('code-update', ({ roomId, code }) => {
        socket.to(roomId).emit('incoming-code', code);
    });

    socket.on('permission-update', ({ roomId, ...permData }) => {
        socket.to(roomId).emit('incoming-permission', permData);
    });

    socket.on('end-class', ({ roomId }) => {
        socket.to(roomId).emit('class-ended');
    });

    socket.on('slide-change-event', ({ roomId, index }) => {
        socket.to(roomId).emit('incoming-slide-change', { index });
    });


    socket.on('slide-add-event', ({ roomId, slideData }) => {
        socket.to(roomId).emit('incoming-slide-add', { slideData });
    });

    socket.on('canvas-update', ({ roomId, imageData }) => {
        socket.to(roomId).emit('incoming-canvas-update', { imageData });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
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
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Routes mounted with Socket.io support.');
});
