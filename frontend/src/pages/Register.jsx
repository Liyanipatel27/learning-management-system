import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

function Register() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'student',
        enrollment: '',
        branch: '',
        employeeId: ''
    });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Frontend validation for @gmail.com
        if (!formData.email.toLowerCase().endsWith('@gmail.com')) {
            alert('Invalid email. Please use a valid @gmail.com address.');
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/register`, formData);
            alert('Registration successful! Please login.');
            navigate('/login');
        } catch (err) {
            alert(err.response?.data?.message || 'Registration failed');
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
                        <h1 className="project-tagline">
                            Join a community of lifelong learners.
                        </h1>
                    </div>
                </div>

                <div className="card-right">
                    <div className="auth-header">
                        <h2 className="auth-title">Create Account</h2>
                        <p className="auth-subtitle">Join our community of lifelong learners.</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input
                                type="text"
                                name="name"
                                className="form-input"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="e.g. John Doe"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">I am a...</label>
                            <select
                                name="role"
                                className="form-select"
                                value={formData.role}
                                onChange={handleChange}
                            >
                                <option value="student">Student</option>
                                <option value="teacher">Teacher</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>

                        {formData.role === 'student' && (
                            <>
                                <div className="form-group">
                                    <label className="form-label">Enrollment Number</label>
                                    <input
                                        type="number"
                                        name="enrollment"
                                        className="form-input"
                                        value={formData.enrollment}
                                        onChange={handleChange}
                                        placeholder="e.g. 123456"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Branch</label>
                                    <input
                                        type="text"
                                        name="branch"
                                        className="form-input"
                                        value={formData.branch}
                                        onChange={handleChange}
                                        placeholder="e.g. Computer Science"
                                        required
                                    />
                                </div>
                            </>
                        )}

                        {(formData.role === 'teacher' || formData.role === 'admin') && (
                            <div className="form-group">
                                <label className="form-label">Employee ID</label>
                                <input
                                    type="number"
                                    name="employeeId"
                                    className="form-input"
                                    value={formData.employeeId}
                                    onChange={handleChange}
                                    placeholder="e.g. 98765"
                                    required
                                />
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                className="form-input"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="e.g. john@gmail.com"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
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
                            {loading ? 'Creating Account...' : 'Sign Up'}
                        </button>
                    </form>

                    <div className="auth-footer">
                        Already have an account?
                        <Link to="/login" className="auth-link">Sign In</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Register;
