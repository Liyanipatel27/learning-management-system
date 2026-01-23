import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

const AIAssistantSidebar = ({ content, activeFeature, aiSummary, setAiSummary, isGeneratingSummary, setIsGeneratingSummary }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isAsking, setIsAsking] = useState(false);
    const [aiQuiz, setAiQuiz] = useState(null);
    const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
    const [quizAnswers, setQuizAnswers] = useState({});
    const [showExplanations, setShowExplanations] = useState({});
    const chatEndRef = useRef(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, aiQuiz]);

    // Auto-trigger Summary
    useEffect(() => {
        if (activeFeature === 'summary' && !aiSummary && !isGeneratingSummary) {
            generateSummary();
        }
    }, [activeFeature]);

    // Auto-trigger Quiz
    useEffect(() => {
        if (activeFeature === 'quiz' && !aiQuiz && !isGeneratingQuiz) {
            generatePracticeQuiz();
        }
    }, [activeFeature]);

    const generateSummary = async () => {
        setIsGeneratingSummary(true);
        try {
            const token = sessionStorage.getItem('token');
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/ai/summarize`,
                { text: content.title + " " + (content.description || ''), type: 'document' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setAiSummary(res.data.data);
        } catch (err) {
            console.error('Error generating summary:', err);
            // alert('Failed to generate summary.'); // Optional: reduce alert noise for auto-trigger
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    const generatePracticeQuiz = async () => {
        setIsGeneratingQuiz(true);
        setAiQuiz(null);
        setQuizAnswers({});
        setShowExplanations({});
        try {
            const token = sessionStorage.getItem('token');
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/ai/generate-quiz`,
                { topic: content.title, context: content.description || '' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setAiQuiz(res.data.data);
        } catch (err) {
            console.error('Error generating quiz:', err);
            // alert('Failed to generate quiz.');
        } finally {
            setIsGeneratingQuiz(false);
        }
    };

    const askAI = async () => {
        if (!input.trim()) return;
        const userMsg = { role: 'user', text: input };
        setMessages([...messages, userMsg]);
        setInput('');
        setIsAsking(true);

        try {
            const token = sessionStorage.getItem('token');
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/ai/solve-doubt`,
                { question: input, context: content.title + " " + (content.description || '') },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessages(prev => [...prev, { role: 'ai', text: res.data.data }]);
        } catch (err) {
            console.error('Error asking AI:', err);
            setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I encountered an error. Please try again.' }]);
        } finally {
            setIsAsking(false);
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '15px', background: activeFeature === 'summary' ? '#4C51BF' : activeFeature === 'quiz' ? '#2F855A' : '#C53030', color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>✨</span> {activeFeature === 'summary' ? 'Lesson Summary' : activeFeature === 'quiz' ? 'Practice Quiz' : 'Doubt Solver'}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {/* Summary Section */}
                {activeFeature === 'summary' && (
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #edf2f7', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#4a5568' }}>Lesson Summary & Notes</h4>
                        {isGeneratingSummary ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#6C63FF' }}>
                                ✨ Generating your summary...
                            </div>
                        ) : aiSummary ? (
                            <div style={{ fontSize: '0.95rem', color: '#2d3748', maxHeight: '100%', overflowY: 'auto', lineHeight: '1.6' }}>
                                <ReactMarkdown
                                    components={{
                                        h1: ({ node, ...props }) => <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '10px 0' }} {...props} />,
                                        h2: ({ node, ...props }) => <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '8px 0' }} {...props} />,
                                        h3: ({ node, ...props }) => <h3 style={{ fontSize: '1rem', fontWeight: 'bold', margin: '6px 0' }} {...props} />,
                                        p: ({ node, ...props }) => <p style={{ marginBottom: '8px' }} {...props} />,
                                        ul: ({ node, ...props }) => <ul style={{ paddingLeft: '20px', marginBottom: '8px' }} {...props} />,
                                        li: ({ node, ...props }) => <li style={{ marginBottom: '4px' }} {...props} />,
                                        code: ({ node, ...props }) => <code style={{ background: '#edf2f7', padding: '2px 4px', borderRadius: '4px', fontFamily: 'monospace' }} {...props} />
                                    }}
                                >
                                    {aiSummary}
                                </ReactMarkdown>
                                <button
                                    onClick={generateSummary}
                                    style={{ marginTop: '15px', padding: '8px', background: 'white', border: '1px solid #6C63FF', color: '#6C63FF', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}
                                >
                                    🔄 Re-generate Summary
                                </button>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#a0aec0' }}>
                                Summary didn't load. Try refreshing or re-generating.
                                <button
                                    onClick={generateSummary}
                                    style={{ marginTop: '10px', padding: '8px', background: '#6C63FF', color: 'white', border: 'none', borderRadius: '6px' }}
                                >
                                    Generate Now
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Practice Quiz Section */}
                {activeFeature === 'quiz' && (
                    <div style={{ background: 'white', padding: '12px', borderRadius: '10px', border: '1px solid #edf2f7', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#4a5568' }}>Practice Quiz</h4>
                        </div>

                        {isGeneratingQuiz ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#38A169' }}>
                                🚀 Building your quiz...
                            </div>
                        ) : aiQuiz ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {aiQuiz.map((q, idx) => (
                                    <div key={idx} style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #edf2f7' }}>
                                        <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 'bold', color: '#2d3748' }}>{idx + 1}. {q.question}</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                            {q.options.map((opt, oIdx) => (
                                                <button
                                                    key={oIdx}
                                                    onClick={() => setQuizAnswers({ ...quizAnswers, [idx]: opt })}
                                                    style={{
                                                        textAlign: 'left',
                                                        padding: '10px',
                                                        borderRadius: '8px',
                                                        border: '1px solid',
                                                        borderColor: quizAnswers[idx] === opt ? (opt === q.correctAnswer ? '#38A169' : '#E53E3E') : '#e2e8f0',
                                                        background: quizAnswers[idx] === opt ? (opt === q.correctAnswer ? '#C6F6D5' : '#FED7D7') : 'white',
                                                        fontSize: '0.85rem',
                                                        cursor: quizAnswers[idx] ? 'default' : 'pointer'
                                                    }}
                                                    disabled={!!quizAnswers[idx]}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                        {quizAnswers[idx] && (
                                            <div style={{ marginTop: '8px' }}>
                                                <button
                                                    onClick={() => setShowExplanations({ ...showExplanations, [idx]: !showExplanations[idx] })}
                                                    style={{ background: 'none', border: 'none', color: '#6C63FF', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}
                                                >
                                                    {showExplanations[idx] ? 'Hide Explanation' : 'Show Explanation'}
                                                </button>
                                                {showExplanations[idx] && (
                                                    <div style={{ marginTop: '5px', padding: '10px', background: '#EDF2F7', borderRadius: '4px', fontSize: '0.75rem', color: '#4a5568' }}>
                                                        {q.explanation}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <button
                                    onClick={generatePracticeQuiz}
                                    style={{ padding: '12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', color: '#718096', cursor: 'pointer' }}
                                >
                                    🔄 Re-generate Quiz
                                </button>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#a0aec0' }}>
                                Quiz not generated.
                                <button
                                    onClick={generatePracticeQuiz}
                                    style={{ marginTop: '10px', padding: '8px', background: '#38A169', color: 'white', border: 'none', borderRadius: '6px' }}
                                >
                                    Generate Now
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Doubt Solver Section */}
                {activeFeature === 'doubt' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#4a5568' }}>Ask a Question</h4>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px', fontSize: '0.85rem' }}>
                            {messages.length === 0 && (
                                <div style={{ padding: '40px', textAlign: 'center', color: '#a0aec0', background: 'white', borderRadius: '12px', border: '2px dashed #edf2f7' }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🤔</div>
                                    <p style={{ margin: 0 }}>Confused about this lesson?<br />Ask me anything!</p>
                                </div>
                            )}
                            {messages.map((m, i) => (
                                <div key={i} style={{
                                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                                    background: m.role === 'user' ? '#C53030' : 'white',
                                    color: m.role === 'user' ? 'white' : '#2d3748',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    maxWidth: '85%',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                    lineHeight: '1.5',
                                    fontSize: '0.9rem',
                                    border: m.role === 'ai' ? '1px solid #edf2f7' : 'none'
                                }}>
                                    <ReactMarkdown
                                        components={{
                                            p: ({ node, ...props }) => <p style={{ margin: '0 0 5px 0', lastChild: { marginBottom: 0 } }} {...props} />,
                                            ul: ({ node, ...props }) => <ul style={{ paddingLeft: '20px', marginBottom: '5px' }} {...props} />,
                                            li: ({ node, ...props }) => <li style={{ marginBottom: '2px' }} {...props} />
                                        }}
                                    >
                                        {m.text}
                                    </ReactMarkdown>
                                </div>
                            ))}
                            {isAsking && <div style={{ alignSelf: 'flex-start', background: '#edf2f7', color: '#718096', padding: '10px', borderRadius: '12px', fontSize: '0.8rem' }}>AI is typing...</div>}
                            <div ref={chatEndRef} />
                        </div>

                        <div style={{ padding: '10px', background: 'white', borderRadius: '12px', border: '1px solid #edf2f7', display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                placeholder="Type your doubt..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && askAI()}
                                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontSize: '0.95rem', outline: 'none' }}
                            />
                            <button
                                onClick={askAI}
                                disabled={isAsking || !input.trim()}
                                style={{ padding: '8px 15px', background: '#C53030', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                →
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIAssistantSidebar;
