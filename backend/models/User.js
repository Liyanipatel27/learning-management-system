const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'teacher', 'admin'],
    default: 'student',
    required: true
  },
  enrollment: {
    type: Number
  },
  branch: {
    type: String
  },
  employeeId: {
    type: Number
  },
  plainPassword: {
    type: String
  },
  resetOTP: {
    type: String
  },
  resetOTPExpire: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
