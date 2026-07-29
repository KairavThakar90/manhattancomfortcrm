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

  const handleLogin = async (username, password, rememberMe) => {
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      rememberMe
        ? localStorage.setItem('rememberedUsername', username)
        : localStorage.removeItem('rememberedUsername');
      setIsAuthenticated(true);
    } catch (err) {
      setError(err.message || 'An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  return isAuthenticated ? (
    <Navigate to="/purchase-orders" replace />
  ) : (
    <LoginPageComponent
      onLogin={handleLogin}
      loading={loading}
      error={error}
      initialUsername={initialUsername}
      initialRememberMe={initialRememberMe}
    />
  );
}
