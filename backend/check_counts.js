const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const Course = require('./models/Course');

const checkCounts = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const students = await User.countDocuments({ role: 'student' });
        const teachers = await User.countDocuments({ role: 'teacher' });
        const courses = await Course.countDocuments();

        console.log('--- DB COUNTS ---');
        console.log(`Students: ${students}`);
        console.log(`Teachers: ${teachers}`);
        console.log(`Courses: ${courses}`);
        console.log('-----------------');

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkCounts();
