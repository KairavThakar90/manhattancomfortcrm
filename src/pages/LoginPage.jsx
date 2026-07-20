import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import LoginPageComponent from '../components/LoginPage';
import { useCRM } from '../hooks/useCRM';
import { login } from '../services/auth.service';

export default function LoginPage() {
  const { isAuthenticated, setIsAuthenticated } = useCRM();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Restore the remembered username if present
  const initialUsername = localStorage.getItem('rememberedUsername') || '';
  const initialRememberMe = !!initialUsername;

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (username, password, rememberMe) => {
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      if (rememberMe) {
        localStorage.setItem('rememberedUsername', username);
      } else {
        localStorage.removeItem('rememberedUsername');
      }
      setIsAuthenticated(true);
    } catch (err) {
      setError(err.message || 'An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginPageComponent
      onLogin={handleLogin}
      loading={loading}
      error={error}
      initialUsername={initialUsername}
      initialRememberMe={initialRememberMe}
    />
  );
}
