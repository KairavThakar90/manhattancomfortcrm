// Application-wide Constants & Dynamic Selectors

export const APP_ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  CUSTOMERS: '/customers',
  PURCHASE_ORDERS: '/purchase-orders',
  PRODUCTS: '/products',
  SETTINGS: '/settings',
  UNAUTHORIZED: '/unauthorized',
};

export const USER_ROLES = {
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  STAFF: 'Staff',
  VENDOR: 'Vendor',
};

export const PO_STATUSES = {
  DRAFT: 'Draft',
  PENDING: 'Pending Approval',
  APPROVED: 'Approved',
  IN_PRODUCTION: 'In Production',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  PAGE_OPTIONS: [10, 20, 50, 100],
};

export const UI_COLORS = {
  PRIMARY: 'indigo',
  SUCCESS: 'green',
  WARNING: 'yellow',
  DANGER: 'red',
  INFO: 'blue',
  GRAY: 'gray',
};

export const LOCAL_STORAGE_KEYS = {
  THEME_MODE: 'crm_theme_mode',
  SIDEBAR_COLLAPSED: 'crm_sidebar_collapsed',
  USER_PREFERENCES: 'crm_user_preferences',
};
