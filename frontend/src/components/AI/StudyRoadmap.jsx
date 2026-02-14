import React, { useState } from 'react';
import axios from 'axios';
import AIStudyMonitor from './AIStudyMonitor';

const StudyRoadmap = ({ studentId, subjects }) => {
    const [targetDate, setTargetDate] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
    const [dailyHours, setDailyHours] = useState(2);
    const [roadmap, setRoadmap] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showMonitor, setShowMonitor] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    const generateRoadmap = async () => {
        setLoading(true);
        try {
            const res = await axios.post('http://localhost:5000/api/ai/roadmap', {
                studentId,
                targetDate,
                startDate,
                dailyHours, // [MODIFIED] Added startDate
                subjects
            });
            setRoadmap(res.data.roadmap);
        } catch (err) {
            console.error(err);
            alert("Failed to generate roadmap");
        } finally {
            setLoading(false);
        }
    };

    const handleStartSession = (task) => {
        setSelectedTask(task);
        setShowMonitor(true);
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Inter, sans-serif' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>🗺️ AI Personalized Study Roadmap</h2>

            {!roadmap ? (
                <div style={{ background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '500px' }}>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                        />
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>When is your exam/goal date?</label>
                        <input
                            type="date"
                            value={targetDate}
                            onChange={(e) => setTargetDate(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Daily Study Hours:</label>
                        <input
                            type="number"
                            value={dailyHours}
                            onChange={(e) => setDailyHours(e.target.value)}
                            min="1" max="12"
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                        />
                    </div>

                    <button
                        onClick={generateRoadmap}
                        disabled={loading || !targetDate}
                        style={{
                            width: '100%', padding: '12px',
                            background: loading ? '#cbd5e0' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold', fontSize: '16px'
                        }}
                    >
                        {loading ? 'Generating Plan...' : 'Generate Roadmap 🚀'}
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
                    {showMonitor && selectedTask ? (
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <h3>Currently Studying: {selectedTask.subject} - {selectedTask.topic}</h3>
                                <button onClick={() => setShowMonitor(false)} style={{ padding: '5px 10px', cursor: 'pointer' }}>Close Monitor</button>
                            </div>
                            <AIStudyMonitor
                                targetHours={selectedTask.hours}
                                onSessionComplete={() => {
                                    alert("Session Completed! Great job!");
                                    // Here we could update backend with progress
                                    setShowMonitor(false);
                                }}
                            />
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '15px' }}>
                            {roadmap.map((day, idx) => (
                                <div key={idx} style={{ background: 'white', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #667eea', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                    <h3 style={{ margin: '0 0 10px 0', color: '#4a5568' }}>Day {day.day} - {day.date}</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {day.tasks.map((task, tIdx) => (
                                            <div key={tIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f7fafc', padding: '10px', borderRadius: '8px' }}>
                                                <div>
                                                    <span style={{ fontWeight: 'bold', color: '#2d3748' }}>{task.subject}:</span> {task.topic}
                                                    <div style={{ fontSize: '12px', color: '#718096' }}>{task.description} • {task.hours} hours</div>
                                                </div>
                                                <button
                                                    onClick={() => handleStartSession(task)}
                                                    style={{ padding: '8px 15px', background: '#48bb78', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                                                >
                                                    Start
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <button
                        onClick={() => setRoadmap(null)}
                        style={{ marginTop: '20px', padding: '10px', background: '#e2e8f0', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                    >
                        Reset Roadmap
                    </button>
                </div>
            )}
        </div>
    );
};

export default StudyRoadmap;
