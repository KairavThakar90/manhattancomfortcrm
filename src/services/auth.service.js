import apiFetch from './api';
import { AUTH_LOGIN, AUTH_LOGOUT, AUTH_ME } from '../utils/endpoints';

/**
 * Login with username and password.
 * Sends form-urlencoded data as expected by the backend.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<object>} Parsed response data (includes token)
 */
export async function login(username, password) {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  const response = await apiFetch(AUTH_LOGIN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        data.detail ||
        'Login failed. Please check your credentials.',
    );
  }

  // Store the token
  const token = data.token || data.access_token;
  if (token) {
    localStorage.setItem('token', token);
  }

  return data;
}

/**
 * Logout the current user — clears stored token.
 * Optionally calls the backend logout endpoint.
 */
export async function logout() {
  try {
    await apiFetch(AUTH_LOGOUT, { method: 'POST' });
  } catch {
    // Silently fail — we clear local state regardless
  }
  localStorage.removeItem('token');
}

/**
 * Fetch the currently authenticated user's profile.
 * @returns {Promise<object>} User profile data
 */
export async function getMe() {
  const response = await apiFetch(AUTH_ME);

  if (!response.ok) {
    throw new Error('Failed to fetch user profile.');
  }

  return response.json();
}

/**
 * Check if a token exists in local storage.
 * @returns {boolean}
 */
export function isTokenPresent() {
  return !!localStorage.getItem('token');
}
