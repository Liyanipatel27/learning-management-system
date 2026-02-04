import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { jsPDF } from 'jspdf';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

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

const SubjectDetailModal = ({ subject, onClose }) => {
    if (!subject) return null;

    const scoreData = subject.scores.map((s, i) => ({
        quiz: `Quiz ${i + 1}`,
        score: s.score
    }));

    const performanceStatus = subject.averageScore >= 80 ? 'Excellent' :
        subject.averageScore >= 70 ? 'Good' :
            subject.averageScore >= 60 ? 'Average' : 'Needs Improvement';

    const getStatusColor = (status) => {
        if (status === 'Excellent') return '#48bb78';
        if (status === 'Good') return '#3182ce';
        if (status === 'Average') return '#ecc94b';
        return '#f56565';
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                background: 'white', padding: '30px', borderRadius: '15px', maxWidth: '600px', width: '90%',
                maxHeight: '80vh', overflowY: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0 }}>📊 {subject.subject} Performance</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
                </div>

                {/* Stats Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '20px' }}>
                    <div style={{ background: '#f7fafc', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3182ce' }}>{subject.averageScore}%</div>
                        <div style={{ fontSize: '12px', color: '#718096' }}>Average Score</div>
                    </div>
                    <div style={{ background: '#f0fff4', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#48bb78' }}>{subject.highestScore}%</div>
                        <div style={{ fontSize: '12px', color: '#718096' }}>Highest Score</div>
                    </div>
                    <div style={{ background: '#fff5f5', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f56565' }}>{subject.lowestScore}%</div>
                        <div style={{ fontSize: '12px', color: '#718096' }}>Lowest Score</div>
                    </div>
                </div>

                {/* Performance Status */}
                <div style={{
                    background: performanceStatus === 'Excellent' ? '#f0fff4' :
                        performanceStatus === 'Good' ? '#ebf8ff' :
                            performanceStatus === 'Average' ? '#fffff0' : '#fff5f5',
                    padding: '15px', borderRadius: '10px', marginBottom: '20px', textAlign: 'center'
                }}>
                    <span style={{ fontSize: '18px', fontWeight: 'bold' }}>Performance: </span>
                    <span style={{ color: getStatusColor(performanceStatus) }}>{performanceStatus}</span>
                </div>

                {/* Quiz Progress Chart */}
                <h4 style={{ marginBottom: '10px' }}>📈 Quiz Progress</h4>
                <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={scoreData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="quiz" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip formatter={(value) => [`${value}%`, 'Score']} />
                        <Area type="monotone" dataKey="score" stroke="#3182ce" fill="#3182ce" fillOpacity={0.3} />
                    </AreaChart>
                </ResponsiveContainer>

                {/* Individual Scores */}
                <h4 style={{ marginTop: '20px', marginBottom: '10px' }}>📝 Individual Quiz Scores</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {subject.scores.map((s, i) => (
                        <div key={i} style={{
                            padding: '10px 15px', borderRadius: '8px',
                            background: s.score >= 80 ? '#f0fff4' : s.score >= 60 ? '#fffff0' : '#fff5f5',
                            border: `2px solid ${s.score >= 80 ? '#48bb78' : s.score >= 60 ? '#ecc94b' : '#f56565'}`
                        }}>
                            <div style={{ fontWeight: 'bold' }}>Quiz {i + 1}</div>
                            <div style={{ fontSize: '20px' }}>{s.score}%</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Calculate grades from courses and allProgress (same logic as GradesSection)
const calculateGrades = (courses, allProgress) => {
    return courses.map(course => {
        const progress = allProgress.find(p => p.course.toString() === course._id.toString());

        const moduleGrades = [];
        course.chapters.forEach(chapter => {
            chapter.modules.forEach(module => {
                if (module.quiz && module.quiz.questions && module.quiz.questions.length > 0) {
                    const completedModule = progress?.completedModules?.find(
                        cm => cm.moduleId.toString() === module._id.toString()
                    );

                    moduleGrades.push({
                        chapterTitle: chapter.title,
                        moduleTitle: module.title,
                        quizExists: true,
                        score: completedModule?.score || null,
                        isFastTracked: completedModule?.isFastTracked || false,
                        completedAt: completedModule?.completedAt || null
                    });
                }
            });
        });

        // Calculate course average
        const completedScores = moduleGrades.filter(m => m.score !== null).map(m => m.score);
        const averageScore = completedScores.length > 0
            ? (completedScores.reduce((a, b) => a + b, 0) / completedScores.length).toFixed(1)
            : 0;
        const highestScore = completedScores.length > 0 ? Math.max(...completedScores) : 0;
        const lowestScore = completedScores.length > 0 ? Math.min(...completedScores) : 0;

        return {
            courseId: course._id,
            subject: course.subject,
            teacher: course.teacher?.name || 'Unknown',
            moduleGrades,
            averageScore: parseFloat(averageScore),
            highestScore,
            lowestScore,
            totalModules: moduleGrades.length,
            completedModules: completedScores.length,
            scores: completedScores.map((score, idx) => ({
                moduleTitle: moduleGrades.find(m => m.score === score)?.moduleTitle || `Quiz ${idx + 1}`,
                score
            }))
        };
    }).filter(course => course.moduleGrades.length > 0);
};

const PerformanceAnalyzer = ({ studentId, courses: propCourses, allProgress: propAllProgress }) => {
    const [courses, setCourses] = useState([]);
    const [allProgress, setAllProgress] = useState([]);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedSubject, setSelectedSubject] = useState(null);

    // Fetch courses and progress if not provided as props
    useEffect(() => {
        const fetchData = async () => {
            try {
                if (propCourses && propAllProgress) {
                    setCourses(propCourses);
                    setAllProgress(propAllProgress);
                } else {
                    // Fetch from same endpoints as GradesSection
                    const coursesRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/courses`);
                    setCourses(coursesRes.data);

                    const progressRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/courses/progress/student/${studentId}`);
                    setAllProgress(progressRes.data);
                }
            } catch (err) {
                console.error('Error fetching data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [studentId, propCourses, propAllProgress]);

    // Calculate grades from the same data source as GradesSection
    const gradesData = useMemo(() => {
        return calculateGrades(courses, allProgress);
    }, [courses, allProgress]);

    // Analyze performance with AI
    useEffect(() => {
        const analyzePerformance = async () => {
            if (gradesData.length === 0) {
                setLoading(false);
                return;
            }

            try {
                // Prepare data for AI analysis (same format as GradesSection)
                const analysisData = gradesData.map(g => ({
                    subject: g.subject,
                    averageScore: g.averageScore,
                    highestScore: g.highestScore,
                    lowestScore: g.lowestScore,
                    totalModules: g.totalModules,
                    completedModules: g.completedModules,
                    scores: g.scores.map(s => s.score)
                }));

                const res = await axios.post('http://localhost:5000/api/ai/analyze-performance', {
                    studentId,
                    performanceData: analysisData
                });
                setAnalysis(res.data);
            } catch (err) {
                console.error('Error analyzing performance:', err);
            } finally {
                setLoading(false);
            }
        };

        if (gradesData.length > 0) {
            analyzePerformance();
        }
    }, [gradesData, studentId]);

    if (loading) return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', color: '#718096' }}>Loading Performance Analytics...</div>
            <div style={{ marginTop: '20px' }}>
                <div style={{
                    width: '50px', height: '50px', border: '4px solid #e2e8f0', borderTop: '4px solid #3182ce',
                    borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto'
                }}></div>
            </div>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );

    if (gradesData.length === 0) return (
        <div style={{ padding: '40px', textAlign: 'center', color: '#718096' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📊</div>
            <h3>No Performance Data Available</h3>
            <p>Complete some quizzes in the My Grades section to see your performance analytics!</p>
        </div>
    );

    const getLevelColor = (level) => {
        if (level === 'High') return '#48bb78';
        if (level === 'Good') return '#4299e1';
        if (level === 'Average') return '#ecc94b';
        return '#f56565';
    };

    // Overall performance data for bar chart
    const overallData = gradesData.map(g => ({
        name: g.subject,
        score: g.averageScore,
        fullMark: 100
    }));

    return (
        <div style={{ padding: '20px', fontFamily: 'Inter, sans-serif' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>📊 AI Performance Analyzer</h2>

            {/* Overall Performance Graph */}
            <div style={{
                background: 'white', padding: '25px', borderRadius: '15px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '20px'
            }}>
                <h3 style={{ marginTop: 0, marginBottom: '20px' }}>🎯 Overall Performance Across All Subjects</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={overallData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} />
                        <YAxis type="category" dataKey="name" width={100} />
                        <Tooltip formatter={(value) => [`${value}%`, 'Score']} />
                        <Legend />
                        <Bar dataKey="score" fill="#3182ce" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Subject Cards Grid */}
            <div style={{
                background: 'white', padding: '25px', borderRadius: '15px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '20px'
            }}>
                <h3 style={{ marginTop: 0, marginBottom: '20px' }}>📚 Individual Subject Performance</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                    {gradesData.map((grade, i) => (
                        <div
                            key={i}
                            onClick={() => setSelectedSubject(grade)}
                            style={{
                                background: grade.averageScore >= 80 ? '#f0fff4' :
                                    grade.averageScore >= 60 ? '#fffff0' : '#fff5f5',
                                padding: '20px', borderRadius: '12px', cursor: 'pointer',
                                border: `2px solid ${grade.averageScore >= 80 ? '#48bb78' :
                                    grade.averageScore >= 60 ? '#ecc94b' : '#f56565'}`,
                                transition: 'transform 0.2s, box-shadow 0.2s'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                            <div style={{ fontWeight: '600', marginBottom: '10px', fontSize: '16px' }}>{grade.subject}</div>
                            <div style={{ fontSize: '32px', fontWeight: 'bold', color: grade.averageScore >= 80 ? '#48bb78' : grade.averageScore >= 60 ? '#d69e2e' : '#f56565' }}>
                                {grade.averageScore}%
                            </div>
                            <div style={{ fontSize: '12px', color: '#718096', marginTop: '5px' }}>
                                {grade.completedModules}/{grade.totalModules} quizzes
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* AI Analysis Section */}
            {analysis && (
                <>
                    {/* Score Card & Insights */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        {/* Overall Level Card - Circle Graph */}
                        <div style={{
                            background: 'white', padding: '25px', borderRadius: '15px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <div style={{ fontSize: '18px', color: '#718096', marginBottom: '10px' }}>Overall Level</div>

                            <div style={{ width: '200px', height: '200px', position: 'relative' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Score', value: analysis.overallScore },
                                                { name: 'Remaining', value: 100 - analysis.overallScore }
                                            ]}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            startAngle={90}
                                            endAngle={-270}
                                            dataKey="value"
                                        >
                                            <Cell key="score" fill={getLevelColor(analysis.overallLevel)} />
                                            <Cell key="remaining" fill="#edf2f7" />
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{
                                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2d3748' }}>
                                        {analysis.overallScore}%
                                    </div>
                                    <div style={{ fontSize: '16px', fontWeight: '600', color: getLevelColor(analysis.overallLevel) }}>
                                        {analysis.overallLevel}
                                    </div>
                                </div>
                            </div>

                            <div style={{ fontSize: '14px', color: '#a0aec0', marginTop: '10px' }}>
                                (Based on AI Analysis)
                            </div>
                        </div>

                        {/* AI Insights */}
                        <div style={{
                            background: 'white', padding: '25px', borderRadius: '15px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                        }}>
                            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>💡 AI Insights</h3>
                            <div style={{ marginBottom: '15px' }}>
                                <strong style={{ color: '#48bb78' }}>✓ Strengths:</strong>
                                <ul style={{ margin: '5px 0', paddingLeft: '20px', fontSize: '14px' }}>
                                    {analysis.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                                </ul>
                            </div>
                            <div>
                                <strong style={{ color: '#f56565' }}>⚠ Areas to Improve:</strong>
                                <ul style={{ margin: '5px 0', paddingLeft: '20px', fontSize: '14px' }}>
                                    {analysis.weaknesses?.map((w, i) => <li key={i}>{w}</li>)}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Improvement Suggestions */}
                    <div style={{
                        background: 'white', padding: '25px', borderRadius: '15px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '20px'
                    }}>
                        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>🚀 Improvement Suggestions</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                            {analysis.improvementSuggestions?.map((tip, i) => (
                                <div key={i} style={{
                                    background: '#ebf8ff', padding: '15px', borderRadius: '10px',
                                    borderLeft: '4px solid #3182ce'
                                }}>
                                    <span style={{ fontWeight: 'bold' }}>Tip {i + 1}:</span> {tip}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Subject Analysis */}
                    {analysis.subjectAnalysis && analysis.subjectAnalysis.length > 0 && (
                        <div style={{
                            background: 'white', padding: '25px', borderRadius: '15px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '20px'
                        }}>
                            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>📊 Subject-by-Subject Analysis</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={analysis.subjectAnalysis.map(s => ({
                                    subject: s.subject,
                                    score: s.averageScore
                                }))}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="subject" />
                                    <YAxis domain={[0, 100]} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="score" stroke="#3182ce" strokeWidth={3} dot={{ fill: '#3182ce', r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Future Prediction */}
                    {analysis.futurePrediction && (
                        <div style={{
                            background: 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)',
                            padding: '25px', borderRadius: '15px', color: 'white',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '20px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                                <div>
                                    <h3 style={{ margin: '0 0 10px 0', color: '#63b3ed' }}>🚀 AI Future Predictor</h3>
                                    <p style={{ margin: 0, fontSize: '14px', opacity: 0.9, maxWidth: '500px' }}>
                                        {analysis.futurePrediction.insight}
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '14px', opacity: 0.8 }}>Predicted Next Score</div>
                                    <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#63b3ed' }}>
                                        {analysis.futurePrediction.predictedScore}%
                                        <span style={{ fontSize: '16px', marginLeft: '5px', color: '#48bb78' }}>
                                            ({analysis.futurePrediction.trend} 📈)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <GradeBasedNotes level={analysis.overallLevel} />
                </>
            )}

            {/* Subject Detail Modal */}
            {selectedSubject && (
                <SubjectDetailModal
                    subject={selectedSubject}
                    onClose={() => setSelectedSubject(null)}
                />
            )}
        </div>
    );
};

export default PerformanceAnalyzer;
