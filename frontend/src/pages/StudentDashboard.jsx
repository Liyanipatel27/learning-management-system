import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function StudentDashboard() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            // In a real app, this might be /api/courses/enrolled or similar
            // For now, fetching all courses
            const res = await axios.get('http://localhost:5000/api/courses');
            setCourses(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <div className="dashboard-container">
            <aside className="sidebar">
                <h2 style={{ fontSize: '1.5rem', marginBottom: '30px', fontWeight: '700' }}>LMS Student</h2>
                <nav>
                    <div className={`nav-item ${!selectedCourse ? 'active' : ''}`} onClick={() => setSelectedCourse(null)}>Dashboard</div>
                    <div className="nav-item" onClick={() => alert('Courses Module Coming Soon!')}>My Courses</div>
                    <div className="nav-item" onClick={() => alert('Assignments Module Coming Soon!')}>Assignments</div>
                    <div className="nav-item" onClick={() => alert('Grades Module Coming Soon!')}>Grades</div>
                    <div className="nav-item" onClick={() => alert('Profile Module Coming Soon!')}>Profile</div>
                    <div
                        className="nav-item"
                        onClick={handleLogout}
                        style={{ marginTop: '50px', cursor: 'pointer', borderTop: '1px solid rgba(255,255,255,0.2)' }}
                    >
                        Logout
                    </div>
                </nav>
            </aside>

            <main className="main-content">
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', color: '#2D3748' }}>Dashboard</h1>
                        <p style={{ color: '#718096' }}>Welcome back, {user.name}!</p>
                    </div>
                    <div className="user-profile" style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#6C63FF', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                    </div>
                </header>

                {selectedCourse ? (
                    <CourseViewer course={selectedCourse} onBack={() => setSelectedCourse(null)} />
                ) : (
                    <>
                        <section className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                            {/* Card 1 */}
                            <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                                <h3 style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '10px' }}>Available Courses</h3>
                                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2D3748' }}>{courses.length}</p>
                            </div>

                            {/* Card 2 */}
                            <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                                <h3 style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '10px' }}>Pending Assignments</h3>
                                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FF6584' }}>2</p>
                            </div>

                            {/* Card 3 */}
                            <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                                <h3 style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '10px' }}>Attendance</h3>
                                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#38B2AC' }}>95%</p>
                            </div>
                        </section>

                        <section style={{ marginTop: '40px' }}>
                            <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', color: '#2D3748' }}>Available Courses</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                                {courses.map(course => (
                                    <div key={course._id} style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', cursor: 'pointer' }} onClick={() => setSelectedCourse(course)}>
                                        <h3 style={{ margin: '0 0 10px 0' }}>{course.subject}</h3>
                                        {/* <p style={{ color: '#666', fontSize: '0.9rem' }}>{course.subject}</p> Removed redundant subject line */}
                                        {/* <p style={{ fontSize: '0.8rem', color: '#888' }}>{course.description}</p> Removed description */}
                                        <div style={{ marginTop: '15px', fontSize: '0.8rem', color: '#555' }}>
                                            Teacher: {course.teacher?.name || 'Unknown'}
                                        </div>
                                    </div>
                                ))}
                                {courses.length === 0 && <p>No courses available right now.</p>}
                            </div>
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}

const CourseViewer = ({ course, onBack }) => {
    // State to track expanded chapters and modules
    const [expandedChapters, setExpandedChapters] = useState({});
    const [expandedModules, setExpandedModules] = useState({});

    const toggleChapter = (chapterId) => {
        setExpandedChapters(prev => ({
            ...prev,
            [chapterId]: !prev[chapterId]
        }));
    };

    const toggleModule = (moduleId) => {
        setExpandedModules(prev => ({
            ...prev,
            [moduleId]: !prev[moduleId]
        }));
    };

    return (
        <div style={{ background: 'white', padding: '20px', borderRadius: '15px' }}>
            <button onClick={onBack} style={{ marginBottom: '20px', border: 'none', background: 'transparent', color: '#666', cursor: 'pointer' }}>&larr; Back to Subjects</button>
            <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>Subject: {course.subject}</h1>

            <div className="course-content">
                {course.chapters.map(chapter => (
                    <div key={chapter._id} style={{ marginBottom: '10px', border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
                        {/* Chapter Header */}
                        <div
                            onClick={() => toggleChapter(chapter._id)}
                            style={{
                                padding: '15px',
                                background: '#f8f9fa',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontWeight: 'bold'
                            }}
                        >
                            <span>{chapter.title}</span>
                            <span>{expandedChapters[chapter._id] ? '▲' : '▼'}</span>
                        </div>

                        {/* Modules List (shown if chapter expanded) */}
                        {expandedChapters[chapter._id] && (
                            <div style={{ padding: '15px' }}>
                                {chapter.modules.map(module => (
                                    <div key={module._id} style={{ marginBottom: '10px', marginLeft: '15px' }}>
                                        {/* Module Header */}
                                        <div
                                            onClick={() => toggleModule(module._id)}
                                            style={{
                                                cursor: 'pointer',
                                                color: '#444',
                                                fontWeight: '500',
                                                padding: '8px',
                                                borderLeft: '3px solid #6C63FF',
                                                background: '#fff',
                                                marginBottom: '5px'
                                            }}
                                        >
                                            {module.title}
                                        </div>

                                        {/* Content List (shown if module expanded) */}
                                        {expandedModules[module._id] && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '15px' }}>
                                                {module.contents.map(content => (
                                                    <div key={content._id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: '#f0f0f5', borderRadius: '5px' }}>
                                                        <span style={{ fontWeight: 'bold', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: '#ddd' }}>{content.type}</span>
                                                        <a
                                                            href={content.type === 'link' ? content.url : `http://localhost:5000${content.url}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{ color: '#007bff', textDecoration: 'none' }}
                                                        >
                                                            {content.title}
                                                        </a>
                                                    </div>
                                                ))}
                                                {module.contents.length === 0 && <span style={{ color: '#aaa', fontSize: '0.8rem' }}>No content.</span>}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {chapter.modules.length === 0 && <div style={{ color: '#aaa', fontStyle: 'italic' }}>No modules.</div>}
                            </div>
                        )}
                    </div>
                ))}
                {course.chapters.length === 0 && <p>No chapters in this subject yet.</p>}
            </div>
        </div>
    );
};

export default StudentDashboard;
