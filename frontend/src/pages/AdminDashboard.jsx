import React from 'react';
import { useNavigate } from 'react-router-dom';

function AdminDashboard() {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const navigate = useNavigate();

    const handleLogout = () => {
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <div className="dashboard-container">
            <aside className="sidebar" style={{ background: '#1a202c' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '30px', fontWeight: '700' }}>LMS Admin</h2>
                <nav>
                    <div className="nav-item active" onClick={() => navigate('/admin-dashboard')}>Overview</div>
                    <div className="nav-item" onClick={() => alert('User Management Coming Soon!')}>Manage Users</div>
                    <div className="nav-item" onClick={() => alert('Course Management Coming Soon!')}>Courses</div>
                    <div className="nav-item" onClick={() => alert('System Settings Coming Soon!')}>System Settings</div>
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
                        <h1 style={{ fontSize: '2rem', color: '#2D3748' }}>Admin Panel</h1>
                        <p style={{ color: '#718096' }}>System Overview for {user.name}!</p>
                    </div>
                    <div className="user-profile">
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#2D3748', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                            {user.name ? user.name.charAt(0).toUpperCase() : 'A'}
                        </div>
                    </div>
                </header>

                <section className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '10px' }}>Total Users</h3>
                        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2D3748' }}>1,204</p>
                    </div>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '10px' }}>Active Courses</h3>
                        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#6C63FF' }}>42</p>
                    </div>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '10px' }}>System Health</h3>
                        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#38B2AC' }}>Good</p>
                    </div>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '10px' }}>Revenue</h3>
                        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FF6584' }}>$12k</p>
                    </div>
                </section>
            </main>
        </div>
    );
}

export default AdminDashboard;
