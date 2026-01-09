import React from 'react';
import { useNavigate } from 'react-router-dom';

function StudentDashboard() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const navigate = useNavigate();

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
                    <div className="nav-item active" onClick={() => navigate('/student-dashboard')}>Dashboard</div>
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

                <section className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                    {/* Card 1 */}
                    <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '10px' }}>Enrolled Courses</h3>
                        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2D3748' }}>4</p>
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
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', color: '#2D3748' }}>Recent Activity</h2>
                    <div style={{ background: 'white', borderRadius: '15px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                        <p style={{ color: '#718096' }}>No recent activity to show.</p>
                    </div>
                </section>
            </main>
        </div>
    );
}

export default StudentDashboard;
