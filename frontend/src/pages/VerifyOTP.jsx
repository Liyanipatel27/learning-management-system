import { useState } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

const API_URL = (import.meta.env.VITE_API_URL || '${API_URL}').replace(/\/api$/, '');

function VerifyOTP() {
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email;

    if (!email) {
        navigate('/forgot-password');
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post(`${API_URL}/api/auth/verify-otp`, { email, otp });
            alert('OTP verified successfully');
            navigate('/reset-password', { state: { email, otp } });
        } catch (err) {
            alert(err.response?.data?.message || 'Invalid OTP');
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
                            LMS Academy
                        </div>
                    </div>
                </div>

                <div className="card-right">
                    <div className="auth-header">
                        <h2 className="auth-title">Verify OTP</h2>
                        <p className="auth-subtitle">Enter the 6-digit code sent to {email}.</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">OTP Code</label>
                            <input
                                type="text"
                                className="form-input"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="123456"
                                maxLength="6"
                                required
                                style={{ textAlign: 'center', letterSpacing: '10px', fontSize: '1.5rem' }}
                            />
                        </div>

                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default VerifyOTP;
