const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = 'AIzaSyDSYR3H3X5SgHOfdsErfdWkDlBPOD0ZFC0';
const genAI = new GoogleGenerativeAI(apiKey);

console.log('GoogleGenerativeAI object:', Object.keys(genAI));
console.log('genAI.constructor:', genAI.constructor.name);

// Try to get available models
try {
    // Check if we can list models
    console.log('Checking available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(genAI)));

    // Try to get a specific model directly
    console.log('Testing with gemini-pro model...');
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    console.log('Model object:', Object.keys(model));

    // Test if model.generateContent exists
    if (typeof model.generateContent === 'function') {
        console.log('generateContent function exists');
        // Try to generate a simple response
        console.log('Testing model.generateContent...');
        model.generateContent('Hello').then(response => {
            console.log('Success! Response:', response.response.text());
        }).catch(err => {
            console.error('generateContent error:', err);
        });
    } else {
        console.log('generateContent not found');
    }

} catch (error) {
    console.error('Error:', error);
}
