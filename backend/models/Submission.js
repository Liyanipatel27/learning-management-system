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
        enum: ['Pending', 'Graded', 'Re-write'],
        default: 'Pending'
    },
    score: {
        type: Number,
        default: null
    },
    feedback: {
        type: String,
        default: ''
    },
    // Plagiarism Detection Results
    extractedText: {
        type: String, // Clean text extracted from file or code
        select: false // Don't return by default to save bandwidth
    },
    plagiarismResult: {
        similarityPercentage: { type: Number, default: 0 },
        riskLevel: {
            type: String,
            enum: ['No Risk', 'Safe', 'Low Risk', 'High Risk'],
            default: 'No Risk'
        },
        matchedWith: [{
            studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            similarity: Number,
            submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission' }
        }],
        isAiVerified: { type: Boolean, default: false },
        checkedAt: Date
    },
    archivedPlagiarismResult: {
        similarityPercentage: { type: Number },
        riskLevel: { type: String },
        matchedWith: [{
            studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            similarity: Number,
            submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission' }
        }],
        isAiVerified: { type: Boolean },
        checkedAt: Date
    },
    archivedStatus: {
        type: String,
        enum: ['Pending', 'Graded']
    }
}, { timestamps: true });

module.exports = mongoose.model('Submission', submissionSchema);
