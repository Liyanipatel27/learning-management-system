import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';

const GradeBasedNotes = ({ level, topic }) => {
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [topicInput, setTopicInput] = useState(topic || '');

    const generateNotes = async () => {
        if (!topicInput) return alert("Please enter a topic");
        setLoading(true);
        try {
            const res = await axios.post('http://localhost:5000/api/ai/notes', {
                topic: topicInput,
                level
            });
            setNotes(res.data.notes);
        } catch (err) {
            alert("Failed to generate notes");
        } finally {
            setLoading(false);
        }
    };

    const downloadPDF = () => {
        const doc = new jsPDF();
        doc.text(`Study Notes: ${topicInput} (${level} Level)`, 10, 10);

        const splitText = doc.splitTextToSize(notes, 180);
        doc.text(splitText, 10, 20);

        doc.save(`${topicInput}_Notes.pdf`);
    };

    return (
        <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
            <h4>📚 Grade-Based Notes Generator</h4>
            <p>Generate study notes tailored to your level: <strong>{level}</strong></p>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <input
                    type="text"
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    placeholder="Enter topic (e.g. Photosynthesis)"
                    style={{ flex: 1, padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }}
                />
                <button
                    onClick={generateNotes}
                    disabled={loading}
                    style={{ padding: '8px 15px', background: '#3182ce', color: 'white', borderRadius: '5px', border: 'none', cursor: 'pointer' }}
                >
                    {loading ? 'Generating...' : 'Generate'}
                </button>
            </div>

            {notes && (
                <div style={{ background: '#f7fafc', padding: '15px', borderRadius: '8px', marginTop: '10px' }}>
                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '14px' }}>{notes}</pre>
                    <button
                        onClick={downloadPDF}
                        style={{ marginTop: '10px', padding: '5px 10px', background: '#e53e3e', color: 'white', borderRadius: '5px', border: 'none', cursor: 'pointer' }}
                    >
                        Download PDF
                    </button>
                </div>
            )}
        </div>
    );
};

const PerformanceAnalyzer = ({ studentId }) => {
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalysis = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/ai/performance/${studentId}`);
                setAnalysis(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (studentId) fetchAnalysis();
    }, [studentId]);

    if (loading) return <div>Loading Performance Analytics...</div>;
    if (!analysis) return <div>No performance data available.</div>;

    const getLevelColor = (level) => {
        if (level === 'High') return '#48bb78';
        if (level === 'Good') return '#4299e1';
        if (level === 'Average') return '#ecc94b';
        return '#f56565';
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Inter, sans-serif' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>📊 AI Performance Analyzer</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Score Card */}
                <div style={{ background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', color: '#718096' }}>Overall Level</div>
                    <div style={{ fontSize: '42px', fontWeight: 'bold', color: getLevelColor(analysis.overallLevel), margin: '10px 0' }}>
                        {analysis.overallLevel}
                    </div>
                    <div style={{ fontSize: '14px', color: '#a0aec0' }}>Predicted Score: {analysis.overallScore}%</div>
                </div>

                {/* Insights */}
                <div style={{ background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ marginTop: 0 }}>💡 AI Insights</h3>
                    <div style={{ marginBottom: '10px' }}>
                        <strong>Strengths:</strong>
                        <ul style={{ margin: '5px 0', paddingLeft: '20px', color: '#48bb78' }}>
                            {analysis.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                    </div>
                    <div>
                        <strong>Areas for Improvement:</strong>
                        <ul style={{ margin: '5px 0', paddingLeft: '20px', color: '#f56565' }}>
                            {analysis.weaknesses?.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                    </div>
                </div>

                {/* Future Prediction */}
                {analysis.futurePrediction && (
                    <div style={{ gridColumn: '1 / -1', background: 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)', padding: '25px', borderRadius: '15px', color: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: '0 0 10px 0', color: '#63b3ed' }}>🚀 AI Future Predictor</h3>
                                <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>{analysis.futurePrediction.insight}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '14px', opacity: 0.8 }}>Predicted Next Score</div>
                                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#63b3ed' }}>
                                    {analysis.futurePrediction.predictedScore}%
                                    <span style={{ fontSize: '16px', marginLeft: '5px' }}>({analysis.futurePrediction.trend})</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <GradeBasedNotes level={analysis.overallLevel} />
        </div>
    );
};

export default PerformanceAnalyzer;
