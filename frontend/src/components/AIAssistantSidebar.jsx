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

    // Video Summary State
    const [videoFile, setVideoFile] = useState(null);
    const [videoSummaryResult, setVideoSummaryResult] = useState(null);
    const [isVideoProcessing, setIsVideoProcessing] = useState(false);

    const handleVideoUpload = async () => {
        if (!videoFile) return;
        setIsVideoProcessing(true);
        const formData = new FormData();
        formData.append('video', videoFile);

        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/ai/video-summary`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setVideoSummaryResult(res.data);
        } catch (err) {
            console.error(err);
            alert('Failed to generate video summary. Please try again.');
        } finally {
            setIsVideoProcessing(false);
        }
    };

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
                subject: content.title,
                topic: content.title,
                difficulty: 'medium',
                fileUrl: fileUrl,
                content: content.description || content.title
            });
            // Backend may return array directly OR { questions: [...] }
            const questions = Array.isArray(res.data)
                ? res.data
                : (res.data.questions || []);
            if (!questions.length) {
                setQuizError("No questions were generated. Please try again.");
            } else {
                setQuizQuestions(questions);
            }
        } catch (err) {
            console.error(err);
            setQuizError("Failed to generate quiz. Please try again.");
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
                    {activeFeature === 'summary' ? '📝' : activeFeature === 'quiz' ? '✅' : activeFeature === 'videoSummary' ? '🎥' : '🤔'}
                </div>
                <h3 style={{ margin: 0, color: '#2d3748' }}>
                    {activeFeature === 'summary' ? 'AI Summary' : activeFeature === 'quiz' ? 'AI Quiz' : activeFeature === 'videoSummary' ? 'Video Summary' : 'AI Doubt Solver'}
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
                            {quizQuestions.map((q, idx) => {
                                // Support both correctAnswer (string) and correctAnswerIndex (number)
                                const correctDisplay = q.correctAnswer
                                    || (q.options && q.correctAnswerIndex != null ? q.options[q.correctAnswerIndex] : '');
                                return (
                                    <div key={idx} style={{ background: '#f7fafc', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                        <p style={{ fontWeight: 'bold', marginBottom: '10px', color: '#2d3748' }}>{idx + 1}. {q.question}</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {(q.options || []).map((opt, oIdx) => (
                                                <div
                                                    key={oIdx}
                                                    style={{
                                                        padding: '8px 12px',
                                                        background: opt === correctDisplay ? '#C6F6D5' : 'white',
                                                        border: opt === correctDisplay ? '1px solid #68D391' : '1px solid #e2e8f0',
                                                        borderRadius: '6px',
                                                        fontSize: '0.9rem',
                                                        color: opt === correctDisplay ? '#276749' : '#4a5568',
                                                        fontWeight: opt === correctDisplay ? 'bold' : 'normal'
                                                    }}
                                                >
                                                    {opt === correctDisplay ? '✅ ' : ''}{opt}
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#38A169', fontWeight: 'bold' }}>
                                            ✔ Answer: {correctDisplay}
                                        </div>
                                    </div>
                                );
                            })}
                            <button
                                onClick={() => setQuizQuestions([])}
                                style={{ marginTop: '10px', padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                🔄 Try Another Quiz
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
                                {/* Improved Markdown Rendering with Preprocessing */}
                                <ReactMarkdown
                                    components={{
                                        h1: ({ node, ...props }) => <h1 style={{
                                            color: '#1a202c',
                                            fontSize: '1.75rem',
                                            fontWeight: 'bold',
                                            margin: '32px 0 16px 0',
                                            fontFamily: 'Inter, sans-serif'
                                        }} {...props} />,
                                        h2: ({ node, ...props }) => <h2 style={{
                                            color: '#2d3748',
                                            fontSize: '1.5rem',
                                            fontWeight: 'bold',
                                            margin: '24px 0 12px 0',
                                            borderBottom: '2px solid #e2e8f0',
                                            paddingBottom: '8px'
                                        }} {...props} />,
                                        h3: ({ node, ...props }) => <h3 style={{
                                            background: '#F3F0FF',
                                            color: '#6C63FF',
                                            padding: '10px 16px',
                                            borderRadius: '8px',
                                            fontWeight: '700',
                                            marginTop: '20px',
                                            marginBottom: '16px',
                                            display: 'block',
                                            width: 'fit-content',
                                            fontSize: '1.1rem',
                                            boxShadow: '0 2px 4px rgba(108, 99, 255, 0.1)'
                                        }} {...props} />,
                                        ul: ({ node, ...props }) => <ul style={{
                                            paddingLeft: '28px',
                                            marginBottom: '16px',
                                            listStyleType: 'disc'
                                        }} {...props} />,
                                        ol: ({ node, ...props }) => <ol style={{
                                            paddingLeft: '28px',
                                            marginBottom: '16px',
                                            listStyleType: 'decimal'
                                        }} {...props} />,
                                        li: ({ node, ...props }) => <li style={{
                                            marginBottom: '10px',
                                            color: '#2d3748',
                                            lineHeight: '1.7',
                                            fontSize: '0.95rem',
                                            paddingLeft: '4px'
                                        }} {...props} />,
                                        p: ({ node, ...props }) => <p style={{
                                            marginBottom: '14px',
                                            lineHeight: '1.7',
                                            color: '#4a5568',
                                            fontSize: '0.95rem'
                                        }} {...props} />,
                                        strong: ({ node, ...props }) => <strong style={{
                                            color: '#553C9A',
                                            fontWeight: '700'
                                        }} {...props} />,
                                        em: ({ node, ...props }) => <em style={{
                                            color: '#d53f8c',
                                            fontStyle: 'italic'
                                        }} {...props} />,
                                        blockquote: ({ node, ...props }) => <blockquote style={{
                                            borderLeft: '4px solid #6C63FF',
                                            padding: '12px 16px',
                                            color: '#718096',
                                            fontStyle: 'italic',
                                            margin: '16px 0',
                                            background: '#f7fafc',
                                            borderRadius: '4px'
                                        }} {...props} />,
                                        code: ({ node, inline, ...props }) =>
                                            inline
                                                ? <code style={{
                                                    background: '#EDF2F7',
                                                    color: '#C53030',
                                                    padding: '3px 6px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.9em',
                                                    fontFamily: 'monospace'
                                                }} {...props} />
                                                : <code style={{
                                                    display: 'block',
                                                    background: '#1A202C',
                                                    color: '#E2E8F0',
                                                    padding: '16px',
                                                    borderRadius: '8px',
                                                    overflowX: 'auto',
                                                    margin: '12px 0',
                                                    fontSize: '0.9em',
                                                    fontFamily: 'monospace',
                                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                                                }} {...props} />
                                    }}
                                >
                                    {(() => {
                                        if (!msg.content) return "";
                                        let clean = msg.content;
                                        // Fix common AI formatting issues
                                        clean = clean.replace(/\\n/g, '\n'); // Handle escaped newlines

                                        // Force double newlines before headers to ensure they break out of paragraphs
                                        clean = clean.replace(/([^\n])\s*(#{1,3})\s/g, '$1\n\n$2 ');

                                        // Ensure bullet points are on their own lines with preceding newline
                                        clean = clean.replace(/([^\n])\s*(\*|-)\s/g, '$1\n$2 ');

                                        // Ensure numbered lists are on their own lines
                                        clean = clean.replace(/([^\n])\s*(\d+\.)\s/g, '$1\n$2 ');

                                        // Clean up any unnecessary whitespace
                                        clean = clean.replace(/\n\s+\n/g, '\n\n');

                                        return clean;
                                    })()}
                                </ReactMarkdown>
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

            {/* VIDEO SUMMARY TAB */}
            {activeFeature === 'videoSummary' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {!videoSummaryResult && !isVideoProcessing && (
                        <div style={{ padding: '20px', background: '#fefcbf', borderRadius: '12px', border: '1px solid #fbd38d', textAlign: 'center' }}>
                            <p style={{ margin: '0 0 15px 0', color: '#744210', fontWeight: 'bold' }}>Upload an educational video to get a summary.</p>
                            <input
                                type="file"
                                accept="video/*"
                                onChange={(e) => setVideoFile(e.target.files[0])}
                                style={{ marginBottom: '15px', width: '100%' }}
                            />
                            <button
                                onClick={handleVideoUpload}
                                disabled={!videoFile}
                                style={{
                                    padding: '10px 20px',
                                    background: !videoFile ? '#cbd5e0' : '#d69e2e',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    cursor: !videoFile ? 'not-allowed' : 'pointer',
                                    width: '100%'
                                }}
                            >
                                Generate Summary 🎥
                            </button>
                        </div>
                    )}

                    {isVideoProcessing && (
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                            <div className="loading-spinner" style={{ width: '40px', height: '40px', border: '4px solid #fbd38d', borderTop: '4px solid #d69e2e', borderRadius: '50%', animation: 'spin 1.5s linear infinite', margin: '0 auto' }}></div>
                            <p style={{ marginTop: '20px', color: '#744210', fontWeight: 'bold' }}>Analyzing video content...</p>
                            <p style={{ fontSize: '0.8rem', color: '#975a16' }}>This may take a minute depending on video size.</p>
                        </div>
                    )}

                    {videoSummaryResult && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ background: '#fffaf0', padding: '15px', borderRadius: '12px', border: '1px solid #feebc8' }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#744210', borderBottom: '1px solid #fbd38d', paddingBottom: '5px' }}>📌 Summary</h4>
                                <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: '#2d3748' }}>{videoSummaryResult.summary}</p>
                            </div>

                            <div style={{ background: '#fffaf0', padding: '15px', borderRadius: '12px', border: '1px solid #feebc8' }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#744210', borderBottom: '1px solid #fbd38d', paddingBottom: '5px' }}>🔑 Key Points</h4>
                                <ul style={{ paddingLeft: '20px', margin: 0 }}>
                                    {videoSummaryResult.keyPoints?.map((kp, idx) => (
                                        <li key={idx} style={{ marginBottom: '8px', fontSize: '0.9rem', color: '#2d3748' }}>{kp}</li>
                                    ))}
                                </ul>
                            </div>

                            <div style={{ background: '#fffaf0', padding: '15px', borderRadius: '12px', border: '1px solid #feebc8' }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#744210', borderBottom: '1px solid #fbd38d', paddingBottom: '5px' }}>🧠 Key Concepts</h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {videoSummaryResult.concepts?.map((c, idx) => (
                                        <span key={idx} style={{ padding: '4px 10px', background: '#feebc8', color: '#744210', borderRadius: '15px', fontSize: '0.8rem', fontWeight: 'bold' }}>{c}</span>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => { setVideoSummaryResult(null); setVideoFile(null); }}
                                style={{ padding: '10px', background: '#edf2f7', color: '#4a5568', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Analyze Another Video
                            </button>
                        </div>
                    )}
                </div>
            )}

            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default AIAssistantSidebar;
