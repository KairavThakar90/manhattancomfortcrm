// Dynamic Environment Variables Configuration
// Centralized loader to safely access variables across the app.

export const ENV = {
  // Application
  NODE_ENV: import.meta.env.MODE || 'development',
  APP_NAME: import.meta.env.VITE_APP_NAME || 'Manhattan Comfort CRM',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',

  // Internal API (Your backend/database APIs)
  API_BASE_URL:
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  API_TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT || '15000', 10),

  // Third-party Integrations
  SELLERCLOUD_API_URL: import.meta.env.VITE_SELLERCLOUD_API_URL || '',
  MAGENTO_API_URL: import.meta.env.VITE_MAGENTO_API_URL || '',

  // Feature Flags
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  ENABLE_NOTIFICATIONS: import.meta.env.VITE_ENABLE_NOTIFICATIONS !== 'false',

  // Authentication
  AUTH_TOKEN_KEY: import.meta.env.VITE_AUTH_TOKEN_KEY || 'crm_auth_token',
  SESSION_EXPIRY_HOURS: parseInt(
    import.meta.env.VITE_SESSION_EXPIRY || '24',
    10,
  ),
};

export const isDev = ENV.NODE_ENV === 'development';
export const isProd = ENV.NODE_ENV === 'production';
