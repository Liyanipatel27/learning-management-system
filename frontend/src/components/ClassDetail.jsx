import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ClassDetail = ({ classId, onBack }) => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [className, setClassName] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1); // Reset to page 1 on search
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        fetchStudents();
    }, [classId, page, debouncedSearch]);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `${import.meta.env.VITE_API_URL}/api/classes/${classId}/students?page=${page}&limit=10&search=${debouncedSearch}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setStudents(response.data.students);
            setTotalPages(response.data.totalPages);
            setClassName(response.data.className);
        } catch (err) {
            console.error('Error fetching students:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ background: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2d3748' }}>Class: {className}</h2>
                <button
                    onClick={onBack}
                    style={{
                        padding: '8px 16px',
                        background: '#e2e8f0',
                        color: '#4a5568',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer'
                    }}
                >
                    &larr; Back to List
                </button>
            </div>

            {/* Search Bar */}
            <div style={{ marginBottom: '25px' }}>
                <input
                    type="text"
                    placeholder="Search students..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                        width: '100%',
                        maxWidth: '400px',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        fontSize: '1rem',
                        outline: 'none',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                />
            </div>

            {/* Student List */}
            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#718096' }}>Loading students...</div>
            ) : (
                <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f7fafc', textAlign: 'left' }}>
                                <th style={{ padding: '15px 20px', color: '#718096', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</th>
                                <th style={{ padding: '15px 20px', color: '#718096', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</th>
                                <th style={{ padding: '15px 20px', color: '#718096', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enrollment</th>
                                <th style={{ padding: '15px 20px', color: '#718096', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Branch</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.length > 0 ? (
                                students.map((student) => (
                                    <tr key={student._id} style={{ borderTop: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '15px 20px', fontWeight: '500', color: '#2d3748' }}>{student.name}</td>
                                        <td style={{ padding: '15px 20px', color: '#4a5568' }}>{student.email}</td>
                                        <td style={{ padding: '15px 20px', color: '#4a5568' }}>{student.enrollment}</td>
                                        <td style={{ padding: '15px 20px', color: '#4a5568' }}>{student.branch}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#a0aec0' }}>
                                        No students found in this class.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
                    <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        style={{
                            padding: '8px 16px',
                            background: page === 1 ? '#e2e8f0' : '#6366f1',
                            color: page === 1 ? '#a0aec0' : 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: page === 1 ? 'not-allowed' : 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        Previous
                    </button>
                    <span style={{ color: '#4a5568', fontWeight: '600' }}>
                        Page {page} of {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        style={{
                            padding: '8px 16px',
                            background: page === totalPages ? '#e2e8f0' : '#6366f1',
                            color: page === totalPages ? '#a0aec0' : 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: page === totalPages ? 'not-allowed' : 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};
export default ClassDetail;
