import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useCRM } from '../hooks/useCRM';

export default function ProtectedRoute() {
    const { isAuthenticated } = useCRM();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}
