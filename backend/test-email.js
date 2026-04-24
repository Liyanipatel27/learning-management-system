require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

console.log('--- EMAIL TEST ---');
console.log('User:', process.env.EMAIL_USER);
console.log('Pass Length:', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0);

const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER, // Send to yourself
    subject: 'LMS Email Test',
    text: 'If you see this, your Gmail credentials are correct!'
};

transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        console.log('❌ TEST FAILED');
        console.log('Error Details:', error.message);
        if (error.message.includes('535')) {
            console.log('👉 Tip: The password in .env is incorrect. Please generate a NEW App Password.');
        } else if (error.message.includes('534')) {
            console.log('👉 Tip: You are using your normal password. You MUST use a 16-character App Password.');
        }
    } else {
        console.log('✅ TEST SUCCESSFUL!');
        console.log('Response:', info.response);
    }
});
