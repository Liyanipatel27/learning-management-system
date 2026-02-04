import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

import SummaryWidget from '../components/AI/SummaryWidget';

import ReactMarkdown from 'react-markdown';

import AIAssistantSidebar from '../components/AIAssistantSidebar'; // Import the new component
import StudentAIHub from './StudentAIHub';

const formatTime = (seconds) => {
    if (seconds <= 0) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
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
            const pendingCount = allAsgns.filter(asgn => !submittedAssignmentIds.has(String(asgn._id))).length;
            setPendingAssignmentsCount(pendingCount);

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

                            {/* Card 3 */}
                            <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                                <h3 style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '10px' }}>Attendance</h3>
                                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#38B2AC' }}>95%</p>
                            </div>


                        </section>

                        {announcements.length > 0 && (
                            <section style={{ marginTop: '40px' }}>
                                <h2 style={{ fontSize: '1.25rem', marginBottom: '20px', color: '#2D3748', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span>📢</span> Latest Announcements
                                </h2>
                                <div style={{ display: 'grid', gap: '15px' }}>
                                    {announcements.map((ann, idx) => (
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
                            <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', color: '#2D3748' }}>Explore Courses</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                                {courses.map(course => (
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

    const handleQuizSubmission = async (moduleId, score, isFastTrack, onFail) => {
        try {
            const studentId = JSON.parse(localStorage.getItem('user') || '{}').id || JSON.parse(localStorage.getItem('user') || '{}')._id;
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/courses/${course._id}/modules/${moduleId}/submit-quiz`, {
                studentId,
                score,
                isFastTrack
            });

            if (res.data.isPassed) {
                alert(`Perfect! Score: ${score}%. ${res.data.message}`);
                fetchProgress(); // Refresh progress
                // We keep activeQuiz open so they can see descriptions
            } else {
                alert(`Score: ${score}%. Minimum required: ${res.data.requiredScore}%. Try again with a new set of questions!`);

                // Find original module to re-trigger shuffle
                const originalModule = course.chapters.flatMap(c => c.modules).find(m => m._id === moduleId);
                if (originalModule) {
                    handleTakeQuiz(originalModule, isFastTrack);
                } else if (onFail) {
                    onFail(); // Fallback to just resetting UI if module not found
                }
            }
        } catch (err) {
            console.error('Error submitting quiz:', err);
            alert('Error submitting quiz. Please try again.');
            if (onFail) onFail();
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
                                                            onClick={() => isTimeRequirementMet ? handleTakeQuiz(module, false) : alert('Finish studying first!')}
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
                                alreadyPassed={studentProgress?.completedModules?.some(m => m.moduleId.toString() === activeQuiz.module._id.toString())}
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
                                    <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#2d3748' }}>{selectedContent.title}</h2>
                                            <span style={{ fontSize: '0.8rem', color: '#718096' }}>Type: {selectedContent.type.toUpperCase()}</span>

                                        </div>
                                        {selectedContent.type === 'link' && isTimeRequirementMet && (
                                            <a
                                                href={selectedContent.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ padding: '8px 16px', background: '#6C63FF', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 'bold' }}
                                            >
                                                Open Link
                                            </a>
                                        )}
                                        {selectedContent.type !== 'link' && isTimeRequirementMet && (
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

    // Submission states
    const [submitting, setSubmitting] = useState(false);
    const [code, setCode] = useState('');
    const [file, setFile] = useState(null);
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                    {assignments.map(asgn => {
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
                                <h3 style={{ margin: '0 0 10px 0' }}>{asgn.title}</h3>
                                <p style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '20px', minHeight: '40px' }}>{asgn.description}</p>

                                {isGraded && (
                                    <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '12px', marginBottom: '15px', border: '1px solid #dcfce7' }}>
                                        <p style={{ margin: 0, fontWeight: 'bold', color: '#166534', fontSize: '0.9rem' }}>Score: {sub.score}/{asgn.maxPoints}</p>
                                        <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem', color: '#15803d' }}>Feedback: {sub.feedback}</p>
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
                                        background: isSubmitted ? '#f8fafc' : '#6366f1',
                                        color: isSubmitted ? '#4a5568' : 'white',
                                        border: isSubmitted ? '1px solid #e2e8f0' : 'none',
                                        borderRadius: '12px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {isSubmitted ? 'View Submission' : 'Start Assignment'}
                                </button>
                            </div>
                        );
                    })}
                </div>
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

                        {submissions[activeAssignment._id] ? (
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
                                {activeAssignment.type === 'file' ? (
                                    <div style={{ marginBottom: '24px' }}>
                                        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Upload your file (PDF/Image/Doc)</label>
                                        <input
                                            type="file"
                                            disabled={!!submissions[activeAssignment._id]}
                                            onChange={(e) => setFile(e.target.files[0])}
                                            style={{ border: '2px dashed #e2e8f0', padding: '20px', width: '100%', borderRadius: '12px', cursor: !!submissions[activeAssignment._id] ? 'not-allowed' : 'pointer', opacity: !!submissions[activeAssignment._id] ? 0.6 : 1 }}
                                        />
                                        {submissions[activeAssignment._id]?.fileUrl && (
                                            <p style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '10px' }}>Current file: {submissions[activeAssignment._id].fileUrl}</p>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ marginBottom: '24px' }}>
                                        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Code Editor ({activeAssignment.codingDetails?.language})</label>
                                        <div style={{ background: '#1a202c', padding: '15px', borderRadius: '15px' }}>
                                            <textarea
                                                value={code}
                                                readOnly={!!submissions[activeAssignment._id]}
                                                onChange={(e) => setCode(e.target.value)}
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
                                                    cursor: !!submissions[activeAssignment._id] ? 'default' : 'text'
                                                }}
                                                placeholder="Write your code here..."
                                            />
                                            <div style={{ marginBottom: '15px' }}>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#4a5568', marginBottom: '8px' }}>Input (Standard Input):</label>
                                                <textarea
                                                    value={stdin}
                                                    readOnly={!!submissions[activeAssignment._id]}
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
                                                        cursor: !!submissions[activeAssignment._id] ? 'default' : 'text'
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
                                    {!submissions[activeAssignment._id] && (
                                        <button
                                            disabled={submitting}
                                            type="submit"
                                            style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: '#6366f1', color: 'white', fontWeight: 'bold' }}
                                        >
                                            {submitting ? 'Submitting...' : 'Submit Assignment'}
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
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
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
    return (
        <div style={{ padding: '20px' }}>
            {announcements.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px', background: 'white', borderRadius: '15px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📢</div>
                    <h3 style={{ color: '#2d3748' }}>No announcements yet</h3>
                    <p style={{ color: '#718096' }}>Check back later for updates from the administration.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '20px' }}>
                    {announcements.map((ann) => (
                        <div
                            key={ann._id}
                            style={{
                                background: 'white',
                                padding: '30px',
                                borderRadius: '16px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
                                border: '1px solid #edf2f7',
                                borderLeft: '6px solid #6366f1'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem', fontWeight: '700' }}>{ann.title}</h3>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>
                                        {new Date(ann.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                        {new Date(ann.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                            <p style={{
                                margin: 0,
                                color: '#475569',
                                fontSize: '1.05rem',
                                lineHeight: '1.6',
                                whiteSpace: 'pre-wrap'
                            }}>
                                {ann.content}
                            </p>
                            <div style={{
                                marginTop: '20px',
                                paddingTop: '15px',
                                borderTop: '1px solid #f1f5f9',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: '#6366f1',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.85rem',
                                    fontWeight: 'bold'
                                }}>
                                    {ann.author?.name?.charAt(0) || 'A'}
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e293b' }}>
                                        {ann.author?.name || 'Administrator'}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Authorized User</div>
                                </div>
                            </div>
                        </div>
                    ))}
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

const generateCertificate = (studentName, courseName) => {
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
    const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text(`Issued on: ${date}`, pageWidth / 2, 160, { align: 'center' });

    // --- Signature ---
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

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '25px' }}>
            {completedCourses.length > 0 ? (
                completedCourses.map(course => (
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
                            Congratulations! You have successfully mastered this course.
                        </p>
                        <button
                            onClick={() => generateCertificate(user.name, course.subject)}
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
                    <h3 style={{ color: '#2d3748', marginBottom: '10px' }}>No Certificates Yet</h3>
                    <p style={{ color: '#a0aec0', margin: 0 }}>
                        Complete all modules and quizzes in a course to unlock your official certificate.
                    </p>
                </div>
            )}
        </div>
    );
};

const MyCoursesSection = ({ courses, allProgress, onSelectCourse }) => {
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

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
            {sortedCourses.length > 0 ? (
                sortedCourses.map(course => {
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
                    <h2 style={{ color: '#2d3748' }}>No Courses Enrolled</h2>
                    <p style={{ color: '#718096' }}>You haven't enrolled in any courses yet. Visit the Dashboard to find and start a course!</p>
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

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📊</div>
                <h2 style={{ fontSize: '1.8rem', color: '#2D3748', marginBottom: '10px' }}>My Grades</h2>
                <p style={{ color: '#718096' }}>View your quiz scores across all courses</p>
            </div>

            {gradeData.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    {gradeData.map((courseData, idx) => (
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
                                                    transition: 'background 0.2s'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                            >
                                                <td style={{ padding: '15px', fontSize: '0.9rem', color: '#4a5568' }}>
                                                    {module.chapterTitle}
                                                </td>
                                                <td style={{ padding: '15px', fontSize: '0.9rem', color: '#2d3748', fontWeight: '600' }}>
                                                    {module.moduleTitle}
                                                </td>
                                                <td style={{ padding: '15px', textAlign: 'center' }}>
                                                    {module.score !== null ? (
                                                        <span style={{
                                                            fontSize: '1.1rem',
                                                            fontWeight: 'bold',
                                                            color: module.score >= 70 ? '#38A169' : '#E53E3E'
                                                        }}>
                                                            {module.score}%
                                                        </span>
                                                    ) : (
                                                        <span style={{ fontSize: '0.85rem', color: '#a0aec0', fontStyle: 'italic' }}>
                                                            Not Attempted
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '15px', textAlign: 'center' }}>
                                                    {module.score !== null ? (
                                                        <span style={{
                                                            padding: '4px 12px',
                                                            borderRadius: '20px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 'bold',
                                                            background: module.score >= 70 ? '#C6F6D5' : '#FED7D7',
                                                            color: module.score >= 70 ? '#22543D' : '#742A2A'
                                                        }}>
                                                            {module.score >= 70 ? (module.isFastTracked ? '⚡ Fast Track' : '✓ Passed') : '✗ Failed'}
                                                        </span>
                                                    ) : (
                                                        <span style={{
                                                            padding: '4px 12px',
                                                            borderRadius: '20px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 'bold',
                                                            background: '#EDF2FF',
                                                            color: '#4338CA'
                                                        }}>
                                                            Pending
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '15px', textAlign: 'center', fontSize: '0.85rem', color: '#718096' }}>
                                                    {module.completedAt
                                                        ? new Date(module.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                                                        : '—'}
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

    useEffect(() => {
        console.log('Quiz Data received in Viewer:', quiz);
        console.log('Already Passed Status:', alreadyPassed);
        console.log('Saved Score from DB:', savedScore);

        // Reset state when new questions are loaded
        setAnswers({});
        setSubmitted(alreadyPassed); // Mark as submitted if already passed
        setCurrentScore(savedScore || 0); // Use saved score if available, otherwise 0
    }, [quiz, alreadyPassed, savedScore]);

    const requiredScore = isFastTrack ? (quiz.fastTrackScore || 85) : (quiz.passingScore || 70);
    const isPassed = alreadyPassed || (submitted && currentScore >= requiredScore);

    const handleAnswer = (qIndex, oIndex) => {
        if (isPassed) return; // Prevent changing after passing
        setAnswers({ ...answers, [qIndex]: oIndex });
    };

    const calculateScore = () => {
        let correct = 0;
        quiz.questions.forEach((q, i) => {
            if (answers[i] === q.correctAnswerIndex) correct++;
        });
        const score = Math.round((correct / quiz.questions.length) * 100);
        setCurrentScore(score);
        setSubmitted(true);
        onSubmit(score, () => setSubmitted(false));
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
                        (Last Score: {currentScore}%)
                    </span>
                )}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {quiz.questions.map((q, i) => (
                    <div key={i} style={{ borderBottom: '1px solid #edf2f7', paddingBottom: '20px' }}>
                        <p style={{ fontWeight: 'bold', marginBottom: '15px' }}>{i + 1}. {q.question}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            {q.options.map((opt, oi) => {
                                const isSelected = answers[i] === oi;
                                const isCorrect = q.correctAnswerIndex === oi;
                                let bgColor = '#f8fafc';
                                let borderColor = 'transparent';

                                if (isSelected) {
                                    bgColor = '#EBF8FF';
                                    borderColor = '#3182CE';
                                }

                                // If passed, highlight correct/wrong answers
                                if (isPassed) {
                                    if (isCorrect) {
                                        bgColor = '#C6F6D5';
                                        borderColor = '#38A169';
                                    } else if (isSelected) {
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
                                            cursor: isPassed ? 'default' : 'pointer',
                                            fontSize: '0.9rem',
                                            transition: 'all 0.2s',
                                            position: 'relative'
                                        }}
                                    >
                                        {opt}
                                        {isPassed && isCorrect && <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#38A169' }}>✓</span>}
                                    </div>
                                );
                            })}
                        </div>
                        {isPassed && (() => {
                            console.log(`Question ${i + 1} explanation:`, q.explanation);
                            return q.explanation && q.explanation.trim() !== '' ? (
                                <div style={{ marginTop: '15px', padding: '15px', background: '#F0FFF4', borderLeft: '4px solid #38A169', borderRadius: '8px' }}>
                                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#2F855A', lineHeight: '1.5' }}>
                                        <strong style={{ display: 'block', marginBottom: '5px' }}>💡 Solution / Description:</strong>
                                        {q.explanation}
                                    </p>
                                </div>
                            ) : null;
                        })()}
                    </div>
                ))}
            </div>

            {!isPassed ? (
                <button
                    onClick={calculateScore}
                    disabled={Object.keys(answers).length < quiz.questions.length || (submitted && !isFastTrack && currentScore < requiredScore && submitted)}
                    style={{
                        width: '100%',
                        padding: '15px',
                        marginTop: '40px',
                        background: Object.keys(answers).length < quiz.questions.length ? '#cbd5e0' : '#6C63FF',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    {submitted ? 'Re-Submit Quiz' : 'Submit Answers'}
                </button>
            ) : (
                <div style={{ marginTop: '40px', textAlign: 'center' }}>
                    <div style={{ background: '#C6F6D5', color: '#22543D', padding: '15px', borderRadius: '12px', marginBottom: '20px', fontWeight: 'bold' }}>
                        🎉 Congratulations! You passed with {currentScore}%.
                    </div>
                    <button
                        onClick={onClose}
                        style={{ width: '100%', padding: '15px', background: '#38A169', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        Close & Continue Learning
                    </button>
                </div>
            )}
        </div>
    );
};


