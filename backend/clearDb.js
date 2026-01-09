const mongoose = require('mongoose');
const User = require('./models/User');

const MONGO_URI = 'mongodb+srv://patelliyani:admin@cluster0.xt9t4.mongodb.net/lms_new?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('Connected to MongoDB');
        await User.deleteMany({});
        console.log('All users deleted. Database is clean.');
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
