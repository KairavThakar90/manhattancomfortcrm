// Centralized API client for all backend requests
import { ENV } from '../config/env';

// Build the full API base URL (strip trailing slash)
const BASE = ENV.API_BASE_URL.replace(/\/+$/, '');

/**
 * Make an authenticated request to the backend API.
 * @param {string} endpoint  - path, e.g. "/auth/login"
 * @param {RequestInit} options - standard fetch options
 * @returns {Promise<Response>}
 */
export async function apiFetch(endpoint, options = {}) {
  const url = `${BASE}${endpoint}`;

  // Attach auth token if available
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return response;
}

export default apiFetch;
