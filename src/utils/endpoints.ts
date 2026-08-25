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
export const AUTH_GOOGLE_LOGIN = '/auth/google';
export const AUTH_LOGOUT = '/auth/logout';
export const AUTH_REFRESH = '/auth/refresh';
export const AUTH_VERIFY_2FA = '/auth/verify-2fa';
export const AUTH_ME = '/auth/me';
export const AUTH_UPDATE_PASSWORD = '/auth/update-password';
export const AUTH_COLUMN_PREFERENCES = '/auth/me/column-preferences';
export const APP_HEALTH = '/health';

// ------------------------------------------
// Auth & User Endpoints
// ------------------------------------------
export const AUTH_REGISTER = '/auth/register';
export const USERS_LIST = '/auth/users';
export const USERS_BY_ID = (id: string) => `/auth/users/${id}`;
export const USERS_CREATE = '/auth/users';
export const USERS_UPDATE = (id: string) => `/auth/users/${id}`;
export const USERS_DELETE = (id: string) => `/auth/users/${id}`;
export const USERS_TAG = '/auth/users/tag';
export const ACTIVITIES_LIST = '/activities';

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
export const PO_EXPORT_SINGLE_CSV = (sellercloud_po_id: string) =>
  `/purchase-orders/${sellercloud_po_id}/export/csv`;
export const PO_SYNC = '/purchase-orders/sync';
export const PO_CHANNEL_ORDER_IDS = '/purchase-orders/channel-order-ids';
export const PO_STATUS_UPDATE = (id: string) => `/purchase-orders/${id}/status`;
export const PO_ITEM_QTY_UPDATE = (id: string) =>
  `/purchase-orders/items/${id}/quantity`;

// ------------------------------------------
// Company Endpoints
// ------------------------------------------
export const COMPANIES_LIST = '/companies';

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
export const CONTAINERS_ATTACHMENT_DELETE = (attachment_id: string) =>
  `/containers/attachments/${attachment_id}`;
export const CONTAINER_PO_ITEMS = (sellercloud_po_id: string) =>
  `/containers/po-items/${sellercloud_po_id}`;
export const CONTAINER_DETAILS = (id: string) => `/containers/${id}/details`;
export const CONTAINER_ETA_SEARCH = (containerNumber: string) =>
  `/containers/allways/search/${containerNumber}`;
export const CONTAINER_SYNC = '/purchase-orders/sync-containers';
export const CONTAINERS_EXPORT_CSV = '/containers/export/csv';
export const CONTAINER_ACTIVITIES = (id: string) =>
  `/containers/${id}/activities`;

// ------------------------------------------
// PO Comment Endpoints
// ------------------------------------------
export const PO_COMMENTS = (poId: string) =>
  `/purchase-orders/${poId}/comments`;
export const PO_COMMENT_UPDATE = (commentId: string) =>
  `/purchase-orders/comments/${commentId}`;
export const PO_COMMENT_DELETE = (commentId: string) =>
  `/purchase-orders/comments/${commentId}`;
export const PO_COMMENT_ATTACHMENT_DELETE = (attachmentId: string) =>
  `/purchase-orders/comments/attachments/${attachmentId}`;

// ------------------------------------------
// PO Item Comment Endpoints
// ------------------------------------------
export const PO_ITEM_COMMENTS = (itemId: string) =>
  `/purchase-orders/items/${itemId}/comments`;
export const PO_ITEM_COMMENT_UPDATE = (commentId: string) =>
  `/purchase-orders/items/comments/${commentId}`;
export const PO_ITEM_COMMENT_DELETE = (commentId: string) =>
  `/purchase-orders/items/comments/${commentId}`;
export const PO_ITEM_COMMENT_ATTACHMENT_DELETE = (attachmentId: string) =>
  `/purchase-orders/items/comments/attachments/${attachmentId}`;

// ------------------------------------------
// Warehouse Endpoints
// ------------------------------------------
export const WAREHOUSES_LIST = '/warehouses/';
export const WAREHOUSES_BY_ID = (id: string) => `/warehouses/${id}`;
export const CONTAINER_ITEMS_IMPORT = (id: string) => `/containers/${id}/items`;
export const CONTAINER_IMPORT_PREVIEW = '/containers/import/preview';
export const CONTAINER_VALIDATE_ITEMS_BULK = '/containers/validate-items-bulk';

// ------------------------------------------
// Logistics Endpoints
// ------------------------------------------
export const LOGISTICS_LIST = '/logistics';
export const LOGISTICS_BY_ID = (id: string) => `/logistics/${id}`;
export const LOGISTICS_CREATE = '/logistics';
export const LOGISTICS_UPDATE = (id: string) => `/logistics/${id}`;
export const LOGISTICS_DELETE = (id: string) => `/logistics/${id}`;

// ------------------------------------------
// Tracker Logistics Endpoints
// ------------------------------------------
export const TRACKER_LOGISTICS_LIST = '/logistics';
export const TRACKER_LOGISTICS_BY_ID = (id: string) => `/logistics/${id}`;
export const TRACKER_LOGISTICS_CREATE = '/logistics';
export const TRACKER_LOGISTICS_UPDATE = (id: string) => `/logistics/${id}`;
export const TRACKER_LOGISTICS_DELETE = (id: string) => `/logistics/${id}`;
