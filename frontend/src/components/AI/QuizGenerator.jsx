import React, { useState } from 'react';
import axios from 'axios';

const QuizGenerator = () => {
    const [config, setConfig] = useState({ subject: '', topic: '', difficulty: 'medium' });
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(false);
    const [answers, setAnswers] = useState({});
    const [result, setResult] = useState(null);

    const generateQuiz = async () => {
        if (!config.subject || !config.topic) return alert("Please fill in subject and topic");
        setLoading(true);
        setQuiz(null);
        setResult(null);
        setAnswers({});

        try {
            const res = await axios.post('http://localhost:5000/api/ai/quiz', config);
            setQuiz(res.data);
        } catch (err) {
            alert("Failed to generate quiz. Try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = (qIndex, optIndex) => {
        setAnswers(prev => ({ ...prev, [qIndex]: optIndex }));
    };

    const submitQuiz = () => {
        let score = 0;
        quiz.questions.forEach((q, idx) => {
            if (answers[idx] === q.correctAnswerIndex) score++;
        });
        setResult({ score, total: quiz.questions.length });
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Inter, sans-serif' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>🎯 AI Quiz Generator</h2>

            {!quiz ? (
                <div style={{ background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '500px' }}>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Subject</label>
                        <input
                            type="text"
                            name="subject"
                            value={config.subject}
                            onChange={(e) => setConfig({ ...config, subject: e.target.value })}
                            placeholder="e.g. History"
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                        />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Topic</label>
                        <input
                            type="text"
                            name="topic"
                            value={config.topic}
                            onChange={(e) => setConfig({ ...config, topic: e.target.value })}
                            placeholder="e.g. World War II"
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                        />
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Difficulty</label>
                        <select
                            value={config.difficulty}
                            onChange={(e) => setConfig({ ...config, difficulty: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                        >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                        </select>
                    </div>
                    <button
                        onClick={generateQuiz}
                        disabled={loading}
                        style={{
                            width: '100%', padding: '12px',
                            background: loading ? '#cbd5e0' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold', fontSize: '16px'
                        }}
                    >
                        {loading ? 'Generating Quiz...' : 'Generate Quiz'}
                    </button>
                </div>
            ) : (
                <div style={{ background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h3>Quiz: {config.subject} - {config.topic}</h3>
                        <button onClick={() => setQuiz(null)} style={{ color: 'red', border: 'none', background: 'transparent', cursor: 'pointer' }}>Exit</button>
                    </div>

                    {quiz.questions.map((q, qImg) => (
                        <div key={qImg} style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
                            <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>{qImg + 1}. {q.question}</p>
                            <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: '1fr 1fr' }}>
                                {q.options.map((opt, oIdx) => (
                                    <button
                                        key={oIdx}
                                        onClick={() => !result && handleAnswer(qImg, oIdx)}
                                        style={{
                                            padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'left',
                                            background: result
                                                ? (oIdx === q.correctAnswerIndex ? '#c6f6d5' : (answers[qImg] === oIdx ? '#fed7d7' : 'white'))
                                                : (answers[qImg] === oIdx ? '#ebf8ff' : 'white'),
                                            borderColor: answers[qImg] === oIdx ? '#4299e1' : '#e2e8f0',
                                            cursor: result ? 'default' : 'pointer'
                                        }}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                            {result && (
                                <div style={{ marginTop: '10px', fontSize: '14px', color: '#718096' }}>
                                    <strong>Explanation:</strong> {q.explanation}
                                </div>
                            )}
                        </div>
                    ))}

                    {!result ? (
                        <button
                            onClick={submitQuiz}
                            style={{ padding: '12px 24px', background: '#48bb78', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            Submit Quiz
                        </button>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '20px', background: '#f0fff4', borderRadius: '10px', marginTop: '20px' }}>
                            <h3>You Scored: {result.score} / {result.total}</h3>
                            <button onClick={() => setQuiz(null)} style={{ marginTop: '10px', padding: '10px 20px', background: '#3182ce', color: 'white', borderRadius: '5px', border: 'none', cursor: 'pointer' }}>Create Another Quiz</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default QuizGenerator;
