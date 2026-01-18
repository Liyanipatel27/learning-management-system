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
                    <CourseViewer
                        course={selectedCourse}
                        user={user}
                        setCourses={setCourses}
                        setSelectedCourse={setSelectedCourse}
                        onBack={() => setSelectedCourse(null)}
                    />
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

const CourseViewer = ({ course, user, setCourses, setSelectedCourse, onBack }) => {
    // State to track expanded chapters and modules
    const [expandedChapters, setExpandedChapters] = useState({});
    const [expandedModules, setExpandedModules] = useState({});
    const [selectedContent, setSelectedContent] = useState(null);
    const [studentProgress, setStudentProgress] = useState(null);
    const [activeQuiz, setActiveQuiz] = useState(null);
    const [timeSpent, setTimeSpent] = useState(0);
    const [isTimeRequirementMet, setIsTimeRequirementMet] = useState(false);

    useEffect(() => {
        if (selectedContent) {
            setTimeSpent(0);
            setIsTimeRequirementMet(false);

            // If minTime is 0, requirement is immediately met
            if (!selectedContent.minTime || selectedContent.minTime === 0) {
                setIsTimeRequirementMet(true);
                return;
            }

            const timer = setInterval(() => {
                setTimeSpent(prev => {
                    const next = prev + 1;
                    if (next >= selectedContent.minTime) {
                        setIsTimeRequirementMet(true);
                        clearInterval(timer);
                    }
                    return next;
                });
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [selectedContent]);

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
                                                onClick={() => {
                                                    // Check if module is locked
                                                    const isLocked = checkIsLocked(chapter, module);
                                                    if (isLocked) {
                                                        alert('🔒 This module is locked. Please pass the previous module quiz first!');
                                                        return;
                                                    }
                                                    toggleModule(module._id);
                                                }}
                                                style={{
                                                    cursor: 'pointer',
                                                    color: checkIsLocked(chapter, module) ? '#cbd5e0' : '#444',
                                                    fontWeight: '600',
                                                    padding: '8px',
                                                    borderLeft: `3px solid ${checkIsLocked(chapter, module) ? '#edf2f7' : '#6C63FF'}`,
                                                    background: expandedModules[module._id] ? '#f0efff' : '#fff',
                                                    marginBottom: '5px',
                                                    fontSize: '0.85rem',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {checkIsLocked(chapter, module) && '🔒'}
                                                    {module.title}
                                                </span>
                                                <span style={{ fontSize: '0.7rem' }}>{expandedModules[module._id] ? '▲' : '▼'}</span>
                                            </div>

                                            {/* Content List (shown if module expanded) */}
                                            {expandedModules[module._id] && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', paddingLeft: '10px' }}>
                                                    {/* Quiz Buttons */}
                                                    {module.quiz?.questions?.length > 0 && (
                                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', padding: '5px' }}>
                                                            <div style={{ flex: 1, position: 'relative' }}>
                                                                <button
                                                                    onClick={() => isTimeRequirementMet ? handleTakeQuiz(module, false) : alert(`Please study for another ${selectedContent.minTime - timeSpent} seconds to unlock the standard quiz.`)}
                                                                    style={{
                                                                        width: '100%',
                                                                        padding: '6px',
                                                                        background: isTimeRequirementMet ? '#38A169' : '#cbd5e0',
                                                                        color: 'white',
                                                                        border: 'none',
                                                                        borderRadius: '6px',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 'bold',
                                                                        cursor: isTimeRequirementMet ? 'pointer' : 'not-allowed'
                                                                    }}
                                                                >
                                                                    {isTimeRequirementMet ? 'Take Quiz (Standard)' : `Locked (${formatTime(selectedContent?.minTime - timeSpent)})`}
                                                                </button>
                                                            </div>
                                                            <button
                                                                onClick={() => handleTakeQuiz(module, true)}
                                                                style={{ flex: 1, padding: '6px', background: '#3182CE', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                                                            >
                                                                Fast Track (85%+)
                                                            </button>
                                                        </div>
                                                    )}

                                                    {module.contents.map(content => (
                                                        <div
                                                            key={content._id}
                                                            onClick={() => {
                                                                if (checkIsLocked(chapter, module)) {
                                                                    alert('🔒 This module is locked.');
                                                                    return;
                                                                }
                                                                setSelectedContent(content);
                                                            }}
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
                            {selectedContent.minTime > 0 && (
                                <div style={{ marginBottom: '15px', padding: '12px', background: isTimeRequirementMet ? '#C6F6D5' : '#EBF8FF', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ fontSize: '1.2rem' }}>{isTimeRequirementMet ? '✅' : '⏳'}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: isTimeRequirementMet ? '#22543D' : '#2A4365' }}>
                                                {isTimeRequirementMet ? 'Time Requirement Met! You can now take the standard quiz.' : `Study Requirement: ${formatTime(Math.max(0, selectedContent.minTime - timeSpent))} remaining`}
                                            </span>
                                            <span style={{ fontSize: '0.85rem', color: '#718096' }}>{Math.min(100, Math.round((timeSpent / selectedContent.minTime) * 100))}%</span>
                                        </div>
                                        <div style={{ height: '6px', background: 'rgba(0,0,0,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${Math.min(100, (timeSpent / selectedContent.minTime) * 100)}%`, background: isTimeRequirementMet ? '#38A169' : '#3182CE', transition: 'width 0.3s' }}></div>
                                        </div>
                                    </div>
                                </div>
                            )}
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

export default StudentDashboard;
