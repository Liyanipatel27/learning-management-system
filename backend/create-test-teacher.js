const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms';

mongoose.connect(MONGO_URI)
    .then(async () => {
        const email = 'teacher@test.com';
        const password = 'password123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        let user = await User.findOne({ email });
        if (user) {
            console.log('Test Teacher already exists, updating password...');
            user.password = hashedPassword;
            user.role = 'teacher';
            user.name = 'Test Teacher';
            await user.save();
        } else {
            console.log('Creating Test Teacher...');
            user = new User({
                name: 'Test Teacher',
                email,
                password: hashedPassword,
                role: 'teacher',
                employeeId: 'T12345',
                specialization: 'Computer Science'
            });
            await user.save();
        }
        console.log(`Test Teacher Ready: ${email} / ${password}`);
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
