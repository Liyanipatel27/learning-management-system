const mongoose = require('mongoose');
const User = require('./models/User');
const Course = require('./models/Course');
require('dotenv').config();

const debugTeachers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        // 1. Find the teacher 'sunita' (or any teacher)
        const teachers = await User.find({ role: 'teacher' });
        console.log(`Found ${teachers.length} teachers.`);

        for (const teacher of teachers) {
            console.log(`\nTeacher: ${teacher.name} (ID: ${teacher._id})`);

            // 2. Try to find courses with instructor as Object ID
            const coursesObjectId = await Course.find({ instructor: teacher._id });
            console.log(`  Courses (query by ObjectId): ${coursesObjectId.length}`);

            // 3. Try to find courses with instructor as String (in case of schema mismatch)
            const coursesString = await Course.find({ instructor: teacher._id.toString() });
            console.log(`  Courses (query by String): ${coursesString.length}`);

            if (coursesObjectId.length === 0 && coursesString.length === 0) {
                // 4. Debug: Find ANY course and check its instructor field type
                const anyCourse = await Course.findOne();
                if (anyCourse) {
                    console.log(`  DEBUG: Random Course "${anyCourse.title}" Instructor Field:`, anyCourse.instructor, `(Type: ${typeof anyCourse.instructor})`);
                }
            } else {
                coursesObjectId.concat(coursesString).forEach(c => console.log(`   - ${c.title}`));
            }
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

debugTeachers();
