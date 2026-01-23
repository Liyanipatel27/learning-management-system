import React from 'react';
import { useNavigate } from 'react-router-dom';

function AdminDashboard() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = React.useState('overview');

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <div className="dashboard-container">
            <aside className="sidebar" style={{ background: '#1a202c' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '30px', fontWeight: '700' }}>LMS Admin</h2>
                <nav>
                    <div className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</div>
                    <div className="nav-item" onClick={() => alert('User Management Coming Soon!')}>Manage Users</div>
                    <div className="nav-item" onClick={() => alert('Course Management Coming Soon!')}>Courses</div>
                    <div className="nav-item" onClick={() => alert('System Settings Coming Soon!')}>System Settings</div>
                    <div className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>My Profile</div>
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
                        <h1 style={{ fontSize: '2rem', color: '#2D3748' }}>
                            {activeTab === 'overview' ? 'Admin Panel' : 'My Profile'}
                        </h1>
                        <p style={{ color: '#718096' }}>Welcome back, {user.name}!</p>
                    </div>
                    <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'white', padding: '8px 16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0, fontWeight: '600', fontSize: '0.9rem', color: '#2d3748' }}>{user.name}</p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#718096' }}>Admin {user.employeeId ? `(ID: ${user.employeeId})` : ''}</p>
                        </div>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                            {user.name ? user.name.charAt(0).toUpperCase() : 'A'}
                        </div>
                    </div>
                </header>

                {activeTab === 'overview' ? (
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
                ) : (
                    <AdminProfileSection user={user} />
                )}
            </main>
        </div>
    );
}

const AdminProfileSection = ({ user }) => {
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', padding: '40px', borderRadius: '25px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '30px', marginBottom: '40px', borderBottom: '1px solid #edf2f7', paddingBottom: '30px' }}>
                <div style={{ width: '100px', height: '100px', borderRadius: '30px', background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 'bold', boxShadow: '0 10px 20px rgba(30, 41, 59, 0.2)' }}>
                    {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                </div>
                <div>
                    <h2 style={{ fontSize: '2rem', margin: '0 0 5px 0', color: '#1a202c' }}>{user.name}</h2>
                    <p style={{ margin: 0, color: '#1e293b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.9rem' }}>{user.role}</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '15px', border: '1px solid #edf2f7' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#718096', marginBottom: '5px', fontWeight: '600' }}>Email Address</label>
                    <div style={{ fontSize: '1.1rem', color: '#2d3748', fontWeight: '500' }}>{user.email}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '15px', border: '1px solid #edf2f7' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#718096', marginBottom: '5px', fontWeight: '600' }}>Status</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
                        <div style={{ fontSize: '1rem', color: '#10b981', fontWeight: '700' }}>Active</div>
                    </div>
                </div>
                {user.employeeId && (
                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '15px', border: '1px solid #edf2f7' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#718096', marginBottom: '5px', fontWeight: '600' }}>Employee ID</label>
                        <div style={{ fontSize: '1.1rem', color: '#2d3748', fontWeight: '500' }}>{user.employeeId}</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
