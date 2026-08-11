import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoginPageComponent from '../components/LoginPage';
import { useCRM } from '../../../hooks/useCRM';
import { login, verify2FA, loginWithGoogle } from '../services/auth.service';

export default function LoginPage() {
  const { isAuthenticated, setIsAuthenticated } = useCRM();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const location = useLocation();

  const initialUsername = localStorage.getItem('rememberedUsername') || '';
  const initialRememberMe = !!initialUsername;

  const handleLogin = async (username, password) => {
    setLoading(true);
    setError('');
    try {
      const response = await login(username, password);
      if (response && response.message) {
        toast.success(response.message);
      }
    } catch (err) {
      const backendMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.response?.data?.detail;
      setError(
        backendMessage || err.message || 'An error occurred during login.',
      );
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (username, otp, rememberMe) => {
    setLoading(true);
    setError('');
    try {
      await verify2FA(username, otp);
      rememberMe
        ? localStorage.setItem('rememberedUsername', username)
        : localStorage.removeItem('rememberedUsername');
      setIsAuthenticated(true);
    } catch (err) {
      const backendMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.response?.data?.detail;
      setError(backendMessage || err.message || 'Invalid verification code.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fromPath = location.state?.from?.pathname || '/purchase-orders';
  const fromSearch = location.state?.from?.search || '';
  const from = `${fromPath}${fromSearch}`;

  const handleGoogleSuccess = async (googleToken) => {
    setLoading(true);
    setError('');
    try {
      await loginWithGoogle(googleToken);
      setIsAuthenticated(true);
      toast.success('Successfully logged in with Google!');
    } catch (err) {
      const backendMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.response?.data?.detail;
      setError(
        backendMessage || err.message || 'Google Login failed securely.',
      );
      // throw err; // Remove throw to prevent unhandled promise rejection crashing things
    } finally {
      setLoading(false);
    }
  };

  return isAuthenticated ? (
    <Navigate to={from} replace />
  ) : (
    <LoginPageComponent
      onLogin={handleLogin}
      onVerifyOtp={handleVerifyOtp}
      loading={loading}
      error={error}
      initialUsername={initialUsername}
      initialRememberMe={initialRememberMe}
      onGoogleLogin={handleGoogleSuccess}
    />
  );
}
