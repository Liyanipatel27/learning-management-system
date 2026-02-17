import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function RequestAccount() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        mobile: '',
        role: 'student',
        course: '',
        qualification: '',
        reason: ''
    });
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [trustScore, setTrustScore] = useState(null); // Optional: demo only

    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/api/auth/request-account`, formData);
            setSubmitted(true);
            setTrustScore(res.data.trustScore);
        } catch (err) {
            alert(err.response?.data?.message || 'Request failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="auth-page" style={{ justifyContent: 'center', alignItems: 'center', display: 'flex', height: '100vh', background: '#f0f4f8' }}>
                <div className="card-right" style={{ maxWidth: '500px', width: '90%', padding: '2rem', background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>Request Submitted!</h2>
                        <p style={{ color: '#4b5563', marginTop: '1rem' }}>
                            Your account request has been sent for administrative review. You will receive an email with your credentials once approved.
                        </p>

                        {/* Demo/Debug Info - In real app, hide this */}
                        {trustScore && (
                            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px' }}>
                                <p style={{ color: '#166534', fontWeight: '600', fontSize: '0.875rem' }}>
                                    AI Verification Score: {trustScore}/100
                                </p>
                            </div>
                        )}

                        <button
                            onClick={() => navigate('/login')}
                            className="btn-primary"
                            style={{ marginTop: '2rem', width: '100%' }}
                        >
                            Return to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-split-card">
                <div className="card-left">
                    <div className="card-left-content">
                        <div className="project-name">
                            Join Our Learning Community
                        </div>
                    </div>
                </div>

                <div className="card-right" style={{ overflowY: 'auto' }}>
                    <div className="auth-header" style={{ marginTop: '0' }}>
                        <Link to="/login" style={{ fontSize: '0.875rem', color: '#6366f1', textDecoration: 'none', display: 'block', marginBottom: '1rem' }}>
                            &larr; Back to Login
                        </Link>
                        <h2 className="auth-title">Request Account</h2>
                        <p className="auth-subtitle">Submit your details for access.</p>
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
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                className="form-input"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Mobile Number</label>
                            <input
                                type="tel"
                                name="mobile"
                                className="form-input"
                                value={formData.mobile}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">I am a...</label>
                            <select
                                name="role"
                                className="form-input"
                                value={formData.role}
                                onChange={handleChange}
                                style={{ background: 'white' }}
                            >
                                <option value="student">Student</option>
                                <option value="teacher">Teacher</option>
                            </select>
                        </div>

                        {formData.role === 'student' && (
                            <div className="form-group">
                                <label className="form-label">Course / Branch</label>
                                <input
                                    type="text"
                                    name="course"
                                    className="form-input"
                                    value={formData.course}
                                    onChange={handleChange}
                                    placeholder="e.g. Computer Science"
                                    required
                                />
                            </div>
                        )}

                        {formData.role === 'teacher' && (
                            <div className="form-group">
                                <label className="form-label">Qualification / Specialization</label>
                                <input
                                    type="text"
                                    name="qualification"
                                    className="form-input"
                                    value={formData.qualification}
                                    onChange={handleChange}
                                    placeholder="e.g. PhD in Physics"
                                    required
                                />
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Reason for Joining</label>
                            <textarea
                                name="reason"
                                className="form-input"
                                value={formData.reason}
                                onChange={handleChange}
                                rows="3"
                                placeholder="Why do you want to join? (This helps us verify your request)"
                                required
                                style={{ resize: 'vertical' }}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                            style={{ marginTop: '1rem' }}
                        >
                            {loading ? 'Analyzing Request...' : 'Submit Request'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default RequestAccount;
