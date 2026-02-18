const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function runTest() {
    try {
        console.log('--- 1. Submitting Account Request ---');
        const uniqueId = Date.now();
        const requestData = {
            name: `Test User ${uniqueId}`,
            email: `test${uniqueId}@gmail.com`,
            mobile: '1234567890',
            role: 'student',
            course: 'Computer Science',
            reason: 'I want to learn AI and Data Science. I am very interested in this field.'
        };

        const reqRes = await axios.post(`${API_URL}/auth/request-account`, requestData);
        console.log('Request Submitted:', reqRes.data);
        const requestId = reqRes.data.requestId;

        console.log('\n--- 2. Logging in as Admin ---');
        // Assuming there is an admin user. If not, this step might fail. 
        // We will try a common default or fail gracefully.
        // You might need to update these credentials if they are different.
        const adminLogin = await axios.post(`${API_URL}/auth/login`, {
            email: 'testadmin@gmail.com',
            password: 'password123'
            // If unknown, we might need to skip this or creating one logic.
            // Let's assume standard 'admin@gmail.com' / 'admin' or '123456'
        });
        const token = adminLogin.data.token;
        console.log('Admin Logged In. Token received.');

        console.log('\n--- 3. Fetching Requests ---');
        const requestsRes = await axios.get(`${API_URL}/admin/account-requests`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Pending Requests Count:', requestsRes.data.length);
        const myRequest = requestsRes.data.find(r => r._id === requestId);

        if (myRequest) {
            console.log('My Request Found:', myRequest);
            console.log('AI Trust Score:', myRequest.aiTrustScore);
        } else {
            console.error('Request NOT found in admin list!');
            return;
        }

        console.log('\n--- 4. Approving Request ---');
        const approveRes = await axios.post(`${API_URL}/admin/approve-request/${requestId}`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Approval Response:', approveRes.data);

        console.log('\n--- 5. Verifying User Creation ---');
        const usersRes = await axios.get(`${API_URL}/admin/users`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const newUser = usersRes.data.find(u => u.email === requestData.email);
        if (newUser) {
            console.log('User Successfully Created:', newUser);
        } else {
            console.error('User creation FAILED!');
        }

    } catch (error) {
        console.error('Test Failed:', error.response ? error.response.data : error.message);
    }
}

runTest();
