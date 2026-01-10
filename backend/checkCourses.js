const mongoose = require('mongoose');
const Course = require('./models/Course');

const MONGO_URI = 'mongodb+srv://patelliyani:admin@cluster0.xt9t4.mongodb.net/lms_new?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGO_URI)
    .then(async () => {
        const courses = await Course.find();
        console.log(JSON.stringify(courses, null, 2));
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
