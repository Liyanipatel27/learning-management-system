const mongoose = require('mongoose');

const ContentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    type: { type: String, enum: ['video', 'image', 'pdf', 'doc', 'link', 'text'], required: true },
    url: { type: String }, // For files (path) or external links
    originalName: { type: String }, // Original file name
    description: { type: String }
});

const ModuleSchema = new mongoose.Schema({
    title: { type: String, required: true },
    contents: [ContentSchema]
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
    chapters: [ChapterSchema],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Course', CourseSchema);
