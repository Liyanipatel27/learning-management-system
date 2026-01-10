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
    lastAttemptedModule: mongoose.Schema.Types.ObjectId,
    updatedAt: { type: Date, default: Date.now }
});

// Index for quick lookup
ProgressSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Progress', ProgressSchema);
