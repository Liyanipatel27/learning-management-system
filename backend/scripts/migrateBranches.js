const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Class = require('../models/Class');
const { normalizeBranch } = require('../utils/branchHelpers');

const path = require('path');
// Assuming running from backend/ root
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
    try {
        console.log('Connecting to MongoDB...');
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is undefined. Check .env file.');
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Database Connection Error:', err.message);
        process.exit(1);
    }
};

const migrate = async () => {
    await connectDB();

    try {
        const students = await User.find({ role: 'student' });
        console.log(`Found ${students.length} students to check.`);

        let updatedCount = 0;
        let errors = 0;

        for (const student of students) {
            if (!student.branch) {
                console.log(`Skipping student ${student.email} - No branch defined.`);
                continue;
            }

            const normalizedBranch = normalizeBranch(student.branch);

            // Find or create class
            let studentClass = await Class.findOne({ name: normalizedBranch });
            if (!studentClass) {
                studentClass = new Class({ name: normalizedBranch, type: 'Branch' });
                await studentClass.save();
                console.log(`Created new class: ${normalizedBranch}`);
            }

            // Update student if not already assigned or assigned incorrectly
            if (!student.enrolledClass || student.enrolledClass.toString() !== studentClass._id.toString()) {
                student.enrolledClass = studentClass._id;
                await student.save();
                console.log(`Updated ${student.email}: ${student.branch} -> ${normalizedBranch}`);
                updatedCount++;
            }
        }

        console.log(`Migration Complete. Updated ${updatedCount} students. Errors: ${errors}`);
        process.exit(0);

    } catch (error) {
        console.error('Migration Error:', error);
        process.exit(1);
    }
};

migrate();
