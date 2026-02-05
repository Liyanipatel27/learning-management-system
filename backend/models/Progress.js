const mongoose = require('mongoose');

const ProgressSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    completedModules: [{
        moduleId: mongoose.Schema.Types.ObjectId,
        completedAt: { type: Date, default: Date.now },
        score: Number,
        isFastTracked: Boolean
    }],
    contentProgress: [{
        contentId: mongoose.Schema.Types.ObjectId,
        timeSpent: { type: Number, default: 0 },
        isCompleted: { type: Boolean, default: false },
        updatedAt: { type: Date, default: Date.now }
    }],
    lastAttemptedModule: mongoose.Schema.Types.ObjectId,
    courseCompletedAt: { type: Date }, // New field for certificate date
    updatedAt: { type: Date, default: Date.now }
});

// Index for quick lookup
ProgressSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Progress', ProgressSchema);
