require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Create a test function to list available models
async function testModelListing() {
    const apiKey = process.env.CV_GEMINI_API_KEYS.split(',')[1]; // Try the second key which didn't give 400 error
    const genAI = new GoogleGenerativeAI(apiKey);

    console.log('=== Testing Google Generative AI Library ===');
    console.log('Library version:', require('@google/generative-ai/package.json').version);
    console.log('Using API key:', apiKey.substring(0, 10) + '...');

    try {
        // Try to list available models
        console.log('\n=== Attempting to list available models ===');
        // The GoogleGenerativeAI client doesn't have a direct listModels method in version 0.24.1
        // We'll need to use the REST API directly

        const axios = require('axios');
        const response = await axios.get('https://generativelanguage.googleapis.com/v1beta/models', {
            params: { key: apiKey }
        });

        console.log('✅ Success! Available models:', response.data.models.map(m => m.name));

        // Find models that support generateContent
        const generativeModels = response.data.models.filter(m => m.supportedGenerationMethods?.includes('generateContent'));
        console.log('\n=== Models supporting generateContent ===');
        generativeModels.forEach(model => {
            console.log(`- ${model.name} (${model.description})`);
        });

        return generativeModels;

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        return [];
    }
}

// Test with available models
async function testGenerateContent() {
    const models = await testModelListing();

    if (models.length === 0) {
        console.log('\nNo compatible models found');
        return;
    }

    // Try to use the first available model
    const model = models[0];
    const modelName = model.name.split('/').pop();
    const apiKey = process.env.CV_GEMINI_API_KEYS.split(',')[1]; // Try the second key
    const genAI = new GoogleGenerativeAI(apiKey);

    console.log(`\n=== Testing model: ${modelName} ===`);

    try {
        const generativeModel = genAI.getGenerativeModel({ model: modelName });
        const result = await generativeModel.generateContent('Explain photosynthesis in one sentence');

        console.log('✅ Success!');
        console.log('Response:', result.response.text());

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

// Run the tests
testGenerateContent();
