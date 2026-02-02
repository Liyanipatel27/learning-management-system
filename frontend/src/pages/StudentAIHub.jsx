import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AIChatbot from '../components/AI/AIChatbot';
import StudyRoadmap from '../components/AI/StudyRoadmap';
import PerformanceAnalyzer from '../components/AI/PerformanceAnalyzer';


const StudentAIHub = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Safe user retrieval with error handling
    let studentData = null;
    try {
        studentData = location.state?.student || JSON.parse(localStorage.getItem('user') || 'null');
    } catch (e) {
        console.error('Error parsing user data:', e);
        studentData = null;
    }

    const student = studentData;
    const [activeTab, setActiveTab] = useState('roadmap');
    const [courses, setCourses] = useState([]);
    const [allProgress, setAllProgress] = useState([]);

    // Fetch courses and progress data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const coursesRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/courses`);
                setCourses(coursesRes.data);

                const studentId = student?._id || student?.id;
                if (studentId) {
                    const progressRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/courses/progress/student/${studentId}`);
                    setAllProgress(progressRes.data);
                }
            } catch (err) {
                console.error('Error fetching data:', err);
            }
        };

        if (student) {
            fetchData();
        }
    }, [student]);

    if (!student) return <div style={{ padding: '20px', textAlign: 'center' }}>Please log in first.</div>;

    const tabs = [
        { id: 'roadmap', label: '🗺️ Study Roadmap', component: <StudyRoadmap studentId={student._id} subjects={[]} /> },
        { id: 'performance', label: '📊 Performance', component: <PerformanceAnalyzer studentId={student._id} courses={courses} allProgress={allProgress} /> },
        { id: 'aitutor', label: '🤖 AI Tutor', component: <AIChatbot studentName={student.name} embedded={true} /> }
    ];

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            fontFamily: 'Inter, sans-serif'
        }}>
            {/* Header */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                padding: '20px 40px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'sticky',
                top: 0,
                zIndex: 100
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <button
                        onClick={() => navigate(-1)}
                        style={{
                            background: '#eff6ff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            cursor: 'pointer',
                            fontSize: '20px',
                            color: '#3182ce',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#dbeafe'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#eff6ff'}
                    >
                        ←
                    </button>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '28px', background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '800' }}>
                            AI Learning Hub
                        </h1>
                        <p style={{ margin: '5px 0 0', color: '#718096', fontSize: '14px' }}>Supercharge your learning with AI</p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '600', color: '#2d3748' }}>{student.name}</div>
                        <div style={{ fontSize: '12px', color: '#a0aec0' }}>Student</div>
                    </div>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                    }}>
                        {student.name.charAt(0)}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{
                padding: '20px 40px',
                display: 'flex',
                justifyContent: 'center',
                gap: '20px',
                background: 'rgba(255,255,255,0.5)'
            }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '12px 25px',
                            background: activeTab === tab.id ? 'white' : 'transparent',
                            color: activeTab === tab.id ? '#5a67d8' : '#718096',
                            border: 'none',
                            borderRadius: '30px',
                            boxShadow: activeTab === tab.id ? '0 4px 6px rgba(90, 103, 216, 0.15)' : 'none',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '15px',
                            transition: 'all 0.3s ease',
                            transform: activeTab === tab.id ? 'translateY(-2px)' : 'none'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div style={{ padding: '30px 40px', maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>
                <style>
                    {`
                        @keyframes fadeIn {
                            from { opacity: 0; transform: translateY(10px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                    `}
                </style>
                <ErrorBoundary key={activeTab}>
                    {tabs.find(t => t.id === activeTab)?.component}
                </ErrorBoundary>
            </div>
        </div>
    );
};

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error("ErrorBoundary caught an error", error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', color: 'red', textAlign: 'center', background: '#fff0f0', borderRadius: '8px' }}>
                    <h3>Something went wrong.</h3>
                    <p>{this.state.error?.toString()}</p>
                    <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', cursor: 'pointer' }}>Reload Page</button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default StudentAIHub;
