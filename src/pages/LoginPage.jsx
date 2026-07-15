import React from 'react';
import { Navigate } from 'react-router-dom';
import LoginPageComponent from '../components/LoginPage';
import { useCRM } from '../hooks/useCRM';

export default function LoginPage() {
  const { isAuthenticated, setIsAuthenticated } = useCRM();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LoginPageComponent onLogin={() => setIsAuthenticated(true)} />;
}
