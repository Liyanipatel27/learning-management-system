import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

import SummaryWidget from '../components/AI/SummaryWidget';

import ReactMarkdown from 'react-markdown';
import signatureImg from '../assets/signature.png';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';


import AIAssistantSidebar from '../components/AIAssistantSidebar'; // Import the new component
import StudentAIHub from './StudentAIHub';

const formatTime = (seconds) => {
    if (seconds <= 0) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
};


const FeedbackReadMore = ({ feedback }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!feedback) return null;

    // Helper to parse feedback into points
    const parseFeedback = (text) => {
        if (!text) return [];
        let lines = text.split('\n').map(l => l.trim()).filter(l => l);

        if (lines.length === 1 || lines.length < 3) {
            const parts = text.split(/(?:^|\s)- /).map(p => p.trim()).filter(p => p);
            if (parts.length > 1) return parts;
        }
        return lines;
    };

    if (isExpanded) {
        const points = parseFeedback(feedback);

        return (
            <div style={{ margin: '5px 0 0 0', fontSize: '0.8rem', color: '#15803d' }}>
                <strong style={{ fontWeight: 'bold' }}>Feedback: </strong>
                <ul style={{ paddingLeft: '20px', margin: '5px 0', listStyleType: 'disc' }}>
                    {points.map((point, idx) => {
                        const isHeader = /^(Strengths|Areas for Improvement|Detailed|Conclusion):/i.test(point);
                        return (
                            <li key={idx} style={{ marginBottom: '4px', listStyle: isHeader ? 'none' : 'disc', fontWeight: isHeader ? 'bold' : 'normal', marginLeft: isHeader ? '-20px' : '0' }}>
                                {point}
                            </li>
                        );
                    })}
                </ul>
                <span
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(false);
                    }}
                    style={{ cursor: 'pointer', color: '#166534', fontWeight: 'bold', textDecoration: 'underline', display: 'inline-block', marginTop: '5px' }}
                >
                    (read less)
                </span>
            </div>
        );
    }

    const words = feedback.split(' ');
    // Handle short feedback gracefully
    const truncated = words.length > 2 ? words.slice(0, 2).join(' ') : words.join(' ');
    const shouldShowReadMore = words.length > 2;

    return (
        <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem', color: '#15803d' }}>
            <strong style={{ fontWeight: 'bold' }}>Feedback: </strong>
            {truncated}
            {shouldShowReadMore && '...'}
            {shouldShowReadMore && (
                <span
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(true);
                    }}
                    style={{ cursor: 'pointer', color: '#166534', fontWeight: 'bold', marginLeft: '5px', textDecoration: 'underline' }}
                >
                    read more
                </span>
            )}
        </p>
    );
};

function StudentDashboard() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [isCinemaMode, setIsCinemaMode] = useState(localStorage.getItem(`cinemaMode_${user.id || user._id}`) === 'true');
    const [activeTab, setActiveTab] = useState(localStorage.getItem(`activeTab_${user.id || user._id}`) || 'dashboard');
    const [showStudyReminder, setShowStudyReminder] = useState(null);
    const [allProgress, setAllProgress] = useState([]);
    const [dailyHours, setDailyHours] = useState(2);
    const [weekendHours, setWeekendHours] = useState(4);
    const [pendingAssignmentsCount, setPendingAssignmentsCount] = useState(0);
    const [pendingAssignments, setPendingAssignments] = useState([]);
    const [rewriteRequests, setRewriteRequests] = useState([]);
    const [announcements, setAnnouncements] = useState([]);


    useEffect(() => {
        fetchCourses();
        fetchAnnouncements();
    }, []);

    useEffect(() => {
        if (['dashboard', 'my-courses', 'ai-hub', 'certificates', 'grades', 'announcements'].includes(activeTab)) {
            fetchCourses();
            fetchAllProgress();
            fetchAnnouncements();

            // Periodically refresh every 60 seconds
            const interval = setInterval(() => {
                fetchCourses();
                fetchAllProgress();
                fetchAnnouncements();
            }, 60000);
            return () => clearInterval(interval);
        }
    }, [activeTab, selectedCourse]); // Also refetch when exiting CourseViewer

    // Persist activeTab
    useEffect(() => {
        if (user.id || user._id) {
            localStorage.setItem(`activeTab_${user.id || user._id}`, activeTab);
        }
    }, [activeTab, user]);

    // Persist cinemaMode
    useEffect(() => {
        if (user.id || user._id) {
            localStorage.setItem(`cinemaMode_${user.id || user._id}`, isCinemaMode);
        }
    }, [isCinemaMode, user]);

    // Persist selectedCourse and restore it on fetch
    useEffect(() => {
        if (user.id || user._id) {
            if (selectedCourse) {
                localStorage.setItem(`selectedCourseId_${user.id || user._id}`, selectedCourse._id);
            } else {
                localStorage.removeItem(`selectedCourseId_${user.id || user._id}`);
            }
        }
    }, [selectedCourse, user]);

    // Restore selectedCourse after courses are fetched
    useEffect(() => {
        if (courses.length > 0 && selectedCourse) {
            // Find the updated version of the currently selected course
            const updatedCourse = courses.find(c => c._id === selectedCourse._id);
            // Only update if it actually changed to avoid infinite loops, 
            // but for now, syncing safe if objects are new refs.
            if (updatedCourse && JSON.stringify(updatedCourse) !== JSON.stringify(selectedCourse)) {
                setSelectedCourse(updatedCourse);
            }
        }
    }, [courses]); // Run whenever courses list refreshes

    // Safety: Ensure Cinema Mode is OFF if no course is selected
    useEffect(() => {
        if (!selectedCourse && isCinemaMode) {
            setIsCinemaMode(false);
        }
    }, [selectedCourse, isCinemaMode]);

    const fetchAllProgress = async () => {
        try {
            const studentId = user.id || user._id;
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/courses/progress/student/${studentId}`);
            setAllProgress(res.data);


        } catch (err) {
            console.error('Error fetching all progress:', err);
        }
    };

    const fetchCourses = async () => {
        try {
            // In a real app, this might be /api/courses/enrolled or similar
            // For now, fetching all courses
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/courses`);
            setCourses(res.data);

            // Fetch assignments for all courses to show pending count
            // Fetch assignments for all courses in parallel
            const assignmentsPromises = res.data.map(course =>
                axios.get(`${import.meta.env.VITE_API_URL}/api/assignments/course/${course._id}`)
                    .then(r => r.data)
                    .catch(e => {
                        console.error(`Error fetching assignments for course ${course._id}:`, e);
                        return []; // Return empty array on error
                    })
            );

            const assignmentsResults = await Promise.all(assignmentsPromises);
            const allAsgns = assignmentsResults.flat();

            // Fetch ALL submissions for this student in one go
            const userId = user.id || user._id;
            const subRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/assignments/submissions/student/${userId}`);
            const submittedAssignmentIds = new Set(subRes.data.map(s => String(s.assignment)));

            // Calculate pending: Assignment exists but ID is NOT in submitted set
            const pendingAsgns = allAsgns.filter(asgn => !submittedAssignmentIds.has(String(asgn._id)));
            setPendingAssignmentsCount(pendingAsgns.length);
            setPendingAssignments(pendingAsgns);

            // Process Rewrite Requests
            const rewrites = subRes.data
                .filter(s => s.status === 'Re-write')
                .map(s => {
                    const asgn = allAsgns.find(a => String(a._id) === String(s.assignment));
                    const crs = res.data.find(c => String(c._id) === String(s.course));
                    return {
                        ...s,
                        assignmentTitle: asgn?.title,
                        subject: crs?.subject,
                        courseObj: crs
                    };
                });
            setRewriteRequests(rewrites);

        } catch (err) {
            console.error('Error in fetchCourses:', err);
        }
    };


    const fetchAnnouncements = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/announcements`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAnnouncements(res.data);
        } catch (err) {
            console.error('Error fetching announcements:', err);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <div className="dashboard-container" style={{ display: isCinemaMode ? 'block' : 'flex', width: '100%', minHeight: '100vh' }}>
            {!isCinemaMode && (
                <aside className="sidebar">
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '30px', fontWeight: '700' }}>LMS Student</h2>
                    <nav>
                        <div className={`nav-item ${activeTab === 'dashboard' && !selectedCourse ? 'active' : ''}`} onClick={() => { setActiveTab('dashboard'); setSelectedCourse(null); }}>Dashboard</div>
                        <div className={`nav-item ${activeTab === 'my-courses' ? 'active' : ''}`} onClick={() => { setActiveTab('my-courses'); setSelectedCourse(null); }}>My Courses</div>
                        <div className={`nav-item ${activeTab === 'certificates' ? 'active' : ''}`} onClick={() => { setActiveTab('certificates'); setSelectedCourse(null); }}>Certificates</div>

                        <div className={`nav-item ${activeTab === 'ai-hub' ? 'active' : ''}`} onClick={() => { setActiveTab('ai-hub'); setSelectedCourse(null); }}>🤖 AI Learning Hub</div>


                        <div className={`nav-item ${activeTab === 'assignments' ? 'active' : ''}`} onClick={() => { setActiveTab('assignments'); setSelectedCourse(null); }}>Assignments</div>
                        <div className={`nav-item ${activeTab === 'grades' ? 'active' : ''}`} onClick={() => { setActiveTab('grades'); setSelectedCourse(null); }}>Grades</div>
                        <div className={`nav-item ${activeTab === 'announcements' ? 'active' : ''}`} onClick={() => { setActiveTab('announcements'); setSelectedCourse(null); }}>Announcements</div>
                        <div className={`nav-item ${activeTab === 'live-class' ? 'active' : ''}`} onClick={() => { setActiveTab('live-class'); setSelectedCourse(null); }}>📺 Live Class</div>
                        <div className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => { setActiveTab('profile'); setSelectedCourse(null); }}>Profile</div>

                        <div
                            className="nav-item"
                            onClick={handleLogout}
                            style={{ marginTop: '50px', cursor: 'pointer', borderTop: '1px solid rgba(255,255,255,0.2)' }}
                        >
                            Logout
                        </div>
                    </nav >
                </aside >
            )
            }

            <main className="main-content" style={{ flex: 1, padding: '40px' }}>
                {!isCinemaMode && (
                    <header style={{
                        display: selectedCourse ? 'grid' : 'flex',
                        gridTemplateColumns: selectedCourse ? '1fr auto 1fr' : 'none',
                        justifyContent: selectedCourse ? 'stretch' : 'space-between',
                        alignItems: 'center',
                        marginBottom: '20px',
                        background: selectedCourse ? 'white' : 'transparent',
                        padding: selectedCourse ? '20px' : '0',
                        borderRadius: selectedCourse ? '12px' : '0',
                        boxShadow: selectedCourse ? '0 2px 10px rgba(0,0,0,0.05)' : 'none'
                    }}>
                        {/* Left Section: Brand + Back */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                            {selectedCourse && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginRight: '30px' }}>
                                    <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#6C63FF' }}>LMS Student</div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => { setSelectedCourse(null); setIsCinemaMode(false); }}
                                            style={{ border: 'none', background: '#edf2f7', padding: '6px 12px', borderRadius: '8px', color: '#4a5568', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                                        >
                                            <span>&larr;</span> Back
                                        </button>
                                    </div>
                                </div>
                            )}
                            {!selectedCourse && (
                                <div>
                                    <h1 style={{ fontSize: '2rem', color: '#2D3748', margin: 0 }}>
                                        {activeTab === 'dashboard' ? 'Dashboard' :
                                            activeTab === 'my-courses' ? 'My Courses' :
                                                activeTab === 'ai-hub' ? 'AI Learning Hub' :

                                                    activeTab === 'assignments' ? 'Assignments' :
                                                        activeTab === 'announcements' ? 'Announcements' :
                                                            activeTab === 'live-class' ? 'Live Classes' :
                                                                activeTab === 'grades' ? 'My Grades' :
                                                                    activeTab === 'profile' ? 'My Profile' : 'My Certificates'}
                                    </h1>
                                    <p style={{ color: '#718096', margin: 0 }}>
                                        {activeTab === 'dashboard' ? `Welcome back, ${user.name}!` :
                                            activeTab === 'my-courses' ? 'Track your learning progress' :
                                                activeTab === 'ai-hub' ? 'Supercharge your learning with AI' :
                                                    activeTab === 'assignments' ? 'Complete and submit your tasks' :
                                                        activeTab === 'announcements' ? 'Stay updated with latest news' :
                                                            activeTab === 'grades' ? 'View your quiz and assignment scores' :
                                                                'Download your earned certifications'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Center Section: Subject Name (only if selected) */}
                        {selectedCourse && (
                            <div style={{ textAlign: 'center' }}>
                                <h1 style={{ fontSize: '1.5rem', color: '#2D3748', margin: 0, fontWeight: '800' }}>
                                    {selectedCourse.subject}
                                </h1>
                            </div>
                        )}

                        {/* Right Section: Cinema + Profile */}
                        <div className="user-profile" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '15px' }}>
                            {selectedCourse && (
                                <button
                                    onClick={() => setIsCinemaMode(!isCinemaMode)}
                                    style={{
                                        padding: '6px 12px',
                                        background: isCinemaMode ? '#FFD700' : '#4A5568',
                                        color: isCinemaMode ? '#000' : '#fff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                        marginRight: '15px'
                                    }}
                                >
                                    {isCinemaMode ? '📺 Exit Cinema' : '🎬 Cinema Mode'}
                                </button>
                            )}
                            {selectedCourse && (
                                <div style={{ textAlign: 'right', marginRight: '10px' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{user.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#718096' }}>Student</div>
                                </div>
                            )}
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#6C63FF', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                        </div>
                    </header>
                )}

                {selectedCourse ? (
                    <CourseViewer
                        course={selectedCourse}
                        user={user}
                        setCourses={setCourses}
                        setSelectedCourse={setSelectedCourse}
                        isCinemaMode={isCinemaMode}
                        setIsCinemaMode={setIsCinemaMode}
                        dailyHours={dailyHours}
                        onBack={() => {
                            // Calculate if goal met before leaving
                            const today = new Date().toISOString().split('T')[0];
                            let totalMin = 0;
                            allProgress.forEach(p => {
                                const activity = p.dailyActivity?.find(a => a.date === today);
                                if (activity) totalMin += activity.minutes;
                            });

                            const day = new Date().getDay();
                            const targetHours = (day === 0 || day === 6) ? weekendHours : dailyHours;
                            const thresholdMin = targetHours * 60 * 0.5;

                            if (totalMin < thresholdMin) {
                                setShowStudyReminder({
                                    remaining: Math.round(thresholdMin - totalMin),
                                    goal: thresholdMin
                                });
                                // Auto hide after 5 seconds
                                setTimeout(() => setShowStudyReminder(null), 5000);
                            }

                            setSelectedCourse(null);
                            setIsCinemaMode(false);
                        }}
                    />
                ) : activeTab === 'dashboard' ? (
                    <>
                        {/* Deadline Warnings */}
                        {/* Deadline Warnings - Condensed */}



                        <section className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                            {/* Card 1 */}
                            <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                                <h3 style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '10px' }}>Available Courses</h3>
                                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2D3748' }}>{courses.length}</p>
                            </div>

                            {/* Card 2 */}
                            <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                                <h3 style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '10px' }}>Pending Assignments</h3>
                                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FF6584' }}>{pendingAssignmentsCount}</p>
                            </div>

                            {/* Deadline Warnings - Card Version */}
                            {(() => {
                                const now = new Date();
                                const urgentAssignments = pendingAssignments.filter(a => {
                                    const due = new Date(a.dueDate);
                                    const diffHrs = (due - now) / (1000 * 60 * 60);
                                    return diffHrs < 48; // Due within 48 hours or overdue
                                });

                                if (urgentAssignments.length === 0) return null;

                                const overdueCount = urgentAssignments.filter(a => new Date(a.dueDate) < now).length;
                                const approachingCount = urgentAssignments.length - overdueCount;

                                return (
                                    <div style={{
                                        background: '#FFF5F5',
                                        padding: '20px',
                                        borderRadius: '15px',
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                                        border: '1px solid #FED7D7',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between'
                                    }}>
                                        <div>
                                            <h3 style={{ color: '#C53030', fontSize: '0.9rem', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <span>⚠️</span> Attention Needed
                                            </h3>
                                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#2D3748', lineHeight: '1.4' }}>
                                                <span style={{ fontWeight: 'bold', color: '#E53E3E' }}>{overdueCount} Overdue</span>
                                                {approachingCount > 0 && <span style={{ fontWeight: 'bold', color: '#D69E2E' }}>, {approachingCount} Due soon</span>}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => { setActiveTab('assignments'); setSelectedCourse(null); }}
                                            style={{
                                                marginTop: '15px',
                                                padding: '8px 12px',
                                                background: '#C53030',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem',
                                                width: '100%'
                                            }}
                                        >
                                            View Assignments &rarr;
                                        </button>
                                    </div>
                                );
                            })()}

                            {/* Card 3 */}



                        </section>

                        {announcements.length > 0 && (
                            <section style={{ marginTop: '40px' }}>
                                <h2 style={{ fontSize: '1.25rem', marginBottom: '20px', color: '#2D3748', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span>📢</span> Latest Announcements
                                </h2>
                                <div style={{ display: 'grid', gap: '15px' }}>
                                    {announcements
                                        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                        .slice(0, 3)
                                        .map((ann, idx) => (
                                            <div
                                                key={ann._id}
                                                style={{
                                                    background: 'linear-gradient(135deg, #ffffff 0%, #f9faff 100%)',
                                                    padding: '20px',
                                                    borderRadius: '16px',
                                                    boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
                                                    border: '1px solid #eef2ff',
                                                    borderLeft: '5px solid #6366f1',
                                                    position: 'relative',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '60px', height: '60px', background: 'rgba(99, 102, 241, 0.03)', borderRadius: '50%' }}></div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                                    <h4 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem', fontWeight: '700' }}>{ann.title}</h4>
                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>
                                                        {new Date(ann.createdAt).toLocaleDateString('en-GB')}
                                                    </span>
                                                </div>
                                                <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem', lineHeight: '1.5' }}>{ann.content}</p>
                                                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#6c63ff', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>
                                                        {ann.author?.name?.charAt(0) || 'A'}
                                                    </div>
                                                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}>{ann.author?.name || 'Admin'}</span>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </section>
                        )}

                        <section style={{ marginTop: '40px' }}>
                            <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', color: '#2D3748' }}>Explore Latest Courses</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                                {courses
                                    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                                    .slice(0, 5)
                                    .map(course => (
                                        <div key={course._id} style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', cursor: 'pointer' }} onClick={() => setSelectedCourse(course)}>
                                            <h3 style={{ margin: '0 0 10px 0' }}>{course.subject}</h3>
                                            <div style={{ marginTop: '15px', fontSize: '0.8rem', color: '#555' }}>
                                                Teacher: {course.teacher?.name || 'Unknown'}
                                            </div>
                                        </div>
                                    ))}
                                {courses.length === 0 && <p>No courses available right now.</p>}
                            </div>
                        </section>
                    </>
                ) : activeTab === 'my-courses' ? (
                    <MyCoursesSection
                        courses={courses}
                        allProgress={allProgress}
                        onSelectCourse={(course) => setSelectedCourse(course)}
                    />
                ) : activeTab === 'ai-hub' ? (
                    <StudentAIHub
                        user={user}
                        dailyHours={dailyHours}
                        setDailyHours={setDailyHours}
                        weekendHours={weekendHours}
                        setWeekendHours={setWeekendHours}
                    />
                ) : activeTab === 'grades' ? (
                    <GradesSection
                        courses={courses}
                        allProgress={allProgress}
                    />
                ) : activeTab === 'assignments' ? (
                    <AssignmentsSection userId={user.id || user._id} courses={courses} />
                ) : activeTab === 'profile' ? (
                    <ProfileSection userId={user.id || user._id} />
                ) : activeTab === 'announcements' ? (
                    <AnnouncementsSection announcements={announcements} />
                ) : activeTab === 'live-class' ? (
                    <LiveClassStudentSection />
                ) : (
                    <CertificatesSection
                        courses={courses}
                        allProgress={allProgress}
                        user={user}
                    />
                )}
            </main>

            {/* Premium Study Reminder Toast */}
            {
                showStudyReminder && (
                    <div style={{
                        position: 'fixed',
                        bottom: '30px',
                        right: '30px',
                        background: 'white',
                        padding: '20px',
                        borderRadius: '16px',
                        boxShadow: '0 15px 35px rgba(0,0,0,0.15)',
                        border: '1px solid #edf2f7',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        minWidth: '320px',
                        zIndex: 9999,
                        animation: 'slideInRight 0.5s ease-out'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '1.5rem' }}>🎯</span>
                                <h4 style={{ margin: 0, color: '#2d3748', fontSize: '1rem' }}>Study Goal Reminder</h4>
                            </div>
                            <button onClick={() => setShowStudyReminder(null)} style={{ border: 'none', background: 'none', color: '#a0aec0', cursor: 'pointer', fontSize: '1.2rem' }}>&times;</button>
                        </div>
                        <div>
                            <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#718096', lineHeight: '1.4' }}>
                                You're doing great! You still need **{showStudyReminder.remaining} mins** more to reach your daily activity target.
                            </p>
                            <div style={{ height: '8px', background: '#edf2f7', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%',
                                    width: `${Math.round(((showStudyReminder.goal - showStudyReminder.remaining) / showStudyReminder.goal) * 100)}%`,
                                    background: 'linear-gradient(90deg, #F6AD55, #ED8936)',
                                    borderRadius: '4px'
                                }}></div>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowStudyReminder(null)}
                            style={{ background: '#6C63FF', color: 'white', border: 'none', padding: '8px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                            Keep Studying (Got it!)
                        </button>

                        <style>{`
                        @keyframes slideInRight {
                            from { transform: translateX(100%); opacity: 0; }
                            to { transform: translateX(0); opacity: 1; }
                        }
                    `}</style>
                    </div>
                )
            }
        </div >
    );
}

const CourseViewer = ({ course, user, setCourses, setSelectedCourse, isCinemaMode, setIsCinemaMode, dailyHours, onBack }) => {
    // Note: Study goal requirement is usually set to 50% of the dailyHours target.
    // For now, we are focusing on counting the portal study time accurately.
    // State to track expanded chapters and modules
    const [expandedChapters, setExpandedChapters] = useState({});
    const [expandedModules, setExpandedModules] = useState({});
    const [selectedContent, setSelectedContent] = useState(null);
    const [studentProgress, setStudentProgress] = useState(null);
    const [activeQuiz, setActiveQuiz] = useState(null);
    const [timeSpent, setTimeSpent] = useState(0);
    const timeSpentRef = useRef(0);
    const [isTimeRequirementMet, setIsTimeRequirementMet] = useState(false);
    const [activeAIFeature, setActiveAIFeature] = useState(null);
    const [aiSummary, setAiSummary] = useState('');
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

    // Persist selectedContentId
    useEffect(() => {
        if (selectedContent && (user.id || user._id)) {
            localStorage.setItem(`selectedContentId_${user.id || user._id}_${course._id}`, selectedContent._id);
        }
    }, [selectedContent, user, course]);

    // Sync ref with state
    useEffect(() => {
        timeSpentRef.current = timeSpent;
    }, [timeSpent]);
    const [isTabActive, setIsTabActive] = useState(true);

    // Visibility and Focus Tracking
    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsTabActive(!document.hidden && document.hasFocus());
            if (document.hidden) {
                saveProgress(false); // Save when tab hidden
            }
        };

        const handleFocus = () => {
            setIsTabActive(true);
        };
        const handleBlur = () => {
            setIsTabActive(false);
            saveProgress(false); // Save when window loses focus
        };

        const handleBeforeUnload = () => {
            saveProgress(false); // Final attempt to save on close/refresh
        };

        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [selectedContent, user]); // Include dependencies for saveProgress

    // Track initialized content to prevent overwriting timeSpent on re-renders
    const initializedContentRef = useRef(null);

    // 1. Initialization Effect (Runs when content changes or progress loads)
    useEffect(() => {
        if (selectedContent && studentProgress) {
            // Only initialize if we haven't done so for this content ID yet
            if (initializedContentRef.current !== selectedContent._id) {
                const contentKey = `timer_${user.id || user._id}_${selectedContent._id}`;
                const existingProgress = studentProgress.contentProgress?.find(
                    cp => cp.contentId.toString() === selectedContent._id.toString()
                );

                const serverTime = existingProgress ? existingProgress.timeSpent : 0;
                const locallySavedTime = parseInt(localStorage.getItem(contentKey) || '0', 10);
                const initialTime = Math.max(serverTime, locallySavedTime);
                const alreadyCompleted = existingProgress ? existingProgress.isCompleted : false;

                setTimeSpent(initialTime);
                timeSpentRef.current = initialTime;

                // Set completion status based on initial data
                if (alreadyCompleted || initialTime >= selectedContent.minTime) {
                    setIsTimeRequirementMet(true);
                } else {
                    setIsTimeRequirementMet(false);
                }

                initializedContentRef.current = selectedContent._id;
            }
        }
    }, [selectedContent, studentProgress, user]);

    // 2. Timer & Auto-Save Effect (Runs ONLY when selectedContent changes)
    useEffect(() => {
        if (selectedContent) {
            let timer = null;
            let autoSaveTimer = null;

            // Start Timer (only if not already completed? No, keep tracking for total time)
            // Note: We don't check 'isTimeRequirementMet' here to stop timer, we track everything.
            timer = setInterval(() => {
                if (document.hidden || !document.hasFocus()) return;

                setTimeSpent(prev => {
                    if (document.hasFocus() && !document.hidden) {
                        const next = prev + 1;
                        // Check requirement in real-time
                        if (next >= selectedContent.minTime) {
                            setIsTimeRequirementMet(true);
                        }

                        timeSpentRef.current = next;
                        // Sync with localStorage
                        const contentKey = `timer_${user.id || user._id}_${selectedContent._id}`;
                        localStorage.setItem(contentKey, next.toString());
                        return next;
                    }
                    return prev;
                });
            }, 1000);

            // Periodic Auto-save (Every 10 seconds)
            autoSaveTimer = setInterval(() => {
                saveProgress(false); // Using Ref for time, so safe to call
            }, 10000);

            return () => {
                if (timer) clearInterval(timer);
                if (autoSaveTimer) clearInterval(autoSaveTimer);
                // Save on unmount/change
                saveProgress(false);
            };
        }
    }, [selectedContent]); // REMOVED studentProgress to prevent loop

    // Separate effect for completion save
    useEffect(() => {
        if (isTimeRequirementMet && selectedContent && !studentProgress?.contentProgress?.find(cp => cp.contentId === selectedContent._id)?.isCompleted) {
            saveProgress(true);
        }
    }, [isTimeRequirementMet]);

    const saveProgress = async (forceCompleted = false) => {
        if (!selectedContent || !user || (!user.id && !user._id)) return;

        // REMOVED early return: Allow saving even if already completed to track total study time for daily goals

        try {
            const studentId = user.id || user._id;
            const timeToSave = timeSpentRef.current; // Use Ref for latest value

            if (timeToSave === 0 && !forceCompleted) return; // Don't overwrite if we haven't tracked anything yet

            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/courses/${course._id}/contents/${selectedContent._id}/progress`, {
                studentId,
                timeSpent: timeToSave,
                isCompleted: forceCompleted || (timeToSave >= selectedContent.minTime)
            });
            // Update local state immediately to reflect changes in UI (e.g., Progress Bar)
            setStudentProgress(res.data);
        } catch (err) {
            console.error('Error auto-saving progress:', err);
        }
    };

    useEffect(() => {
        if (course) {
            fetchProgress();
        }
    }, [course]);

    const fetchProgress = async () => {
        if (!course || !user.id && !user._id) return;
        try {
            const studentId = user.id || user._id;
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/courses/${course._id}/progress/${studentId}`);
            setStudentProgress(res.data);
        } catch (err) {
            console.error('Error fetching progress:', err);
        }
    };

    const refreshCourse = async () => {
        if (!course) return;
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/courses/${course._id}`);
            const updatedCourse = res.data;
            setCourses(prev => prev.map(c => c._id === updatedCourse._id ? updatedCourse : c));
            setSelectedCourse(updatedCourse);
            return updatedCourse;
        } catch (err) {
            console.error('Error refreshing course:', err);
        }
    };

    const handleTakeQuiz = async (module, isFastTrack) => {
        const latestCourse = await refreshCourse();
        const latestModule = latestCourse?.chapters.flatMap(c => c.modules).find(m => m._id === module._id) || module;

        // --- Weighted-Difficulty Selection Logic ---
        const allQuestions = latestModule.quiz?.questions || [];
        const quizSize = isFastTrack ?
            (latestModule.quizConfig?.questionsPerAttemptFastTrack || latestModule.quizConfig?.questionsPerAttempt || 5) :
            (latestModule.quizConfig?.questionsPerAttemptStandard || latestModule.quizConfig?.questionsPerAttempt || 10);

        if (allQuestions.length === 0) {
            setActiveQuiz({ module: latestModule, isFastTrack });
            return;
        }

        // Group by difficulty
        const pools = {
            easy: allQuestions.filter(q => q.difficulty === 'easy'),
            medium: allQuestions.filter(q => q.difficulty === 'medium'),
            hard: allQuestions.filter(q => q.difficulty === 'hard')
        };

        // Shuffle all pools initially to get random selection
        const shuffleArray = (array) => [...array].sort(() => Math.random() - 0.5);
        Object.keys(pools).forEach(key => pools[key] = shuffleArray(pools[key]));

        let selected = [];
        if (isFastTrack) {
            // Fast Track Ratio: 60% Medium, 40% Hard (as per user request: "50-60 medium, 50-40 hard")
            const medCount = Math.round(quizSize * 0.6);
            const hardCount = quizSize - medCount;

            selected = [...pools.medium.slice(0, medCount), ...pools.hard.slice(0, hardCount)];

            // If still short, fill from anywhere available
            if (selected.length < quizSize) {
                const remaining = allQuestions.filter(q => !selected.find(s => s._id === q._id));
                selected = [...selected, ...shuffleArray(remaining).slice(0, quizSize - selected.length)];
            }
        } else {
            // Standard Ratio: 40% Easy, 50% Medium, 10% Hard
            const easyCount = Math.round(quizSize * 0.4);
            const medCount = Math.round(quizSize * 0.5);
            const hardCount = quizSize - easyCount - medCount;

            selected = [
                ...pools.easy.slice(0, easyCount),
                ...pools.medium.slice(0, medCount),
                ...pools.hard.slice(0, hardCount)
            ];

            // Safety Fill: If any category was empty, fill with randoms from pool
            if (selected.length < quizSize) {
                const remaining = allQuestions.filter(q => !selected.find(s => s._id === q._id));
                selected = [...selected, ...shuffleArray(remaining).slice(0, quizSize - selected.length)];
            }
        }

        // Final shuffle of the selected subset
        const finalQuestions = shuffleArray(selected).slice(0, quizSize);

        // Create a 'virtual' module for the QuizViewer so it only sees the selected questions
        const virtualModule = {
            ...latestModule,
            quiz: {
                ...latestModule.quiz,
                questions: finalQuestions
            }
        };

        setActiveQuiz({ module: virtualModule, isFastTrack });
    };

    useEffect(() => {
        console.log('Selected Content Changed:', selectedContent);
    }, [selectedContent]);

    // Auto-select first content if available, but check localStorage first
    useEffect(() => {
        if (course.chapters.length > 0) {
            const savedContentId = localStorage.getItem(`selectedContentId_${user.id || user._id}_${course._id}`);

            if (savedContentId) {
                // Find and restore
                for (const chapter of course.chapters) {
                    for (const module of chapter.modules) {
                        const content = module.contents.find(c => c._id === savedContentId);
                        if (content) {
                            setSelectedContent(content);
                            setExpandedChapters(prev => ({ ...prev, [chapter._id]: true }));
                            setExpandedModules(prev => ({ ...prev, [module._id]: true }));
                            return;
                        }
                    }
                }
            }

            // Fallback to first
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

    const checkIsLocked = (chapter, module) => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role === 'teacher' || user.role === 'admin') return false;

        // Find module index in course
        const allModules = course.chapters.flatMap(c => c.modules);
        const moduleIndex = allModules.findIndex(m => m._id.toString() === module._id.toString());

        if (moduleIndex <= 0) return false; // First module (index 0) is always unlocked

        const prevModule = allModules[moduleIndex - 1];

        // Find if previous module is in completedModules
        const isPrevCompleted = studentProgress?.completedModules?.some(m =>
            m.moduleId.toString() === prevModule._id.toString()
        );

        return !isPrevCompleted;
    };

    const handleQuizSubmission = async (moduleId, answers, isFastTrack, callback) => {
        try {
            const studentId = JSON.parse(localStorage.getItem('user') || '{}').id || JSON.parse(localStorage.getItem('user') || '{}')._id;
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/courses/${course._id}/modules/${moduleId}/submit-quiz`, {
                studentId,
                answers, // Sending answers map
                isFastTrack
            });

            const { isPassed, score, requiredScore, message, corrections } = res.data;

            if (isPassed) {
                alert(`Perfect! Score: ${score}%. ${message}`);
                fetchProgress(); // Refresh progress
            } else {
                alert(`Score: ${score}%. Minimum required: ${requiredScore}%. Try again!`);
                // Find original module to re-trigger shuffle? 
                // We might just let them retry in the modal.
            }

            // Execute callback with results so QuizViewer can update UI
            if (callback) callback({ isPassed, score, corrections });

        } catch (err) {
            console.error('Quiz Submission Error:', err);
            alert('Error submitting quiz. Please try again.');
            if (callback) callback({ isPassed: false, score: 0, corrections: [] });
        }
    };

    const handleQuizClick = (module) => {
        // 1. Check if module has contents
        if (!module.contents || module.contents.length === 0) {
            handleTakeQuiz(module, false);
            return;
        }

        // 2. Check if all contents are completed
        const allContentsCompleted = module.contents.every(content => {
            // If this is the currently selected content, rely on local state (real-time check)
            if (selectedContent && content._id.toString() === selectedContent._id.toString()) {
                return isTimeRequirementMet;
            }
            // Otherwise check saved progress
            const p = studentProgress?.contentProgress?.find(cp => cp.contentId.toString() === content._id.toString());
            return p?.isCompleted;
        });

        if (allContentsCompleted) {
            handleTakeQuiz(module, false);
        } else {
            alert('Please complete all study materials in this module before taking the quiz.');
        }
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
        const fullUrl = `${import.meta.env.VITE_API_URL}${url}`;
        // Encode URI to handle spaces and special characters in filenames
        return encodeURI(fullUrl);
    };

    const toggleChapter = (chapterId) => {
        setExpandedChapters(prev => ({
            ...prev,
            [chapterId]: !prev[chapterId]
        }));
    };



    return (
        <div style={{ background: 'transparent', padding: '0', width: '100%' }}>
            {/* Navigation buttons moved to header */}

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                marginTop: '0'
            }}>
                {!isCinemaMode && (
                    <div className="course-top-nav" style={{
                        display: 'flex',
                        gap: '15px',
                        overflowX: 'auto',
                        paddingBottom: '15px',
                        borderBottom: '1px solid #edf2f7'
                    }}>
                        {course.chapters.map(chapter => (
                            <div key={chapter._id} style={{ minWidth: '250px', background: '#f8fafc', borderRadius: '12px', padding: '15px', border: '1px solid #edf2f7' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '10px', color: '#2d3748' }}>{chapter.title}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {chapter.modules.map(module => (
                                        <div key={module._id}>
                                            <div
                                                onClick={() => {
                                                    const isLocked = checkIsLocked(chapter, module);
                                                    if (isLocked) {
                                                        alert('🔒 This module is locked. Please pass the previous module quiz first!');
                                                        return;
                                                    }
                                                    toggleModule(module._id);
                                                }}
                                                style={{
                                                    cursor: 'pointer',
                                                    color: checkIsLocked(chapter, module) ? '#cbd5e0' : (expandedModules[module._id] ? '#6C63FF' : '#444'),
                                                    fontWeight: '600',
                                                    fontSize: '0.8rem',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '5px 8px',
                                                    borderRadius: '6px',
                                                    background: expandedModules[module._id] ? '#f0efff' : 'transparent'
                                                }}
                                            >
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    {checkIsLocked(chapter, module) && '🔒'}
                                                    {module.title}
                                                </span>
                                            </div>
                                            {expandedModules[module._id] && (
                                                <div style={{ marginTop: '5px', paddingLeft: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    {module.contents.map(content => (
                                                        <div
                                                            key={content._id}
                                                            onClick={() => setSelectedContent(content)}
                                                            style={{
                                                                fontSize: '0.75rem',
                                                                padding: '4px 8px',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer',
                                                                background: selectedContent?._id === content._id ? '#6C63FF' : 'transparent',
                                                                color: selectedContent?._id === content._id ? 'white' : '#718096'
                                                            }}
                                                        >
                                                            {content.title}
                                                        </div>
                                                    ))}
                                                    {module.quiz?.questions?.length > 0 && (
                                                        <div
                                                            onClick={() => handleQuizClick(module)}
                                                            style={{ fontSize: '0.75rem', padding: '4px 8px', color: '#38A169', fontWeight: 'bold', cursor: 'pointer' }}
                                                        >
                                                            📝 Quiz
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: '600px' }}>
                    <div className="content-view-area" style={{ flex: activeAIFeature ? 0.7 : 1, background: '#f8fafc', borderRadius: '15px', padding: '15px', border: '1px solid #edf2f7', display: 'flex', flexDirection: 'column' }}>
                        {activeQuiz ? (
                            <QuizViewer
                                quiz={activeQuiz.module.quiz}
                                isFastTrack={activeQuiz.isFastTrack}
                                alreadyPassed={studentProgress?.completedModules?.some(m =>
                                    m.moduleId.toString() === activeQuiz.module._id.toString() &&
                                    m.score >= (activeQuiz.isFastTrack ? (activeQuiz.module.quiz.fastTrackScore || 85) : (activeQuiz.module.quiz.passingScore || 70))
                                )}
                                savedScore={studentProgress?.completedModules?.find(m => m.moduleId.toString() === activeQuiz.module._id.toString())?.score || 0}
                                onClose={() => setActiveQuiz(null)}
                                onSubmit={(score, onFail) => handleQuizSubmission(activeQuiz.module._id, score, activeQuiz.isFastTrack, onFail)}
                            />
                        ) : selectedContent ? (
                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                {/* Progress Bars Row */}
                                <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                                    {/* Course Wide Progress Bar */}
                                    <div style={{ flex: 1, padding: '12px', background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4a5568' }}>Course Overall Progress</span>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#6C63FF' }}>
                                                {(() => {
                                                    const allC = course.chapters?.flatMap(c => c.modules?.flatMap(m => m.contents) || []) || [];
                                                    const allQ = course.chapters?.flatMap(c => c.modules || []).filter(m => m.quiz?.questions?.length > 0) || [];
                                                    const total = allC.length + allQ.length;
                                                    if (total === 0) return 0;

                                                    let points = 0;
                                                    allC.forEach(content => {
                                                        const cp = studentProgress?.contentProgress?.find(p => p.contentId?.toString() === content._id?.toString());
                                                        if (cp) {
                                                            if (cp.isCompleted) points += 1;
                                                            else if (content.minTime > 0) points += Math.min(0.9, cp.timeSpent / content.minTime);
                                                            else if (cp.timeSpent > 0) points += 0.1;
                                                        }
                                                    });
                                                    const passedQ = allQ.filter(m => studentProgress?.completedModules?.some(cm => cm.moduleId?.toString() === m._id?.toString())).length;
                                                    points += passedQ;

                                                    return Math.min(100, Math.round((points / total) * 100));
                                                })()}%
                                            </span>
                                        </div>
                                        <div style={{ height: '6px', background: '#edf2f7', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%',
                                                width: `${(() => {
                                                    const allC = course.chapters?.flatMap(c => c.modules?.flatMap(m => m.contents) || []) || [];
                                                    const allQ = course.chapters?.flatMap(c => c.modules || []).filter(m => m.quiz?.questions?.length > 0) || [];
                                                    const total = allC.length + allQ.length;
                                                    if (total === 0) return 0;

                                                    let points = 0;
                                                    allC.forEach(content => {
                                                        const cp = studentProgress?.contentProgress?.find(p => p.contentId?.toString() === content._id?.toString());
                                                        if (cp) {
                                                            if (cp.isCompleted) points += 1;
                                                            else if (content.minTime > 0) points += Math.min(0.9, cp.timeSpent / content.minTime);
                                                            else if (cp.timeSpent > 0) points += 0.1;
                                                        }
                                                    });
                                                    const passedQ = allQ.filter(m => studentProgress?.completedModules?.some(cm => cm.moduleId?.toString() === m._id?.toString())).length;
                                                    points += passedQ;

                                                    return Math.min(100, Math.round((points / total) * 100));
                                                })()}%`,
                                                background: 'linear-gradient(90deg, #6C63FF, #3182CE)',
                                                transition: 'width 0.5s ease-out'
                                            }}></div>
                                        </div>
                                    </div>


                                    {
                                        !isTabActive && !isTimeRequirementMet && (
                                            <div style={{
                                                padding: '8px',
                                                background: '#FFF5F5',
                                                color: '#C53030',
                                                borderRadius: '8px',
                                                marginBottom: '10px',
                                                textAlign: 'center',
                                                fontSize: '0.8rem',
                                                fontWeight: 'bold',
                                                border: '1px solid #FC8181'
                                            }}>
                                                ⚠️ Timer Paused: Please stay on this tab to continue your study time.
                                            </div>
                                        )
                                    }



                                    {/* Study Requirement Bar */}
                                    {
                                        selectedContent.minTime > 0 && (
                                            <div style={{ flex: 1, padding: '12px', background: isTimeRequirementMet ? '#C6F6D5' : '#EBF8FF', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ fontSize: '1rem' }}>{isTimeRequirementMet ? '✅' : '⏳'}</div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: isTimeRequirementMet ? '#22543D' : '#2A4365', display: 'flex', gap: '8px' }}>
                                                            {isTimeRequirementMet ? '✅ Requirement Met' : (
                                                                <>
                                                                    <span>⏱️ Spent: {formatTime(timeSpent)}</span>
                                                                    <span style={{ opacity: 0.6 }}>|</span>
                                                                    <span>⏳ Left: {formatTime(Math.max(0, selectedContent.minTime - timeSpent))}</span>
                                                                </>
                                                            )}
                                                        </span>
                                                        <span style={{ fontSize: '0.75rem', color: '#718096' }}>{Math.min(100, Math.round((timeSpent / selectedContent.minTime) * 100))}%</span>
                                                    </div>
                                                    <div style={{ height: '6px', background: 'rgba(0,0,0,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${Math.min(100, (timeSpent / selectedContent.minTime) * 100)}%`, background: isTimeRequirementMet ? '#38A169' : '#3182CE', transition: 'width 0.3s' }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    }
                                </div >

                                {!isTabActive && !isTimeRequirementMet && (
                                    <div style={{
                                        padding: '8px',
                                        background: '#FFF5F5',
                                        color: '#C53030',
                                        borderRadius: '8px',
                                        marginBottom: '10px',
                                        textAlign: 'center',
                                        fontSize: '0.8rem',
                                        fontWeight: 'bold',
                                        border: '1px solid #FC8181'
                                    }}>
                                        ⚠️ Timer Paused: Please stay on this tab to continue your study time.
                                    </div>
                                )}
                                <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div>
                                            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#2d3748' }}>{selectedContent.title}</h2>
                                            <span style={{ fontSize: '0.8rem', color: '#718096' }}>Type: {selectedContent.type.toUpperCase()}</span>
                                        </div>
                                        <button
                                            onClick={() => setActiveAIFeature(activeAIFeature === 'summary' ? null : 'summary')}
                                            style={{
                                                padding: '8px 12px',
                                                background: activeAIFeature === 'summary' ? '#4C51BF' : '#6C63FF',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '0.8rem',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                boxShadow: '0 2px 4px rgba(108, 99, 255, 0.3)'
                                            }}
                                        >
                                            ✨ AI Summary
                                        </button>
                                        <button
                                            onClick={() => setActiveAIFeature(activeAIFeature === 'quiz' ? null : 'quiz')}
                                            style={{
                                                padding: '8px 12px',
                                                background: activeAIFeature === 'quiz' ? '#2F855A' : '#38A169',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '0.8rem',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                boxShadow: '0 2px 4px rgba(47, 133, 90, 0.3)'
                                            }}
                                        >
                                            ✅ Quiz
                                        </button>
                                        <button
                                            onClick={() => setActiveAIFeature(activeAIFeature === 'doubt' ? null : 'doubt')}
                                            style={{
                                                padding: '8px 12px',
                                                background: activeAIFeature === 'doubt' ? '#C53030' : '#E53E3E',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '0.8rem',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                boxShadow: '0 2px 4px rgba(197, 48, 48, 0.3)'
                                            }}
                                        >
                                            🤔 Doubt
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        {selectedContent.type === 'doc' && (
                                            <a
                                                href={getContentUrl(selectedContent.url)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    padding: '8px 12px',
                                                    background: '#4A5568',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 'bold',
                                                    textDecoration: 'none',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}
                                            >
                                                📥 Download
                                            </a>
                                        )}
                                        <a
                                            href={isTimeRequirementMet ? getContentUrl(selectedContent.url) : '#'}
                                            target={isTimeRequirementMet ? "_blank" : "_self"}
                                            rel="noopener noreferrer"
                                            onClick={(e) => {
                                                if (!isTimeRequirementMet) {
                                                    e.preventDefault();
                                                    alert('Please complete the minimum time requirement before opening this link!');
                                                }
                                            }}
                                            style={{
                                                padding: '8px 12px',
                                                background: isTimeRequirementMet ? '#edf2f7' : '#e2e8f0',
                                                color: isTimeRequirementMet ? '#4a5568' : '#a0aec0',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '0.8rem',
                                                fontWeight: 'bold',
                                                textDecoration: 'none',
                                                cursor: isTimeRequirementMet ? 'pointer' : 'not-allowed',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                opacity: isTimeRequirementMet ? 1 : 0.7
                                            }}
                                        >
                                            {isTimeRequirementMet ? '🚀' : '🔒'} Open in New Tab
                                        </a>
                                    </div>
                                </div>

                                <div style={{ flex: 1, background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                    {selectedContent.type === 'pdf' || selectedContent.type === 'doc' ? (
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
                                    ) : selectedContent.type === 'video' ? (
                                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, padding: '20px', background: '#000' }}>
                                            <video
                                                src={getContentUrl(selectedContent.url)}
                                                controls
                                                style={{ maxWidth: '100%', maxHeight: '100%' }}
                                            />
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
                                            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>
                                                {selectedContent.type === 'doc' ? '📄' : '📦'}
                                            </div>
                                            <h3>{selectedContent.type === 'doc' ? 'Document Content' : 'Preview not available'}</h3>
                                            <p style={{ marginBottom: '24px' }}>
                                                {selectedContent.type === 'doc'
                                                    ? 'This document can be downloaded for viewing.'
                                                    : `This file type (${selectedContent.type}) cannot be previewed directly.`}
                                            </p>
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
                                                {selectedContent.type === 'doc' ? 'Download Document' : 'Download / View File'}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div >
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#a0aec0' }}>
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '20px' }}>
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
                                </svg>
                                <p>Select a lesson from the sidebar to start learning</p>
                            </div>
                        )}
                    </div >
                </div >

                {activeAIFeature && selectedContent && (
                    <div style={{ flex: 0.3, background: 'white', borderRadius: '15px', border: '1px solid #edf2f7', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                        <AIAssistantSidebar
                            content={selectedContent}
                            activeFeature={activeAIFeature}
                            aiSummary={aiSummary}
                            setAiSummary={setAiSummary}
                            isGeneratingSummary={isGeneratingSummary}
                            setIsGeneratingSummary={setIsGeneratingSummary}
                        />
                    </div>
                )}
            </div >
        </div >
    );
};

// --- NEW SECTION: Assignments View ---
const AssignmentsSection = ({ userId, courses }) => {
    const [assignments, setAssignments] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState(''); // Default to all
    const [submissions, setSubmissions] = useState({}); // Tracking student's own submissions
    const [activeAssignment, setActiveAssignment] = useState(null);
    const [loading, setLoading] = useState(true);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 12; // Updated for better grid alignment

    // Submission states
    const [submitting, setSubmitting] = useState(false);
    const [code, setCode] = useState('');
    const [file, setFile] = useState(null);
    const fileInputRef = useRef(null);
    const [stdin, setStdin] = useState('');
    const [executionResult, setExecutionResult] = useState(null);
    const [isExecuting, setIsExecuting] = useState(false);

    // Test Case States
    const [testResults, setTestResults] = useState(null);
    const [isRunningTests, setIsRunningTests] = useState(false);

    const handleRunCode = async () => {
        setIsExecuting(true);
        setExecutionResult(null);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/assignments/execute`, {
                code,
                language: activeAssignment.codingDetails?.language || 'javascript',
                stdin
            });
            setExecutionResult(res.data);
        } catch (err) {
            console.error(err);
            setExecutionResult({ output: 'Error executing code: ' + (err.response?.data?.message || err.message) });
        } finally {
            setIsExecuting(false);
        }
    };

    const handleRunTests = async () => {
        setIsRunningTests(true);
        setTestResults(null);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/assignments/execute-tests`, {
                code,
                language: activeAssignment.codingDetails?.language || 'javascript',
                testCases: activeAssignment.codingDetails?.testCases || []
            });
            setTestResults(res.data.results);
        } catch (err) {
            console.error(err);
            alert('Error running tests: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsRunningTests(false);
        }
    };

    useEffect(() => {
        // No longer auto-selecting first course
    }, [courses]);

    useEffect(() => {
        fetchAssignmentsAndSubmissions();
    }, [selectedCourseId, courses]);

    const fetchAssignmentsAndSubmissions = async () => {
        setLoading(true);
        try {
            // 1. Fetch assignments
            let asgns = [];
            if (selectedCourseId) {
                // Fetch for specific course
                const asgnRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/assignments/course/${selectedCourseId}`);
                asgns = asgnRes.data;
            } else {
                // Fetch ALL assignments (from all enrolled courses)
                // We'll iterate through available courses to get their assignments
                // Optimized: parallel fetch
                const promises = courses.map(c => axios.get(`${import.meta.env.VITE_API_URL}/api/assignments/course/${c._id}`).catch(() => ({ data: [] })));
                const results = await Promise.all(promises);
                asgns = results.flatMap(r => r.data);
            }
            setAssignments(asgns);

            // 2. Fetch submissions for each assignment
            const subsMapped = {};
            await Promise.all(asgns.map(async (asgn) => {
                const subRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/assignments/student/${userId}/assignment/${asgn._id}`);
                if (subRes.data) subsMapped[asgn._id] = subRes.data;
            }));
            setSubmissions(subsMapped);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            let fileUrl = submissions[activeAssignment._id]?.fileUrl || '';

            // 1. If file assignment, upload file first
            if (activeAssignment.type === 'file' && file) {
                const formData = new FormData();
                formData.append('file', file);
                const uploadRes = await axios.post(`${import.meta.env.VITE_API_URL}/api/assignments/upload`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                fileUrl = uploadRes.data.url;
            }

            // 2. Submit the assignment data
            await axios.post(`${import.meta.env.VITE_API_URL}/api/assignments/submit`, {
                assignmentId: activeAssignment._id,
                studentId: userId,
                courseId: selectedCourseId || activeAssignment.course,
                fileUrl,
                code: activeAssignment.type === 'coding' ? code : '',
                language: activeAssignment.codingDetails?.language || 'javascript'
            });

            alert('Assignment submitted successfully!');
            setActiveAssignment(null);
            fetchAssignmentsAndSubmissions();
        } catch (err) {
            alert('Error submitting assignment');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '1.75rem', color: '#2d3748', margin: 0 }}>My Assignments</h2>
                <p style={{ color: '#718096' }}>Track and submit your course tasks.</p>
            </div>

            <div style={{ marginBottom: '30px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>Select Course</label>
                <select
                    className="form-input"
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    style={{ width: '300px', color: 'black', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e0' }}
                >
                    <option value="" style={{ color: 'black' }}>All Courses</option>
                    {courses.map(c => <option key={c._id} value={c._id} style={{ color: 'black' }}>{c.subject}</option>)}
                </select>
            </div>

            {loading ? <p>Loading assignments...</p> : assignments.length === 0 ? <p>No assignments found for this course.</p> : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                        {assignments.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(asgn => {
                            const sub = submissions[asgn._id];
                            const isGraded = sub?.status === 'Graded';
                            const isSubmitted = !!sub;

                            return (
                                <div key={asgn._id} style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid #edf2f7', position: 'relative' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '0.7rem',
                                            fontWeight: '700',
                                            background: isGraded ? '#d1fae5' : isSubmitted ? '#dbeafe' : 'rgba(0,0,0,0.05)',
                                            color: isGraded ? '#065f46' : isSubmitted ? '#1e40af' : '#718096'
                                        }}>
                                            {isGraded ? 'GRADED' : isSubmitted ? 'SUBMITTED' : 'NOT STARTED'}
                                        </span>
                                        <span style={{ fontSize: '0.8rem', color: '#f87171', fontWeight: 'bold' }}>
                                            Due: {new Date(asgn.dueDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                    {asgn.type === 'coding' && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '60px',
                                            right: '24px',
                                            background: '#EEF2FF',
                                            color: '#4338CA',
                                            padding: '4px 10px',
                                            borderRadius: '20px',
                                            fontSize: '0.75rem',
                                            fontWeight: 'bold',
                                            border: '1px solid #C7D2FE'
                                        }}>
                                            💻 {asgn.codingDetails?.language?.toUpperCase()}
                                        </div>
                                    )}
                                    <h3 style={{ margin: '0 0 10px 0' }}>{asgn.title}</h3>
                                    <p style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '20px', minHeight: '40px' }}>{asgn.description}</p>

                                    {isGraded && (
                                        <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '12px', marginBottom: '15px', border: '1px solid #dcfce7' }}>
                                            <p style={{ margin: 0, fontWeight: 'bold', color: '#166534', fontSize: '0.9rem' }}>Score: {sub.score}/{asgn.maxPoints}</p>
                                            <FeedbackReadMore feedback={sub.feedback} />
                                        </div>
                                    )}

                                    <button
                                        onClick={() => {
                                            setActiveAssignment(asgn);
                                            setCode(sub?.code || asgn.codingDetails?.starterCode || '');
                                            setStdin(sub?.stdin || '');
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            background: sub?.status === 'Re-write' ? '#ea580c' : isSubmitted ? '#f8fafc' : '#6366f1',
                                            color: sub?.status === 'Re-write' ? 'white' : isSubmitted ? '#4a5568' : 'white',
                                            border: isSubmitted && sub?.status !== 'Re-write' ? '1px solid #e2e8f0' : 'none',
                                            borderRadius: '12px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {sub?.status === 'Re-write' ? 'Resubmit Now' : isSubmitted ? 'View Submission' : 'Start Assignment'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination Controls */}
                    {assignments.length > ITEMS_PER_PAGE && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '30px' }}>
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    background: currentPage === 1 ? '#f7fafc' : 'white',
                                    color: currentPage === 1 ? '#cbd5e0' : '#4a5568',
                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                &lt; Previous
                            </button>
                            <span style={{ fontSize: '0.9rem', color: '#718096', fontWeight: '600' }}>
                                Page {currentPage} of {Math.ceil(assignments.length / ITEMS_PER_PAGE)}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(Math.ceil(assignments.length / ITEMS_PER_PAGE), p + 1))}
                                disabled={currentPage === Math.ceil(assignments.length / ITEMS_PER_PAGE)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    background: currentPage === Math.ceil(assignments.length / ITEMS_PER_PAGE) ? '#f7fafc' : 'white',
                                    color: currentPage === Math.ceil(assignments.length / ITEMS_PER_PAGE) ? '#cbd5e0' : '#4a5568',
                                    cursor: currentPage === Math.ceil(assignments.length / ITEMS_PER_PAGE) ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                Next &gt;
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Submission Modal */}
            {activeAssignment && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
                    <div style={{ background: 'white', padding: '32px', borderRadius: '24px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0 }}>{activeAssignment.title}</h2>
                            <button onClick={() => setActiveAssignment(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                        </div>
                        <p style={{ color: '#718096', marginBottom: '24px' }}>{activeAssignment.description}</p>

                        {activeAssignment.type === 'coding' && (
                            <div style={{
                                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                                padding: '15px 20px',
                                borderRadius: '15px',
                                marginBottom: '24px',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px',
                                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)'
                            }}>
                                <div style={{ fontSize: '1.5rem' }}>ℹ️</div>
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>Required Programming Language</div>
                                    <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                                        Please write your solution in <strong style={{ textDecoration: 'underline' }}>{activeAssignment.codingDetails?.language?.toUpperCase()}</strong> as requested by the instructor.
                                    </div>
                                </div>
                            </div>
                        )}

                        {submissions[activeAssignment._id] && submissions[activeAssignment._id].status !== 'Re-write' ? (
                            <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                                {/* --- SUBMISSION PREVIEW --- */}
                                <div style={{ marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                        <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#4a5568' }}>Submission Status</span>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '0.8rem',
                                            fontWeight: '700',
                                            background: submissions[activeAssignment._id].status === 'Graded' ? '#d1fae5' : '#dbeafe',
                                            color: submissions[activeAssignment._id].status === 'Graded' ? '#065f46' : '#1e40af'
                                        }}>
                                            {submissions[activeAssignment._id].status}
                                        </span>
                                    </div>

                                    {activeAssignment.type === 'file' ? (
                                        <div style={{ textAlign: 'center', padding: '20px' }}>
                                            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📄</div>
                                            <a
                                                href={submissions[activeAssignment._id].fileUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{ color: '#6366f1', fontWeight: 'bold', textDecoration: 'underline' }}
                                            >
                                                View Submitted File
                                            </a>
                                        </div>
                                    ) : (
                                        <div>
                                            <div style={{ background: '#1a202c', padding: '15px', borderRadius: '10px', marginBottom: '15px' }}>
                                                <div style={{ color: '#a0aec0', fontSize: '0.8rem', marginBottom: '5px' }}>Submitted Code:</div>
                                                <pre style={{ color: '#818cf8', margin: 0, fontFamily: 'monospace', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                                                    {submissions[activeAssignment._id].code}
                                                </pre>
                                            </div>

                                            <div style={{ marginBottom: '15px' }}>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#4a5568', marginBottom: '5px' }}>Test Input (stdin):</label>
                                                <textarea
                                                    value={stdin}
                                                    onChange={(e) => setStdin(e.target.value)}
                                                    placeholder="Enter inputs..."
                                                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e0', fontFamily: 'monospace' }}
                                                />
                                            </div>

                                            <button
                                                type="button"
                                                onClick={handleRunCode}
                                                disabled={isExecuting}
                                                style={{ width: '100%', padding: '10px', background: isExecuting ? '#cbd5e0' : '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: isExecuting ? 'not-allowed' : 'pointer' }}
                                            >
                                                {isExecuting ? 'Running...' : '▶ Run Code'}
                                            </button>

                                            {executionResult && (
                                                <div style={{ marginTop: '15px', background: '#2d3748', padding: '15px', borderRadius: '10px', color: '#e2e8f0', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                                                    <div style={{ color: '#a0aec0', fontSize: '0.7rem', marginBottom: '5px' }}>Output:</div>
                                                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{executionResult.output}</pre>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {submissions[activeAssignment._id].status === 'Graded' && (
                                        <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
                                            <div style={{ fontWeight: 'bold', color: '#2f855a', marginBottom: '5px' }}>Instructor Feedback:</div>
                                            <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>{submissions[activeAssignment._id].feedback}</p>
                                            <div style={{ fontWeight: 'bold', color: '#2f855a' }}>Score: {submissions[activeAssignment._id].score}/{activeAssignment.maxPoints}</div>
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => setActiveAssignment(null)} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Close</button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                {submissions[activeAssignment._id]?.status === 'Re-write' && (
                                    <div style={{ marginBottom: '20px', padding: '15px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '12px' }}>
                                        <h4 style={{ color: '#c2410c', margin: '0 0 5px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>📝</span> Resubmission Requested
                                        </h4>
                                        <p style={{ margin: 0, color: '#9a3412', fontSize: '0.95rem' }}>
                                            <strong>Instructor Feedback:</strong> {submissions[activeAssignment._id].feedback}
                                        </p>
                                    </div>
                                )}
                                {activeAssignment.type === 'file' ? (
                                    <div style={{ marginBottom: '24px' }}>
                                        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Upload your file (PDF/Image/Doc)</label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                disabled={!!submissions[activeAssignment._id] && submissions[activeAssignment._id].status !== 'Re-write'}
                                                onChange={(e) => setFile(e.target.files[0])}
                                                style={{ border: '2px dashed #e2e8f0', padding: '20px', width: '100%', borderRadius: '12px', cursor: (!!submissions[activeAssignment._id] && submissions[activeAssignment._id].status !== 'Re-write') ? 'not-allowed' : 'pointer', opacity: (!!submissions[activeAssignment._id] && submissions[activeAssignment._id].status !== 'Re-write') ? 0.6 : 1 }}
                                            />
                                            {file && (!submissions[activeAssignment._id] || submissions[activeAssignment._id].status === 'Re-write') && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFile(null);
                                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        padding: '12px',
                                                        background: '#fee2e2',
                                                        color: '#ef4444',
                                                        border: '1px solid #fecaca',
                                                        borderRadius: '12px',
                                                        cursor: 'pointer',
                                                        fontWeight: 'bold',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '8px'
                                                    }}
                                                >
                                                    <span style={{ fontSize: '1.2rem', lineHeight: 0 }}>&times;</span> Cancel Selection
                                                </button>
                                            )}
                                        </div>

                                    </div>
                                ) : (
                                    <div style={{ marginBottom: '24px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <label style={{ fontWeight: 'bold' }}>Code Editor</label>
                                            <div style={{
                                                background: '#4F46E5',
                                                color: 'white',
                                                padding: '5px 12px',
                                                borderRadius: '8px',
                                                fontSize: '0.8rem',
                                                fontWeight: 'bold',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px'
                                            }}>
                                                Required Language: {activeAssignment.codingDetails?.language?.toUpperCase()}
                                            </div>
                                        </div>
                                        <div style={{ background: '#1a202c', padding: '15px', borderRadius: '15px' }}>
                                            <textarea
                                                value={code}
                                                readOnly={!!submissions[activeAssignment._id] && submissions[activeAssignment._id].status !== 'Re-write'}
                                                onChange={(e) => setCode(e.target.value)}
                                                onCopy={(e) => { e.preventDefault(); alert('Copying is disabled!'); }}
                                                onPaste={(e) => { e.preventDefault(); alert('Pasting is disabled!'); }}
                                                onCut={(e) => { e.preventDefault(); alert('Cutting is disabled!'); }}
                                                style={{
                                                    width: '100%',
                                                    minHeight: '300px',
                                                    background: 'transparent',
                                                    color: '#818cf8',
                                                    border: 'none',
                                                    outline: 'none',
                                                    fontFamily: 'monospace',
                                                    fontSize: '1rem',
                                                    lineHeight: '1.5',
                                                    resize: 'vertical',
                                                    cursor: (!!submissions[activeAssignment._id] && submissions[activeAssignment._id].status !== 'Re-write') ? 'default' : 'text'
                                                }}
                                                placeholder="Write your code here..."
                                            />
                                            <div style={{ marginBottom: '15px' }}>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#4a5568', marginBottom: '8px' }}>Input (Standard Input):</label>
                                                <textarea
                                                    value={stdin}
                                                    readOnly={!!submissions[activeAssignment._id] && submissions[activeAssignment._id].status !== 'Re-write'}
                                                    onChange={(e) => setStdin(e.target.value)}
                                                    placeholder="Enter inputs here (e.g. 29 for prime check)..."
                                                    style={{
                                                        width: '100%',
                                                        height: '60px',
                                                        background: '#f8fafc',
                                                        border: '1px solid #e2e8f0',
                                                        borderRadius: '8px',
                                                        padding: '10px',
                                                        fontSize: '0.9rem',
                                                        fontFamily: 'monospace',
                                                        resize: 'none',
                                                        outline: 'none',
                                                        cursor: (!!submissions[activeAssignment._id] && submissions[activeAssignment._id].status !== 'Re-write') ? 'default' : 'text'
                                                    }}
                                                />
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', gap: '10px' }}>
                                                {/* Test Case Run Button */}
                                                {activeAssignment.codingDetails?.testCases?.length > 0 && (
                                                    <button
                                                        type="button"
                                                        disabled={isRunningTests || isExecuting}
                                                        onClick={handleRunTests}
                                                        style={{ padding: '8px 16px', background: '#805AD5', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}
                                                    >
                                                        {isRunningTests ? 'Running Tests...' : '⚡ Run Test Cases'}
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    disabled={isExecuting || isRunningTests}
                                                    onClick={handleRunCode}
                                                    style={{ padding: '8px 16px', background: '#38B2AC', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}
                                                >
                                                    {isExecuting ? 'Running...' : '▶ Compile & Run'}
                                                </button>
                                            </div>

                                            {executionResult && (
                                                <div style={{ marginTop: '20px' }}>
                                                    <p style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#4a5568', marginBottom: '8px' }}>Execution Output:</p>
                                                    <div style={{
                                                        background: '#1a202c',
                                                        padding: '15px',
                                                        borderRadius: '12px',
                                                        color: '#e2e8f0',
                                                        fontFamily: 'monospace',
                                                        fontSize: '0.9rem',
                                                        maxHeight: '200px',
                                                        overflowY: 'auto',
                                                        whiteSpace: 'pre-wrap',
                                                        border: '1px solid #4a5568'
                                                    }}>
                                                        {executionResult.output}
                                                    </div>
                                                </div>
                                            )}

                                            {testResults && (
                                                <div style={{ marginTop: '20px' }}>
                                                    <p style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#4a5568', marginBottom: '8px' }}>Test Case Results:</p>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                        {testResults.map((res, idx) => (
                                                            <div key={idx} style={{
                                                                background: '#1a202c',
                                                                padding: '12px',
                                                                borderRadius: '8px',
                                                                borderLeft: `4px solid ${res.passed ? '#48BB78' : '#F56565'}`
                                                            }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                                                    <span style={{ fontWeight: 'bold', color: res.passed ? '#48BB78' : '#F56565', fontSize: '0.85rem' }}>
                                                                        Test Case #{idx + 1}: {res.passed ? 'PASSED' : 'FAILED'}
                                                                    </span>
                                                                </div>
                                                                {!res.passed && (
                                                                    <div style={{ fontSize: '0.8rem', color: '#cbd5e0' }}>
                                                                        <div><strong>Input:</strong> {res.input}</div>
                                                                        <div><strong>Expected:</strong> {res.expectedOutput}</div>
                                                                        <div><strong>Actual:</strong> {res.actualOutput || '(No Output)'}</div>
                                                                        {res.error && <div style={{ color: '#fc8181', marginTop: '4px' }}><strong>Error:</strong> {res.error}</div>}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <button type="button" onClick={() => setActiveAssignment(null)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 'bold' }}>Close</button>
                                    {(!submissions[activeAssignment._id] || submissions[activeAssignment._id].status === 'Re-write') && (
                                        <button
                                            disabled={submitting}
                                            type="submit"
                                            style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: '#6366f1', color: 'white', fontWeight: 'bold' }}
                                        >
                                            {submitting ? 'Submitting...' : submissions[activeAssignment._id]?.status === 'Re-write' ? 'Resubmit Assignment' : 'Submit Assignment'}
                                        </button>
                                    )}
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- NEW SECTION: Profile View ---
const ProfileSection = ({ userId }) => {
    const sessionUser = JSON.parse(localStorage.getItem('user') || '{}');
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!userId || userId === 'undefined') {
                console.warn('[PROFILE] No valid userId provided for student. Falling back to session data.');
                setProfile(sessionUser);
                setLoading(false);
                return;
            }

            try {
                console.log(`[PROFILE] Fetching student profile for: ${userId}`);
                const apiUrl = import.meta.env.VITE_API_URL || '${API_URL}';
                const res = await axios.get(`${apiUrl}/api/auth/profile/${userId}`);
                console.log('[PROFILE] Data received from API:', res.data);
                setProfile(res.data);
            } catch (err) {
                console.error('[PROFILE] Error fetching student profile:', err);
                console.error('[PROFILE] Error response:', err.response?.data);
                setError(err.message);
                // Fallback to session user
                setProfile(sessionUser);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [userId]);

    if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>Loading profile...</div>;

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
                <div style={{ width: '100px', height: '100px', borderRadius: '30px', background: 'linear-gradient(135deg, #6C63FF 0%, #4338CA 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 'bold', boxShadow: '0 10px 20px rgba(108, 99, 255, 0.2)' }}>
                    {profile.name ? profile.name.charAt(0).toUpperCase() : '?'}
                </div>
                <div>
                    <h2 style={{ fontSize: '2rem', margin: '0 0 5px 0', color: '#2d3748' }}>{profile.name}</h2>
                    <p style={{ margin: 0, color: '#6C63FF', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.9rem' }}>{profile.role}</p>
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
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#718096', marginBottom: '5px', fontWeight: '600' }}>Account Activity</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
                        <div style={{ fontSize: '1rem', color: '#10b981', fontWeight: '700' }}>Active</div>
                    </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '15px', border: '1px solid #edf2f7' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#718096', marginBottom: '5px', fontWeight: '600' }}>Enrollment Number</label>
                    <div style={{ fontSize: '1.1rem', color: '#2d3748', fontWeight: '500' }}>{profile.enrollment || 'Not Assigned'}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '15px', border: '1px solid #edf2f7' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#718096', marginBottom: '5px', fontWeight: '600' }}>Branch</label>
                    <div style={{ fontSize: '1.1rem', color: '#2d3748', fontWeight: '500' }}>{profile.branch || 'Not Assigned'}</div>
                </div>
            </div>

            <div style={{ marginTop: '40px', padding: '20px', background: 'rgba(108, 99, 255, 0.05)', borderRadius: '15px', border: '1px dashed #6C63FF' }}>
                <p style={{ margin: 0, color: '#4a5568', fontSize: '0.9rem', textAlign: 'center' }}>
                    Continue your learning adventure with LMS Student. Your path to excellence starts here!
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


const AnnouncementsSection = ({ announcements }) => {
    // Filter & Pagination State
    const [filterText, setFilterText] = useState('');
    const [senderFilter, setSenderFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Filter Logic
    const filteredAnnouncements = announcements.filter(ann => {
        const matchesText = (
            ann.title.toLowerCase().includes(filterText.toLowerCase()) ||
            ann.content.toLowerCase().includes(filterText.toLowerCase())
        );
        const matchesSender = (
            !senderFilter ||
            (ann.author && ann.author.name.toLowerCase().includes(senderFilter.toLowerCase()))
        );
        return matchesText && matchesSender;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredAnnouncements.length / ITEMS_PER_PAGE);
    const paginatedAnnouncements = filteredAnnouncements.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterText, senderFilter]);

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📢</div>
                <h2 style={{ fontSize: '1.8rem', color: '#2D3748', marginBottom: '10px' }}>Latest Announcements</h2>
                <p style={{ color: '#718096' }}>Stay updated with important news and events</p>
            </div>

            {/* Filter Controls */}
            {announcements.length > 0 && (
                <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '250px' }}>
                        <input
                            type="text"
                            placeholder="🔍 Search announcements..."
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                outline: 'none',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                fontSize: '1rem'
                            }}
                        />
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <input
                            type="text"
                            placeholder="👤 Filter by sender..."
                            value={senderFilter}
                            onChange={(e) => setSenderFilter(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                outline: 'none',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                fontSize: '1rem'
                            }}
                        />
                    </div>
                </div>
            )}

            {filteredAnnouncements.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '20px', border: '2px dashed #edf2f7' }}>
                    <h3 style={{ color: '#2d3748', marginBottom: '10px' }}>No Announcements Found</h3>
                    <p style={{ color: '#718096', margin: 0 }}>
                        {announcements.length === 0 ? "Check back later for updates." : "Try adjusting your search filters."}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '25px' }}>
                    {paginatedAnnouncements.map((ann) => (
                        <div
                            key={ann._id}
                            style={{
                                background: 'white',
                                padding: '30px',
                                borderRadius: '20px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
                                border: '1px solid #edf2f7',
                                borderLeft: '6px solid #6366f1',
                                transition: 'transform 0.2s',
                                cursor: 'default'
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                <div>
                                    <h3 style={{ margin: '0 0 8px 0', color: '#1e293b', fontSize: '1.25rem', fontWeight: '700' }}>{ann.title}</h3>
                                    <span style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: '700', textTransform: 'uppercase', background: '#e0e7ff', padding: '4px 8px', borderRadius: '6px' }}>
                                        To: {ann.target || 'Everyone'}
                                    </span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>
                                        {new Date(ann.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                        {new Date(ann.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>

                            <p style={{
                                margin: '0 0 25px 0',
                                color: '#475569',
                                fontSize: '1rem',
                                lineHeight: '1.7',
                                whiteSpace: 'pre-wrap'
                            }}>
                                {ann.content}
                            </p>

                            <div style={{
                                paddingTop: '20px',
                                borderTop: '1px solid #f1f5f9',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: '#f1f5f9',
                                    color: '#6366f1',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.9rem',
                                    fontWeight: 'bold'
                                }}>
                                    {ann.author?.name?.charAt(0) || 'A'}
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}>
                                        {ann.author?.name || 'Administrator'}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Authorized Staff</div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Pagination Controls */}
                    {filteredAnnouncements.length > ITEMS_PER_PAGE && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '30px' }}>
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '10px',
                                    border: '1px solid #e2e8f0',
                                    background: currentPage === 1 ? '#f7fafc' : 'white',
                                    color: currentPage === 1 ? '#cbd5e0' : '#4a5568',
                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem'
                                }}
                            >
                                &lt; Previous
                            </button>
                            <span style={{ fontSize: '0.9rem', color: '#718096', fontWeight: '600' }}>
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '10px',
                                    border: '1px solid #e2e8f0',
                                    background: currentPage === totalPages ? '#f7fafc' : 'white',
                                    color: currentPage === totalPages ? '#cbd5e0' : '#4a5568',
                                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem'
                                }}
                            >
                                Next &gt;
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StudentDashboard;

const LiveClassStudentSection = () => {
    const navigate = useNavigate();
    const [liveClasses, setLiveClasses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchActive();
        const interval = setInterval(fetchActive, 10000); // Check every 10s
        return () => clearInterval(interval);
    }, []);

    const fetchActive = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/live-class/active`);
            setLiveClasses(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>Checking for active classes...</div>;

    return (
        <div style={{ background: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '30px' }}>📺 Active Live Classrooms</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {liveClasses.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px', background: '#f8fafc', borderRadius: '15px', color: '#64748b' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '15px' }}>😴</div>
                        <h3>No classes are live right now</h3>
                        <p>Keep an eye on announcements for scheduled class timings.</p>
                    </div>
                ) : (
                    liveClasses.map(c => (
                        <div key={c._id} style={{
                            background: 'white',
                            padding: '24px',
                            borderRadius: '16px',
                            borderLeft: '5px solid #10b981',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
                            position: 'relative'
                        }}>
                            <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <div style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#ef4444' }}>LIVE</span>
                            </div>
                            <h4 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: '#1a202c' }}>{c.title}</h4>
                            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>
                                👨‍🏫 <b>Host:</b> {c.teacherName || c.teacher?.name || 'Instructor'}
                            </p>
                            <button
                                onClick={() => navigate(`/live-class/${c.roomId}`)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
                            >
                                Enter Classroom 🚀
                            </button>
                        </div>
                    ))
                )}
            </div>

            <style>{`
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.3; }
                    100% { opacity: 1; }
                }
            `}</style>
        </div>
    );
};

const generateCertificate = (studentName, courseName, completionDate) => {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // --- Border & Background ---
    doc.setDrawColor(74, 85, 104); // Dark border
    doc.setLineWidth(5);
    doc.rect(5, 5, pageWidth - 10, pageHeight - 10);

    doc.setDrawColor(108, 99, 255); // Inner purple border
    doc.setLineWidth(1);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

    // --- Header ---
    doc.setTextColor(108, 99, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(40);
    doc.text('CERTIFICATE OF COMPLETION', pageWidth / 2, 45, { align: 'center' });

    doc.setTextColor(74, 85, 104);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'normal');
    doc.text('This is to certify that', pageWidth / 2, 70, { align: 'center' });

    // --- Student Name ---
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(35);
    doc.text(studentName.toUpperCase(), pageWidth / 2, 95, { align: 'center' });

    // --- Body ---
    doc.setTextColor(74, 85, 104);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'normal');
    doc.text('has successfully completed the course', pageWidth / 2, 115, { align: 'center' });

    // --- Course Name ---
    doc.setTextColor(108, 99, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.text(courseName, pageWidth / 2, 135, { align: 'center' });

    // --- Footer & Date ---
    doc.setTextColor(113, 128, 150);
    doc.setFontSize(12);
    const date = (completionDate ? new Date(completionDate) : new Date()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text(`Issued on: ${date}`, pageWidth / 2, 160, { align: 'center' });

    // --- Signature ---
    try {
        doc.addImage(signatureImg, 'PNG', pageWidth / 2 - 20, 165, 40, 20);
    } catch (e) {
        console.warn('Signature image failed to load', e);
    }
    doc.setDrawColor(203, 213, 224);
    doc.line(pageWidth / 2 - 30, 185, pageWidth / 2 + 30, 185);
    doc.setFontSize(10);
    doc.text('Authorized Signature', pageWidth / 2, 192, { align: 'center' });

    // --- ID Placeholder ---
    const certId = 'CERT-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    doc.setFontSize(8);
    doc.text(`Verify at: lms.example.com/verify | ID: ${certId}`, 15, pageHeight - 15);

    doc.save(`${studentName}_${courseName}_Certificate.pdf`);
};

const CertificatesSection = ({ courses, allProgress, user }) => {
    const [completionDates, setCompletionDates] = useState({});

    const checkCompletion = (course) => {
        const progress = allProgress.find(p => p.course.toString() === course._id.toString());
        if (!progress) return 0;

        const allContents = course.chapters.flatMap(c => c.modules.flatMap(m => m.contents)) || [];
        const allQuizzes = course.chapters.flatMap(c => c.modules || []).filter(m => m.quiz?.questions?.length > 0) || [];
        const totalItems = allContents.length + allQuizzes.length;

        if (totalItems === 0) return 0;

        let completedItems = 0;
        allContents.forEach(content => {
            if (progress.contentProgress?.some(cp => cp.contentId.toString() === content._id.toString() && cp.isCompleted)) {
                completedItems++;
            }
        });

        allQuizzes.forEach(module => {
            if (progress.completedModules?.some(cm => cm.moduleId.toString() === module._id.toString())) {
                completedItems++;
            }
        });

        return Math.floor((completedItems / totalItems) * 100);
    };

    const completedCourses = courses.filter(course => {
        const percent = checkCompletion(course);
        return percent === 100 && course.chapters.flatMap(c => c.modules).length > 0;
    });

    useEffect(() => {
        const fetchCompletionDates = async () => {
            const newDates = { ...completionDates };
            let changed = false;

            for (const course of completedCourses) {
                // If we already have a date locally, skip
                if (newDates[course._id]) continue;

                // Check if it's already in allProgress (passed from parent)
                const progress = allProgress.find(p => p.course.toString() === course._id.toString());
                if (progress && progress.courseCompletedAt) {
                    newDates[course._id] = progress.courseCompletedAt;
                    changed = true;
                } else {
                    // Not found, verify with backend (and force calculation/freeze)
                    try {
                        const studentId = user.id || user._id;
                        const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/courses/${course._id}/complete`, { studentId });
                        if (res.data.isCompleted && res.data.completedAt) {
                            newDates[course._id] = res.data.completedAt;
                            changed = true;
                        }
                    } catch (err) {
                        console.error('Error verifying completion:', err);
                    }
                }
            }

            if (changed) {
                setCompletionDates(newDates);
            }
        };

        if (completedCourses.length > 0) {
            fetchCompletionDates();
        }
    }, [completedCourses, allProgress, user]);

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 12;

    const filteredCertificates = completedCourses.filter(course =>
        course.subject.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredCertificates.length / ITEMS_PER_PAGE);
    const paginatedCertificates = filteredCertificates.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    return (
        <div>
            {/* Search Bar */}
            <div style={{ marginBottom: '25px' }}>
                <input
                    type="text"
                    placeholder="🔍 Search certificates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        maxWidth: '400px',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        outline: 'none',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                        fontSize: '1rem'
                    }}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '25px' }}>
                {paginatedCertificates.length > 0 ? (
                    paginatedCertificates.map(course => (
                        <div
                            key={course._id}
                            style={{
                                background: 'white',
                                padding: '25px',
                                borderRadius: '15px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                                border: '1px solid #edf2f7',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🏆</div>
                            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: '#2d3748' }}>{course.subject}</h3>
                            <p style={{ fontSize: '0.85rem', color: '#718096', marginBottom: '20px' }}>
                                {completionDates[course._id]
                                    ? `Completed on: ${new Date(completionDates[course._id]).toLocaleDateString('en-GB')}`
                                    : 'Congratulations! You have successfully mastered this course.'}
                            </p>
                            <button
                                onClick={() => generateCertificate(user.name, course.subject, completionDates[course._id])}
                                style={{
                                    background: '#6C63FF',
                                    color: 'white',
                                    border: 'none',
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    width: '100%',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#5A52E5'}
                                onMouseLeave={e => e.currentTarget.style.background = '#6C63FF'}
                            >
                                Download Certificate (PDF)
                            </button>
                        </div>
                    ))
                ) : (
                    <div style={{
                        gridColumn: '1 / -1',
                        padding: '60px',
                        textAlign: 'center',
                        background: '#fff',
                        borderRadius: '15px',
                        border: '2px dashed #edf2f7'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🎓</div>
                        <h3 style={{ color: '#2d3748', marginBottom: '10px' }}>No Certificates Found</h3>
                        <p style={{ color: '#a0aec0', margin: 0 }}>
                            {searchTerm ? `No certificates match "${searchTerm}".` : "Complete all modules and quizzes in a course to unlock your official certificate."}
                        </p>
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {filteredCertificates.length > ITEMS_PER_PAGE && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', padding: '30px 0', marginTop: '20px' }}>
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        style={{
                            border: '1px solid #e2e8f0',
                            background: currentPage === 1 ? '#f7fafc' : 'white',
                            color: currentPage === 1 ? '#cbd5e0' : '#4a5568',
                            padding: '8px 16px',
                            borderRadius: '10px',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        &lt; Previous
                    </button>
                    <span style={{ fontSize: '0.9rem', color: '#718096', fontWeight: '600' }}>
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        style={{
                            border: '1px solid #e2e8f0',
                            background: currentPage === totalPages ? '#f7fafc' : 'white',
                            color: currentPage === totalPages ? '#cbd5e0' : '#4a5568',
                            padding: '8px 16px',
                            borderRadius: '10px',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        Next &gt;
                    </button>
                </div>
            )}
        </div>
    );
};

const MyCoursesSection = ({ courses, allProgress, onSelectCourse }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const ITEMS_PER_PAGE = 12;

    const calculateProgress = (course) => {
        const progress = allProgress.find(p => p.course.toString() === course._id.toString());
        if (!progress) return 0;

        const allContents = course.chapters.flatMap(c => c.modules.flatMap(m => m.contents)) || [];
        const allQuizzes = course.chapters.flatMap(c => c.modules || []).filter(m => m.quiz?.questions?.length > 0) || [];
        const totalItems = allContents.length + allQuizzes.length;

        if (totalItems === 0) return 0;

        let completedItems = 0;
        allContents.forEach(content => {
            if (progress.contentProgress?.some(cp => cp.contentId.toString() === content._id.toString() && cp.isCompleted)) {
                completedItems++;
            }
        });

        allQuizzes.forEach(module => {
            if (progress.completedModules?.some(cm => cm.moduleId.toString() === module._id.toString())) {
                completedItems++;
            }
        });

        return Math.min(100, Math.round((completedItems / totalItems) * 100));
    };

    const sortedCourses = [...courses].sort((a, b) => {
        const progressA = calculateProgress(a);
        const progressB = calculateProgress(b);
        if (progressA === 100 && progressB < 100) return 1;
        if (progressA < 100 && progressB === 100) return -1;
        return 0;
    });

    const filteredCourses = sortedCourses.filter(course =>
        course.subject.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredCourses.length / ITEMS_PER_PAGE);
    const paginatedCourses = filteredCourses.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset page on search
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    return (
        <div>
            {/* Search Bar */}
            <div style={{ marginBottom: '25px' }}>
                <input
                    type="text"
                    placeholder="🔍 Search your courses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        maxWidth: '400px',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        outline: 'none',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                        fontSize: '1rem'
                    }}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
                {paginatedCourses.length > 0 ? (
                    paginatedCourses.map(course => {
                        const progressPercent = calculateProgress(course);
                        return (
                            <div
                                key={course._id}
                                style={{
                                    background: 'white',
                                    padding: '25px',
                                    borderRadius: '15px',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                                    border: '1px solid #edf2f7',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    cursor: 'pointer'
                                }}
                                onClick={() => onSelectCourse(course)}
                                onMouseEnter={e => {
                                    e.currentTarget.style.transform = 'translateY(-5px)';
                                    e.currentTarget.style.boxShadow = '0 10px 15px rgba(0,0,0,0.1)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#2d3748', fontWeight: '700' }}>{course.subject}</h3>
                                    <span style={{ padding: '4px 10px', background: progressPercent === 100 ? '#C6F6D5' : '#EBF8FF', color: progressPercent === 100 ? '#22543D' : '#2B6CB0', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                        {progressPercent === 100 ? 'Completed' : 'In Progress'}
                                    </span>
                                </div>

                                <p style={{ fontSize: '0.85rem', color: '#718096', marginBottom: '20px', flex: 1 }}>
                                    Teacher: {course.teacher?.name || 'Assigned Instructor'}
                                </p>

                                <div style={{ marginBottom: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#4a5568' }}>Progress</span>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#6C63FF' }}>{progressPercent}%</span>
                                    </div>
                                    <div style={{ height: '8px', background: '#edf2f7', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${progressPercent}%`,
                                            background: 'linear-gradient(90deg, #6C63FF, #4834d4)',
                                            borderRadius: '4px',
                                            transition: 'width 0.5s ease'
                                        }}></div>
                                    </div>
                                </div>

                                <button
                                    style={{
                                        marginTop: '10px',
                                        padding: '12px',
                                        background: '#f8fafc',
                                        color: '#6C63FF',
                                        border: '1px solid #6C63FF',
                                        borderRadius: '10px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background = '#6C63FF';
                                        e.currentTarget.style.color = 'white';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = '#f8fafc';
                                        e.currentTarget.style.color = '#6C63FF';
                                    }}
                                >
                                    Continue Learning
                                </button>
                            </div>
                        );
                    })
                ) : (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px 20px' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📚</div>
                        <h2 style={{ color: '#2d3748' }}>No Courses Found</h2>
                        <p style={{ color: '#718096' }}>
                            {searchTerm ? `No courses match "${searchTerm}".` : "You haven't enrolled in any courses yet."}
                        </p>
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {filteredCourses.length > ITEMS_PER_PAGE && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', padding: '30px 0', marginTop: '20px' }}>
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        style={{
                            border: '1px solid #e2e8f0',
                            background: currentPage === 1 ? '#f7fafc' : 'white',
                            color: currentPage === 1 ? '#cbd5e0' : '#4a5568',
                            padding: '8px 16px',
                            borderRadius: '10px',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        &lt; Previous
                    </button>
                    <span style={{ fontSize: '0.9rem', color: '#718096', fontWeight: '600' }}>
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        style={{
                            border: '1px solid #e2e8f0',
                            background: currentPage === totalPages ? '#f7fafc' : 'white',
                            color: currentPage === totalPages ? '#cbd5e0' : '#4a5568',
                            padding: '8px 16px',
                            borderRadius: '10px',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        Next &gt;
                    </button>
                </div>
            )}
        </div>
    );
};

const GradesSection = ({ courses, allProgress }) => {
    // Build a comprehensive grade report
    const gradeData = courses.map(course => {
        const progress = allProgress.find(p => p.course.toString() === course._id.toString());

        // Get all modules with quizzes
        const moduleGrades = [];
        course.chapters.forEach(chapter => {
            chapter.modules.forEach(module => {
                // Only include modules that have quizzes added by teacher
                if (module.quiz && module.quiz.questions && module.quiz.questions.length > 0) {
                    // Check if student has completed this quiz
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

        return {
            courseName: course.subject,
            teacher: course.teacher?.name || 'Unknown',
            moduleGrades
        };
    }).filter(course => course.moduleGrades.length > 0); // Only show courses with quizzes

    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 3;

    const totalPages = Math.ceil(gradeData.length / ITEMS_PER_PAGE);
    const paginatedGrades = gradeData.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📊</div>
                <h2 style={{ fontSize: '1.8rem', color: '#2D3748', marginBottom: '10px' }}>My Grades</h2>
                <p style={{ color: '#718096' }}>View your quiz scores across all courses</p>
            </div>

            {paginatedGrades.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    {paginatedGrades.map((courseData, idx) => (
                        <div
                            key={idx}
                            style={{
                                background: 'white',
                                padding: '30px',
                                borderRadius: '15px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                                border: '1px solid #edf2f7'
                            }}
                        >
                            {/* Course Header */}
                            <div style={{ marginBottom: '25px', paddingBottom: '15px', borderBottom: '2px solid #edf2f7' }}>
                                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', color: '#2d3748', fontWeight: '700' }}>
                                    {courseData.courseName}
                                </h3>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: '#718096' }}>
                                    Teacher: {courseData.teacher}
                                </p>
                            </div>

                            {/* Grades Table */}
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #edf2f7' }}>
                                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.85rem', fontWeight: '700', color: '#4a5568' }}>Chapter</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.85rem', fontWeight: '700', color: '#4a5568' }}>Module</th>
                                            <th style={{ padding: '12px', textAlign: 'center', fontSize: '0.85rem', fontWeight: '700', color: '#4a5568' }}>Quiz Score</th>
                                            <th style={{ padding: '12px', textAlign: 'center', fontSize: '0.85rem', fontWeight: '700', color: '#4a5568' }}>Status</th>
                                            <th style={{ padding: '12px', textAlign: 'center', fontSize: '0.85rem', fontWeight: '700', color: '#4a5568' }}>Completed</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {courseData.moduleGrades.map((module, mIdx) => (
                                            <tr
                                                key={mIdx}
                                                style={{
                                                    borderBottom: '1px solid #edf2f7',
                                                    background: mIdx % 2 === 0 ? 'white' : '#fcfcfc'
                                                }}
                                            >
                                                <td style={{ padding: '12px', fontSize: '0.9rem', color: '#2d3748' }}>{module.chapterTitle}</td>
                                                <td style={{ padding: '12px', fontSize: '0.9rem', color: '#4a5568' }}>{module.moduleTitle}</td>
                                                <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: module.score !== null ? '#2d3748' : '#cbd5e0' }}>
                                                    {module.score !== null ? `${module.score}%` : '-'}
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                                    <span style={{
                                                        padding: '4px 10px',
                                                        borderRadius: '20px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 'bold',
                                                        background: module.score !== null ? (module.score >= 50 ? '#def7ec' : '#fde8e8') : '#edf2f7',
                                                        color: module.score !== null ? (module.score >= 50 ? '#03543f' : '#9b1c1c') : '#718096'
                                                    }}>
                                                        {module.score !== null ? (module.score >= 50 ? 'Passed' : 'Failed') : 'Pending'}
                                                        {module.isFastTracked && ' (Fast-Tracked)'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'center', fontSize: '0.85rem', color: '#718096' }}>
                                                    {module.completedAt ? new Date(module.completedAt).toLocaleDateString() : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Course Summary */}
                            <div style={{ marginTop: '20px', padding: '15px', background: '#f8fafc', borderRadius: '10px', display: 'flex', gap: '30px', justifyContent: 'center' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#718096', marginBottom: '5px', fontWeight: '600' }}>Total Quizzes</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2d3748' }}>{courseData.moduleGrades.length}</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#718096', marginBottom: '5px', fontWeight: '600' }}>Completed</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#38A169' }}>
                                        {courseData.moduleGrades.filter(m => m.score !== null).length}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#718096', marginBottom: '5px', fontWeight: '600' }}>Average Score</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#6C63FF' }}>
                                        {courseData.moduleGrades.filter(m => m.score !== null).length > 0
                                            ? Math.round(
                                                courseData.moduleGrades
                                                    .filter(m => m.score !== null)
                                                    .reduce((sum, m) => sum + m.score, 0) /
                                                courseData.moduleGrades.filter(m => m.score !== null).length
                                            ) + '%'
                                            : '—'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Pagination Controls for Subject List */}
                    {gradeData.length > ITEMS_PER_PAGE && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '30px' }}>
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    background: currentPage === 1 ? '#f7fafc' : 'white',
                                    color: currentPage === 1 ? '#cbd5e0' : '#4a5568',
                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: 'bold'
                                }}
                            >
                                &lt; Previous
                            </button>
                            <span style={{ fontSize: '0.9rem', color: '#718096', fontWeight: '600' }}>
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    background: currentPage === totalPages ? '#f7fafc' : 'white',
                                    color: currentPage === totalPages ? '#cbd5e0' : '#4a5568',
                                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: 'bold'
                                }}
                            >
                                Next &gt;
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div style={{
                    gridColumn: '1 / -1',
                    padding: '60px',
                    textAlign: 'center',
                    background: '#fff',
                    borderRadius: '15px',
                    border: '2px dashed #edf2f7'
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📝</div>
                    <h3 style={{ color: '#2d3748', marginBottom: '10px' }}>No Quizzes Yet</h3>
                    <p style={{ color: '#a0aec0', margin: 0 }}>
                        Your teachers haven't added any quizzes yet, or you haven't enrolled in courses with quizzes.
                    </p>
                </div>
            )}
        </div>
    );
};

const QuizViewer = ({ quiz, isFastTrack, alreadyPassed, savedScore, onSubmit, onClose }) => {
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [currentScore, setCurrentScore] = useState(0);
    const [corrections, setCorrections] = useState([]); // Stores backend feedback
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        // Reset state when new questions are loaded
        setAnswers({});
        setSubmitted(alreadyPassed); // Mark as submitted if already passed
        setCurrentScore(savedScore || 0); // Use saved score if available, otherwise 0
        setCorrections([]);
    }, [quiz, alreadyPassed, savedScore]);

    const requiredScore = isFastTrack ? (quiz.fastTrackScore || 85) : (quiz.passingScore || 70);
    const isPassed = alreadyPassed || (submitted && currentScore >= requiredScore);

    console.log('QuizViewer Render:', { submitted, isPassed, alreadyPassed, answersKeys: Object.keys(answers) });

    const handleAnswer = (qIndex, oIndex) => {
        console.log('handleAnswer called:', { qIndex, oIndex, submitted });
        if (submitted) {
            console.warn('Quiz already submitted, ignoring click.');
            return;
        }
        setAnswers(prev => {
            const newState = { ...prev, [qIndex]: oIndex };
            console.log('Updating answers:', newState);
            return newState;
        });
    };

    const submitQuiz = () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        // Call parent onSubmit with answers
        onSubmit(answers, (result) => {
            setIsSubmitting(false);
            setSubmitted(true);
            setCurrentScore(result.score);
            setCorrections(result.corrections || []);

            // If they failed, we might want to allow retry?
            // Current user requirement implies "hide answers". 
            // If they fail, they shouldn't see correct answers, only score.
            // But if they passed, they might want to see.
            // Backend returns corrections ALWAYS or ONLY on pass?
            // For now, backend returns 'corrections' always in my implementation.
            // We can choose to render them or not.
        });
    };

    return (
        <div style={{ padding: '20px', background: 'white', borderRadius: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>{isFastTrack ? '⚡ Fast Track Quiz' : '📝 Module Quiz'}</h2>
                <button onClick={onClose} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '5px 15px', borderRadius: '8px', cursor: 'pointer' }}>Close</button>
            </div>

            <p style={{ color: '#718096', marginBottom: '30px' }}>
                {isFastTrack ?
                    `Requirement: Score at least 85% to skip this module.` :
                    `Requirement: Score at least 70% to unlock the next module.`}
                {submitted && (
                    <span style={{ marginLeft: '10px', fontWeight: 'bold', color: isPassed ? '#38A169' : '#E53E3E' }}>
                        (Score: {currentScore}%)
                    </span>
                )}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {quiz.questions.map((q, i) => {
                    // Find correction if available
                    // corrections is array of { questionIndex, isCorrect, correctAnswerIndex, explanation }
                    // Logic: questionIndex matches 'i'
                    const correction = corrections.find(c => Number(c.questionIndex) === i);
                    const showFeedback = submitted && correction;

                    return (
                        <div key={i} style={{ borderBottom: '1px solid #edf2f7', paddingBottom: '20px' }}>
                            <p style={{ fontWeight: 'bold', marginBottom: '15px' }}>{i + 1}. {q.question}</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {q.options.map((opt, oi) => {
                                    const isSelected = answers[i] === oi;
                                    let bgColor = '#f8fafc';
                                    let borderColor = 'transparent';

                                    if (isSelected) {
                                        bgColor = '#EBF8FF';
                                        borderColor = '#3182CE';
                                    }

                                    // If submitted, show feedback based on CORRECTIONS
                                    if (showFeedback) {
                                        const isCorrectAnswer = correction.correctAnswerIndex === oi;

                                        // Highlight correct answer in Green
                                        if (isCorrectAnswer) {
                                            bgColor = '#C6F6D5';
                                            borderColor = '#38A169';
                                        }
                                        // Highlight wrong selection in Red
                                        else if (isSelected && !correction.isCorrect) {
                                            bgColor = '#FED7D7';
                                            borderColor = '#E53E3E';
                                        }
                                    }

                                    return (
                                        <div
                                            key={oi}
                                            onClick={() => handleAnswer(i, oi)}
                                            style={{
                                                padding: '12px',
                                                background: bgColor,
                                                border: `2px solid ${borderColor}`,
                                                borderRadius: '10px',
                                                cursor: submitted ? 'default' : 'pointer',
                                                fontSize: '0.9rem',
                                                transition: 'all 0.2s',
                                                position: 'relative'
                                            }}
                                        >
                                            {opt}
                                            {showFeedback && correction.correctAnswerIndex === oi && <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#38A169' }}>✓</span>}
                                            {showFeedback && isSelected && !correction.isCorrect && <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#E53E3E' }}>✗</span>}
                                        </div>
                                    );
                                })}
                            </div>
                            {showFeedback && correction.explanation && (
                                <div style={{ marginTop: '15px', padding: '15px', background: '#F0FFF4', borderLeft: '4px solid #38A169', borderRadius: '8px' }}>
                                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#2F855A', lineHeight: '1.5' }}>
                                        <strong style={{ display: 'block', marginBottom: '5px' }}>💡 Solution / Description:</strong>
                                        {correction.explanation}
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {!submitted ? (
                <button
                    onClick={submitQuiz}
                    disabled={Object.keys(answers).length < quiz.questions.length || isSubmitting}
                    style={{
                        width: '100%',
                        padding: '15px',
                        marginTop: '40px',
                        background: Object.keys(answers).length < quiz.questions.length ? '#cbd5e0' : '#6C63FF',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: 'bold',
                        cursor: Object.keys(answers).length < quiz.questions.length ? 'not-allowed' : 'pointer',
                        opacity: isSubmitting ? 0.7 : 1
                    }}
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Answers'}
                </button>
            ) : (
                <div style={{ marginTop: '40px', textAlign: 'center' }}>
                    <div style={{ background: isPassed ? '#C6F6D5' : '#FED7D7', color: isPassed ? '#22543D' : '#742A2A', padding: '15px', borderRadius: '12px', marginBottom: '20px', fontWeight: 'bold' }}>
                        {isPassed ? `🎉 Congratulations! You passed with ${currentScore}%.` : `Score: ${currentScore}%. Keep trying!`}
                    </div>
                    {/* Only show 'Close' if passed, or 'Re-take' if failed? For now just Close. The user can re-open to retake. */}
                    <button
                        onClick={onClose}
                        style={{ width: '100%', padding: '15px', background: '#38A169', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        Close & Continue Learning
                    </button>
                    {!isPassed && (
                        <p style={{ marginTop: '10px', fontSize: '0.9rem', color: '#718096' }}>Close this quiz and open it again to retake it.</p>
                    )}
                </div>
            )}
        </div>
    );
};


