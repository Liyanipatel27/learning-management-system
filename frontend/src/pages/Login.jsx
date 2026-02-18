import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';


function Login() {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/api/auth/login`, formData);
            const { user, token } = res.data;

            localStorage.setItem('user', JSON.stringify(user));
            if (token) localStorage.setItem('token', token);

            if (user.role === 'student') {
                navigate('/student-dashboard');
            } else if (user.role === 'teacher') {
                navigate('/teacher-dashboard');
            } else if (user.role === 'admin') {
                navigate('/admin-dashboard');
            } else {
                alert('Unknown role');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-split-card">
                <div className="card-left">
                    <div className="card-left-content">
                        <div className="project-name">
                            Learning Management System
                        </div>

                    </div>
                </div>

                <div className="card-right">
                    <div className="auth-header">
                        <h2 className="auth-title">Welcome Back</h2>
                        <p className="auth-subtitle">Elevate your learning journey today.</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                className="form-input"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="name@company.com"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label className="form-label">Password</label>
                                <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: '#818cf8', textDecoration: 'none', marginBottom: '8px' }}>
                                    Forgot password?
                                </Link>
                            </div>
                            <input
                                type="password"
                                name="password"
                                className="form-input"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div style={{ marginTop: '1.5rem', textAlign: 'center', borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
                        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
                            Need an account?
                        </p>
                        <button
                            type="button"
                            onClick={() => navigate('/request-account')}
                            className="btn-secondary"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: '#f3f4f6',
                                color: '#374151',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontWeight: '500'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#e5e7eb'}
                            onMouseOut={(e) => e.currentTarget.style.background = '#f3f4f6'}
                        >
                            Request Access
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default Login;
