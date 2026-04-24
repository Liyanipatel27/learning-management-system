const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // App password
    },
    tls: {
        rejectUnauthorized: false // Keeping the TLS fix for dev environments
    }
});

module.exports = transporter;
