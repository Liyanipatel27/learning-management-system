const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();
const User = require('./models/User');
const Course = require('./models/Course');
const Progress = require('./models/Progress');

const debugProgress = async () => {
    let output = '';
    const log = (msg) => { output += msg + '\n'; console.log(msg); };

    try {
        await mongoose.connect(process.env.MONGO_URI);
        log('Connected to DB');

        const student = await User.findOne({ name: { $regex: 'liyani', $options: 'i' } });

        if (!student) {
            log('Student not found!');
        } else {
            log(`Found Student: ${student.name} (${student._id})`);

            const progressRecords = await Progress.find({ student: student._id });
            log(`Total Progress Records found: ${progressRecords.length}`);
            log('--- Detailed Breakdown ---');

            for (const p of progressRecords) {
                const course = await Course.findById(p.course);
                log(`Progress ID: ${p._id}`);
                log(`  Course ID: ${p.course}`);
                if (course) {
                    log(`  Course Title: "${course.title}"`);
                    log(`  Published: ${course.isPublished !== false}`); // Assuming default true
                } else {
                    log(`  Course Status: DELETED / MISSING from Database`);
                }
                log('---');
            }
        }

        fs.writeFileSync('debug_output.txt', output);
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

debugProgress();
