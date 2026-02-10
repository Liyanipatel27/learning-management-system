import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

const AIAssistantSidebar = ({ content, activeFeature, aiSummary, setAiSummary, isGeneratingSummary, setIsGeneratingSummary }) => {
    // Quiz State
    const [quizQuestions, setQuizQuestions] = useState([]);
    const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
    const [quizError, setQuizError] = useState(null);

    // Doubt State
    const [chatHistory, setChatHistory] = useState([]); // [{role: 'user'|'model', content: ''}]
    const [doubtInput, setDoubtInput] = useState('');
    const [isSendingDoubt, setIsSendingDoubt] = useState(false);

    useEffect(() => {
        if (activeFeature === 'summary' && !aiSummary && !isGeneratingSummary) {
            generateSummary();
        }
    }, [activeFeature, content]);

    const getContentUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        const fullUrl = `${import.meta.env.VITE_API_URL}${url}`;
        return encodeURI(fullUrl);
    };

    const getFileUrl = () => {
        if (!content) return null;
        if (content.type === 'pdf' || content.type === 'doc') {
            return getContentUrl(content.url);
        }
        return null; // For video/link, maybe use description or just title
    };

    const generateSummary = async () => {
        setIsGeneratingSummary(true);
        try {
            const fileUrl = getFileUrl();
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/ai/summary`, {
                content: content.description || content.title,
                type: content.type,
                fileUrl: fileUrl
            });
            setAiSummary(res.data.summary);
        } catch (err) {
            console.error(err);
            setAiSummary("Failed to generate summary. Please try again.");
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    const generateQuiz = async () => {
        setIsGeneratingQuiz(true);
        setQuizError(null);
        try {
            const fileUrl = getFileUrl();
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/ai/quiz`, {
                subject: content.title, // Use title as subject/topic context
                topic: content.title,
                difficulty: 'medium',
                fileUrl: fileUrl,
                content: content.description || content.title
            });
            setQuizQuestions(res.data.questions);
        } catch (err) {
            console.error(err);
            setQuizError("Failed to generate quiz.");
        } finally {
            setIsGeneratingQuiz(false);
        }
    };

    const handleSendDoubt = async () => {
        if (!doubtInput.trim()) return;

        const userMsg = { role: 'user', content: doubtInput };
        setChatHistory(prev => [...prev, userMsg]);
        setDoubtInput('');
        setIsSendingDoubt(true);

        try {
            const fileUrl = getFileUrl();
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/ai/chat`, {
                message: userMsg.content,
                history: chatHistory,
                fileUrl: fileUrl,
                studentLevel: 'Average' // could take from props
            });

            const aiMsg = { role: 'model', content: res.data.response };
            setChatHistory(prev => [...prev, aiMsg]);
        } catch (err) {
            console.error(err);
            setChatHistory(prev => [...prev, { role: 'model', content: "Sorry, I encountered an error answering your doubt." }]);
        } finally {
            setIsSendingDoubt(false);
        }
    };

    return (
        <div style={{ padding: '20px', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #edf2f7', paddingBottom: '15px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                    {activeFeature === 'summary' ? '📝' : activeFeature === 'quiz' ? '✅' : '🤔'}
                </div>
                <h3 style={{ margin: 0, color: '#2d3748' }}>
                    {activeFeature === 'summary' ? 'AI Summary' : activeFeature === 'quiz' ? 'AI Quiz' : 'AI Doubt Solver'}
                </h3>
            </div>

            {/* SUMMARY TAB */}
            {activeFeature === 'summary' && (
                <div>
                    {isGeneratingSummary ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
                            <div className="loading-spinner" style={{ width: '30px', height: '30px', border: '3px solid #e2e8f0', borderTop: '3px solid #6C63FF', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                            <p style={{ marginTop: '15px', color: '#718096', fontSize: '0.9rem' }}>Generating summary from {content.type}...</p>
                        </div>
                    ) : (
                        <div style={{ lineHeight: '1.6', color: '#4a5568', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
                            <ReactMarkdown>{aiSummary}</ReactMarkdown>
                        </div>
                    )}
                </div>
            )}

            {/* QUIZ TAB */}
            {activeFeature === 'quiz' && (
                <div>
                    {!quizQuestions.length && !isGeneratingQuiz && (
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                            <p style={{ color: '#718096', marginBottom: '20px' }}>Generate a quick quiz based on this {content.type}.</p>
                            <button
                                onClick={generateQuiz}
                                style={{
                                    padding: '10px 20px',
                                    background: '#38A169',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                Generate PDF Quiz
                            </button>
                            {quizError && <p style={{ color: 'red', marginTop: '10px' }}>{quizError}</p>}
                        </div>
                    )}

                    {isGeneratingQuiz && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
                            <div className="loading-spinner" style={{ width: '30px', height: '30px', border: '3px solid #e2e8f0', borderTop: '3px solid #38A169', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                            <p style={{ marginTop: '15px', color: '#718096', fontSize: '0.9rem' }}>Generating questions...</p>
                        </div>
                    )}

                    {quizQuestions.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {quizQuestions.map((q, idx) => (
                                <div key={idx} style={{ background: '#f7fafc', padding: '15px', borderRadius: '10px' }}>
                                    <p style={{ fontWeight: 'bold', marginBottom: '10px', color: '#2d3748' }}>{idx + 1}. {q.question}</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {q.options.map((opt, oIdx) => (
                                            <div key={oIdx} style={{ padding: '8px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.9rem' }}>
                                                {opt}
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#38A169' }}>
                                        Correct: {q.options[q.correctAnswerIndex]}
                                    </div>
                                </div>
                            ))}
                            <button
                                onClick={() => setQuizQuestions([])}
                                style={{ marginTop: '10px', padding: '8px', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                            >
                                Clear Quiz
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* DOUBT TAB */}
            {activeFeature === 'doubt' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '15px' }}>
                        {chatHistory.length === 0 && (
                            <div style={{ textAlign: 'center', color: '#a0aec0', marginTop: '40px' }}>
                                <p>Ask any question about this {content.type}!</p>
                            </div>
                        )}
                        {chatHistory.map((msg, idx) => (
                            <div key={idx} style={{
                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                background: msg.role === 'user' ? '#6C63FF' : '#f1f5f9',
                                color: msg.role === 'user' ? 'white' : '#1e293b',
                                padding: '10px 15px',
                                borderRadius: '12px',
                                maxWidth: '85%',
                                fontSize: '0.9rem',
                                lineHeight: '1.5'
                            }}>
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                        ))}
                        {isSendingDoubt && (
                            <div style={{ alignSelf: 'flex-start', color: '#718096', padding: '10px', fontSize: '0.8rem', fontStyle: 'italic' }}>
                                Thinking...
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                            type="text"
                            value={doubtInput}
                            onChange={(e) => setDoubtInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendDoubt()}
                            placeholder="Ask a doubt..."
                            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e0', outline: 'none' }}
                        />
                        <button
                            onClick={handleSendDoubt}
                            disabled={isSendingDoubt || !doubtInput.trim()}
                            style={{
                                padding: '10px 15px',
                                background: isSendingDoubt ? '#a0aec0' : '#6C63FF',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: isSendingDoubt ? 'not-allowed' : 'pointer'
                            }}
                        >
                            ➤
                        </button>
                    </div>
                </div>
            )}

            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default AIAssistantSidebar;
