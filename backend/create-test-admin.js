const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const MONGO_URI = 'mongodb+srv://patelliyani:admin@cluster0.xt9t4.mongodb.net/lms_new?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGO_URI)
    .then(async () => {
        const email = 'testadmin@gmail.com';
        const password = 'password123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        let user = await User.findOne({ email });
        if (user) {
            console.log('Test Admin already exists, updating password...');
            user.password = hashedPassword;
            user.role = 'admin';
            await user.save();
        } else {
            console.log('Creating Test Admin...');
            user = new User({
                name: 'Test Admin',
                email,
                password: hashedPassword,
                role: 'admin',
                employeeId: 99999
            });
            await user.save();
        }
        console.log(`Test Admin Ready: ${email} / ${password}`);
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
