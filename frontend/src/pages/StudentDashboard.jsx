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
    const [selectedContent, setSelectedContent] = useState(null);

    useEffect(() => {
        console.log('Selected Content Changed:', selectedContent);
    }, [selectedContent]);

    // Auto-select first content if available
    useEffect(() => {
        if (course.chapters.length > 0) {
            const firstChapter = course.chapters[0];
            setExpandedChapters({ [firstChapter._id]: true });
            if (firstChapter.modules.length > 0) {
                const firstModule = firstChapter.modules[0];
                setExpandedModules({ [firstModule._id]: true });
                if (firstModule.contents.length > 0) {
                    setSelectedContent(firstModule.contents[0]);
                }
            }
        }
    }, [course]);

    const toggleChapter = (chapterId) => {
        setExpandedChapters(prev => ({
            ...prev,
            [chapterId]: !prev[chapterId]
        }));
    };

    const toggleModule = (moduleId) => {
        setExpandedModules(prev => {
            const isExpanding = !prev[moduleId];
            if (isExpanding) {
                // Find module and its first content
                for (const chapter of course.chapters) {
                    const module = chapter.modules.find(m => m._id === moduleId);
                    if (module && module.contents.length > 0) {
                        setSelectedContent(module.contents[0]);
                        break;
                    }
                }
            }
            return {
                ...prev,
                [moduleId]: isExpanding
            };
        });
    };

    const getContentUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        const fullUrl = `http://localhost:5000${url}`;
        // Encode URI to handle spaces and special characters in filenames
        return encodeURI(fullUrl);
    };

    return (
        <div style={{ background: 'white', padding: '20px', borderRadius: '15px' }}>
            <button onClick={onBack} style={{ marginBottom: '20px', border: 'none', background: 'transparent', color: '#666', cursor: 'pointer' }}>&larr; Back to Subjects</button>
            <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>Subject: {course.subject}</h1>

            <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '30px', marginTop: '20px' }}>
                <div className="course-sidebar" style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto', paddingRight: '10px' }}>
                    {course.chapters.map(chapter => (
                        <div key={chapter._id} style={{ marginBottom: '10px', border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
                            {/* Chapter Header */}
                            <div
                                onClick={() => toggleChapter(chapter._id)}
                                style={{
                                    padding: '12px 15px',
                                    background: '#f8f9fa',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem'
                                }}
                            >
                                <span>{chapter.title}</span>
                                <span style={{ fontSize: '0.8rem' }}>{expandedChapters[chapter._id] ? '▲' : '▼'}</span>
                            </div>

                            {/* Modules List (shown if chapter expanded) */}
                            {expandedChapters[chapter._id] && (
                                <div style={{ padding: '10px' }}>
                                    {chapter.modules.map(module => (
                                        <div key={module._id} style={{ marginBottom: '10px' }}>
                                            {/* Module Header */}
                                            <div
                                                onClick={() => toggleModule(module._id)}
                                                style={{
                                                    cursor: 'pointer',
                                                    color: '#444',
                                                    fontWeight: '600',
                                                    padding: '8px',
                                                    borderLeft: '3px solid #6C63FF',
                                                    background: expandedModules[module._id] ? '#f0efff' : '#fff',
                                                    marginBottom: '5px',
                                                    fontSize: '0.85rem',
                                                    display: 'flex',
                                                    justifyContent: 'space-between'
                                                }}
                                            >
                                                <span>{module.title}</span>
                                                <span style={{ fontSize: '0.7rem' }}>{expandedModules[module._id] ? '▲' : '▼'}</span>
                                            </div>

                                            {/* Content List (shown if module expanded) */}
                                            {expandedModules[module._id] && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', paddingLeft: '10px' }}>
                                                    {module.contents.map(content => (
                                                        <div
                                                            key={content._id}
                                                            onClick={() => setSelectedContent(content)}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '10px',
                                                                padding: '8px 12px',
                                                                background: selectedContent?._id === content._id ? '#6C63FF' : '#f8f9fa',
                                                                color: selectedContent?._id === content._id ? 'white' : '#4a5568',
                                                                borderRadius: '6px',
                                                                cursor: 'pointer',
                                                                fontSize: '0.8rem',
                                                                transition: 'all 0.2s',
                                                                border: '1px solid transparent'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                if (selectedContent?._id !== content._id) {
                                                                    e.currentTarget.style.background = '#edf2f7';
                                                                }
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                if (selectedContent?._id !== content._id) {
                                                                    e.currentTarget.style.background = '#f8f9fa';
                                                                }
                                                            }}
                                                        >
                                                            <span style={{
                                                                fontWeight: 'bold',
                                                                fontSize: '0.6rem',
                                                                padding: '2px 5px',
                                                                borderRadius: '3px',
                                                                background: selectedContent?._id === content._id ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                                                                textTransform: 'uppercase'
                                                            }}>
                                                                {content.type}
                                                            </span>
                                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {content.title}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {module.contents.length === 0 && <span style={{ color: '#aaa', fontSize: '0.75rem', padding: '5px' }}>No content.</span>}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {chapter.modules.length === 0 && <div style={{ color: '#aaa', fontStyle: 'italic', fontSize: '0.8rem' }}>No modules.</div>}
                                </div>
                            )}
                        </div>
                    ))}
                    {course.chapters.length === 0 && <p>No chapters in this subject yet.</p>}
                </div>

                <div className="content-view-area" style={{ background: '#f8fafc', borderRadius: '15px', padding: '20px', border: '1px solid #edf2f7', minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
                    {selectedContent ? (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#2d3748' }}>{selectedContent.title}</h2>
                                    <span style={{ fontSize: '0.8rem', color: '#718096' }}>Type: {selectedContent.type.toUpperCase()}</span>
                                </div>
                                {selectedContent.type === 'link' && (
                                    <a
                                        href={selectedContent.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ padding: '8px 16px', background: '#6C63FF', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 'bold' }}
                                    >
                                        Open Link
                                    </a>
                                )}
                                {selectedContent.type !== 'link' && (
                                    <a
                                        href={getContentUrl(selectedContent.url)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ padding: '8px 16px', background: '#6C63FF', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 'bold' }}
                                    >
                                        Open In New Tab
                                    </a>
                                )}
                            </div>

                            <div style={{ flex: 1, background: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                                {selectedContent.type === 'pdf' ? (
                                    <iframe
                                        src={`${getContentUrl(selectedContent.url)}`}
                                        width="100%"
                                        height="700px"
                                        style={{ border: 'none' }}
                                        title={selectedContent.title}
                                    />
                                ) : selectedContent.type === 'link' ? (
                                    <div style={{ padding: '60px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🔗</div>
                                        <h3>External Content</h3>
                                        <p style={{ color: '#718096', marginBottom: '20px' }}>This content is hosted on an external website.</p>
                                        <a
                                            href={selectedContent.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: '#6C63FF', fontWeight: 'bold', fontSize: '1.1rem', wordBreak: 'break-all' }}
                                        >
                                            {selectedContent.url}
                                        </a>
                                    </div>
                                ) : selectedContent.type === 'image' ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, padding: '20px', overflow: 'auto' }}>
                                        <img
                                            src={getContentUrl(selectedContent.url)}
                                            alt={selectedContent.title}
                                            style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        />
                                    </div>
                                ) : (
                                    <div style={{ padding: '60px', textAlign: 'center', color: '#718096', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📄</div>
                                        <h3>Preview not available</h3>
                                        <p style={{ marginBottom: '24px' }}>This file type ({selectedContent.type}) cannot be previewed directly.</p>
                                        <a
                                            href={getContentUrl(selectedContent.url)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: 'inline-block',
                                                padding: '12px 24px',
                                                background: '#6C63FF',
                                                color: 'white',
                                                borderRadius: '10px',
                                                textDecoration: 'none',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            Download / View File
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#a0aec0' }}>
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '20px' }}>
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
                            </svg>
                            <p>Select a lesson from the sidebar to start learning</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
