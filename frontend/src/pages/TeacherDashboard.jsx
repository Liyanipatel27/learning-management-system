import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as XLSX from 'xlsx';
import CourseBuilder from './CourseBuilder';


function TeacherDashboard() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const navigate = useNavigate();
    const [selectedCourse, setSelectedCourse] = useState(null); // For editing existing
    const [activeTab, setActiveTab] = useState(localStorage.getItem(`teacherTab_${user.id || user._id}`) || 'dashboard');
    const [courses, setCourses] = useState([]);
    const [pendingGradingCount, setPendingGradingCount] = useState(0);

    useEffect(() => {
        if (user.id || user._id) {
            localStorage.setItem(`teacherTab_${user.id || user._id}`, activeTab);
        }
    }, [activeTab, user]);

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

            // Fetch pending grading count
            let totalPending = 0;
            const published = res.data.filter(c => c.isPublished);
            for (const course of published) {
                const asgnRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/assignments/course/${course._id}`);
                for (const asgn of asgnRes.data) {
                    const subRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/assignments/assignment/${asgn._id}`);
                    const pending = subRes.data.filter(s => s.status === 'Pending');
                    totalPending += pending.length;
                }
            }
            setPendingGradingCount(totalPending);
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
        localStorage.removeItem('user');
        localStorage.removeItem('token');
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
                            { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
                            { id: 'my-courses', label: 'My Courses', icon: '📚' },
                            { id: 'create-course', label: 'Create Course', icon: '➕' },
                            { id: 'students', label: 'Students List', icon: '👥' },
                            { id: 'assignments', label: 'Assignments', icon: '📝' },
                            { id: 'student-grades', label: 'Student Grades', icon: '📊' },
                            { id: 'profile', label: 'My Profile', icon: '👤' }
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
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}
                            >
                                <span>{item.icon}</span>
                                {item.label}
                            </li>
                        ))}

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
                                activeTab === 'my-courses' ? 'My Courses' :
                                    activeTab === 'students' ? 'Students Directory' :
                                        activeTab === 'student-grades' ? 'Academic Performance' :
                                            activeTab === 'profile' ? 'My Profile' : 'Course Builder'}
                        </h1>
                        <p style={{ color: '#718096', margin: 0 }}>Welcome back, <span style={{ color: '#4a5568', fontWeight: '600' }}>{user.name}</span>! Ready to inspire today?</p>
                    </div>
                    <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'white', padding: '8px 16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0, fontWeight: '600', fontSize: '0.9rem', color: '#2d3748' }}>{user.name}</p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#718096' }}>Instructor {user.employeeId ? `(ID: ${user.employeeId})` : ''}</p>
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
                ) : activeTab === 'students' ? (
                    <StudentsSection />
                ) : activeTab === 'profile' ? (
                    <ProfileSection userId={user.id || user._id} />
                ) : activeTab === 'assignments' ? (
                    <AssignmentsSection teacherId={user.id || user._id} courses={publishedCourses} />
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
                                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FF6584' }}>{pendingGradingCount}</p>
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

const StudentGradesSection = ({ teacherId, allPublishedCourses }) => {
    const [gradesData, setGradesData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourseId, setSelectedCourseId] = useState('all');

    useEffect(() => {
        fetchStudentGrades();
    }, [teacherId]);

    const fetchStudentGrades = async () => {
        if (!teacherId || teacherId === 'undefined') {
            console.warn('[GRADES] No valid teacherId provided. Skipping fetch.');
            setLoading(false);
            return;
        }

        console.log('Fetching student grades for teacherId:', teacherId);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const res = await axios.get(`${apiUrl}/api/courses/grades/teacher/${teacherId}`);
            console.log('Received grades data:', res.data);
            setGradesData(res.data);
        } catch (err) {
            console.error('Error fetching student grades:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredData = selectedCourseId === 'all'
        ? gradesData
        : gradesData.filter(c => c.courseId === selectedCourseId);

    if (loading) return (
        <div style={{ textAlign: 'center', padding: '100px', background: '#fff', borderRadius: '20px' }}>
            <div className="spinner" style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #6366f1', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
            <div style={{ color: '#718096', fontSize: '1.1rem' }}>Analyzing student performance data...</div>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );

    return (
        <div style={{ background: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #edf2f7', paddingBottom: '20px' }}>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1a202c', margin: 0 }}>Student Performance</h2>
                    <p style={{ color: '#718096', margin: '5px 0 0 0' }}>Track quiz results across your courses</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: '#f8fafc', padding: '10px 20px', borderRadius: '12px' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#4a5568' }}>Filter:</label>
                    <select
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', outline: 'none', cursor: 'pointer', color: 'black' }}
                    >
                        <option value="all" style={{ color: 'black' }}>All My Courses</option>
                        {allPublishedCourses.map(course => (
                            <option key={course._id} value={course._id} style={{ color: 'black' }}>{course.subject}</option>
                        ))}
                    </select>
                </div>
            </div>

            {filteredData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 40px', background: '#f8fafc', borderRadius: '15px', border: '2px dashed #e2e8f0' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📁</div>
                    <h3 style={{ color: '#2d3748', fontSize: '1.25rem', marginBottom: '10px' }}>No Quiz Data Found</h3>
                    <p style={{ color: '#718096', maxWidth: '400px', margin: '0 auto' }}>
                        When students pass quizzes in your published courses, their detailed scores and completion dates will appear here.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    {filteredData.map((course) => (
                        <div key={course.courseId} style={{ border: '1px solid #edf2f7', borderRadius: '15px', overflow: 'hidden' }}>
                            <div style={{ background: '#f8fafc', padding: '15px 20px', borderBottom: '1px solid #edf2f7' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#2d3748' }}>Course: {course.courseName}</h3>
                            </div>

                            {course.students.length === 0 ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#a0aec0' }}>No students have started this course yet.</div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: '#fff', borderBottom: '1px solid #edf2f7' }}>
                                                <th style={{ padding: '12px 20px', textAlign: 'left', color: '#718096', fontSize: '0.85rem' }}>Student Details</th>
                                                <th style={{ padding: '12px 20px', textAlign: 'left', color: '#718096', fontSize: '0.85rem' }}>Quiz (Module)</th>
                                                <th style={{ padding: '12px 20px', textAlign: 'center', color: '#718096', fontSize: '0.85rem' }}>Score</th>
                                                <th style={{ padding: '12px 20px', textAlign: 'center', color: '#718096', fontSize: '0.85rem' }}>Status</th>
                                                <th style={{ padding: '12px 20px', textAlign: 'center', color: '#718096', fontSize: '0.85rem' }}>Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {course.students.map((student) => (
                                                <React.Fragment key={student.studentId}>
                                                    {student.quizzes.length === 0 ? (
                                                        <tr style={{ borderBottom: '1px solid #f8fafc' }}>
                                                            <td style={{ padding: '15px 20px' }}>
                                                                <div style={{ fontWeight: '600', color: '#2d3748' }}>{student.studentName}</div>
                                                                <div style={{ fontSize: '0.75rem', color: '#a0aec0' }}>{student.studentEmail}</div>
                                                            </td>
                                                            <td colSpan="4" style={{ padding: '15px 20px', color: '#a0aec0', fontSize: '0.85rem' }}>No quizzes attempted yet.</td>
                                                        </tr>
                                                    ) : (
                                                        student.quizzes.map((quiz, qIdx) => (
                                                            <tr key={`${student.studentId}-${quiz.moduleId}`} style={{ borderBottom: '1px solid #f8fafc' }}>
                                                                {qIdx === 0 && (
                                                                    <td rowSpan={student.quizzes.length} style={{ padding: '15px 20px', verticalAlign: 'top', borderRight: '1px solid #f8fafc' }}>
                                                                        <div style={{ fontWeight: '600', color: '#2d3748' }}>{student.studentName}</div>
                                                                        <div style={{ fontSize: '0.75rem', color: '#a0aec0' }}>{student.studentEmail}</div>
                                                                    </td>
                                                                )}
                                                                <td style={{ padding: '15px 20px' }}>
                                                                    <div style={{ fontSize: '0.85rem', color: '#4a5568' }}>{quiz.chapterTitle}</div>
                                                                    <div style={{ fontSize: '0.9rem', fontWeight: '500', color: '#2d3748' }}>{quiz.moduleTitle}</div>
                                                                </td>
                                                                <td style={{ padding: '15px 20px', textAlign: 'center' }}>
                                                                    {quiz.score !== null ? (
                                                                        <span style={{ fontWeight: 'bold', fontSize: '1rem', color: quiz.score >= 70 ? '#10b981' : '#f87171' }}>
                                                                            {quiz.score}%
                                                                        </span>
                                                                    ) : '-'}
                                                                </td>
                                                                <td style={{ padding: '15px 20px', textAlign: 'center' }}>
                                                                    {quiz.score !== null ? (
                                                                        <span style={{
                                                                            padding: '4px 10px',
                                                                            borderRadius: '20px',
                                                                            fontSize: '0.7rem',
                                                                            fontWeight: 'bold',
                                                                            background: quiz.score >= 70 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(248, 113, 113, 0.1)',
                                                                            color: quiz.score >= 70 ? '#10b981' : '#f87171'
                                                                        }}>
                                                                            {quiz.score >= 70 ? (quiz.isFastTracked ? '⚡ FAST TRACK' : 'PASSED') : 'FAILED'}
                                                                        </span>
                                                                    ) : '-'}
                                                                </td>
                                                                <td style={{ padding: '15px 20px', textAlign: 'center', fontSize: '0.8rem', color: '#718096' }}>
                                                                    {quiz.completedAt ? new Date(quiz.completedAt).toLocaleDateString('en-GB') : '-'}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- NEW SECTION: Students Directory ---
const StudentsSection = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/students`);
            setStudents(res.data);
        } catch (err) {
            console.error('Error fetching students:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>Loading students...</div>;

    return (
        <div style={{ background: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1a202c', margin: 0 }}>Registered Students</h2>
                <button
                    onClick={fetchStudents}
                    style={{ padding: '8px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                    🔄 Refresh List
                </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #edf2f7' }}>
                            <th style={{ padding: '15px 20px', textAlign: 'left', color: '#718096' }}>Student Name</th>
                            <th style={{ padding: '15px 20px', textAlign: 'left', color: '#718096' }}>Enrollment</th>
                            <th style={{ padding: '15px 20px', textAlign: 'left', color: '#718096' }}>Branch</th>
                            <th style={{ padding: '15px 20px', textAlign: 'left', color: '#718096' }}>Email</th>
                            <th style={{ padding: '15px 20px', textAlign: 'left', color: '#718096' }}>Joined Date</th>
                            <th style={{ padding: '15px 20px', textAlign: 'center', color: '#718096' }}>Account Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.length === 0 ? (
                            <tr>
                                <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#a0aec0' }}>No students registered yet.</td>
                            </tr>
                        ) : (
                            students.map(student => (
                                <tr key={student._id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                    <td style={{ padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#6366f1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600' }}>
                                            {student.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span style={{ fontWeight: '600', color: '#2d3748' }}>{student.name}</span>
                                    </td>
                                    <td style={{ padding: '15px 20px', color: '#4a5568', fontWeight: '600' }}>{student.enrollment || 'N/A'}</td>
                                    <td style={{ padding: '15px 20px', color: '#4a5568' }}>{student.branch || 'N/A'}</td>
                                    <td style={{ padding: '15px 20px', color: '#4a5568' }}>{student.email}</td>
                                    <td style={{ padding: '15px 20px', color: '#718096' }}>
                                        {student.createdAt ? new Date(student.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                                    </td>
                                    <td style={{ padding: '15px 20px', textAlign: 'center' }}>
                                        <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                                            ACTIVE
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- NEW SECTION: Profile View ---
// --- NEW SECTION: Assignments Management ---
const AssignmentsSection = ({ teacherId, courses }) => {
    const [assignments, setAssignments] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState(''); // Default to all
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState(null);
    const [viewSubmissionsFor, setViewSubmissionsFor] = useState(null);
    const [loading, setLoading] = useState(false);

    const [newAssignment, setNewAssignment] = useState({
        title: '',
        description: '',
        course: courses[0]?._id || '',
        type: 'file',
        dueDate: '',
        maxPoints: 100,
        codingDetails: { language: 'javascript', starterCode: '' },
        fileDetails: { instructionFileUrl: '' }
    });

    useEffect(() => {
        fetchAssignments();
    }, [selectedCourseId, courses]);

    const handleDeleteAssignment = async (assignmentId) => {
        if (!window.confirm('Are you sure you want to delete this assignment? All student submissions will also be deleted.')) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/assignments/${assignmentId}`);
            fetchAssignments(); // Refresh list
        } catch (err) {
            console.error('Error deleting assignment:', err);
            alert('Failed to delete assignment');
        }
    };

    const fetchAssignments = async () => {
        try {
            let asgns = [];
            if (selectedCourseId) {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/assignments/course/${selectedCourseId}`);
                asgns = res.data;
            } else {
                // Fetch assignments from ALL published courses
                const promises = courses.map(c => axios.get(`${import.meta.env.VITE_API_URL}/api/assignments/course/${c._id}`).catch(() => ({ data: [] })));
                const results = await Promise.all(promises);
                asgns = results.flatMap(r => r.data);
            }
            setAssignments(asgns);
        } catch (err) {
            console.error('Error fetching assignments:', err);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newAssignment.course) {
            alert('Please select a course for this assignment');
            return;
        }
        setLoading(true);
        try {
            if (editingAssignment) {
                await axios.put(`${import.meta.env.VITE_API_URL}/api/assignments/${editingAssignment._id}`, {
                    ...newAssignment,
                    teacher: teacherId
                });
            } else {
                await axios.post(`${import.meta.env.VITE_API_URL}/api/assignments`, {
                    ...newAssignment,
                    teacher: teacherId
                });
            }
            setShowCreateModal(false);
            setEditingAssignment(null);

            // Critical: Ensure the UI shows the course the assignment belongs to
            if (selectedCourseId !== newAssignment.course) {
                setSelectedCourseId(newAssignment.course);
            } else {
                fetchAssignments();
            }
            setNewAssignment({
                title: '',
                description: '',
                course: courses[0]?._id || '',
                type: 'file',
                dueDate: '',
                maxPoints: 100,
                codingDetails: { language: 'javascript', starterCode: '' },
                fileDetails: { instructionFileUrl: '' }
            });
        } catch (err) {
            alert('Error creating assignment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h2 style={{ fontSize: '1.75rem', color: '#2d3748', margin: 0 }}>Assignments Management</h2>
                    <p style={{ color: '#718096' }}>Create and manage task for your students.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    style={{ padding: '12px 24px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
                >
                    + Create New Assignment
                </button>
            </div>

            <div style={{ marginBottom: '30px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#4a5568' }}>Select Course</label>
                <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    style={{ padding: '10px 15px', borderRadius: '10px', border: '1px solid #e2e8f0', width: '300px', color: 'black' }}
                >
                    <option value="" style={{ color: 'black' }}>All Courses</option>
                    {courses.map(course => (
                        <option key={course._id} value={course._id} style={{ color: 'black' }}>{course.subject}</option>
                    ))}
                </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                {assignments.map(asgn => (
                    <div key={asgn._id} style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid #edf2f7', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                            <span style={{
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                background: asgn.type === 'coding' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                color: asgn.type === 'coding' ? '#6366f1' : '#10b981',
                                textTransform: 'uppercase'
                            }}>
                                {asgn.type} Task
                            </span>
                            <span style={{ color: '#718096', fontSize: '0.85rem' }}>Due: {new Date(asgn.dueDate).toLocaleDateString()}</span>
                        </div>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.25rem', color: '#2d3748' }}>{asgn.title}</h3>
                        <p style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '20px', height: '40px', overflow: 'hidden' }}>{asgn.description}</p>

                        <div style={{ borderTop: '1px solid #edf2f7', paddingTop: '15px', display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setViewSubmissionsFor(asgn)}
                                style={{ flex: 1, padding: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#4a5568', fontWeight: '600', cursor: 'pointer' }}
                            >
                                Submissions
                            </button>
                            <button
                                onClick={() => {
                                    setEditingAssignment(asgn);
                                    setNewAssignment({
                                        title: asgn.title,
                                        description: asgn.description,
                                        course: asgn.course,
                                        type: asgn.type,
                                        dueDate: asgn.dueDate.split('T')[0],
                                        maxPoints: asgn.maxPoints,
                                        codingDetails: asgn.codingDetails || { language: 'javascript', starterCode: '' },
                                        fileDetails: asgn.fileDetails || { instructionFileUrl: '' }
                                    });
                                    setShowCreateModal(true);
                                }}
                                style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.1)', border: 'none', borderRadius: '10px', color: '#6366f1', cursor: 'pointer' }}
                                title="Edit Assignment"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button
                                onClick={() => handleDeleteAssignment(asgn._id)}
                                style={{ padding: '10px', background: 'rgba(248, 113, 113, 0.1)', border: 'none', borderRadius: '10px', color: '#f87171', cursor: 'pointer' }}
                                title="Delete Assignment"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ background: 'white', padding: '32px', borderRadius: '24px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2 style={{ marginBottom: '24px' }}>{editingAssignment ? 'Edit Assignment' : 'Create Assignment'}</h2>
                        <form onSubmit={handleCreate}>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Title</label>
                                <input
                                    required
                                    type="text"
                                    className="form-input"
                                    style={{ width: '100%', boxSizing: 'border-box', color: 'black' }}
                                    value={newAssignment.title}
                                    onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                                />
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Description / Problem Statement</label>
                                <textarea
                                    required
                                    className="form-input"
                                    style={{ width: '100%', minHeight: '100px', boxSizing: 'border-box', color: 'black' }}
                                    value={newAssignment.description}
                                    onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                                />
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Course / Subject</label>
                                <select
                                    required
                                    className="form-input"
                                    style={{ width: '100%', color: 'black' }}
                                    value={newAssignment.course}
                                    onChange={(e) => setNewAssignment({ ...newAssignment, course: e.target.value })}
                                >
                                    <option value="" disabled style={{ color: 'black' }}>Select a Course</option>
                                    {courses.map(course => (
                                        <option key={course._id} value={course._id} style={{ color: 'black' }}>{course.subject}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Type</label>
                                    <select
                                        className="form-input"
                                        style={{ width: '100%', color: 'black' }}
                                        value={newAssignment.type}
                                        onChange={(e) => setNewAssignment({ ...newAssignment, type: e.target.value })}
                                    >
                                        <option value="file" style={{ color: 'black' }}>File Upload</option>
                                        <option value="coding" style={{ color: 'black' }}>Coding Lab</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Points</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        style={{ width: '100%', boxSizing: 'border-box', color: 'black' }}
                                        value={newAssignment.maxPoints}
                                        onChange={(e) => setNewAssignment({ ...newAssignment, maxPoints: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Due Date</label>
                                <input
                                    required
                                    type="date"
                                    className="form-input"
                                    style={{ width: '100%', boxSizing: 'border-box', color: 'black' }}
                                    value={newAssignment.dueDate}
                                    onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                                />
                            </div>

                            {newAssignment.type === 'coding' && (
                                <div style={{ marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Starter Code (Optional)</label>
                                    <textarea
                                        placeholder="// Write some starter code here..."
                                        className="form-input"
                                        style={{ width: '100%', minHeight: '120px', fontFamily: 'monospace', boxSizing: 'border-box', color: 'black' }}
                                        value={newAssignment.codingDetails.starterCode}
                                        onChange={(e) => setNewAssignment({
                                            ...newAssignment,
                                            codingDetails: { ...newAssignment.codingDetails, starterCode: e.target.value }
                                        })}
                                    />
                                    <label style={{ display: 'block', marginTop: '10px', marginBottom: '5px', fontWeight: '600' }}>Language</label>
                                    <select
                                        className="form-input"
                                        style={{ width: '100%', color: 'black' }}
                                        value={newAssignment.codingDetails.language}
                                        onChange={(e) => setNewAssignment({
                                            ...newAssignment,
                                            codingDetails: { ...newAssignment.codingDetails, language: e.target.value }
                                        })}
                                    >
                                        <option value="javascript" style={{ color: 'black' }}>JavaScript</option>
                                        <option value="python" style={{ color: 'black' }}>Python</option>
                                        <option value="java" style={{ color: 'black' }}>Java</option>
                                        <option value="cpp" style={{ color: 'black' }}>C++</option>
                                    </select>

                                    {/* Test Cases Section */}
                                    <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
                                        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Test Cases (Auto-Grading)</label>
                                        {newAssignment.codingDetails.testCases?.map((tc, idx) => (
                                            <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' }}>
                                                <div style={{ flex: 1 }}>
                                                    <textarea
                                                        placeholder="Input (stdin)"
                                                        style={{ width: '100%', minHeight: '40px', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '0.8rem', fontFamily: 'monospace' }}
                                                        value={tc.input}
                                                        onChange={(e) => {
                                                            const newTestCases = [...newAssignment.codingDetails.testCases];
                                                            newTestCases[idx].input = e.target.value;
                                                            setNewAssignment({
                                                                ...newAssignment,
                                                                codingDetails: { ...newAssignment.codingDetails, testCases: newTestCases }
                                                            });
                                                        }}
                                                    />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <textarea
                                                        placeholder="Expected Output"
                                                        style={{ width: '100%', minHeight: '40px', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '0.8rem', fontFamily: 'monospace' }}
                                                        value={tc.output}
                                                        onChange={(e) => {
                                                            const newTestCases = [...newAssignment.codingDetails.testCases];
                                                            newTestCases[idx].output = e.target.value;
                                                            setNewAssignment({
                                                                ...newAssignment,
                                                                codingDetails: { ...newAssignment.codingDetails, testCases: newTestCases }
                                                            });
                                                        }}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newTestCases = newAssignment.codingDetails.testCases.filter((_, i) => i !== idx);
                                                        setNewAssignment({
                                                            ...newAssignment,
                                                            codingDetails: { ...newAssignment.codingDetails, testCases: newTestCases }
                                                        });
                                                    }}
                                                    style={{ padding: '8px', background: '#ffe4e6', color: '#e11d48', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const currentCases = newAssignment.codingDetails.testCases || [];
                                                setNewAssignment({
                                                    ...newAssignment,
                                                    codingDetails: {
                                                        ...newAssignment.codingDetails,
                                                        testCases: [...currentCases, { input: '', output: '' }]
                                                    }
                                                });
                                            }}
                                            style={{ marginTop: '5px', padding: '8px 12px', background: '#e0e7ff', color: '#4338ca', border: 'none', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '600' }}
                                        >
                                            + Add Test Case
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '15px' }}>
                                <button type="button" onClick={() => { setShowCreateModal(false); setEditingAssignment(null); }} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white' }}>Cancel</button>
                                <button disabled={loading} type="submit" style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#6366f1', color: 'white', fontWeight: 'bold' }}>
                                    {loading ? 'Processing...' : (editingAssignment ? 'Update Assignment' : 'Create Assignment')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Submissions Modal */}
            {viewSubmissionsFor && (
                <SubmissionsModal
                    assignment={viewSubmissionsFor}
                    onClose={() => setViewSubmissionsFor(null)}
                />
            )}
        </div>
    );
};

const SubmissionsModal = ({ assignment, onClose }) => {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [gradingSubmission, setGradingSubmission] = useState(null);
    const [executingCode, setExecutingCode] = useState(false);
    const [stdin, setStdin] = useState('');
    const [executionResult, setExecutionResult] = useState(null);

    useEffect(() => {
        fetchSubmissions();
    }, []);

    const handleRunCode = async (code, language) => {
        setExecutingCode(true);
        setExecutionResult(null);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/assignments/execute`, {
                code,
                language: language || 'javascript',
                stdin
            });
            setExecutionResult(res.data);
        } catch (err) {
            console.error(err);
            setExecutionResult({ output: 'Error executing code: ' + (err.response?.data?.message || err.message) });
        } finally {
            setExecutingCode(false);
        }
    };

    const fetchSubmissions = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/assignments/assignment/${assignment._id}`);
            setSubmissions(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleGrade = async (score, feedback) => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/assignments/grade/${gradingSubmission._id}`, { score, feedback });
            setGradingSubmission(null);
            fetchSubmissions();
        } catch (err) {
            alert('Error grading submission');
        }
    };

    const handleExport = () => {
        const data = submissions.map(sub => ({
            'Student Name': sub.student.name,
            'Enrollment': sub.student.enrollment || 'N/A',
            'Submitted At': new Date(sub.submittedAt).toLocaleString(),
            'Status': sub.status,
            'Score': sub.score !== null ? `${sub.score}/${assignment.maxPoints}` : '-',
            'File URL': sub.fileUrl || 'N/A',
            'Submission ID': sub._id
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Submissions");
        XLSX.writeFile(wb, `${assignment.title}_Submissions.xlsx`);
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ background: 'white', padding: '32px', borderRadius: '24px', width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ margin: 0 }}>Submissions: {assignment.title}</h2>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={handleExport}
                            disabled={submissions.length === 0}
                            style={{
                                padding: '8px 16px',
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: submissions.length === 0 ? 'not-allowed' : 'pointer',
                                fontWeight: 'bold',
                                opacity: submissions.length === 0 ? 0.6 : 1
                            }}
                        >
                            Export to Excel
                        </button>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                    </div>
                </div>

                {loading ? <p>Loading...</p> : submissions.length === 0 ? <p>No submissions found for this assignment.</p> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '2px solid #edf2f7' }}>
                                <th style={{ padding: '12px' }}>Student</th>
                                <th style={{ padding: '12px' }}>Enrollment</th>
                                <th style={{ padding: '12px' }}>Submitted At</th>
                                <th style={{ padding: '12px' }}>Status</th>
                                <th style={{ padding: '12px' }}>Score</th>
                                <th style={{ padding: '12px' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {submissions.map(sub => (
                                <tr key={sub._id} style={{ borderBottom: '1px solid #edf2f7' }}>
                                    <td style={{ padding: '12px' }}>{sub.student.name}</td>
                                    <td style={{ padding: '12px' }}>{sub.student.enrollment || 'N/A'}</td>
                                    <td style={{ padding: '12px' }}>{new Date(sub.submittedAt).toLocaleString()}</td>
                                    <td style={{ padding: '12px' }}>
                                        <span style={{
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            fontSize: '0.7rem',
                                            background: sub.status === 'Graded' ? '#d1fae5' : '#fef3c7',
                                            color: sub.status === 'Graded' ? '#065f46' : '#92400e'
                                        }}>{sub.status}</span>
                                    </td>
                                    <td style={{ padding: '12px' }}>{sub.score !== null ? `${sub.score}/${assignment.maxPoints}` : '-'}</td>
                                    <td style={{ padding: '12px' }}>
                                        <button
                                            onClick={() => setGradingSubmission(sub)}
                                            style={{ padding: '6px 12px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                                        >
                                            {sub.status === 'Graded' ? 'Edit Grade' : 'Grade'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {gradingSubmission && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
                        <div style={{ background: 'white', padding: '32px', borderRadius: '24px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px rgba(0,0,0,0.2)' }}>
                            <h3>Grade Submission</h3>
                            <p style={{ fontSize: '0.9rem', color: '#718096' }}>Student: {gradingSubmission.student.name}</p>

                            <div style={{ margin: '20px 0' }}>
                                {assignment.type === 'file' ? (
                                    <a href={gradingSubmission.fileUrl} target="_blank" rel="noreferrer" style={{ color: '#6366f1', textDecoration: 'underline' }}>View Submitted File</a>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        <div style={{ background: '#1a202c', padding: '10px', borderRadius: '8px', overflow: 'hidden' }}>
                                            <p style={{ color: 'white', fontSize: '0.7rem', margin: '0 0 5px 0' }}>Submitted Code ({gradingSubmission.language}):</p>
                                            <pre style={{ color: '#818cf8', fontSize: '0.8rem', margin: 0, maxHeight: '200px', overflowY: 'auto' }}>{gradingSubmission.code}</pre>
                                        </div>
                                        <div style={{ marginBottom: '5px' }}>
                                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', color: '#4a5568', marginBottom: '5px' }}>Input (stdin):</label>
                                            <textarea
                                                value={stdin}
                                                onChange={(e) => setStdin(e.target.value)}
                                                placeholder="Enter inputs for the code..."
                                                style={{
                                                    width: '100%',
                                                    height: '50px',
                                                    background: '#f8fafc',
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: '8px',
                                                    padding: '8px',
                                                    fontSize: '0.8rem',
                                                    fontFamily: 'monospace',
                                                    resize: 'none',
                                                    color: 'black'
                                                }}
                                            />
                                        </div>
                                        <button
                                            disabled={executingCode}
                                            onClick={() => handleRunCode(gradingSubmission.code, gradingSubmission.language)}
                                            style={{
                                                padding: '8px 16px',
                                                background: executingCode ? '#94a3b8' : '#10b981',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                cursor: executingCode ? 'not-allowed' : 'pointer',
                                                fontWeight: 'bold',
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            {executingCode ? '⚡ Running...' : '▶ Run Code'}
                                        </button>
                                        {executionResult && (
                                            <div style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
                                                <p style={{ color: '#94a3b8', fontSize: '0.7rem', margin: '0 0 5px 0' }}>Output:</p>
                                                <pre style={{
                                                    color: executionResult.stderr ? '#f87171' : '#10b981',
                                                    fontSize: '0.8rem',
                                                    margin: 0,
                                                    whiteSpace: 'pre-wrap'
                                                }}>
                                                    {executionResult.output}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px' }}>Score (Out of {assignment.maxPoints})</label>
                                <input
                                    id="grade-score"
                                    defaultValue={gradingSubmission.score || ''}
                                    type="number"
                                    className="form-input"
                                    style={{ width: '100%', boxSizing: 'border-box', color: 'black' }}
                                />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '5px' }}>Feedback</label>
                                <textarea
                                    id="grade-feedback"
                                    defaultValue={gradingSubmission.feedback || ''}
                                    className="form-input"
                                    style={{ width: '100%', minHeight: '80px', boxSizing: 'border-box', color: 'black' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => setGradingSubmission(null)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white' }}>Cancel</button>
                                <button
                                    onClick={() => {
                                        const score = document.getElementById('grade-score').value;
                                        const feedback = document.getElementById('grade-feedback').value;
                                        handleGrade(score, feedback);
                                    }}
                                    style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: '#6366f1', color: 'white', fontWeight: 'bold' }}
                                >
                                    Save Grade
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const ProfileSection = ({ userId }) => {
    const sessionUser = JSON.parse(localStorage.getItem('user') || '{}');
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!userId || userId === 'undefined') {
                console.warn('[PROFILE] No valid userId provided. Falling back to session data.');
                setProfile(sessionUser);
                setLoading(false);
                return;
            }

            try {
                console.log(`[PROFILE] Fetching profile for: ${userId}`);
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                const res = await axios.get(`${apiUrl}/api/auth/profile/${userId}`);
                setProfile(res.data);
            } catch (err) {
                console.error('[PROFILE] Error fetching profile:', err);
                setError(err.message);
                // Fallback to session user if fetch fails
                setProfile(sessionUser);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [userId]);

    if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>Loading profile...</div>;

    // If no profile found anywhere
    if (!profile || !profile.name) {
        return (
            <div style={{ textAlign: 'center', padding: '50px' }}>
                <h3>Profile not found</h3>
                <p style={{ color: '#718096' }}>Please try logging out and logging in again.</p>
                {error && <p style={{ fontSize: '0.8rem', color: '#e53e3e' }}>Error: {error}</p>}
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', padding: '40px', borderRadius: '25px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '30px', marginBottom: '40px', borderBottom: '1px solid #edf2f7', paddingBottom: '30px' }}>
                <div style={{ width: '100px', height: '100px', borderRadius: '30px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 'bold', boxShadow: '0 10px 20px rgba(99, 102, 241, 0.2)' }}>
                    {profile.name ? profile.name.charAt(0).toUpperCase() : '?'}
                </div>
                <div>
                    <h2 style={{ fontSize: '2rem', margin: '0 0 5px 0', color: '#1a202c' }}>{profile.name}</h2>
                    <p style={{ margin: 0, color: '#6366f1', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.9rem' }}>{profile.role}</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '15px', border: '1px solid #edf2f7' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#718096', marginBottom: '5px', fontWeight: '600' }}>Email Address</label>
                    <div style={{ fontSize: '1.1rem', color: '#2d3748', fontWeight: '500' }}>{profile.email}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '15px', border: '1px solid #edf2f7' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#718096', marginBottom: '5px', fontWeight: '600' }}>Joined Date</label>
                    <div style={{ fontSize: '1.1rem', color: '#2d3748', fontWeight: '500' }}>
                        {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Recently Joined'}
                    </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '15px', border: '1px solid #edf2f7' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#718096', marginBottom: '5px', fontWeight: '600' }}>Status</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
                        <div style={{ fontSize: '1rem', color: '#10b981', fontWeight: '700' }}>Active</div>
                    </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '15px', border: '1px solid #edf2f7' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#718096', marginBottom: '5px', fontWeight: '600' }}>Employee ID</label>
                    <div style={{ fontSize: '1.1rem', color: '#2d3748', fontWeight: '500' }}>{profile.employeeId || 'Not Assigned'}</div>
                </div>
            </div>

            <div style={{ marginTop: '40px', padding: '20px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '15px', border: '1px dashed #6366f1' }}>
                <p style={{ margin: 0, color: '#4a5568', fontSize: '0.9rem', textAlign: 'center' }}>
                    Experience a personalized learning journey with LMS Academy. More profile features coming soon!
                </p>
            </div>
            {error && (
                <div style={{ marginTop: '20px', padding: '10px', background: '#fff5f5', color: '#c53030', fontSize: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                    Note: Using offline session data. (Original error: {error})
                </div>
            )}
        </div>
    );
};

export default TeacherDashboard;
