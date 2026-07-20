import apiClient from './api';
import {
  AUTH_LOGIN,
  AUTH_LOGOUT,
  AUTH_ME,
  AUTH_REFRESH,
} from '../utils/endpoints';

// ==========================================
// Auth Service
// ==========================================

export interface LoginResponse {
  access_token?: string;
  token?: string;
  token_type?: string;
  user?: Record<string, unknown>;
}

/**
 * Login with username and password.
 * Backend expects application/x-www-form-urlencoded.
 */
export async function login(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  const { data } = await apiClient.post<LoginResponse>(AUTH_LOGIN, formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  // Store the token
  const token = data.access_token || data.token;
  if (token) {
    localStorage.setItem('token', token);
  }

  return data;
}

/**
 * Logout — clears stored token, optionally notifies backend.
 */
export async function logout(): Promise<void> {
  try {
    await apiClient.post(AUTH_LOGOUT);
  } catch {
    // Silently fail — clear local state regardless
  }
  localStorage.removeItem('token');
  localStorage.removeItem('isAuthenticated');
}

/**
 * Refresh the access token.
 */
export async function refreshToken(): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>(AUTH_REFRESH);

  const token = data.access_token || data.token;
  if (token) {
    localStorage.setItem('token', token);
  }

  return data;
}

/**
 * Get the current authenticated user's profile.
 */
export async function getMe(): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get(AUTH_ME);
  return data;
}

/**
 * Check if a token exists in local storage.
 */
export function isTokenPresent(): boolean {
  return !!localStorage.getItem('token');
}
