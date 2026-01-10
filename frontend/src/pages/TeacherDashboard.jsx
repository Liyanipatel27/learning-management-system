import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CourseBuilder from './CourseBuilder';

function TeacherDashboard() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const navigate = useNavigate();
    const [showCourseBuilder, setShowCourseBuilder] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [courses, setCourses] = useState([]);

    useEffect(() => {
        const userId = user.id || user._id;
        if (userId) {
            fetchCourses(userId);
        }
    }, [user.id, user._id]);

    const fetchCourses = async (userId) => {
        try {
            const res = await axios.get(`http://localhost:5000/api/courses/teacher/${userId}`);
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
        <div className="dashboard-container" style={{ display: 'flex', minHeight: '100vh', background: '#f7fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
            <aside className="sidebar" style={{
                width: '260px',
                background: '#1a202c',
                color: 'white',
                padding: '30px 20px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '4px 0 10px rgba(0,0,0,0.05)',
                position: 'fixed',
                height: '100vh',
                zIndex: 100
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', padding: '0 10px' }}>
                    <div style={{ width: '32px', height: '32px', background: '#6366f1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: 'white', fontWeight: 'bold' }}>L</span>
                    </div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, letterSpacing: '-0.02em' }}>LMS Academy</h2>
                </div>
                <nav style={{ flex: 1 }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        <li
                            onClick={() => setShowCourseBuilder(false)}
                            style={{
                                padding: '12px 16px',
                                borderRadius: '10px',
                                marginBottom: '8px',
                                cursor: 'pointer',
                                background: !showCourseBuilder ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                color: !showCourseBuilder ? '#818cf8' : '#a0aec0',
                                fontWeight: !showCourseBuilder ? '600' : '500',
                                transition: 'all 0.2s'
                            }}
                        >
                            Dashboard
                        </li>
                        <li
                            onClick={() => setShowCourseBuilder(true)}
                            style={{
                                padding: '12px 16px',
                                borderRadius: '10px',
                                marginBottom: '8px',
                                cursor: 'pointer',
                                background: showCourseBuilder ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                color: showCourseBuilder ? '#818cf8' : '#a0aec0',
                                fontWeight: showCourseBuilder ? '600' : '500',
                                transition: 'all 0.2s'
                            }}
                        >
                            Create Course
                        </li>
                        <li style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '8px', cursor: 'pointer', color: '#a0aec0' }} onClick={() => alert('Coming Soon!')}>Students</li>
                        <li style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '8px', cursor: 'pointer', color: '#a0aec0' }} onClick={() => alert('Coming Soon!')}>Assignments</li>
                        <li style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '8px', cursor: 'pointer', color: '#a0aec0' }} onClick={() => alert('Coming Soon!')}>Analytics</li>
                    </ul>
                </nav>
                <div
                    onClick={handleLogout}
                    style={{
                        marginTop: 'auto',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        color: '#f87171',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        border: '1px solid rgba(248, 113, 113, 0.2)'
                    }}
                >
                    Logout
                </div>
            </aside>

            <main className="main-content" style={{ flex: 1, marginLeft: '260px', padding: '40px' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <div>
                        <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1a202c', margin: '0 0 4px 0' }}>Instructor Portal</h1>
                        <p style={{ color: '#718096', margin: 0 }}>Welcome back, <span style={{ color: '#4a5568', fontWeight: '600' }}>{user.name}</span>! Ready to inspire today?</p>
                    </div>
                    <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'white', padding: '8px 16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0, fontWeight: '600', fontSize: '0.9rem', color: '#2d3748' }}>{user.name}</p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#718096' }}>Instructor</p>
                        </div>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                            {user.name ? user.name.charAt(0).toUpperCase() : 'T'}
                        </div>
                    </div>
                </header>

                {showCourseBuilder || selectedCourse ? (
                    <CourseBuilder
                        teacherId={user.id || user._id}
                        initialCourse={selectedCourse}
                        onCourseCreated={() => {
                            setShowCourseBuilder(false);
                            setSelectedCourse(null);
                            fetchCourses(user.id || user._id);
                        }}
                    />
                ) : (
                    <>
                        <section className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                            <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                                <h3 style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '10px' }}>Active Courses</h3>
                                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2D3748' }}>{courses.length}</p>
                            </div>
                            <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                                <h3 style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '10px' }}>Total Students</h3>
                                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#6C63FF' }}>142</p>
                            </div>
                            <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                                <h3 style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '10px' }}>Pending Grading</h3>
                                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FF6584' }}>15</p>
                            </div>
                        </section>

                        <section>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1a202c', margin: 0 }}>Your Courses</h2>
                                <button
                                    onClick={() => setShowCourseBuilder(true)}
                                    style={{ padding: '10px 20px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px rgba(99, 102, 241, 0.2)' }}
                                >
                                    + Create New
                                </button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                                {courses.map(course => (
                                    <div
                                        key={course._id}
                                        style={{
                                            background: 'white',
                                            padding: '24px',
                                            borderRadius: '20px',
                                            boxShadow: '0 4px 6px rgba(0,0,0,0.02), 0 10px 15px -3px rgba(0,0,0,0.03)',
                                            cursor: 'pointer',
                                            transition: 'transform 0.2s, box-shadow 0.2s',
                                            border: '1px solid #edf2f7'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-4px)';
                                            e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.02), 0 10px 15px -3px rgba(0,0,0,0.03)';
                                        }}
                                        onClick={() => setSelectedCourse(course)}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                            <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700' }}>
                                                Development
                                            </div>
                                            <div style={{ color: '#cbd5e0' }}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
                                            </div>
                                        </div>
                                        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: '700', color: '#2d3748' }}>{course.subject}</h3>
                                        <p style={{ fontSize: '0.875rem', color: '#718096', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
                                            {course.chapters.length} Chapters
                                        </p>
                                        <div style={{ height: '1px', background: '#edf2f7', marginBottom: '16px' }}></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#4a5568' }}>4.8</span>
                                                <svg style={{ color: '#fbbf24' }} width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" /></svg>
                                            </div>
                                            <span style={{ color: '#6366f1', fontSize: '0.875rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                Manage <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {courses.length === 0 && (
                                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', background: 'white', borderRadius: '20px', border: '2px dashed #edf2f7' }}>
                                        <p style={{ color: '#718096', fontSize: '1.1rem' }}>No courses created yet. Start by creating your first subject!</p>
                                        <button
                                            onClick={() => setShowCourseBuilder(true)}
                                            style={{ marginTop: '16px', padding: '10px 24px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}
                                        >
                                            Create Course
                                        </button>
                                    </div>
                                )}
                            </div>
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}

export default TeacherDashboard;
