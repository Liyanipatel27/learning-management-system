import React, { useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

const RoadmapGenerator = ({
    courses = [],
    allProgress = [],
    dailyHours,
    setDailyHours,
    weekendHours,
    setWeekendHours
}) => {
    const [goal, setGoal] = useState('');
    const [selectedCourseIds, setSelectedCourseIds] = useState([]);
    const [roadmap, setRoadmap] = useState('');
    const [loading, setLoading] = useState(false);
    const [revisionMode, setRevisionMode] = useState(false);
    const [showGapModal, setShowGapModal] = useState(false);
    const [missedDaysCount, setMissedDaysCount] = useState(0);

    // Subject Selection Filter & Pagination
    const [subjectFilter, setSubjectFilter] = useState('');
    const [currentSubjectPage, setCurrentSubjectPage] = useState(1);
    const SUBJECTS_PER_PAGE = 9;

    const checkStudyGap = () => {
        if (allProgress.length === 0 || selectedCourseIds.length === 0) return;

        // Check activity for "Yesterday"
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];
        const dayOfWeek = yesterday.getDay(); // 0 is Sunday, 6 is Saturday
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        const targetHours = isWeekend ? weekendHours : dailyHours;
        const thresholdMinutes = targetHours * 60 * 0.5;

        // Sum minutes from all selected courses for yesterday
        let totalMinutesYesterday = 0;
        selectedCourseIds.forEach(courseId => {
            const progress = allProgress.find(p => p.course.toString() === courseId.toString());
            const yesterdayActivity = progress?.dailyActivity?.find(a => a.date === dateStr);
            if (yesterdayActivity) {
                totalMinutesYesterday += yesterdayActivity.minutes;
            }
        });

        if (totalMinutesYesterday < thresholdMinutes) {
            setMissedDaysCount(1); // For now, we just track yesterday. Could be expanded.
            setShowGapModal(true);
        } else {
            generateRoadmapInternal(0);
        }
    };

    const generateRoadmap = async () => {
        console.log('[Roadmap] Generate button clicked');
        console.log('[Roadmap] Goal:', goal);
        console.log('[Roadmap] Selected Courses:', selectedCourseIds);

        if (!goal.trim()) {
            alert('Please enter a career goal or topic!');
            return;
        }
        if (selectedCourseIds.length === 0) {
            alert('Please select at least one course!');
            return;
        }

        console.log('[Roadmap] Validation passed, checking study gap...');
        // Trigger Gap Check first
        checkStudyGap();
    };

    const generateRoadmapInternal = async (missed = 0) => {
        console.log('[Roadmap] Starting internal generation with missed days:', missed);
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            console.log('[Roadmap] Token found:', token ? 'Yes' : 'No');

            if (!token) {
                alert('Session expired. Please log in again.');
                setLoading(false);
                return;
            }

            // Extract progress for all selected courses
            const courseProgressData = selectedCourseIds.map(courseId => {
                const progress = allProgress.find(p => p.course.toString() === courseId.toString());
                return {
                    courseId,
                    completedModules: progress?.completedModules?.map(m => m.moduleId.toString()) || []
                };
            });

            console.log('[Roadmap] Sending request to API...');
            // [FIXED] Correct endpoint and request body
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/ai/roadmap`,
                {
                    goal,
                    courseIds: selectedCourseIds,
                    revisionMode,
                    dailyHours,
                    weekendHours,
                    courseProgressData,
                    missedDays: missed,
                    startDate: new Date().toISOString().split('T')[0], // Added start date
                    targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Default 2 weeks
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log('[Roadmap] Received response:', res.data);

            // [FIXED] backend now returns { roadmap: "markdown string" }
            if (res.data.roadmap) {
                setRoadmap(res.data.roadmap);
            } else {
                // Fallback for older format if needed, or error
                setRoadmap(JSON.stringify(res.data));
            }
        } catch (err) {
            console.error('[Roadmap] Error details:', err);
            console.error('[Roadmap] Error response:', err.response);

            if (err.response?.status === 401) {
                alert('Your session has expired. Please log out and log in again.');
            } else {
                alert(`Failed to generate roadmap: ${err.response?.data?.message || err.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    // --- Filter & Pagination Logic ---
    const filteredSubjects = courses.filter(course =>
        course.subject.toLowerCase().includes(subjectFilter.toLowerCase())
    );

    const totalSubjectPages = Math.ceil(filteredSubjects.length / SUBJECTS_PER_PAGE);
    const paginatedSubjects = filteredSubjects.slice(
        (currentSubjectPage - 1) * SUBJECTS_PER_PAGE,
        currentSubjectPage * SUBJECTS_PER_PAGE
    );

    // Filter effect handled by state update directly or we can use useEffect
    // But since we use simple state, we can reset page in the onChange handler or useEffect
    React.useEffect(() => {
        setCurrentSubjectPage(1);
    }, [subjectFilter]);

    return (
        <div style={{ background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🚀</div>
                <h2 style={{ fontSize: '1.8rem', color: '#2D3748', marginBottom: '10px' }}>AI Career Roadmap Generator</h2>
                <p style={{ color: '#718096' }}>Tell AI your dream job or topic, and we'll build your learning path.</p>
            </div>

            <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', gap: '20px', marginBottom: '40px', flexDirection: 'column' }}>
                <div style={{ background: '#f8fafc', padding: '25px', borderRadius: '15px', border: '1px solid #edf2f7' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                        <h3 style={{ fontSize: '1.2rem', margin: 0, color: '#2d3748' }}>📚 Select Subjects to Include</h3>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            {/* Small Filter Input */}
                            <input
                                type="text"
                                placeholder="🔍 Filter..."
                                value={subjectFilter}
                                onChange={(e) => setSubjectFilter(e.target.value)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e0',
                                    fontSize: '0.85rem',
                                    width: '120px',
                                    outline: 'none'
                                }}
                            />
                            <button
                                onClick={() => setSelectedCourseIds(courses.map(c => c._id))}
                                style={{ background: 'white', border: '1px solid #6C63FF', color: '#6C63FF', padding: '5px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                            >
                                Select All
                            </button>
                            <button
                                onClick={() => setSelectedCourseIds([])}
                                style={{ background: 'white', border: '1px solid #e53e3e', color: '#e53e3e', padding: '5px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                            >
                                Clear All
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                        {paginatedSubjects.map(course => (
                            <label key={course._id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '10px 15px',
                                background: selectedCourseIds.includes(course._id) ? '#EEF2FF' : 'white',
                                border: `1px solid ${selectedCourseIds.includes(course._id) ? '#6C63FF' : '#edf2f7'}`,
                                borderRadius: '10px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={selectedCourseIds.includes(course._id)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedCourseIds([...selectedCourseIds, course._id]);
                                        } else {
                                            setSelectedCourseIds(selectedCourseIds.filter(id => id !== course._id));
                                        }
                                    }}
                                    style={{ width: '18px', height: '18px' }}
                                />
                                <span style={{ fontSize: '0.9rem', fontWeight: '600', color: selectedCourseIds.includes(course._id) ? '#4338CA' : '#4A5568' }}>
                                    {course.subject}
                                </span>
                            </label>
                        ))}
                        {paginatedSubjects.length === 0 && <p style={{ color: '#a0aec0', fontSize: '0.9rem', gridColumn: '1/-1', textAlign: 'center' }}>No subjects found.</p>}
                    </div>

                    {/* Pagination Controls */}
                    {filteredSubjects.length > SUBJECTS_PER_PAGE && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '15px' }}>
                            <button
                                onClick={() => setCurrentSubjectPage(p => Math.max(1, p - 1))}
                                disabled={currentSubjectPage === 1}
                                style={{
                                    border: '1px solid #e2e8f0',
                                    background: currentSubjectPage === 1 ? '#f7fafc' : 'white',
                                    color: currentSubjectPage === 1 ? '#cbd5e0' : '#4a5568',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    cursor: currentSubjectPage === 1 ? 'not-allowed' : 'pointer',
                                    fontSize: '0.8rem'
                                }}
                            >
                                &lt; Prev
                            </button>
                            <span style={{ fontSize: '0.8rem', color: '#718096' }}>
                                {currentSubjectPage} / {totalSubjectPages}
                            </span>
                            <button
                                onClick={() => setCurrentSubjectPage(p => Math.min(totalSubjectPages, p + 1))}
                                disabled={currentSubjectPage === totalSubjectPages}
                                style={{
                                    border: '1px solid #e2e8f0',
                                    background: currentSubjectPage === totalSubjectPages ? '#f7fafc' : 'white',
                                    color: currentSubjectPage === totalSubjectPages ? '#cbd5e0' : '#4a5568',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    cursor: currentSubjectPage === totalSubjectPages ? 'not-allowed' : 'pointer',
                                    fontSize: '0.8rem'
                                }}
                            >
                                Next &gt;
                            </button>
                        </div>
                    )}
                </div>

                <div style={{ width: '100%' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 'bold', display: 'block', marginBottom: '8px', color: '#4a5568' }}>🚀 Your Career Goal or Target</label>
                    <input
                        type="text"
                        placeholder="e.g. Master these subjects for upcoming finals in 2 weeks"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '2px solid #edf2f7', fontSize: '1rem', outline: 'none' }}
                    />
                </div>

                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '15px', border: '1px solid #edf2f7', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Time Inputs Row - Always Visible */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '8px', color: '#4a5568' }}>📅 Weekday Study (Hours)</label>
                            <input
                                type="number"
                                min="1"
                                max="24"
                                value={dailyHours}
                                onChange={(e) => setDailyHours(Number(e.target.value))}
                                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid #edf2f7', outline: 'none', transition: 'border-color 0.2s' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '8px', color: '#4a5568' }}>🎉 Weekend Study (Hours)</label>
                            <input
                                type="number"
                                min="1"
                                max="24"
                                value={weekendHours}
                                onChange={(e) => setWeekendHours(Number(e.target.value))}
                                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid #edf2f7', outline: 'none', transition: 'border-color 0.2s' }}
                            />
                        </div>
                    </div>

                    {/* Revision Toggle Row - Only if Courses Selected */}
                    {selectedCourseIds.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f0f4ff', padding: '12px 15px', borderRadius: '10px', border: '1px solid #d1d9ff' }}>
                            <input
                                type="checkbox"
                                id="revisionToggle"
                                checked={revisionMode}
                                onChange={(e) => setRevisionMode(e.target.checked)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <label htmlFor="revisionToggle" style={{ cursor: 'pointer', fontWeight: '600', color: '#4c51bf', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                                🎓 Revision Mode (Includes completed modules for exam prep)
                            </label>
                        </div>
                    )}
                </div>
                <button
                    onClick={generateRoadmap}
                    disabled={loading}
                    style={{ padding: '15px 25px', background: '#6C63FF', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                    {loading ? 'Generating...' : 'Build Path'}
                </button>
            </div>

            {/* Gap Detection Modal */}
            {showGapModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(5px)'
                }}>
                    <div style={{
                        background: 'white', padding: '40px', borderRadius: '20px',
                        maxWidth: '500px', width: '90%', textAlign: 'center',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🕒</div>
                        <h2 style={{ color: '#2d3748', marginBottom: '15px' }}>Study Gap Detected</h2>
                        <p style={{ color: '#718096', marginBottom: '30px', lineHeight: '1.6' }}>
                            We noticed your activity yesterday was below your 50% study target.
                            Did you miss your scheduled study time, or did you study offline using your notes?
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <button
                                onClick={() => {
                                    setShowGapModal(false);
                                    generateRoadmapInternal(missedDaysCount);
                                }}
                                style={{
                                    background: '#6C63FF', color: 'white', padding: '15px',
                                    borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer'
                                }}
                            >
                                ❗ Yes, I missed it (Readjust Plan)
                            </button>
                            <button
                                onClick={() => {
                                    setShowGapModal(false);
                                    generateRoadmapInternal(0);
                                }}
                                style={{
                                    background: '#EDF2FF', color: '#4338CA', padding: '15px',
                                    borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer'
                                }}
                            >
                                📝 No, I studied offline
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {roadmap && (
                <div style={{ marginTop: '40px', background: 'white', borderRadius: '20px', border: '1px solid #edf2f7', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '25px 35px', background: 'linear-gradient(135deg, #6C63FF, #4834d4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ fontSize: '1.8rem' }}>🗺️</span>
                            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800' }}>Your Personalized Learning Path</h3>
                        </div>
                        <button
                            onClick={() => window.print()}
                            style={{
                                background: 'rgba(255,255,255,0.2)',
                                border: '1px solid rgba(255,255,255,0.4)',
                                color: 'white',
                                padding: '8px 18px',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '0.9rem',
                                transition: 'all 0.2s',
                                backdropFilter: 'blur(5px)'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                        >
                            ⎙ Print Roadmap
                        </button>
                    </div>

                    <div className="markdown-container" style={{ padding: '40px', color: '#2d3748', fontSize: '1.05rem', lineHeight: '1.7' }}>
                        <ReactMarkdown
                            components={{
                                h1: ({ node, ...props }) => <h1 style={{ color: '#2d3748', borderBottom: '2px solid #edf2f7', paddingBottom: '10px', marginTop: '30px' }} {...props} />,
                                h2: ({ node, ...props }) => <h2 style={{ color: '#4a5568', marginTop: '25px' }} {...props} />,
                                h3: ({ node, ...props }) => <h3 style={{ color: '#6C63FF', marginTop: '20px' }} {...props} />,
                                strong: ({ node, ...props }) => <strong style={{ color: '#2d3748', fontWeight: '800' }} {...props} />,
                                ul: ({ node, ...props }) => <ul style={{ paddingLeft: '20px', listStyleType: 'none' }} {...props} />,
                                li: ({ node, ...props }) => (
                                    <li style={{ marginBottom: '10px', position: 'relative', paddingLeft: '25px' }} {...props}>
                                        <span style={{ position: 'absolute', left: 0, color: '#6C63FF' }}>•</span>
                                        {props.children}
                                    </li>
                                ),
                                p: ({ node, ...props }) => <p style={{ marginBottom: '15px' }} {...props} />
                            }}
                        >
                            {roadmap}
                        </ReactMarkdown>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoadmapGenerator;
