import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useCRM } from '../../../hooks/useCRM';

export default function ProtectedRoute() {
  const { isAuthenticated } = useCRM();
  const location = useLocation();

  if (!isAuthenticated) {
    // Store intended route robustly to survive page reloads during login
    localStorage.setItem(
      'intendedRoute',
      `${location.pathname}${location.search}${location.hash}`,
    );
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
