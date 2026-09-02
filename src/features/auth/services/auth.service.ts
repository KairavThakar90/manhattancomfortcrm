import apiClient from '../../../services/api';
import {
  AUTH_LOGIN,
  AUTH_LOGOUT,
  AUTH_ME,
  AUTH_REFRESH,
  AUTH_VERIFY_2FA,
  AUTH_GOOGLE_LOGIN,
  AUTH_IMPERSONATE,
  AUTH_EXIT_IMPERSONATION,
} from '../../../utils/endpoints';

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

import { UserRole } from '../../../types';

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
 * Verify 2FA OTP code.
 */
export async function verify2FA(
  username: string,
  otp: string,
): Promise<LoginResponse> {
  const reqData = { email: username, code: otp };

  const { data } = await apiClient.post<LoginResponse>(
    AUTH_VERIFY_2FA,
    reqData,
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );

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
 * Logout — clears stored details, optionally notifies backend.
 */
export async function logout(): Promise<void> {
  try {
    const refreshToken = localStorage.getItem('refresh_token');
    await apiClient.post(AUTH_LOGOUT, { refresh_token: refreshToken });
  } catch {
    // Silently fail — clear local state regardless
  }
  // Wipe everything (not just the auth keys) so a logout — including one
  // from inside an impersonated session — never leaves stale data (e.g.
  // stashed `admin_*` impersonation keys, cached preferences) behind for
  // the next login to accidentally pick up.
  localStorage.clear();
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

/**
 * Log in as another user (admin-only "Login" action in User Management).
 * Stashes the admin's own session under `admin_*` keys first so
 * `restoreAdminSession()` can switch back without a fresh login.
 */
export async function impersonateUser(userId: string): Promise<LoginResponse> {
  const adminToken = localStorage.getItem('token');
  const adminRefreshToken = localStorage.getItem('refresh_token');
  const adminUser = localStorage.getItem('user');
  const adminRole = localStorage.getItem('userRole');

  const { data } = await apiClient.post<LoginResponse>(
    AUTH_IMPERSONATE(userId),
  );

  const token = data.access_token || data.token;
  if (token) {
    // Only stash the admin session once we know impersonation actually
    // succeeded, and only if we're not already impersonating someone.
    if (!localStorage.getItem('admin_token') && adminToken) {
      localStorage.setItem('admin_token', adminToken);
      if (adminRefreshToken)
        localStorage.setItem('admin_refresh_token', adminRefreshToken);
      if (adminUser) localStorage.setItem('admin_user', adminUser);
      if (adminRole) localStorage.setItem('admin_userRole', adminRole);
    }
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

/** True while the current session is an admin impersonating another user. */
export function isImpersonating(): boolean {
  return !!localStorage.getItem('admin_token');
}

/**
 * Switch back from an impersonated session to the admin's own session.
 * Calls the exit-impersonation endpoint first (while still authenticated as
 * the impersonated user, so the backend can end that session server-side),
 * then restores whatever it returns — falling back to the admin session
 * stashed locally by `impersonateUser()` if the call fails or returns
 * nothing usable.
 */
export async function restoreAdminSession(): Promise<void> {
  const adminToken = localStorage.getItem('admin_token');
  if (!adminToken) return;

  const adminRefreshToken = localStorage.getItem('admin_refresh_token');
  const adminUser = localStorage.getItem('admin_user');
  const adminRole = localStorage.getItem('admin_userRole');

  const restoreLocalAdminSession = () => {
    localStorage.setItem('token', adminToken);
    if (adminRefreshToken)
      localStorage.setItem('refresh_token', adminRefreshToken);
    if (adminUser) localStorage.setItem('user', adminUser);
    if (adminRole) localStorage.setItem('userRole', adminRole);
  };

  try {
    const { data } = await apiClient.post<LoginResponse>(
      AUTH_EXIT_IMPERSONATION,
    );
    const token = data?.access_token || data?.token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      restoreLocalAdminSession();
    }
    if (data?.refresh_token) {
      localStorage.setItem('refresh_token', data.refresh_token);
    }
    if (data?.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('userRole', mapBackendRole(data.user.role));
    } else if (adminUser) {
      localStorage.setItem('user', adminUser);
      if (adminRole) localStorage.setItem('userRole', adminRole);
    }
  } catch (err) {
    console.error(
      'Exit-impersonation request failed — restoring the locally stashed admin session instead:',
      err,
    );
    restoreLocalAdminSession();
  } finally {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_userRole');
  }
}

/**
 * Handle Google Login by sending the access token to the backend.
 * The backend MUST verify the token via Google's API, check if the email
 * exists in the employee database, and return a real CRM session.
 */
export async function loginWithGoogle(
  googleToken: string,
): Promise<LoginResponse> {
  const reqData = { token: googleToken };

  const { data } = await apiClient.post<LoginResponse>(
    AUTH_GOOGLE_LOGIN,
    reqData,
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );

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
