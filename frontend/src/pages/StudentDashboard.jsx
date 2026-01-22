import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import ReactMarkdown from 'react-markdown';

import AIAssistantSidebar from '../components/AIAssistantSidebar'; // Import the new component

function StudentDashboard() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [isCinemaMode, setIsCinemaMode] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [allProgress, setAllProgress] = useState([]);

    useEffect(() => {
        fetchCourses();
    }, []);

    useEffect(() => {
        if (activeTab === 'my-courses') {
            fetchAllProgress();
        }
    }, [activeTab]);

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
        <div className="dashboard-container" style={{ display: isCinemaMode ? 'block' : 'flex', width: '100%', minHeight: '100vh' }}>
            {!isCinemaMode && (
                <aside className="sidebar">
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '30px', fontWeight: '700' }}>LMS Student</h2>
                    <nav>
                        <div className={`nav-item ${activeTab === 'dashboard' && !selectedCourse ? 'active' : ''}`} onClick={() => { setActiveTab('dashboard'); setSelectedCourse(null); }}>Dashboard</div>
                        <div className={`nav-item ${activeTab === 'my-courses' ? 'active' : ''}`} onClick={() => { setActiveTab('my-courses'); setSelectedCourse(null); }}>My Courses</div>
                        <div className={`nav-item ${activeTab === 'certificates' ? 'active' : ''}`} onClick={() => { setActiveTab('certificates'); setSelectedCourse(null); }}>Certificates</div>
                        <div className={`nav-item ${activeTab === 'ai-roadmap' ? 'active' : ''}`} onClick={() => { setActiveTab('ai-roadmap'); setSelectedCourse(null); }}>AI Career Roadmap</div>
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
            )}

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
                                                activeTab === 'ai-roadmap' ? 'AI Roadmap' : 'My Certificates'}
                                    </h1>
                                    <p style={{ color: '#718096', margin: 0 }}>
                                        {activeTab === 'dashboard' ? `Welcome back, ${user.name}!` :
                                            activeTab === 'my-courses' ? 'Track your learning progress' : 'Download your earned certifications'}
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
                        onBack={() => {
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
                                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FF6584' }}>2</p>
                            </div>

                            {/* Card 3 */}
                            <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                                <h3 style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '10px' }}>Attendance</h3>
                                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#38B2AC' }}>95%</p>
                            </div>
                        </section>

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
                ) : activeTab === 'ai-roadmap' ? (
                    <RoadmapSection courses={courses} />
                ) : (
                    <CertificatesSection
                        courses={courses}
                        allProgress={allProgress}
                        user={user}
                    />
                )}
            </main>
        </div>
    );
}

const CourseViewer = ({ course, user, setCourses, setSelectedCourse, isCinemaMode, setIsCinemaMode, onBack }) => {
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

    // Sync ref with state
    useEffect(() => {
        timeSpentRef.current = timeSpent;
    }, [timeSpent]);
    const [isTabActive, setIsTabActive] = useState(true);

    // Visibility and Focus Tracking
    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsTabActive(!document.hidden && document.hasFocus());
        };

        const handleFocus = () => setIsTabActive(true);
        const handleBlur = () => setIsTabActive(false);

        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);

        return () => {
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('blur', handleBlur);
        };
    }, []);

    useEffect(() => {
        if (selectedContent && studentProgress) {
            // 1. Initialize time spent from progress
            const existingProgress = studentProgress.contentProgress?.find(
                cp => cp.contentId.toString() === selectedContent._id.toString()
            );

            const initialTime = existingProgress ? existingProgress.timeSpent : 0;
            const alreadyCompleted = existingProgress ? existingProgress.isCompleted : false;

            setTimeSpent(initialTime);
            timeSpentRef.current = initialTime; // Sync ref immediately

            if (alreadyCompleted || !selectedContent.minTime || selectedContent.minTime === 0) {
                setIsTimeRequirementMet(true);
                return;
            }

            setIsTimeRequirementMet(false);

            // 2. Start Timer
            const timer = setInterval(() => {
                if (document.hidden || !document.hasFocus()) return;

                setTimeSpent(prev => {
                    const next = prev + 1;
                    timeSpentRef.current = next; // Update ref immediately
                    if (next >= selectedContent.minTime) {
                        setIsTimeRequirementMet(true);
                    }
                    return next;
                });
            }, 1000);

            // 3. Periodic Auto-save (Every 10 seconds)
            const autoSaveTimer = setInterval(() => {
                saveProgress(false); // saveProgress will use the ref
            }, 10000);

            return () => {
                clearInterval(timer);
                clearInterval(autoSaveTimer);
                // Save latest progress using the ref
                saveProgress(false);
            };
        }
    }, [selectedContent, studentProgress]);

    // Separate effect for completion save
    useEffect(() => {
        if (isTimeRequirementMet && selectedContent && !studentProgress?.contentProgress?.find(cp => cp.contentId === selectedContent._id)?.isCompleted) {
            saveProgress(true);
        }
    }, [isTimeRequirementMet]);

    const saveProgress = async (forceCompleted = false) => {
        if (!selectedContent || !user || (!user.id && !user._id)) return;

        const isAlreadyDone = studentProgress?.contentProgress?.find(
            cp => cp.contentId.toString() === selectedContent._id.toString()
        )?.isCompleted;

        if (isAlreadyDone && !forceCompleted) return;

        try {
            const studentId = user.id || user._id;
            const timeToSave = timeSpentRef.current; // Use Ref for latest value

            if (timeToSave === 0 && !forceCompleted) return; // Don't overwrite if we haven't tracked anything yet

            await axios.post(`${import.meta.env.VITE_API_URL}/api/courses/${course._id}/contents/${selectedContent._id}/progress`, {
                studentId,
                timeSpent: timeToSave,
                isCompleted: forceCompleted || (timeToSave >= selectedContent.minTime)
            });
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

    const formatTime = (seconds) => {
        if (seconds <= 0) return '0s';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
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

                                    {/* Study Requirement Bar */}
                                    {selectedContent.minTime > 0 && (
                                        <div style={{ flex: 1, padding: '12px', background: isTimeRequirementMet ? '#C6F6D5' : '#EBF8FF', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ fontSize: '1rem' }}>{isTimeRequirementMet ? '✅' : '⏳'}</div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: isTimeRequirementMet ? '#22543D' : '#2A4365' }}>
                                                        {isTimeRequirementMet ? 'Study Complete' : `Study: ${formatTime(Math.max(0, selectedContent.minTime - timeSpent))} left`}
                                                    </span>
                                                    <span style={{ fontSize: '0.75rem', color: '#718096' }}>{Math.min(100, Math.round((timeSpent / selectedContent.minTime) * 100))}%</span>
                                                </div>
                                                <div style={{ height: '6px', background: 'rgba(0,0,0,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${Math.min(100, (timeSpent / selectedContent.minTime) * 100)}%`, background: isTimeRequirementMet ? '#38A169' : '#3182CE', transition: 'width 0.3s' }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

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
                                            📝 Summary
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
                                            href={getContentUrl(selectedContent.url)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                padding: '8px 12px',
                                                background: '#edf2f7',
                                                color: '#4a5568',
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
                                            🚀 Open in New Tab
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
            </div>
        </div>
    );
};

export default StudentDashboard;

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

        const allContents = course.chapters.flatMap(c => c.modules.flatMap(m => m.contents));
        if (allContents.length === 0) return 0;

        const completedContentsCount = allContents.filter(content =>
            progress.contentProgress?.some(cp => cp.contentId.toString() === content._id.toString() && cp.isCompleted)
        ).length;

        return Math.round((completedContentsCount / allContents.length) * 100);
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

const QuizViewer = ({ quiz, isFastTrack, alreadyPassed, onSubmit, onClose }) => {
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [currentScore, setCurrentScore] = useState(0);

    useEffect(() => {
        console.log('Quiz Data received in Viewer:', quiz);
        console.log('Already Passed Status:', alreadyPassed);
        // Reset state when new questions are loaded
        setAnswers({});
        setSubmitted(false);
        setCurrentScore(0);
    }, [quiz, alreadyPassed]);

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

const RoadmapSection = ({ courses = [] }) => {
    const [goal, setGoal] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [roadmap, setRoadmap] = useState('');
    const [loading, setLoading] = useState(false);

    const generateRoadmap = async () => {
        if (!goal.trim()) return alert('Please enter a career goal or topic!');
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/ai/generate-roadmap`,
                { goal, courseId: selectedCourseId || null },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setRoadmap(res.data.data);
        } catch (err) {
            console.error('Error generating roadmap:', err);
            alert('Failed to generate roadmap. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🚀</div>
                <h2 style={{ fontSize: '1.8rem', color: '#2D3748', marginBottom: '10px' }}>AI Career Roadmap Generator</h2>
                <p style={{ color: '#718096' }}>Tell AI your dream job or topic, and we'll build your learning path.</p>
            </div>

            <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', gap: '10px', marginBottom: '40px', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <select
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        style={{ padding: '15px', borderRadius: '12px', border: '2px solid #edf2f7', fontSize: '1rem', outline: 'none', background: 'white', minWidth: '200px' }}
                    >
                        <option value="">General / No Specific Course</option>
                        {courses.map(course => (
                            <option key={course._id} value={course._id}>{course.subject}</option>
                        ))}
                    </select>
                    <input
                        type="text"
                        placeholder="e.g. Become a Full Stack Web Developer in 6 months"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        style={{ flex: 1, padding: '15px', borderRadius: '12px', border: '2px solid #edf2f7', fontSize: '1rem', outline: 'none' }}
                    />
                </div>
                <button
                    onClick={generateRoadmap}
                    disabled={loading}
                    style={{ padding: '15px 25px', background: '#6C63FF', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                    {loading ? 'Generating...' : 'Build Path'}
                </button>
            </div>

            {roadmap && (
                <div style={{ background: '#f8fafc', padding: '30px', borderRadius: '15px', border: '1px solid #edf2f7', lineHeight: '1.8' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0 }}>Your Personalized Learning Path</h3>
                        <button
                            onClick={() => window.print()}
                            style={{ background: 'transparent', border: '1px solid #6C63FF', color: '#6C63FF', padding: '5px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            ⎙ Print Roadmap
                        </button>
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', color: '#4A5568', fontSize: '1.05rem' }}>
                        {roadmap}
                    </div>
                </div>
            )}
        </div>
    );
};
