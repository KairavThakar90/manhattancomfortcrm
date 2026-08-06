import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useCRM } from '../hooks/useCRM';

export default function ProtectedRoute() {
  const { isAuthenticated } = useCRM();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
