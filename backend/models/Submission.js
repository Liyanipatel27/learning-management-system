const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    assignment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assignment',
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    // Data based on assignment type
    fileUrl: String, // For file uploads
    code: String,    // For coding editor
    language: String, // Language used for coding

    status: {
        type: String,
        enum: ['Pending', 'Graded'],
        default: 'Pending'
    },
    score: {
        type: Number,
        default: null
    },
    feedback: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('Submission', submissionSchema);
