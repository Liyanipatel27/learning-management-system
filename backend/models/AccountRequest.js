const mongoose = require('mongoose');

const accountRequestSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true // Prevent duplicate pending requests
    },
    enrollment: {
        type: String
        // required if role is student
    },
    employeeId: {
        type: String
        // required if role is teacher
    },
    role: {
        type: String,
        enum: ['student', 'teacher'],
        required: true
    },
    // Student specific
    course: {
        type: String
        // required if role is student, validation handled in controller
    },
    // Teacher specific
    qualification: {
        type: String
        // required if role is teacher
    },

    idProofUrl: {
        type: String // URL to uploaded ID proof
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    aiTrustScore: {
        type: Number, // 0-100
        default: 0
    },
    aiRiskLevel: {
        type: String,
        enum: ['Low', 'Medium', 'High'],
        default: 'Medium'
    },
    aiAnalysis: {
        type: String // Detailed AI analysis/reasoning
    }
}, { timestamps: true });

module.exports = mongoose.model('AccountRequest', accountRequestSchema);
