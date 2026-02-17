const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

const VIDEO_URL = 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4';
const TEMP_FILE = 'temp_test_video.mp4';
const API_URL = 'http://localhost:5000/api/ai/video-summary';

async function runTest() {
    try {
        console.log('1. Downloading sample video...');
        const response = await axios({
            method: 'GET',
            url: VIDEO_URL,
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(TEMP_FILE);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
        console.log('Video downloaded to', TEMP_FILE);

        console.log('2. Uploading to API...');
        const formData = new FormData();
        formData.append('video', fs.createReadStream(TEMP_FILE));

        const apiResponse = await axios.post(API_URL, formData, {
            headers: {
                ...formData.getHeaders()
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        console.log('3. API Response:');
        console.log(JSON.stringify(apiResponse.data, null, 2));

    } catch (error) {
        console.error('Test Failed:', error.message);
        if (error.response) {
            console.error('Data:', error.response.data);
            console.error('Status:', error.response.status);
        }
    } finally {
        // Cleanup
        if (fs.existsSync(TEMP_FILE)) {
            fs.unlinkSync(TEMP_FILE);
            console.log('Cleanup: Deleted temp file.');
        }
    }
}

runTest();
