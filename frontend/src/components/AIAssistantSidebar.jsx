import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AIAssistantSidebar = ({ content, activeFeature, aiSummary, setAiSummary, isGeneratingSummary, setIsGeneratingSummary }) => {

    useEffect(() => {
        if (activeFeature === 'summary' && !aiSummary && !isGeneratingSummary) {
            generateSummary();
        }
    }, [activeFeature, content]);

    const generateSummary = async () => {
        setIsGeneratingSummary(true);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/ai/summary`, {
                content: content.description || content.title, // Fallback to title if no description
                type: content.type
            });
            setAiSummary(res.data.summary);
        } catch (err) {
            console.error(err);
            setAiSummary("Failed to generate summary. Please try again.");
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    return (
        <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #edf2f7', paddingBottom: '15px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                    {activeFeature === 'summary' ? '📝' : activeFeature === 'quiz' ? '✅' : '🤔'}
                </div>
                <h3 style={{ margin: 0, color: '#2d3748' }}>
                    {activeFeature === 'summary' ? 'AI Summary' : activeFeature === 'quiz' ? 'AI Quiz' : 'AI Doubt Solver'}
                </h3>
            </div>

            {activeFeature === 'summary' && (
                <div>
                    {isGeneratingSummary ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
                            <div className="loading-spinner" style={{ width: '30px', height: '30px', border: '3px solid #e2e8f0', borderTop: '3px solid #6C63FF', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                            <p style={{ marginTop: '15px', color: '#718096', fontSize: '0.9rem' }}>Generating summary...</p>
                            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                        </div>
                    ) : (
                        <div style={{ lineHeight: '1.6', color: '#4a5568', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
                            {aiSummary}
                        </div>
                    )}
                </div>
            )}
            {/* Placeholders for other features if needed later */}
            {activeFeature !== 'summary' && (
                <div style={{ textAlign: 'center', color: '#a0aec0', marginTop: '50px' }}>
                    Feature coming soon...
                </div>
            )}
        </div>
    );
};

export default AIAssistantSidebar;
