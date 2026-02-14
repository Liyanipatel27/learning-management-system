import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useChat } from '../../context/ChatContext';
import ReactMarkdown from 'react-markdown';

const AIChatbot = ({ studentName, performanceLevel, embedded = false }) => {
    const [isOpen, setIsOpen] = useState(embedded); // Default to open if embedded
    const { messages, addMessage, isLoading, setIsLoading } = useChat();
    const [input, setInput] = useState('');
    // const [loading, setLoading] = useState(false); // Using context isLoading
    const [isListening, setIsListening] = useState(false); // Voice State
    const messagesEndRef = useRef(null);

    // Speech Recognition Setup
    const recognitionRef = useRef(null);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.lang = 'en-US';
        }
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    // Force open if embedded
    useEffect(() => {
        if (embedded) setIsOpen(true);
    }, [embedded]);

    // Text-to-Speech Function
    const speak = (text) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1;
            utterance.pitch = 1;
            window.speechSynthesis.speak(utterance);
        }
    };

    // Voice Input Handler
    const handleVoiceInput = () => {
        const recognition = recognitionRef.current;
        if (!recognition) {
            alert("Your browser does not support voice input.");
            return;
        }

        if (isListening) {
            recognition.stop();
            setIsListening(false);
        } else {
            setIsListening(true);
            try {
                recognition.start();
            } catch (e) {
                console.error("Speech recognition already started", e);
            }

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setInput(transcript);
                handleSend(transcript);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.onerror = (event) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
            };
        }
    };

    const suggestedActions = [
        "Explain Quantum Physics",
        "Create a study schedule",
        "Quiz me on History",
        "Summarize the last lesson"
    ];

    const handleSend = async (messageOverride = null) => {
        const messageText = messageOverride || input;
        if (!messageText.trim()) return;

        const userMsg = { role: 'user', content: messageText };
        addMessage(userMsg);
        setInput('');
        setIsLoading(true);

        try {
            // Include recent history (last 10 messages) for context
            const history = messages.slice(-10);

            // Use environment variable for API URL
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const response = await axios.post(`${apiUrl}/api/ai/chat`, {
                message: userMsg.content,
                history: history,
                studentLevel: performanceLevel || 'Average'
            });

            const reply = response.data.response;
            addMessage({ role: 'assistant', content: reply });

            // Speak the response
            speak(reply);

        } catch (error) {
            console.error("Chat Error:", error);
            addMessage({ role: 'assistant', content: "Sorry, I'm having trouble connecting right now." });
        } finally {
            setIsLoading(false);
        }
    };

    // Styles for embedded vs fixed
    const containerStyle = embedded ? {
        width: '100%',
        height: '600px', // Fixed height for embedded mode to scroll
        backgroundColor: 'white',
        borderRadius: '15px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #e2e8f0'
    } : {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1000,
        fontFamily: 'Segoe UI, sans-serif'
    };

    const windowStyle = embedded ? {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    } : {
        width: '350px',
        height: '500px',
        backgroundColor: 'white',
        borderRadius: '15px',
        boxShadow: '0 5px 25px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
        marginBottom: '10px',
        overflow: 'hidden',
        border: '1px solid #e0e0e0'
    };

    return (
        <div style={containerStyle}>
            {/* Chat Window */}
            {isOpen && (
                <div style={windowStyle}>
                    {/* Header */}
                    <div style={{
                        padding: '15px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '20px' }}>🤖</span>
                            <span style={{ fontWeight: 'bold' }}>AI Tutor {isListening ? '(Listening...)' : ''}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => window.speechSynthesis.cancel()} // Stop speaking
                                style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px' }}
                                title="Stop Speaking"
                            >
                                🔇
                            </button>
                            {!embedded && (
                                <button
                                    onClick={() => setIsOpen(false)}
                                    style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px' }}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div style={{
                        flex: 1,
                        padding: '15px',
                        overflowY: 'auto',
                        backgroundColor: '#f8f9fa'
                    }}>
                        {messages.map((msg, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                marginBottom: '10px'
                            }}>
                                <div style={{
                                    maxWidth: '80%',
                                    padding: '10px 14px',
                                    borderRadius: '15px',
                                    backgroundColor: msg.role === 'user' ? '#667eea' : 'white',
                                    color: msg.role === 'user' ? 'white' : '#333',
                                    boxShadow: msg.role === 'assistant' ? '0 2px 5px rgba(0,0,0,0.05)' : 'none',
                                    border: msg.role === 'assistant' ? '1px solid #eee' : 'none',
                                    borderBottomRightRadius: msg.role === 'user' ? '4px' : '15px',
                                    borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '15px',
                                    fontSize: '14px',
                                    lineHeight: '1.4'
                                }}>
                                    {/* Enforce line breaks for long sentences */}
                                    <ReactMarkdown>
                                        {msg.content.replace(/([.?!])\s*(?=[A-Z])/g, "$1\n\n- ")}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        ))}
                        {/* Suggested Actions */}
                        {messages.length === 1 && (
                            <div style={{ padding: '0 10px 10px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {suggestedActions.map((action, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSend(action)}
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: '20px',
                                            border: '1px solid #667eea',
                                            background: 'white',
                                            color: '#667eea',
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.background = '#667eea';
                                            e.currentTarget.style.color = 'white';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.background = 'white';
                                            e.currentTarget.style.color = '#667eea';
                                        }}
                                    >
                                        {action}
                                    </button>
                                ))}
                            </div>
                        )}

                        {isLoading && (
                            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                <div style={{ background: 'white', padding: '10px', borderRadius: '15px', color: '#888', fontSize: '12px' }}>
                                    Thinking...
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div style={{
                        padding: '15px',
                        borderTop: '1px solid #eee',
                        display: 'flex',
                        gap: '10px',
                        backgroundColor: 'white',
                        alignItems: 'center'
                    }}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask me anything..."
                            style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '20px',
                                border: '1px solid #ddd',
                                outline: 'none'
                            }}
                        />

                        {/* Microphone Button */}
                        <button
                            onClick={handleVoiceInput}
                            style={{
                                background: isListening ? '#e53e3e' : '#edf2f7', // Red when listening
                                color: isListening ? 'white' : '#4a5568',
                                border: 'none',
                                borderRadius: '50%',
                                width: '40px',
                                height: '40px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                                boxShadow: isListening ? '0 0 10px rgba(229, 62, 62, 0.5)' : 'none'
                            }}
                            title="Speak"
                        >
                            🎤
                        </button>

                        <button
                            onClick={() => handleSend()}
                            disabled={isLoading}
                            style={{
                                background: '#667eea',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '40px',
                                height: '40px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            ➤
                        </button>
                    </div>
                </div>
            )}

            {/* Toggle Button (Hidden if embedded) */}
            {!embedded && !isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                        cursor: 'pointer',
                        fontSize: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                    🤖
                </button>
            )}
        </div>
    );
};

export default AIChatbot;
