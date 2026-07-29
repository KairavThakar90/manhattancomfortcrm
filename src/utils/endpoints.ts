// ==========================================
// Centralized API Endpoint Definitions
// ==========================================
// All backend endpoint URLs are defined here.
// Import the relevant constant wherever an API call is made.
// Do NOT hardcode endpoint paths anywhere else in the project.

// ------------------------------------------
// Auth Endpoints
// ------------------------------------------
export const AUTH_LOGIN = '/auth/login';
export const AUTH_LOGOUT = '/auth/logout';
export const AUTH_REFRESH = '/auth/refresh';
export const AUTH_ME = '/auth/me';

// ------------------------------------------
// User Endpoints
// ------------------------------------------
export const USERS_LIST = '/users';
export const USERS_BY_ID = (id: string) => `/users/${id}`;
export const USERS_CREATE = '/users';
export const USERS_UPDATE = (id: string) => `/users/${id}`;
export const USERS_DELETE = (id: string) => `/users/${id}`;

// ------------------------------------------
// Dashboard Endpoints
// ------------------------------------------
export const DASHBOARD_STATS = '/dashboard/stats';
export const DASHBOARD_SUMMARY = '/dashboard/summary';

// ------------------------------------------
// Purchase Order Endpoints
// ------------------------------------------
export const PO_LIST = '/purchase-orders';
export const PO_BY_ID = (id: string) => `/purchase-orders/${id}`;
export const PO_CREATE = '/purchase-orders';
export const PO_UPDATE = (id: string) => `/purchase-orders/${id}`;
export const PO_DELETE = (id: string) => `/purchase-orders/${id}`;
export const PO_FILTERS_ALL = '/purchase-orders/filters/all';
export const PO_EXPORT_CSV = '/purchase-orders/export/csv';

// ------------------------------------------
// Vendor Endpoints
// ------------------------------------------
export const VENDORS_LIST = '/vendors';
export const VENDORS_BY_ID = (id: string) => `/vendors/${id}`;
export const VENDORS_CREATE = '/vendors';
export const VENDORS_UPDATE = (id: string) => `/vendors/${id}`;
export const VENDORS_DELETE = (id: string) => `/vendors/${id}`;

// ------------------------------------------
// Board / Kanban Endpoints
// ------------------------------------------
export const BOARDS_LIST = '/boards';
export const BOARDS_BY_ID = (id: string) => `/boards/${id}`;
export const BOARDS_UPDATE = (id: string) => `/boards/${id}`;

// ------------------------------------------
// Task Endpoints
// ------------------------------------------
export const TASKS_LIST = '/tasks';
export const TASKS_BY_ID = (id: string) => `/tasks/${id}`;
export const TASKS_CREATE = '/tasks';
export const TASKS_UPDATE = (id: string) => `/tasks/${id}`;
export const TASKS_DELETE = (id: string) => `/tasks/${id}`;
export const TASKS_ASSIGN = (id: string) => `/tasks/${id}/assign`;

// ------------------------------------------
// Team Endpoints
// ------------------------------------------
export const TEAMS_LIST = '/teams';
export const TEAMS_BY_ID = (id: string) => `/teams/${id}`;
export const TEAMS_MEMBERS = (id: string) => `/teams/${id}/members`;

// ------------------------------------------
// Project Endpoints
// ------------------------------------------
export const PROJECTS_LIST = '/projects';
export const PROJECTS_BY_ID = (id: string) => `/projects/${id}`;
export const PROJECTS_CREATE = '/projects';
export const PROJECTS_UPDATE = (id: string) => `/projects/${id}`;
export const PROJECTS_DELETE = (id: string) => `/projects/${id}`;

// ------------------------------------------
// SEO Endpoints
// ------------------------------------------
export const SEO_AUDIT = '/seo/audit';
export const SEO_REPORT = (id: string) => `/seo/report/${id}`;
export const SEO_SITEMAP = '/seo/sitemap';

// ------------------------------------------
// Email Endpoints
// ------------------------------------------
export const EMAIL_LIST = '/emails';
export const EMAIL_SEND = '/emails/send';
export const EMAIL_BY_ID = (id: string) => `/emails/${id}`;

// ------------------------------------------
// Chat Endpoints
// ------------------------------------------
export const CHAT_MESSAGES = '/chat/messages';
export const CHAT_SEND = '/chat/send';
export const CHAT_CHANNELS = '/chat/channels';

// ------------------------------------------
// Reports & Analytics Endpoints
// ------------------------------------------
export const REPORTS_SUMMARY = '/reports/summary';
export const REPORTS_EXPORT = '/reports/export';

// ------------------------------------------
// Notification Endpoints
// ------------------------------------------
export const NOTIFICATIONS_LIST = '/notifications';
export const NOTIFICATIONS_MARK_READ = (id: string) =>
  `/notifications/${id}/read`;
export const NOTIFICATIONS_MARK_ALL_READ = '/notifications/read-all';

// ------------------------------------------
// Sellercloud Sync Endpoints
// ------------------------------------------
export const SYNC_TRIGGER = '/sync/trigger';
export const SYNC_STATUS = '/sync/status';
export const SYNC_HISTORY = '/sync/history';

// ------------------------------------------
// Admin Endpoints
// ------------------------------------------
export const ADMIN_SETTINGS = '/admin/settings';
export const ADMIN_ROLES = '/admin/roles';
export const ADMIN_AUDIT_LOGS = '/admin/audit-logs';

export const CONTAINERS_LIST = '/containers';
export const CONTAINERS_CREATE = '/containers';
export const CONTAINERS_UPDATE = (id: string) => `/containers/${id}`;
export const CONTAINERS_DELETE = (id: string) => `/containers/${id}`;
export const CONTAINER_PO_ITEMS = (sellercloud_po_id: string) => `/containers/po-items/${sellercloud_po_id}`;
export const CONTAINER_DETAILS = (id: string) => `/containers/${id}/details`;
