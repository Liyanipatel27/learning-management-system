const User = require("../models/User");
const transporter = require("../config/mail");
const bcrypt = require("bcryptjs");

// 1. Forgot Password (Send OTP)
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        console.log(`[FORGOT PASSWORD] OTP request for: ${email}`);

        const user = await User.findOne({ email });
        if (!user) {
            console.log(`[FORGOT PASSWORD] User not found: ${email}`);
            return res.status(404).json({ message: "User not found" });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        user.resetOTP = otp;
        user.resetOTPExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save();

        // Send Email
        const mailOptions = {
            from: `"LMS Academy" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Password Reset OTP",
            html: `<h3>Your OTP is: ${otp}</h3><p>Valid for 10 minutes</p>`,
        };

        await transporter.sendMail(mailOptions);
        console.log(`[FORGOT PASSWORD] OTP sent to: ${email}`);
        res.json({ message: "OTP sent to email" });
    } catch (error) {
        console.error(`[FORGOT PASSWORD] Error:`, error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// 2. Verify OTP
exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        console.log(`[VERIFY OTP] Attempt for: ${email}, OTP: ${otp}`);

        const user = await User.findOne({ email });

        if (
            !user ||
            user.resetOTP !== otp ||
            user.resetOTPExpire < Date.now()
        ) {
            console.log(`[VERIFY OTP] Invalid or expired OTP for: ${email}`);
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        console.log(`[VERIFY OTP] Success for: ${email}`);
        res.json({ message: "OTP verified" });
    } catch (error) {
        console.error(`[VERIFY OTP] Error:`, error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// 3. Reset Password (New + Confirm)
exports.resetPassword = async (req, res) => {
    try {
        const { email, newPassword, confirmPassword } = req.body;
        console.log(`[RESET PASSWORD] Attempt for: ${email}`);

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            console.log(`[RESET PASSWORD] User not found: ${email}`);
            return res.status(404).json({ message: "User not found" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;
        user.plainPassword = newPassword; // Keeping consistency with existing project logic
        user.resetOTP = undefined;
        user.resetOTPExpire = undefined;

        await user.save();

        console.log(`[RESET PASSWORD] Success for: ${email}`);
        res.json({ message: "Password changed successfully" });
    } catch (error) {
        console.error(`[RESET PASSWORD] Error:`, error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
