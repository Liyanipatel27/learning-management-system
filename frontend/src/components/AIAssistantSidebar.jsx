import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

const AIAssistantSidebar = ({ content, activeFeature, aiSummary, setAiSummary, isGeneratingSummary, setIsGeneratingSummary }) => {

    // Auto-generate summary when feature is active and no summary exists
    useEffect(() => {
        if (activeFeature === 'summary' && !aiSummary && !isGeneratingSummary && content) {
            generateSummary();
        }
    }, [activeFeature, content]);

    const generateSummary = async () => {
        if (!content || (content.type !== 'pdf' && content.type !== 'doc')) {
            return;
        }

        setIsGeneratingSummary(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/ai/summary`, {
                pdfUrl: content.url
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAiSummary(res.data.summary);
        } catch (err) {
            console.error('Error fetching AI summary:', err);
            setAiSummary('Failed to generate summary. Please try again later.');
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    if (activeFeature !== 'summary') return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '20px', background: '#4C51BF', color: 'white' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>📝</span> AI Summary
                </h3>
            </div>

            <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
                {isGeneratingSummary ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#718096' }}>
                        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTop: '4px solid #4C51BF', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '15px' }}></div>
                        <p>Analysing document...</p>
                    </div>
                ) : aiSummary ? (
                    <div className="markdown-body" style={{ fontSize: '0.95rem', lineHeight: '1.6', color: '#2d3748' }}>
                        <ReactMarkdown>{aiSummary}</ReactMarkdown>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', color: '#718096', marginTop: '50px' }}>
                        <p>Click below to generate a summary for this document.</p>
                        <button
                            onClick={generateSummary}
                            style={{ padding: '10px 20px', background: '#4C51BF', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            Generate Summary
                        </button>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default AIAssistantSidebar;
