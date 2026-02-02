import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || '${API_URL}').replace(/\/api$/, '');

function AdminDashboard() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');

    // Data States
    const [stats, setStats] = useState({ totalStudents: 0, totalTeachers: 0, totalCourses: 0, totalEnrollments: 0 });
    const [users, setUsers] = useState([]);
    const [courses, setCourses] = useState([]);
    const [studentReports, setStudentReports] = useState([]);
    const [teacherReports, setTeacherReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedCourseContent, setSelectedCourseContent] = useState(null);
    const [announcements, setAnnouncements] = useState([]);

    // Modal States
    const [showUserModal, setShowUserModal] = useState(false);
    const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importRole, setImportRole] = useState('student');
    const [importFile, setImportFile] = useState(null);
    const [importPassword, setImportPassword] = useState('Welcome@123');
    const [newUser, setNewUser] = useState({
        name: '', email: '', password: '', role: 'student',
        enrollment: '', branch: '', employeeId: ''
    });
    const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', target: 'all' });
    const [isEditing, setIsEditing] = useState(false);
    const [editingUserId, setEditingUserId] = useState(null);

    useEffect(() => {
        if (!token) navigate('/login');
        if (activeTab === 'overview') {
            fetchStats();
            fetchAnnouncements();
        }
        if (activeTab === 'students' || activeTab === 'teachers' || activeTab === 'admins') fetchUsers();
        if (activeTab === 'courses') fetchCourses();
        if (activeTab === 'reports') {
            fetchStudentReports();
            fetchTeacherReports();
        }
    }, [activeTab, navigate, token]);

    const getAuthHeader = () => ({ headers: { Authorization: `Bearer ${token}` } });

    const fetchStats = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/admin/stats`, getAuthHeader());
            setStats(res.data);
        } catch (err) { console.error("Failed to fetch stats", err); }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/api/admin/users`, getAuthHeader());
            setUsers(res.data);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/api/admin/courses`, getAuthHeader());
            setCourses(res.data);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const fetchStudentReports = async () => axios.get(`${API_URL}/api/admin/reports/student-progress`, getAuthHeader()).then(res => setStudentReports(res.data));
    const fetchTeacherReports = async () => axios.get(`${API_URL}/api/admin/reports/teachers`, getAuthHeader()).then(res => setTeacherReports(res.data));
    const fetchAnnouncements = async () => axios.get(`${API_URL}/api/announcements`, getAuthHeader()).then(res => setAnnouncements(res.data));

    const handleAddUser = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await axios.put(`${API_URL}/api/admin/users/${editingUserId}`, newUser, getAuthHeader());
                alert("User updated successfully");
            } else {
                await axios.post(`${API_URL}/api/auth/register`, newUser);
                alert("User created successfully");
            }
            setNewUser({
                name: '', email: '', password: '', role: 'student',
                enrollment: '', branch: '', employeeId: ''
            });
            setIsEditing(false);
            setEditingUserId(null);
            setShowUserModal(false);
            fetchUsers();
            fetchStats();
        } catch (err) { alert(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'add'} user`); }
    };

    const handleEditUser = (u) => {
        setNewUser({
            name: u.name,
            email: u.email,
            password: '', // Don't populate password
            role: u.role,
            enrollment: u.enrollment || '',
            branch: u.branch || '',
            employeeId: u.employeeId || ''
        });
        setIsEditing(true);
        setEditingUserId(u._id);
        setShowUserModal(true);
    };

    const handlePostAnnouncement = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/api/announcements`, newAnnouncement, getAuthHeader());
            alert("Announcement posted");
            setNewAnnouncement({ title: '', content: '', target: 'all' });
            setShowAnnouncementModal(false);
            fetchAnnouncements();
        } catch (err) { alert("Failed to post announcement"); }
    };

    const handleTogglePublish = async (id) => {
        try {
            await axios.put(`${API_URL}/api/admin/courses/${id}/publish`, {}, getAuthHeader());
            fetchCourses();
        } catch (err) { alert("Failed to update status"); }
    };

    const deleteAnnouncement = async (id) => {
        if (!window.confirm("Delete this announcement?")) return;
        try {
            await axios.delete(`${API_URL}/api/announcements/${id}`, getAuthHeader());
            fetchAnnouncements();
        } catch (err) { alert("Delete failed"); }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/login');
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;
        try {
            await axios.delete(`${API_URL}/api/admin/users/${id}`, getAuthHeader());
            fetchUsers();
        } catch (err) { alert("Failed to delete user"); }
    };

    const handleExport = (data, filename) => {
        if (!data || data.length === 0) {
            alert("No data available to export");
            return;
        }
        // Simple CSV Export
        const header = Object.keys(data[0]).join(',');
        const rows = data.map(obj => Object.values(obj).join(',')).join('\n');
        const blob = new Blob([header + '\n' + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
    };

    const handleImportExcel = async (e) => {
        e.preventDefault();
        if (!importFile) return alert("Please select a file");

        const formData = new FormData();
        formData.append('file', importFile);
        formData.append('role', importRole);
        formData.append('commonPassword', importPassword);

        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/api/auth/bulk-import`, formData, {
                headers: {
                    ...getAuthHeader().headers,
                    'Content-Type': 'multipart/form-data'
                }
            });
            alert(res.data.message);
            setShowImportModal(false);
            setImportFile(null);
            fetchUsers();
            fetchStats();
        } catch (err) {
            alert(err.response?.data?.message || "Import failed");
        }
        setLoading(false);
    };

    const handleDownloadSample = async (role) => {
        try {
            const response = await axios.get(`${API_URL}/api/auth/sample-excel/${role}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `sample_${role}.xlsx`);
            document.body.appendChild(link);
            link.click();
        } catch (err) {
            alert("Failed to download sample file");
        }
    };

    return (
        <div className="dashboard-container" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f7fafc' }}>
            {/* SIDEBAR */}
            <aside className="sidebar" style={{ width: '250px', background: '#1a202c', color: 'white', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '40px', fontWeight: '700', textAlign: 'center' }}>LMS Admin</h2>
                <nav style={{ flex: 1 }}>
                    <NavItem label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
                    <NavItem label="Manage Students" active={activeTab === 'students'} onClick={() => { setActiveTab('students'); fetchUsers(); }} />
                    <NavItem label="Manage Teachers" active={activeTab === 'teachers'} onClick={() => { setActiveTab('teachers'); fetchUsers(); }} />
                    <NavItem label="Manage Admins" active={activeTab === 'admins'} onClick={() => { setActiveTab('admins'); fetchUsers(); }} />
                    <NavItem label="Course Management" active={activeTab === 'courses'} onClick={() => setActiveTab('courses')} />
                    <NavItem label="Analytics & Reports" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
                </nav>
                <div
                    onClick={handleLogout}
                    style={{ padding: '12px', cursor: 'pointer', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '20px' }}
                >
                    Logout
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="main-content" style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
                <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ fontSize: '2rem', color: '#2d3748', fontWeight: '700' }}>
                        {activeTab === 'overview' && 'Dashboard Overview'}
                        {activeTab === 'students' && 'Manage Students'}
                        {activeTab === 'teachers' && 'Manage Teachers'}
                        {activeTab === 'admins' && 'Manage Admins'}
                        {activeTab === 'courses' && 'Course Management'}
                        {activeTab === 'reports' && 'Reports & Analytics'}
                    </h1>
                    <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'white', padding: '10px 20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0, fontWeight: '600', color: '#2d3748' }}>{user.name}</p>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#718096' }}>Admin</p>
                        </div>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#4a5568', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                            {user.name ? user.name.charAt(0) : 'A'}
                        </div>
                    </div>
                </header>

                {/* CONTENT AREA */}
                {activeTab === 'overview' && (
                    <>
                        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
                            <StatCard title="Total Students" value={stats.totalStudents} color="#4299e1" />
                            <StatCard title="Total Teachers" value={stats.totalTeachers} color="#ed8936" />
                            <StatCard title="Active Courses" value={stats.totalCourses} color="#48bb78" />
                        </div>
                        <div style={{ background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
                            <h3 style={{ marginBottom: '20px', color: '#2d3748' }}>Quick Actions</h3>
                            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                <button onClick={() => setShowAnnouncementModal(true)} style={btnStyle}>📢 Post Announcement</button>
                                <button onClick={() => setShowUserModal(true)} style={btnStyle}>➕ Add User (Manual)</button>
                                <button onClick={() => { setImportRole('student'); setShowImportModal(true); }} style={{ ...btnStyle, background: '#48bb78' }}>📥 Import Students (Excel)</button>
                                <button onClick={() => { setImportRole('teacher'); setShowImportModal(true); }} style={{ ...btnStyle, background: '#ed8936' }}>📥 Import Teachers (Excel)</button>
                            </div>
                        </div>

                        <div style={{ background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                            <h3 style={{ marginBottom: '20px', color: '#2d3748' }}>Recent Announcements</h3>
                            {announcements.length === 0 && <p style={{ color: '#718096' }}>No announcements yet.</p>}
                            <div style={{ display: 'grid', gap: '15px' }}>
                                {announcements.map(ann => (
                                    <div key={ann._id} style={{ padding: '15px', border: '1px solid #edf2f7', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h4 style={{ margin: '0 0 5px 0', color: '#2d3748' }}>{ann.title}</h4>
                                            <p style={{ margin: '0 0 10px 0', color: '#4a5568', fontSize: '0.9rem' }}>{ann.content}</p>
                                            <div style={{ display: 'flex', gap: '10px', fontSize: '0.75rem', color: '#a0aec0' }}>
                                                <span>Target: <strong style={{ color: '#3182ce' }}>{ann.target}</strong></span>
                                                <span>• {new Date(ann.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => deleteAnnouncement(ann._id)} style={{ padding: '4px 8px', background: '#fff5f5', color: '#c53030', border: '1px solid #feb2b2', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>Delete</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {(activeTab === 'students' || activeTab === 'teachers' || activeTab === 'admins') && (
                    <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #edf2f7', textAlign: 'left' }}>
                                    <th style={{ padding: '15px' }}>Name</th>
                                    <th style={{ padding: '15px' }}>Email</th>
                                    <th style={{ padding: '15px' }}>Role</th>
                                    <th style={{ padding: '15px' }}>{activeTab === 'students' ? 'Enrollment' : 'Employee ID'}</th>
                                    <th style={{ padding: '15px' }}>Branch</th>
                                    <th style={{ padding: '15px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.filter(u => u.role === activeTab.slice(0, -1)).map(u => (
                                    <tr key={u._id} style={{ borderBottom: '1px solid #edf2f7' }}>
                                        <td style={{ padding: '15px' }}>{u.name}</td>
                                        <td style={{ padding: '15px' }}>{u.email}</td>
                                        <td style={{ padding: '15px' }}>
                                            <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', background: u.role === 'admin' ? '#fed7d7' : u.role === 'teacher' ? '#feebc8' : '#c6f6d5', color: '#2d3748' }}>
                                                {u.role.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ padding: '15px' }}>
                                            {u.role === 'student' ? u.enrollment : (u.employeeId || '-')}
                                        </td>
                                        <td style={{ padding: '15px' }}>
                                            {u.branch || '-'}
                                        </td>
                                        <td style={{ padding: '15px' }}>
                                            <button onClick={() => handleEditUser(u)} style={{ color: '#3182ce', border: 'none', background: 'none', cursor: 'pointer', marginRight: '10px' }}>Edit</button>
                                            <button onClick={() => handleDeleteUser(u._id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                                {users.filter(u => u.role === activeTab.slice(0, -1)).length === 0 && (
                                    <tr>
                                        <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#a0aec0' }}>No {activeTab} found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'courses' && (
                    <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #edf2f7', textAlign: 'left' }}>
                                    <th style={{ padding: '15px' }}>Title</th>
                                    <th style={{ padding: '15px' }}>Instructor</th>
                                    <th style={{ padding: '15px' }}>Content</th>
                                    <th style={{ padding: '15px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {courses.map(c => (
                                    <tr key={c._id} style={{ borderBottom: '1px solid #edf2f7' }}>
                                        <td style={{ padding: '15px' }}>{c.title}</td>
                                        <td style={{ padding: '15px' }}>{c.teacher?.name || 'Unknown'}</td>
                                        <td style={{ padding: '15px' }}>
                                            <span style={{ fontSize: '0.85rem', color: '#4a5568' }}>
                                                {c.chapters?.length || 0} Chapters, {c.chapters ? c.chapters.reduce((acc, ch) => acc + (ch.modules?.length || 0), 0) : 0} Modules
                                            </span>
                                        </td>
                                        <td style={{ padding: '15px' }}>
                                            <button onClick={() => setSelectedCourseContent(c)} style={{ marginRight: '10px', padding: '5px 10px', cursor: 'pointer', backgroundColor: '#4299e1', color: 'white', border: 'none', borderRadius: '4px' }}>View Content</button>
                                            <button onClick={() => handleTogglePublish(c._id)} style={{ padding: '5px 10px', cursor: 'pointer', backgroundColor: '#f56565', color: 'white', border: 'none', borderRadius: '4px' }}>Unpublish</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'reports' && (
                    <div style={{ display: 'grid', gap: '30px' }}>
                        {/* Student Progress */}
                        <div style={{ background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <h3>Student Progress Report</h3>
                                <button onClick={() => handleExport(studentReports, 'students_progress.xls')} style={btnStyle}>📥 Export Excel</button>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f7fafc', textAlign: 'left' }}>
                                        <th style={{ padding: '10px' }}>Enrollment ID</th>
                                        <th style={{ padding: '10px' }}>Name</th>
                                        <th style={{ padding: '10px' }}>Course Completion</th>
                                        <th style={{ padding: '10px' }}>Progress %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {studentReports.map(s => (
                                        <tr key={s.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                                            <td style={{ padding: '10px' }}>{s.enrollment}</td>
                                            <td style={{ padding: '10px' }}>{s.name}</td>
                                            <td style={{ padding: '10px' }}>
                                                {s.completedCourses} / {s.totalCourses} Courses
                                            </td>
                                            <td style={{ padding: '10px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ flex: 1, background: '#e2e8f0', height: '8px', borderRadius: '4px', minWidth: '100px' }}>
                                                        <div style={{ width: `${s.percentage}%`, background: '#48bb78', height: '100%', borderRadius: '4px' }}></div>
                                                    </div>
                                                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#2d3748' }}>{s.percentage}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Teacher Portfolio */}
                        <div style={{ background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <h3>Teacher Portfolio</h3>
                                <button onClick={() => handleExport(teacherReports, 'teachers.xls')} style={btnStyle}>📥 Export Excel</button>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f7fafc', textAlign: 'left' }}>
                                        <th style={{ padding: '10px' }}>Emp ID</th>
                                        <th style={{ padding: '10px' }}>Name</th>
                                        <th style={{ padding: '10px' }}>Email</th>
                                        <th style={{ padding: '10px' }}>Uploaded Courses</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teacherReports.map(t => (
                                        <tr key={t.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                                            <td style={{ padding: '10px' }}>{t.employeeId}</td>
                                            <td style={{ padding: '10px' }}>{t.name}</td>
                                            <td style={{ padding: '10px' }}>{t.email}</td>
                                            <td style={{ padding: '10px' }}>
                                                <span style={{ padding: '4px 10px', background: '#bee3f8', borderRadius: '12px', fontSize: '0.9rem', color: '#2b6cb0', fontWeight: 'bold' }}>
                                                    {t.courses ? t.courses.length : 0} Courses
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {/* Course Content Modal */}
            {selectedCourseContent && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center',
                    alignItems: 'center', zIndex: 1000
                }}>
                    <div style={{
                        background: 'white', padding: '30px', borderRadius: '15px',
                        maxWidth: '800px', width: '95%', maxHeight: '90vh', overflowY: 'auto',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #edf2f7', paddingBottom: '10px' }}>
                            <h2 style={{ margin: 0, color: '#2d3748' }}>{selectedCourseContent.title} - Full Content</h2>
                            <button onClick={() => setSelectedCourseContent(null)} style={{ border: 'none', background: 'none', fontSize: '1.8rem', cursor: 'pointer', color: '#a0aec0' }}>×</button>
                        </div>

                        {selectedCourseContent.chapters?.length === 0 && <p>No chapters available.</p>}

                        {selectedCourseContent.chapters?.map((ch, idx) => (
                            <div key={idx} style={{ marginBottom: '25px', padding: '15px', background: '#f8fafc', borderRadius: '10px' }}>
                                <h3 style={{ marginTop: 0, color: '#4a5568', fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}>
                                    <span style={{ background: '#4299e1', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '10px', fontSize: '0.8rem' }}>{idx + 1}</span>
                                    {ch.title}
                                </h3>

                                {ch.modules?.map((m, mIdx) => (
                                    <div key={mIdx} style={{ marginLeft: '30px', marginBottom: '15px', borderLeft: '2px solid #e2e8f0', paddingLeft: '15px' }}>
                                        <div style={{ fontWeight: 'bold', color: '#2d3748', marginBottom: '5px' }}>{m.title}</div>

                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '5px' }}>
                                            {m.contents?.map((content, cIdx) => (
                                                <span key={cIdx} style={{ fontSize: '0.75rem', padding: '2px 8px', background: '#edf2f7', borderRadius: '10px', color: '#4a5568' }}>
                                                    {content.type === 'video' ? '📺 ' : content.type === 'pdf' ? '📄 ' : '🔗 '}
                                                    {content.title}
                                                </span>
                                            ))}
                                        </div>

                                        {m.quiz && m.quiz.questions?.length > 0 && (
                                            <div style={{ fontSize: '0.8rem', color: '#48bb78', fontWeight: '500' }}>
                                                📝 Quiz: {m.quiz.questions.length} Questions (Pass: {m.quiz.passingScore}%)
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ))}

                        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setSelectedCourseContent(null)} style={{ padding: '8px 20px', background: '#edf2f7', color: '#4a5568', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* QUICK ACTION MODALS */}
            {showUserModal && (
                <Modal
                    title={isEditing ? "Edit User Details" : "Add New User Manually"}
                    onClose={() => {
                        setShowUserModal(false);
                        setIsEditing(false);
                        setEditingUserId(null);
                        setNewUser({
                            name: '', email: '', password: '', role: 'student',
                            enrollment: '', branch: '', employeeId: ''
                        });
                    }}
                    onSubmit={handleAddUser}
                >
                    <InputGroup label="Full Name" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} placeholder="John Doe" />
                    <InputGroup label="Email Address" type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="john@example.com" />
                    {!isEditing && <InputGroup label="Password" type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} placeholder="********" />}
                    <InputGroup label="Role" type="select" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} options={[
                        { label: 'Student', value: 'student' },
                        { label: 'Teacher', value: 'teacher' },
                        { label: 'Admin', value: 'admin' }
                    ]} />
                    {newUser.role === 'student' && (
                        <>
                            <InputGroup label="Enrollment Number" type="number" value={newUser.enrollment} onChange={e => setNewUser({ ...newUser, enrollment: e.target.value })} placeholder="123456" />
                            <InputGroup label="Branch" value={newUser.branch} onChange={e => setNewUser({ ...newUser, branch: e.target.value })} placeholder="Computer Engineering" />
                        </>
                    )}
                    {(newUser.role === 'teacher' || newUser.role === 'admin') && (
                        <InputGroup label="Employee ID" type="number" value={newUser.employeeId} onChange={e => setNewUser({ ...newUser, employeeId: e.target.value })} placeholder="101" />
                    )}
                </Modal>
            )}

            {showAnnouncementModal && (
                <Modal title="Post New Announcement" onClose={() => setShowAnnouncementModal(false)} onSubmit={handlePostAnnouncement}>
                    <InputGroup label="Announcement Title" value={newAnnouncement.title} onChange={e => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })} placeholder="Exam Schedule Update" />
                    <InputGroup label="Content" type="textarea" value={newAnnouncement.content} onChange={e => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })} placeholder="Write your message here..." />
                    <InputGroup label="Target Audience" type="select" value={newAnnouncement.target} onChange={e => setNewAnnouncement({ ...newAnnouncement, target: e.target.value })} options={[
                        { label: 'Everybody', value: 'all' },
                        { label: 'Students Only', value: 'students' },
                        { label: 'Teachers Only', value: 'teachers' }
                    ]} />
                </Modal>
            )}

            {showImportModal && (
                <Modal title={`Import ${importRole === 'student' ? 'Students' : 'Teachers'} via Excel`} onClose={() => setShowImportModal(false)} onSubmit={handleImportExcel}>
                    <div style={{ marginBottom: '20px', padding: '15px', background: '#ebf8ff', borderRadius: '8px', border: '1px solid #bee3f8' }}>
                        <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#2b6cb0' }}>
                            1. Download the sample file to see the required format.
                        </p>
                        <button type="button" onClick={() => handleDownloadSample(importRole)} style={{ background: '#3182ce', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                            📥 Download Sample Excel
                        </button>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#4a5568' }}>Common Password for All Users</label>
                        <input
                            type="text"
                            value={importPassword}
                            onChange={e => setImportPassword(e.target.value)}
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                        />
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#4a5568' }}>Select Excel File</label>
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={e => setImportFile(e.target.files[0])}
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                        />
                    </div>
                </Modal>
            )}
        </div>
    );
}

const Modal = ({ title, onClose, onSubmit, children }) => (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
        <div style={{ background: 'white', padding: '30px', borderRadius: '15px', width: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{title}</h2>
                <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={onSubmit}>
                {children}
                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button type="button" onClick={onClose} style={{ padding: '8px 16px', background: '#edf2f7', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>Cancel</button>
                    <button type="submit" style={btnStyle}>Submit</button>
                </div>
            </form>
        </div>
    </div>
);

const InputGroup = ({ label, type = "text", value, onChange, placeholder, options }) => (
    <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#4a5568' }}>{label}</label>
        {type === 'select' ? (
            <select value={value} onChange={onChange} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
        ) : type === 'textarea' ? (
            <textarea value={value} onChange={onChange} placeholder={placeholder} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', minHeight: '100px' }} />
        ) : (
            <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
        )}
    </div>
);

const NavItem = ({ label, active, onClick }) => (
    <div
        onClick={onClick}
        style={{
            padding: '12px 15px',
            marginBottom: '8px',
            cursor: 'pointer',
            borderRadius: '8px',
            background: active ? '#2d3748' : 'transparent',
            color: active ? 'white' : '#a0aec0',
            fontWeight: active ? '600' : 'normal',
            transition: 'all 0.2s'
        }}
    >
        {label}
    </div>
);

const StatCard = ({ title, value, color }) => (
    <div style={{ background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', borderLeft: `5px solid ${color}` }}>
        <h3 style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '10px', textTransform: 'uppercase' }}>{title}</h3>
        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2D3748', margin: 0 }}>{value}</p>
    </div>
);

const btnStyle = {
    padding: '8px 16px',
    background: '#3182ce',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.9rem'
};

export default AdminDashboard;
