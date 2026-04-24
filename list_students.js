const mongoose = require('mongoose');
const fs = require('fs');

async function listStudents() {
    try {
        const envPath = './backend/.env';
        let mongoUri = 'mongodb://localhost:27017/lms';
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const mongoMatch = envContent.match(/MONGO_URI=(.+)/);
            if (mongoMatch) mongoUri = mongoMatch[1].trim();
        }

        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const User = mongoose.model('User', new mongoose.Schema({ name: String, email: String, role: String, createdAt: Date }));

        const students = await User.find({ role: 'student' });
        console.log(`Found ${students.length} students:`);
        students.forEach(s => {
            console.log(` - ${s.name} (${s.email}) Role: ${s.role} Joined: ${s.createdAt}`);
        });

        const allUsers = await User.find({});
        console.log(`Total users in DB: ${allUsers.length}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

listStudents();
