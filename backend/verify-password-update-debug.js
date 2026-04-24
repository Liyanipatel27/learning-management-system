const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let adminToken = '';
let studentId = '';

async function runTest() {
    try {
        console.log('--- DEBUG TEST ---');

        // 0. Connectivity Check
        console.log('Checking /ping...');
        try {
            const ping = await axios.get('http://localhost:5000/ping');
            console.log('Ping status:', ping.status, ping.data);
        } catch (e) {
            console.log('Ping failed:', e.message);
        }

        // 1. Register Admin
        const adminEmail = `admin_debug_${Date.now()}@example.com`;
        console.log(`1. Registering temporary admin (${adminEmail})...`);
        try {
            await axios.post(`${API_URL}/auth/register`, {
                name: 'Temp Admin', email: adminEmail, password: 'Pass', role: 'admin', employeeId: '9999'
            });
            console.log('Admin registered.');
        } catch (e) {
            console.log('Admin registration result:', e.response ? e.response.status : e.message);
        }

        // 2. Login Admin
        console.log('2. Logging in...');
        try {
            const loginRes = await axios.post(`${API_URL}/auth/login`, { email: adminEmail, password: 'Pass' });
            adminToken = loginRes.data.token;
            console.log('Admin Token acquired.');
        } catch (e) {
            console.log('Login failed:', e.response ? e.response.status : e.message);
            if (e.response) console.log('Response data:', JSON.stringify(e.response.data));
            throw new Error('Login failed, cannot proceed.');
        }

        // 3. Register Student
        const studentEmail = `student_debug_${Date.now()}@example.com`;
        console.log(`3. Registering student (${studentEmail})...`);
        try {
            await axios.post(`${API_URL}/auth/register`, {
                name: 'Test Student', email: studentEmail, password: 'Pass', role: 'student', enrollment: '123456'
            });
            console.log('Student registered.');
        } catch (e) {
            console.log('Student registration result:', e.response ? e.response.status : e.message);
        }

        // 4. Find Student ID
        console.log('4. Fetching users list...');
        const usersRes = await axios.get(`${API_URL}/admin/users`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const student = usersRes.data.find(u => u.email === studentEmail);
        if (!student) throw new Error('Student not found in list');
        studentId = student._id;
        console.log('Student ID:', studentId);

        // 5. Try Password Update
        console.log('5. Attempting update WITH password...');
        try {
            const updateUrl = (`${API_URL}/admin/users/${studentId}`);
            console.log('Update URL:', updateUrl);
            const res = await axios.put(updateUrl, {
                name: 'Updated Name 2',
                role: 'student',
                email: studentEmail,
                password: 'NewPassword123'
            }, { headers: { Authorization: `Bearer ${adminToken}` } });
            console.log('Password update SUCCESS:', res.status, res.data);
        } catch (e) {
            console.log('Password update FAILED');
            if (e.response) {
                console.log('Status:', e.response.status);
                console.log('Data:', JSON.stringify(e.response.data));
            } else {
                console.log('Error:', e.message);
            }
        }

    } catch (err) {
        console.error('Test Scaffolding Failed:', err.message);
    }
}

runTest();
