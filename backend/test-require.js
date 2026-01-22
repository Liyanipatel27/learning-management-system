try {
    console.log('Attempting to require authMiddleware...');
    const auth = require('./middleware/authMiddleware');
    console.log('Successfully required authMiddleware. Keys:', Object.keys(auth));

    console.log('Attempting to require routes/ai...');
    const ai = require('./routes/ai');
    console.log('Successfully required routes/ai');
} catch (e) {
    console.error('Error during require test:');
    console.error(e);
}
