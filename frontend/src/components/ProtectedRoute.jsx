import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const userString = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userString || !token) {
        // Not logged in
        return <Navigate to="/login" replace />;
    }

    const user = JSON.parse(userString);

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Role not authorized
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
