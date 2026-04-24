import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ClassDetail from './ClassDetail';

const ClassManager = ({ readOnly = false }) => {
    const [classes, setClasses] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState(null);
    const [newClassName, setNewClassName] = useState('');
    const [newClassType, setNewClassType] = useState('Branch');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/classes`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setClasses(response.data);
        } catch (err) {
            console.error('Error fetching classes:', err);
        }
    };

    const handleCreateClass = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `${import.meta.env.VITE_API_URL}/api/classes`,
                { name: newClassName, type: newClassType },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSuccess('Class created successfully');
            setNewClassName('');
            fetchClasses();
        } catch (err) {
            setError(err.response?.data?.message || 'Error creating class');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClass = async (id) => {
        if (!window.confirm('Are you sure? This will move the class to "Recently Deleted". Students will remain enrolled but the class will be hidden.')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/classes/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchClasses();
        } catch (err) {
            alert('Error deleting class');
        }
    };

    const handleRestoreClass = async (id) => {
        if (!window.confirm('Restore this class? It will appear in the active list again.')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${import.meta.env.VITE_API_URL}/api/classes/${id}/restore`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchClasses();
        } catch (err) {
            alert('Error restoring class');
        }
    };

    const startEdit = (cls) => {
        setEditingId(cls._id);
        setEditName(cls.name);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName('');
    };

    const saveEdit = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(
                `${import.meta.env.VITE_API_URL}/api/classes/${editingId}`,
                { name: editName },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setEditingId(null);
            fetchClasses();
        } catch (err) {
            alert('Error updating class');
        }
    };

    if (selectedClassId) {
        return <ClassDetail classId={selectedClassId} onBack={() => setSelectedClassId(null)} />;
    }

    const activeClasses = classes.filter(c => !c.isDeleted);
    const deletedClasses = classes.filter(c => c.isDeleted);

    return (
        <div style={{ background: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2d3748', marginBottom: '25px' }}>Class & Branch Management</h2>

            {/* Create Class Form */}
            {!readOnly && (
                <form onSubmit={handleCreateClass} style={{ marginBottom: '30px', display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ display: 'block', textTransform: 'uppercase', color: '#718096', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '10px' }}>Class/Branch Name</label>
                        <input
                            type="text"
                            value={newClassName}
                            onChange={(e) => setNewClassName(e.target.value)}
                            style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.95rem', outline: 'none' }}
                            placeholder="e.g. CE, IT, Section A"
                            required
                        />
                    </div>
                    <div style={{ minWidth: '150px' }}>
                        <label style={{ display: 'block', textTransform: 'uppercase', color: '#718096', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '10px' }}>Type</label>
                        <select
                            value={newClassType}
                            onChange={(e) => setNewClassType(e.target.value)}
                            style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.95rem', outline: 'none', background: 'white' }}
                        >
                            <option value="Branch">Branch</option>
                            <option value="Section">Section/Class</option>
                        </select>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '12px 24px',
                            background: '#6366f1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            opacity: loading ? 0.7 : 1,
                            marginTop: 'auto'
                        }}
                    >
                        {loading ? 'Adding...' : '+ Add Class'}
                    </button>
                </form>
            )}

            {error && <div style={{ color: '#f56565', marginBottom: '20px', padding: '10px', background: '#fff5f5', borderRadius: '8px' }}>{error}</div>}
            {success && <div style={{ color: '#48bb78', marginBottom: '20px', padding: '10px', background: '#f0fff4', borderRadius: '8px' }}>{success}</div>}

            {/* Active Class List */}
            <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f7fafc', textAlign: 'left' }}>
                            <th style={{ padding: '15px 20px', color: '#718096', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</th>
                            <th style={{ padding: '15px 20px', color: '#718096', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                            <th style={{ padding: '15px 20px', color: '#718096', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Students</th>
                            <th style={{ padding: '15px 20px', color: '#718096', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activeClasses.map((cls) => (
                            <tr key={cls._id} style={{ borderTop: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '15px 20px' }}>
                                    {editingId === cls._id ? (
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e0' }}
                                        />
                                    ) : (
                                        <span style={{ fontWeight: '600', color: '#2d3748' }}>{cls.name}</span>
                                    )}
                                </td>
                                <td style={{ padding: '15px 20px' }}>
                                    <span style={{
                                        padding: '4px 10px',
                                        borderRadius: '20px',
                                        fontSize: '0.85rem',
                                        background: cls.type === 'Branch' ? '#ebf8ff' : '#f0fff4',
                                        color: cls.type === 'Branch' ? '#3182ce' : '#38a169',
                                        fontWeight: '600'
                                    }}>
                                        {cls.type}
                                    </span>
                                </td>
                                <td style={{ padding: '15px 20px', color: '#4a5568' }}>{cls.studentCount || 0} enrolled</td>
                                <td style={{ padding: '15px 20px' }}>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        {editingId === cls._id ? (
                                            <>
                                                <button onClick={saveEdit} style={{ color: '#48bb78', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}>Save</button>
                                                <button onClick={cancelEdit} style={{ color: '#718096', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => setSelectedClassId(cls._id)} style={{ color: '#6366f1', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}>View</button>
                                                {!readOnly && (
                                                    <>
                                                        <button onClick={() => startEdit(cls)} style={{ color: '#805ad5', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                                                        <button onClick={() => handleDeleteClass(cls._id)} style={{ color: '#f56565', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {activeClasses.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: '#a0aec0' }}>No active classes found. Add one above.</div>}
            </div>

            {/* Deleted Classes Section */}
            {!readOnly && deletedClasses.length > 0 && (
                <div style={{ marginTop: '40px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#e53e3e', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>🗑️</span> Recently Deleted Classes
                    </h3>
                    <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #ffd1d1', background: '#fff5f5' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#fee2e2', textAlign: 'left' }}>
                                    <th style={{ padding: '15px 20px', color: '#c53030', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' }}>Name</th>
                                    <th style={{ padding: '15px 20px', color: '#c53030', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' }}>Type</th>
                                    <th style={{ padding: '15px 20px', color: '#c53030', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' }}>Students (Preserved)</th>
                                    <th style={{ padding: '15px 20px', color: '#c53030', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {deletedClasses.map((cls) => (
                                    <tr key={cls._id} style={{ borderTop: '1px solid #fed7d7' }}>
                                        <td style={{ padding: '15px 20px', fontWeight: '600', color: '#742a2a', textDecoration: 'line-through' }}>{cls.name}</td>
                                        <td style={{ padding: '15px 20px', color: '#742a2a' }}>{cls.type}</td>
                                        <td style={{ padding: '15px 20px', color: '#742a2a' }}>{cls.studentCount || 0} enrolled</td>
                                        <td style={{ padding: '15px 20px' }}>
                                            <button
                                                onClick={() => handleRestoreClass(cls._id)}
                                                style={{
                                                    padding: '6px 12px',
                                                    background: 'white',
                                                    border: '1px solid #48bb78',
                                                    color: '#48bb78',
                                                    borderRadius: '6px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '5px'
                                                }}
                                            >
                                                <span>↩️</span> Revert
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
export default ClassManager;
