const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['file', 'coding'],
        required: true
    },
    dueDate: {
        type: Date,
        required: true
    },
    maxPoints: {
        type: Number,
        default: 100
    },
    // Details for File-based assignments
    fileDetails: {
        instructionFileUrl: String,
    },
    // Details for Coding-based assignments
    codingDetails: {
        language: {
            type: String,
            default: 'javascript'
        },
        starterCode: String,
        testCases: [{
            input: String,
            output: String
        }]
    }
}, { timestamps: true });

module.exports = mongoose.model('Assignment', assignmentSchema);
