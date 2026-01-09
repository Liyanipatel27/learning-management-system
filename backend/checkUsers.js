const mongoose = require('mongoose');
const User = require('./models/User');

const MONGO_URI = 'mongodb+srv://patelliyani:admin@cluster0.xt9t4.mongodb.net/lms_new?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGO_URI)
    .then(async () => {
        const count = await User.countDocuments();
        console.log(`User count: ${count}`);
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
