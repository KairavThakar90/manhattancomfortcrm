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

export interface LoginUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: LoginUser;
  token?: string; // fallback in case api sends it
}

import { UserRole } from '../types';

/**
 * Map backend user role to frontend UserRole.
 */
export function mapBackendRole(backendRole?: string): UserRole {
  const roleLower = (backendRole || '').toLowerCase().trim();
  if (roleLower === 'admin' || roleLower === 'administrator') {
    return 'Administrator';
  }
  if (roleLower === 'purchasing' || roleLower === 'buyer') {
    return 'Purchasing';
  }
  if (
    roleLower === 'warehouse' ||
    roleLower === 'logistic' ||
    roleLower === 'logistics'
  ) {
    return 'Warehouse';
  }
  if (roleLower === 'finance' || roleLower === 'accounting') {
    return 'Finance';
  }
  if (roleLower === 'vendor' || roleLower === 'supplier') {
    return 'Vendor';
  }
  return 'Administrator'; // Default fallback
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

  // Store access token
  const token = data.access_token || data.token;
  if (token) {
    localStorage.setItem('token', token);
  }

  // Store refresh token
  if (data.refresh_token) {
    localStorage.setItem('refresh_token', data.refresh_token);
  }

  // Store user details & mapped role
  if (data.user) {
    localStorage.setItem('user', JSON.stringify(data.user));
    const mappedRole = mapBackendRole(data.user.role);
    localStorage.setItem('userRole', mappedRole);
  }

  return data;
}

/**
 * Logout — clears stored details, optionally notifies backend.
 */
export async function logout(): Promise<void> {
  try {
    await apiClient.post(AUTH_LOGOUT);
  } catch {
    // Silently fail — clear local state regardless
  }
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  localStorage.removeItem('userRole');
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
  if (data.refresh_token) {
    localStorage.setItem('refresh_token', data.refresh_token);
  }
  if (data.user) {
    localStorage.setItem('user', JSON.stringify(data.user));
    const mappedRole = mapBackendRole(data.user.role);
    localStorage.setItem('userRole', mappedRole);
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
