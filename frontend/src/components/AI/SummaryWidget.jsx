import React, { useState } from 'react';
import axios from 'axios';

const SummaryWidget = ({ content, type = 'text', title }) => {
    const [summary, setSummary] = useState('');
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const handleGenerate = async () => {
        if (!content) return alert("No content to summarize!");
        setLoading(true);
        setIsOpen(true);
        try {
            const res = await axios.post('http://localhost:5000/api/ai/summary', {
                content,
                type
            });
            setSummary(res.data.summary);
        } catch (err) {
            console.error(err);
            setSummary("Failed to generate summary. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ margin: '10px 0' }}>
            {!isOpen ? (
                <button
                    onClick={handleGenerate}
                    style={{
                        background: 'linear-gradient(90deg, #38b2ac 0%, #4fd1c5 100%)',
                        color: 'white', border: 'none', padding: '8px 16px', borderRadius: '20px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold'
                    }}
                >
                    ✨ AI Summarize {title}
                </button>
            ) : (
                <div style={{ background: '#e6fffa', padding: '15px', borderRadius: '10px', border: '1px solid #b2f5ea', position: 'relative' }}>
                    <button
                        onClick={() => setIsOpen(false)}
                        style={{ position: 'absolute', top: '5px', right: '5px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px', color: '#2c7a7b' }}
                    >
                        ✕
                    </button>

                    <h4 style={{ margin: '0 0 10px 0', color: '#234e52' }}>✨ AI Summary: {title}</h4>

                    {loading ? (
                        <div style={{ color: '#285e61', fontStyle: 'italic' }}>Analyzing content and generating key points...</div>
                    ) : (
                        <div style={{ whiteSpace: 'pre-wrap', color: '#2c7a7b', lineHeight: '1.6' }}>
                            {summary}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SummaryWidget;
