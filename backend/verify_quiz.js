const axios = require('axios');

async function checkQuestionIds() {
    try {
        const response = await axios.get('http://localhost:5000/api/courses');
        const courses = response.data;

        let targetModule = null;

        for (const course of courses) {
            for (const chapter of course.chapters) {
                for (const module of chapter.modules) {
                    if (module.quiz && module.quiz.questions && module.quiz.questions.length > 0) {
                        targetModule = module;
                        break;
                    }
                }
                if (targetModule) break;
            }
            if (targetModule) break;
        }

        if (targetModule) {
            console.log(`Module ID: ${targetModule._id}`);
            const firstQ = targetModule.quiz.questions[0];
            console.log('First Question ID:', firstQ._id);
            console.log('Has ID:', !!firstQ._id);
        } else {
            console.log('NO_QUIZ_FOUND');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkQuestionIds();
