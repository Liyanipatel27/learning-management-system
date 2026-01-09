import React from 'react';
import { useNavigate } from 'react-router-dom';

function TeacherDashboard() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <div className="dashboard-container">
            <aside className="sidebar" style={{ background: '#25213b' }}> {/* Slightly darker for teacher */}
                <h2 style={{ fontSize: '1.5rem', marginBottom: '30px', fontWeight: '700' }}>LMS Teacher</h2>
                <nav>
                    <div className="nav-item active" onClick={() => navigate('/teacher-dashboard')}>Dashboard</div>
                    <div className="nav-item" onClick={() => alert('Classes Module Coming Soon!')}>My Classes</div>
                    <div className="nav-item" onClick={() => alert('Student List Coming Soon!')}>Students</div>
                    <div className="nav-item" onClick={() => alert('Assignments Coming Soon!')}>Assignments</div>
                    <div className="nav-item" onClick={() => alert('Settings Coming Soon!')}>Settings</div>
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
                        <h1 style={{ fontSize: '2rem', color: '#2D3748' }}>Instructor Portal</h1>
                        <p style={{ color: '#718096' }}>Welcome back, {user.name}!</p>
                    </div>
                    <div className="user-profile">
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#FF6584', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                            {user.name ? user.name.charAt(0).toUpperCase() : 'T'}
                        </div>
                    </div>
                </header>

                <section className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '10px' }}>Active Classes</h3>
                        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2D3748' }}>3</p>
                    </div>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '10px' }}>Total Students</h3>
                        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#6C63FF' }}>142</p>
                    </div>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '10px' }}>Pending Grading</h3>
                        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FF6584' }}>15</p>
                    </div>
                </section>
            </main>
        </div>
    );
}

export default TeacherDashboard;
