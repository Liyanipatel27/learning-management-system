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
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px' }}>
            <button onClick={onCourseCreated} style={{ marginBottom: '15px', border: 'none', background: 'transparent', color: '#666', cursor: 'pointer' }}>&larr; Back to Dashboard</button>
            {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h2>Manage Subject</h2>
                    <p style={{ color: '#666' }}>Enter the Subject Name. If it exists, you will edit it. If not, a new one will be created.</p>
                    <input type="text" placeholder="Subject Name (e.g. Mathematics)" onChange={e => setCourseData({ ...courseData, subject: e.target.value })} />
                    <button onClick={handleCreateCourse} className="btn-primary" style={{ padding: '10px', background: '#6C63FF', color: 'white', border: 'none', borderRadius: '5px' }}>Next: Manage Chapters</button>
                </div>
            )}

            {step === 2 && (
                <div>
                    <h3>Structure for: {courseData.subject}</h3>
                    <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '15px' }}>
                        Add Chapters and Modules below. You can upload content (PDF, Video, etc.) <b>inside</b> each Module.
                    </p>
                    <div style={{ marginBottom: '20px' }}>
                        <input id="new-chapter" type="text" placeholder="New Chapter Title" />
                        <button onClick={() => {
                            const el = document.getElementById('new-chapter');
                            addChapter(el.value);
                            el.value = '';
                        }}>Add Chapter</button>
                    </div>

                    {chapters.map(chapter => (
                        <div key={chapter._id} style={{ border: '1px solid #eee', padding: '10px', marginBottom: '10px', marginLeft: '20px' }}>
                            <h4>Chapter: {chapter.title}</h4>
                            <div style={{ marginBottom: '10px' }}>
                                <input id={`new-mod-${chapter._id}`} type="text" placeholder="New Module Title" />
                                <button onClick={() => {
                                    const el = document.getElementById(`new-mod-${chapter._id}`);
                                    addModule(chapter._id, el.value);
                                    el.value = '';
                                }}>Add Module</button>
                            </div>

                            {chapter.modules.map(module => (
                                <div key={module._id} style={{ background: '#f9f9f9', padding: '10px', marginBottom: '5px', marginLeft: '20px' }}>
                                    <h5>Module: {module.title}</h5>
                                    <ContentUploader onUpload={(file, data) => uploadContent(chapter._id, module._id, file, data)} />
                                    <ul>
                                        {module.contents.map((c, i) => (
                                            <li key={i}>{c.title} ({c.type})</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    ))}
                    <button onClick={onCourseCreated} style={{ marginTop: '20px', background: 'green', color: 'white', padding: '10px' }}>Finish Course Creation</button>
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
        <div style={{ border: '1px dashed #ccc', padding: '10px', marginTop: '10px' }}>
            <h6>Add Content</h6>
            <select onChange={e => setType(e.target.value)} value={type}>
                <option value="pdf">PDF</option>
                <option value="video">Video</option>
                <option value="image">Image</option>
                <option value="doc">Document</option>
                <option value="link">External Link</option>
            </select>
            <input type="text" placeholder="Content Title" value={title} onChange={e => setTitle(e.target.value)} style={{ display: 'block', margin: '5px 0' }} />

            {type === 'link' ? (
                <input type="text" placeholder="URL" value={url} onChange={e => setUrl(e.target.value)} style={{ display: 'block', margin: '5px 0' }} />
            ) : (
                <input type="file" onChange={e => setFile(e.target.files[0])} style={{ display: 'block', margin: '5px 0' }} />
            )}
            <button onClick={handleSubmit}>Upload / Add</button>
        </div>
    );
};

export default CourseBuilder;
