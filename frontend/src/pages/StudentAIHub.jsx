import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AIChatbot from '../components/AI/AIChatbot';
import StudyRoadmap from '../components/AI/StudyRoadmap';
import PerformanceAnalyzer from '../components/AI/PerformanceAnalyzer';


const StudentAIHub = ({ user }) => {
    // Safe user retrieval with error handling (fallback to passed prop, then localStorage)
    let studentData = user;
    if (!studentData) {
        try {
            studentData = JSON.parse(localStorage.getItem('user') || 'null');
        } catch (e) {
            console.error('Error parsing user data:', e);
            studentData = null;
        }
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
            fontFamily: 'Inter, sans-serif',
            width: '100%'
        }}>
            {/* Tabs */}
            <div style={{
                marginBottom: '30px',
                display: 'flex',
                justifyContent: 'center',
                gap: '20px',
            }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '12px 25px',
                            background: activeTab === tab.id ? '#6C63FF' : 'white',
                            color: activeTab === tab.id ? 'white' : '#718096',
                            border: activeTab === tab.id ? 'none' : '1px solid #e2e8f0',
                            borderRadius: '30px',
                            boxShadow: activeTab === tab.id ? '0 4px 6px rgba(108, 99, 255, 0.2)' : 'none',
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
            <div style={{ maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>
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
