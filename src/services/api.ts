import axios from 'axios';
import { ENV } from '../config/env';

// ==========================================
// Centralized Axios Instance
// ==========================================
// All service files import this instance.
// baseURL, headers, timeout, and interceptors are configured here.

const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL.replace(/\/+$/, ''),
  timeout: ENV.API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ------------------------------------------
// Request Interceptor
// ------------------------------------------
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ------------------------------------------
// Response Interceptor
// ------------------------------------------
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Extract a readable error message
    const message =
      error.response?.data?.message ||
      error.response?.data?.detail ||
      error.message ||
      'An unexpected error occurred.';

    // Handle 401 Unauthorized globally
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('isAuthenticated');
      // Only redirect if not already on login
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(new Error(message));
  },
);

export default apiClient;
