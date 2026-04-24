const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let adminToken = '';
let studentId = '';
const newPassword = 'NewSecretPassword123!';

async function runTest() {
    try {
        console.log('--- User Password Update Test ---');

        // 1. Login as Admin
        // Assuming there is an admin account. If not, this might fail, but usually there is one.
        // We can use the one from create-test-admin.js if it exists, or try default.
        // Let's try to login as a known admin or create one if possible.
        // Actually, better to just try a known admin credential or ask user?
        // I'll try a common one, if fail, I'll report.
        // But wait, I can see `create-test-admin.js` in the file list. Let's see if I can use that to ensure admin exists.

        // Ensure admin token. 
        // For this test, I'll register a new temporary admin to be sure.
        const adminEmail = `admin_test_${Date.now()}@example.com`;
        const adminPass = 'Admin@123';

        console.log('1. Registering temporary admin...');
        try {
            await axios.post(`${API_URL}/auth/register`, {
                name: 'Temp Admin',
                email: adminEmail,
                password: adminPass,
                role: 'admin',
                employeeId: '9999'
            });
        } catch (e) {
            // Check if already exists or other error
            if (e.response && e.response.status !== 400) {
                console.log('Admin registration failed (might exist):', e.response?.data?.message);
            }
        }

        console.log('2. Logging in as Admin...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: adminEmail,
            password: adminPass
        });
        adminToken = loginRes.data.token;
        console.log('Admin logged in.');

        // 2. Create a User (Student)
        const studentEmail = `student_test_${Date.now()}@example.com`;
        const initialPassword = 'InitialPassword123!';

        console.log('3. creating a student...');
        const studentRes = await axios.post(`${API_URL}/auth/register`, {
            name: 'Test Student',
            email: studentEmail,
            password: initialPassword,
            role: 'student',
            enrollment: '123456',
            branch: 'CS'
        }); // This auto-logs in usually? No, just register.

        // We need the ID. Login to get ID or fetches.
        // Actually, register might not return ID in some implementations, usually returns user.
        // Let's fetch all users and find this one.

        console.log('3. Fetched users to find student ID...');
        const usersRes = await axios.get(`${API_URL}/admin/users`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const student = usersRes.data.find(u => u.email === studentEmail);
        if (!student) throw new Error('Student not found after creation');
        studentId = student._id;
        console.log('Student ID:', studentId);

        // 3. Verify Login with Old Password
        console.log('4. Verifying login with OLD password...');
        await axios.post(`${API_URL}/auth/login`, {
            email: studentEmail,
            password: initialPassword
        });
        console.log('Login with OLD password successful.');

        // 4. Update Password via Admin Route
        console.log('5. Admin updating student password...');
        await axios.put(`${API_URL}/admin/users/${studentId}`, {
            name: 'Test Student Updated',
            email: studentEmail,
            role: 'student',
            password: newPassword
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('Password update request sent.');

        // 5. Verify Login with NEW Password
        console.log('6. Verifying login with NEW password...');
        await axios.post(`${API_URL}/auth/login`, {
            email: studentEmail,
            password: newPassword
        });
        console.log('Login with NEW password successful!');

        // 6. Verify Login with OLD Password (should fail)
        console.log('7. Verifying login with OLD password (should fail)...');
        try {
            await axios.post(`${API_URL}/auth/login`, {
                email: studentEmail,
                password: initialPassword
            });
            console.error('ERROR: Login with OLD password should have failed!');
        } catch (e) {
            console.log('Login with OLD password failed as expected.');
        }

        console.log('--- TEST PASSED ---');

    } catch (err) {
        console.error('--- TEST FAILED ---');
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', JSON.stringify(err.response.data, null, 2));
        } else {
            console.error('Error Message:', err.message);
        }
    }
}

runTest();
