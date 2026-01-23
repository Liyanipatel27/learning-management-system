import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CourseBuilder from './CourseBuilder';

function TeacherDashboard() {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'my-courses', 'create-course'
    const [selectedCourse, setSelectedCourse] = useState(null); // For editing existing
    const [courses, setCourses] = useState([]);

    useEffect(() => {
        const userId = user.id || user._id;
        if (userId) {
            fetchCourses(userId);
        }
    }, [user.id, user._id]);

    const fetchCourses = async (userId) => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/courses/teacher/${userId}`);
            setCourses(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const deleteCourse = async (courseId, e) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this course? This will remove all chapters and modules.')) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/courses/${courseId}`);
            fetchCourses(user.id || user._id);
        } catch (err) {
            console.error(err);
            alert('Error deleting course');
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('token');
        navigate('/login');
    };

    // Filtered lists
    const publishedCourses = courses.filter(c => c.isPublished);
    const draftCourses = courses.filter(c => !c.isPublished);

    return (
        <div className="dashboard-container">
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
                        {[
                            { id: 'dashboard', label: 'Dashboard' },
                            { id: 'my-courses', label: 'My Courses' },
                            { id: 'create-course', label: 'Create Course' }
                        ].map(item => (
                            <li
                                key={item.id}
                                onClick={() => { setActiveTab(item.id); setSelectedCourse(null); }}
                                style={{
                                    padding: '12px 16px',
                                    borderRadius: '10px',
                                    marginBottom: '8px',
                                    cursor: 'pointer',
                                    background: activeTab === item.id ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                    color: activeTab === item.id ? '#818cf8' : '#a0aec0',
                                    fontWeight: activeTab === item.id ? '600' : '500',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {item.label}
                            </li>
                        ))}
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
                        <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1a202c', margin: '0 0 4px 0' }}>
                            {activeTab === 'dashboard' ? 'Instructor Portal' :
                                activeTab === 'my-courses' ? 'My Courses' : 'Course Builder'}
                        </h1>
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

                {(activeTab === 'create-course' || selectedCourse) ? (
                    <CourseBuilder
                        teacherId={user.id || user._id}
                        initialCourse={selectedCourse}
                        onCourseCreated={() => {
                            setActiveTab('my-courses');
                            setSelectedCourse(null);
                            fetchCourses(user.id || user._id);
                        }}
                    />
                ) : activeTab === 'my-courses' ? (
                    <div>
                        {/* Published Section */}
                        <section style={{ marginBottom: '40px' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#2d3748', marginBottom: '20px', borderBottom: '2px solid #10b981', paddingBottom: '10px', display: 'inline-block' }}>
                                Published Courses
                            </h3>
                            {publishedCourses.length === 0 ? (
                                <p style={{ color: '#718096', fontStyle: 'italic' }}>No published courses yet.</p>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                                    {publishedCourses.map(course => (
                                        <CourseCard
                                            key={course._id}
                                            course={course}
                                            onEdit={() => setSelectedCourse(course)}
                                            onDelete={(e) => deleteCourse(course._id, e)}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Drafts Section */}
                        <section>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#2d3748', marginBottom: '20px', borderBottom: '2px solid #f59e0b', paddingBottom: '10px', display: 'inline-block' }}>
                                Drafts
                            </h3>
                            {draftCourses.length === 0 ? (
                                <p style={{ color: '#718096', fontStyle: 'italic' }}>No drafts currently.</p>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                                    {draftCourses.map(course => (
                                        <CourseCard
                                            key={course._id}
                                            course={course}
                                            onEdit={() => setSelectedCourse(course)}
                                            onDelete={(e) => deleteCourse(course._id, e)}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                ) : (
                    // Dashboard View
                    <>
                        <section className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                            <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                                <h3 style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '10px' }}>Active Courses</h3>
                                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2D3748' }}>{publishedCourses.length}</p>
                            </div>
                            <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                                <h3 style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '10px' }}>Drafts</h3>
                                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>{draftCourses.length}</p>
                            </div>
                            <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                                <h3 style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '10px' }}>Pending Grading</h3>
                                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FF6584' }}>15</p>
                            </div>
                        </section>

                        <div style={{ background: '#f8fafc', padding: '30px', borderRadius: '20px', textAlign: 'center' }}>
                            <h2 style={{ fontSize: '1.5rem', color: '#2d3748', marginBottom: '15px' }}>Quick Start</h2>
                            <p style={{ color: '#718096', marginBottom: '25px' }}>Start creating a new course structure or finish a draft.</p>
                            <button
                                onClick={() => setActiveTab('create-course')}
                                style={{ padding: '12px 30px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 6px rgba(99, 102, 241, 0.3)' }}
                            >
                                + Create New Course
                            </button>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

// Helper Component for Course Card
const CourseCard = ({ course, onEdit, onDelete }) => (
    <div
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
        onClick={onEdit}
    >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700' }}>
                Development
            </div>
            <div style={{
                background: course.isPublished ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                color: course.isPublished ? '#10b981' : '#f59e0b',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: '700',
                marginLeft: '8px'
            }}>
                {course.isPublished ? 'PUBLISHED' : 'DRAFT'}
            </div>
            <div style={{ color: '#cbd5e0', display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                <div
                    onClick={onDelete}
                    style={{ color: '#f87171', padding: '4px', borderRadius: '4px', cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(248, 113, 113, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    title="Delete Course"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </div>
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
);

export default TeacherDashboard;
