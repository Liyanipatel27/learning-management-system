const mongoose = require('mongoose');

const ContentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    type: { type: String, enum: ['video', 'image', 'pdf', 'doc', 'link', 'text'], required: true },
    url: { type: String }, // For files (path) or external links
    originalName: { type: String }, // Original file name
    description: { type: String },
    minTime: { type: Number, default: 0 } // Minimum read/watch time in seconds
});

const QuestionSchema = new mongoose.Schema({
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswerIndex: { type: Number, required: true }, // Index of the correct option in the options array
    explanation: { type: String },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' }
});

const ModuleSchema = new mongoose.Schema({
    title: { type: String, required: true },
    contents: [ContentSchema],
    quiz: {
        questions: [QuestionSchema],
        passingScore: { type: Number, default: 70 },
        fastTrackScore: { type: Number, default: 85 }
    },
    quizConfig: {
        questionsPerAttempt: { type: Number, default: 10 },
        questionsPerAttemptStandard: { type: Number, default: 10 },
        questionsPerAttemptFastTrack: { type: Number, default: 5 }
    }
});

const ChapterSchema = new mongoose.Schema({
    title: { type: String, required: true },
    modules: [ModuleSchema]
});

const CourseSchema = new mongoose.Schema({
    title: { type: String, required: true },
    subject: { type: String, required: true },
    description: { type: String },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isPublished: { type: Boolean, default: false },
    chapters: [ChapterSchema],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Course', CourseSchema);
