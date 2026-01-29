const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');

async function diagnose() {
    try {
        // Find .env file in backend
        const envPath = './backend/.env';
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const mongoMatch = envContent.match(/MONGO_URI=(.+)/);
            if (mongoMatch) {
                const mongoUri = mongoMatch[1].trim();
                await mongoose.connect(mongoUri);
                console.log('Connected to DB');
            } else {
                console.log('MONGO_URI not found in .env');
                return;
            }
        } else {
            console.log('.env not found at ' + envPath);
            return;
        }

        // Define schemas briefly to avoid needing separate files
        const User = mongoose.model('User', new mongoose.Schema({ name: String, role: String }));
        const Course = mongoose.model('Course', new mongoose.Schema({ subject: String, teacher: mongoose.Schema.Types.ObjectId, chapters: Array }));
        const Progress = mongoose.model('Progress', new mongoose.Schema({ student: mongoose.Schema.Types.ObjectId, course: mongoose.Schema.Types.ObjectId, completedModules: Array }));

        // Find teacher 'sunita'
        const teacher = await User.findOne({ name: 'sunita', role: 'teacher' });
        if (!teacher) {
            console.log('Teacher sunita not found');
            const allTeachers = await User.find({ role: 'teacher' });
            console.log('Available teachers:', allTeachers.map(t => `${t.name} (${t._id})`).join(', '));
            return;
        }
        console.log('Found teacher sunita:', teacher._id);

        // Find courses by sunita
        const courses = await Course.find({ teacher: teacher._id });
        console.log(`Found ${courses.length} courses for sunita`);
        courses.forEach(c => console.log(` - ${c.subject} (${c._id})`));

        // Find progress records for these courses
        if (courses.length > 0) {
            const courseIds = courses.map(c => c._id);
            const relatedProgress = await Progress.find({ course: { $in: courseIds } });
            console.log(`Progress records for sunita's courses: ${relatedProgress.length}`);
            for (const p of relatedProgress) {
                const student = await User.findById(p.student);
                console.log(` - Student: ${student?.name} (${p.student}), Course: ${p.course}, Modules: ${p.completedModules?.length}`);
            }
        }

        process.exit(0);
    } catch (err) {
        console.error('Diagnosis error:', err);
        process.exit(1);
    }
}

diagnose();
