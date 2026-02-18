const mongoose = require('mongoose');
const Class = require('./models/Class');
const User = require('./models/User');
require('dotenv').config();

const verifyClassRevert = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        // 1. Create a Test Class
        console.log('\n--- Step 1: Creating Test Class ---');
        const testClass = new Class({
            name: 'RevertVerificationClass_' + Date.now(),
            type: 'Branch',
            description: 'Temporary class for verification'
        });
        await testClass.save();
        console.log('Test Class Created:', testClass.name);

        // 2. Create a Test Student enrolled in this class
        console.log('\n--- Step 2: Creating Test Student ---');
        const testUser = new User({
            name: 'RevertTestStudent',
            email: `reverttest_${Date.now()}@example.com`,
            password: 'password123',
            role: 'student',
            enrolledClass: testClass._id
        });
        await testUser.save();
        console.log('Test Student Created and Enrolled:', testUser.name);

        // Verify initial state
        const initialCount = await User.countDocuments({ enrolledClass: testClass._id });
        console.log(`Initial Student Count for ${testClass.name}: ${initialCount} (Expected: 1)`);

        // 3. Soft Delete the Class
        console.log('\n--- Step 3: Soft Deleting Class ---');
        testClass.isDeleted = true;
        await testClass.save();
        console.log('Class marked as deleted (isDeleted: true)');

        // 4. Verify Student Association persists
        console.log('\n--- Step 4: Verifying Student Association AFTER Delete ---');
        const countAfterDelete = await User.countDocuments({ enrolledClass: testClass._id });
        console.log(`Student Count for Deleted Class: ${countAfterDelete} (Expected: 1)`);

        if (countAfterDelete !== 1) {
            console.error('CRITICAL ERROR: Student count changed after deletion!');
        } else {
            console.log('SUCCESS: Student enrollment preserved.');
        }

        // 5. Restore the Class
        console.log('\n--- Step 5: Restoring Class ---');
        testClass.isDeleted = false;
        await testClass.save();
        console.log('Class restored (isDeleted: false)');

        // 6. Verify Final State
        console.log('\n--- Step 6: Verifying Final State ---');
        const finalClass = await Class.findById(testClass._id);
        const finalCount = await User.countDocuments({ enrolledClass: testClass._id });

        console.log('Class isDeleted:', finalClass.isDeleted); // Should be false
        console.log('Final Student Count:', finalCount); // Should be 1

        if (!finalClass.isDeleted && finalCount === 1) {
            console.log('\n✅ VERIFICATION SUCCESSFUL: Class revert functionality works as expected.');
        } else {
            console.error('\n❌ VERIFICATION FAILED.');
        }

        // Cleanup
        console.log('\n--- Cleanup ---');
        await User.deleteOne({ _id: testUser._id });
        await Class.deleteOne({ _id: testClass._id });
        console.log('Test data cleaned up.');

    } catch (error) {
        console.error('Verification Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

verifyClassRevert();
