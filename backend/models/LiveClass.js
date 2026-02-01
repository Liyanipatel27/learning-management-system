const mongoose = require('mongoose');

const liveClassSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    roomId: {
        type: String,
        required: true,
        unique: true
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    teacherName: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('LiveClass', liveClassSchema);
