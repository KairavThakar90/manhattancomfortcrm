import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import LoginPageComponent from '../components/LoginPage';
import { useCRM } from '../hooks/useCRM';

export default function LoginPage() {
  const { isAuthenticated, setIsAuthenticated } = useCRM();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (email, password) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Login failed. Please check your credentials.',
        );
      }

      // If token is returned, store it
      if (data.token || data.access_token) {
        localStorage.setItem('token', data.token || data.access_token);
      }

      setIsAuthenticated(true);
    } catch (err) {
      setError(err.message || 'An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginPageComponent onLogin={handleLogin} loading={loading} error={error} />
  );
}
