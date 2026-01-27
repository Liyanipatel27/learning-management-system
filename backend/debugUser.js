const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms';

async function checkUser(email) {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const user = await User.findOne({ email });
        if (user) {
            console.log(`User found: ${user.name} (${user.email})`);
            console.log('Role:', user.role);
            console.log('Enrollment:', user.enrollment);
            console.log('Branch:', user.branch);
            console.log('EmployeeID:', user.employeeId);
            console.log('Full Object:', JSON.stringify(user, null, 2));
        } else {
            console.log(`User with email ${email} not found.`);
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.connection.close();
    }
}

const emailToCheck = process.argv[2] || 'lsp@gmail.com';
checkUser(emailToCheck);
