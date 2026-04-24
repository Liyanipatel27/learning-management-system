const mongoose = require('mongoose');
const Assignment = require('./models/Assignment');
const Submission = require('./models/Submission');
const User = require('./models/User');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms';

async function testRevertRewrite() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Setup Data
        // Find a student and an assignment (or create dummies if needed, but assuming some exist)
        const student = await User.findOne({ role: 'student' });
        const assignment = await Assignment.findOne();

        if (!student || !assignment) {
            console.error('Student or Assignment not found. Please ensure DB has data.');
            return;
        }

        // Create a dummy submission (Starts as Graded to test status restoration)
        const submission = new Submission({
            assignment: assignment._id,
            student: student._id,
            course: assignment.course,
            extractedText: "Test text for plagiarism",
            status: 'Graded', // Start as Graded
            score: 85,
            plagiarismResult: {
                similarityPercentage: 80,
                riskLevel: 'High Risk',
                isAiVerified: true,
                checkedAt: new Date()
            }
        });
        await submission.save();
        console.log('1. Created submission:', submission._id, 'Status:', submission.status);

        // 2. Request Re-write
        const API_URL = 'http://localhost:5000'; // Adjust if needed

        try {
            console.log('2. Requesting Re-write...');
            const rewriteRes = await axios.put(`${API_URL}/api/assignments/request-rewrite/${submission._id}`, {
                feedback: 'Plagiarism detected, please rewrite.'
            });
            console.log('Rewrite Requested. New Status:', rewriteRes.data.status);

            const updatedSub = await Submission.findById(submission._id);
            if (updatedSub.status === 'Re-write' &&
                !updatedSub.plagiarismResult &&
                updatedSub.archivedPlagiarismResult &&
                updatedSub.archivedStatus === 'Graded') { // Check archivedStatus
                console.log('PASS: plagiarismResult and status archived correctly.');
            } else {
                console.error('FAIL: Archive failed.', updatedSub);
            }

            // 3. Revert Re-write
            console.log('3. Reverting Re-write...');
            const revertRes = await axios.put(`${API_URL}/api/assignments/revert-rewrite/${submission._id}`);
            console.log('Revert Executed. New Status:', revertRes.data.status);

            const finalSub = await Submission.findById(submission._id);
            if (finalSub.status === 'Graded' && // Should be Graded again
                finalSub.plagiarismResult &&
                !finalSub.archivedPlagiarismResult &&
                !finalSub.feedback &&
                !finalSub.archivedStatus) {
                console.log('PASS: Revert successful. Status and Plagiarism result restored.');
            } else {
                console.error('FAIL: Revert failed.', finalSub);
            }

        } catch (apiErr) {
            console.error('API Error:', apiErr.response ? apiErr.response.data : apiErr.message);
        }

        // Cleanup
        await Submission.findByIdAndDelete(submission._id);
        console.log('Cleanup complete.');

    } catch (err) {
        console.error('Test Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

testRevertRewrite();
