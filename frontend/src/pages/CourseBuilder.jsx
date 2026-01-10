import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CourseBuilder = ({ teacherId, onCourseCreated, initialCourse }) => {
    const [step, setStep] = useState(initialCourse ? 2 : 1);
    const [courseData, setCourseData] = useState({
        subject: initialCourse ? initialCourse.subject : '',
        teacherId: teacherId
    });
    const [chapters, setChapters] = useState(initialCourse ? initialCourse.chapters : []);
    const [currentCourseId, setCurrentCourseId] = useState(initialCourse ? initialCourse._id : null);
    const [editingQuiz, setEditingQuiz] = useState(null);

    useEffect(() => {
        if (initialCourse) {
            setStep(2);
            setCourseData({ subject: initialCourse.subject, teacherId: teacherId });
            setChapters(initialCourse.chapters);
            setCurrentCourseId(initialCourse._id);
        }
    }, [initialCourse, teacherId]);

    const handleCreateCourse = async () => {
        if (!courseData.subject) {
            alert('Please enter a Subject Name');
            return;
        }
        try {
            const res = await axios.post('http://localhost:5000/api/courses/create', { ...courseData, teacherId });
            setCurrentCourseId(res.data._id);
            setChapters(res.data.chapters || []); // Load existing chapters if any
            setStep(2);
            // alert(res.status === 200 ? 'Found existing Subject. Adding to it.' : 'New Subject Created.');
        } catch (err) {
            console.error(err);
            alert('Error accessing course');
        }
    };

    const addChapter = async (title) => {
        try {
            const res = await axios.post(`http://localhost:5000/api/courses/${currentCourseId}/chapters`, { title });
            // Refresh local state
            setChapters(res.data.chapters); // Backend returns updated course
        } catch (err) {
            console.error(err);
            alert('Error adding chapter');
        }
    };

    const addModule = async (chapterId, title) => {
        try {
            const res = await axios.post(`http://localhost:5000/api/courses/${currentCourseId}/chapters/${chapterId}/modules`, { title });
            setChapters(res.data.chapters); // Backend returns updated course
        } catch (err) {
            console.error(err);
            alert('Error adding module');
        }
    };

    const uploadContent = async (chapterId, moduleId, file, contentData) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', contentData.title);
        formData.append('type', contentData.type);
        formData.append('description', contentData.description);
        if (contentData.type === 'link') formData.append('url', contentData.url);

        try {
            const res = await axios.post(`http://localhost:5000/api/courses/${currentCourseId}/chapters/${chapterId}/modules/${moduleId}/content`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert('Content added successfully!');
            setChapters(res.data.chapters);
        } catch (err) {
            console.error(err);
            alert('Error uploading content');
        }
    };

    // fetchCourseStructure not strictly needed inside here anymore as we get updates from API responses, 
    // but handy if we wanted to revert changes. Removing for simplicity as per new flow.

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
            <button
                onClick={onCourseCreated}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '24px',
                    border: 'none',
                    background: 'white',
                    color: '#4a5568',
                    cursor: 'pointer',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                }}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                Back to Dashboard
            </button>

            {step === 1 && (
                <div style={{ background: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                    <div style={{ width: '64px', height: '64px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
                    </div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1a202c', marginBottom: '12px' }}>Manage Subject</h2>
                    <p style={{ color: '#718096', maxWidth: '500px', margin: '0 auto 32px', lineHeight: '1.6' }}>
                        Enter the Subject Name below. If the subject already exists, we'll load its content for you to edit.
                    </p>
                    <div style={{ maxWidth: '400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <input
                            type="text"
                            placeholder="e.g. Advanced Java Programming"
                            style={{ padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s', width: '100%', boxSizing: 'border-box' }}
                            onChange={e => setCourseData({ ...courseData, subject: e.target.value })}
                        />
                        <button
                            onClick={handleCreateCourse}
                            style={{ padding: '14px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 4px 6px rgba(99, 102, 241, 0.2)' }}
                        >
                            Continue to Structure &rarr;
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div>
                    <div style={{ background: 'white', padding: '32px', borderRadius: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', marginBottom: '32px', border: '1px solid #edf2f7' }}>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1a202c', margin: '0 0 8px 0' }}>Structure: <span style={{ color: '#6366f1' }}>{courseData.subject}</span></h3>
                        <p style={{ color: '#718096', margin: 0, fontSize: '0.95rem' }}>
                            Design your course by adding chapters and modules. Upload content directly within each module.
                        </p>

                        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                            <input
                                id="new-chapter"
                                type="text"
                                placeholder="Add a new chapter (e.g. Introduction)"
                                style={{ flex: 1, padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none' }}
                            />
                            <button
                                onClick={() => {
                                    const el = document.getElementById('new-chapter');
                                    addChapter(el.value);
                                    el.value = '';
                                }}
                                style={{ padding: '12px 24px', background: '#1a202c', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}
                            >
                                Add Chapter
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {chapters.map((chapter, idx) => (
                            <div key={chapter._id} style={{ background: 'white', borderRadius: '20px', border: '1px solid #edf2f7', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                                <div style={{ background: '#f8fafc', padding: '16px 24px', borderBottom: '1px solid #edf2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#2d3748', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ background: '#6366f1', color: 'white', width: '24px', height: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>{idx + 1}</span>
                                        {chapter.title}
                                    </h4>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input
                                            id={`new-mod-${chapter._id}`}
                                            type="text"
                                            placeholder="Module Title"
                                            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
                                        />
                                        <button
                                            onClick={() => {
                                                const el = document.getElementById(`new-mod-${chapter._id}`);
                                                addModule(chapter._id, el.value);
                                                el.value = '';
                                            }}
                                            style={{ padding: '6px 12px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}
                                        >
                                            + Module
                                        </button>
                                    </div>
                                </div>
                                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {chapter.modules.map(module => (
                                        <div key={module._id} style={{ background: '#fcfcfd', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '20px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                                <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#4a5568' }}>{module.title}</h5>
                                                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6366f1', background: 'rgba(99, 102, 241, 0.05)', padding: '2px 8px', borderRadius: '4px' }}>MODULE</span>
                                            </div>

                                            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                                                <button
                                                    onClick={() => {
                                                        const questions = module.quiz?.questions || [];
                                                        const passingScore = module.quiz?.passingScore || 70;
                                                        const fastTrackScore = module.quiz?.fastTrackScore || 85;
                                                        const quizData = { questions, passingScore, fastTrackScore };
                                                        setEditingQuiz({ chapterId: chapter._id, moduleId: module._id, quiz: quizData });
                                                    }}
                                                    style={{ padding: '8px 16px', background: '#f8fafc', color: '#6366f1', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
                                                >
                                                    {module.quiz?.questions?.length > 0 ? `Edit Quiz (${module.quiz.questions.length} Qs)` : '+ Add Quiz'}
                                                </button>
                                            </div>

                                            <ContentUploader onUpload={(file, data) => uploadContent(chapter._id, module._id, file, data)} />

                                            {module.contents.length > 0 && (
                                                <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 0 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                                                    {module.contents.map((c, i) => (
                                                        <li
                                                            key={i}
                                                            onClick={() => {
                                                                if (!c.url) return;
                                                                const fullUrl = c.url.startsWith('http') ? c.url : `http://localhost:5000${c.url}`;
                                                                window.open(encodeURI(fullUrl), '_blank');
                                                            }}
                                                            style={{
                                                                background: 'white',
                                                                border: '1px solid #edf2f7',
                                                                padding: '8px 12px',
                                                                borderRadius: '10px',
                                                                fontSize: '0.85rem',
                                                                color: '#4a5568',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '10px',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.borderColor = '#6366f1';
                                                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(99, 102, 241, 0.1)';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.borderColor = '#edf2f7';
                                                                e.currentTarget.style.boxShadow = 'none';
                                                            }}
                                                        >
                                                            <div style={{ color: '#6366f1' }}>
                                                                {c.type === 'pdf' ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>}
                                                            </div>
                                                            <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ))}
                                    {chapter.modules.length === 0 && (
                                        <p style={{ margin: 0, textAlign: 'center', color: '#cbd5e0', fontSize: '0.9rem', fontStyle: 'italic' }}>No modules added to this chapter yet.</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {editingQuiz && (
                        <QuizEditor
                            chapterId={editingQuiz.chapterId}
                            moduleId={editingQuiz.moduleId}
                            quiz={editingQuiz.quiz}
                            onClose={() => setEditingQuiz(null)}
                            onSave={async (quizData) => {
                                try {
                                    const res = await axios.post(`http://localhost:5000/api/courses/${currentCourseId}/chapters/${editingQuiz.chapterId}/modules/${editingQuiz.moduleId}/quiz`, quizData);
                                    setChapters(res.data.chapters);
                                    setEditingQuiz(null);
                                    alert('Quiz saved successfully!');
                                } catch (err) {
                                    console.error(err);
                                    alert('Error saving quiz');
                                }
                            }}
                        />
                    )}

                    <div style={{ marginTop: '40px', textAlign: 'center' }}>
                        <button
                            onClick={onCourseCreated}
                            style={{ padding: '14px 40px', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)' }}
                        >
                            Complete Course & Publish
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const ContentUploader = ({ onUpload }) => {
    const [type, setType] = useState('pdf');
    const [title, setTitle] = useState('');
    const [file, setFile] = useState(null);
    const [url, setUrl] = useState('');

    const handleSubmit = () => {
        onUpload(file, { title, type, url });
        setTitle('');
        setFile(null);
        setUrl('');
    };

    return (
        <div style={{ border: '2px dashed #e2e8f0', padding: '16px', borderRadius: '12px', background: 'white' }}>
            <h6 style={{ margin: '0 0 12px 0', fontSize: '0.875rem', fontWeight: '700', color: '#4a5568' }}>Add Content</h6>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', alignItems: 'center' }}>
                <select
                    onChange={e => setType(e.target.value)}
                    value={type}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#4a5568' }}
                >
                    <option value="pdf">PDF</option>
                    <option value="video">Video</option>
                    <option value="image">Image</option>
                    <option value="doc">Document</option>
                    <option value="link">External Link</option>
                </select>
                <input
                    type="text"
                    placeholder="Content Title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />

                {type === 'link' ? (
                    <input
                        type="text"
                        placeholder="Paste URL here"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                ) : (
                    <div style={{ position: 'relative' }}>
                        <input
                            type="file"
                            id="file-upload"
                            onChange={e => setFile(e.target.files[0])}
                            style={{ opacity: 0, position: 'absolute', width: '100%', height: '100%', cursor: 'pointer' }}
                        />
                        <div style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center', fontSize: '0.85rem', color: '#718096', overflow: 'hidden' }}>
                            {file ? file.name : 'Choose File'}
                        </div>
                    </div>
                )}
                <button
                    onClick={handleSubmit}
                    style={{ padding: '8px 16px', background: '#1a202c', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                >
                    Upload / Add
                </button>
            </div>
        </div>
    );
};

const QuizEditor = ({ quiz, onSave, onClose }) => {
    const [questions, setQuestions] = useState(quiz?.questions || []);
    const [passingScore, setPassingScore] = useState(quiz?.passingScore || 70);
    const [fastTrackScore, setFastTrackScore] = useState(quiz?.fastTrackScore || 85);
    const [showExplanation, setShowExplanation] = useState({}); // Track which explanation is visible

    const addQuestion = () => {
        setQuestions([...questions, { question: '', options: ['', '', '', ''], correctAnswerIndex: 0, explanation: '' }]);
    };

    const updateQuestion = (index, field, value) => {
        const newQuestions = [...questions];
        newQuestions[index][field] = value;
        setQuestions(newQuestions);
    };

    const updateOption = (qIndex, oIndex, value) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options[oIndex] = value;
        setQuestions(newQuestions);
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ background: 'white', padding: '32px', borderRadius: '24px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ margin: 0 }}>Module Quiz Editor</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px' }}>Standard Passing Score (%)</label>
                        <input type="number" value={passingScore} onChange={e => setPassingScore(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px' }}>Fast Track Score (%)</label>
                        <input type="number" value={fastTrackScore} onChange={e => setFastTrackScore(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {questions.map((q, qIdx) => (
                        <div key={qIdx} style={{ padding: '20px', border: '1px solid #edf2f7', borderRadius: '16px', background: '#f8fafc' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                <span style={{ fontWeight: 'bold' }}>Question {qIdx + 1}</span>
                                <button onClick={() => setQuestions(questions.filter((_, i) => i !== qIdx))} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>Remove</button>
                            </div>
                            <input
                                type="text"
                                placeholder="Enter Question"
                                value={q.question}
                                onChange={e => updateQuestion(qIdx, 'question', e.target.value)}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '15px' }}
                            />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {q.options.map((opt, oIdx) => (
                                    <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <input
                                            type="radio"
                                            name={`correct-${qIdx}`}
                                            checked={q.correctAnswerIndex === oIdx}
                                            onChange={() => updateQuestion(qIdx, 'correctAnswerIndex', oIdx)}
                                        />
                                        <input
                                            type="text"
                                            placeholder={`Option ${oIdx + 1}`}
                                            value={opt}
                                            onChange={e => updateOption(qIdx, oIdx, e.target.value)}
                                            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                                        />
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: '15px', borderTop: '1px solid #edf2f7', paddingTop: '15px' }}>
                                <button
                                    onClick={() => setShowExplanation(prev => ({ ...prev, [qIdx]: !prev[qIdx] }))}
                                    style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '5px' }}
                                >
                                    {showExplanation[qIdx] ? 'Collapse Solution' : 'Add/Edit Solution (Description)'}
                                </button>

                                {showExplanation[qIdx] && (
                                    <div style={{ marginTop: '10px' }}>
                                        <textarea
                                            placeholder="Explain why the answer is correct..."
                                            value={q.explanation || ''}
                                            onChange={e => updateQuestion(qIdx, 'explanation', e.target.value)}
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '60px', fontFamily: 'inherit', fontSize: '0.85rem' }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    onClick={addQuestion}
                    style={{ width: '100%', padding: '12px', marginTop: '20px', background: 'white', color: '#6366f1', border: '2px dashed #6366f1', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                    + Add Question
                </button>

                <div style={{ marginTop: '40px', display: 'flex', gap: '15px' }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                    <button
                        onClick={() => onSave({ questions, passingScore: Number(passingScore), fastTrackScore: Number(fastTrackScore) })}
                        style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: '#6366f1', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        Save Quiz
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CourseBuilder;
