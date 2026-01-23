import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const navigate = useNavigate();
    const userString = sessionStorage.getItem('user');
    const token = sessionStorage.getItem('token');

    // Effect to listen for storage changes (logout in other tabs)
    useEffect(() => {
        const handleStorageChange = () => {
            const currentToken = sessionStorage.getItem('token');
            if (!currentToken) {
                navigate('/login');
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [navigate]);

    if (!userString || !token) {
        // Not logged in - Strict Redirect
        return <Navigate to="/login" replace />;
    }

    try {
        const user = JSON.parse(userString);
        if (allowedRoles && !allowedRoles.includes(user.role)) {
            // Role not authorized
            return <Navigate to="/" replace />;
        }
    } catch (e) {
        // Corrupt data
        sessionStorage.clear();
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
