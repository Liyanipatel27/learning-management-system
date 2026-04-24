const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();
const User = require('./models/User');
const Course = require('./models/Course');
const Progress = require('./models/Progress');

const debugCompletion = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const student = await User.findOne({ name: { $regex: 'liyani', $options: 'i' } });
        if (!student) {
            console.log('Student not found');
            return;
        }
        console.log(`Checking Student: ${student.name}`);

        // Fetch ALL published courses
        const publishedCourses = await Course.find({ isPublished: true }).select('title chapters isPublished subject');
        console.log(`Total Published Courses: ${publishedCourses.length}`);

        // Fetch student progress
        const progressRecords = await Progress.find({ student: student._id });

        let completedCoursesCount = 0;

        console.log('--- COMPLETION CHECK ---');

        publishedCourses.forEach(course => {
            const p = progressRecords.find(pr => pr.course && pr.course.toString() === course._id.toString());

            let status = "NOT STARTED/NO PROGRESS";
            let totalItems = 0;
            let completedItems = 0;

            if (p) {
                const chapters = course.chapters || [];

                chapters.forEach(ch => {
                    if (ch.modules) {
                        ch.modules.forEach(m => {
                            // Content
                            if (m.contents) {
                                totalItems += m.contents.length;
                                m.contents.forEach(c => {
                                    if (p.contentProgress && p.contentProgress.some(cp => cp.contentId.toString() === c._id.toString() && cp.isCompleted)) {
                                        completedItems++;
                                    }
                                });
                            }
                            // Quiz
                            if (m.quiz && m.quiz.questions && m.quiz.questions.length > 0) {
                                totalItems++;
                                if (p.completedModules && p.completedModules.some(cm => cm.moduleId.toString() === m._id.toString())) {
                                    completedItems++;
                                }
                            }
                        });
                    }
                });

                if (totalItems > 0 && completedItems >= totalItems) {
                    status = "COMPLETE";
                    completedCoursesCount++;
                } else {
                    status = "IN PROGRESS";
                }
            }

            console.log(`Course: "${course.title || course.subject}"`);
            console.log(`   Total Items: ${totalItems} | Completed: ${completedItems}`);
            console.log(`   Status: ${status}`);
            console.log('-----------------------------------');
        });

        console.log(`FINAL RESULT: ${completedCoursesCount} / ${publishedCourses.length} Courses Completed`);

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

debugCompletion();
