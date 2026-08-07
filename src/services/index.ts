// ==========================================
// Services Barrel Export
// ==========================================
// Import all services from this file for convenience.

export { default as apiClient } from './api';

export * as authService from '../features/auth/services/auth.service';
export * as userService from '../features/users/services/user.service';
export * as dashboardService from './dashboard.service';
export * as purchaseOrderService from '../features/purchaseOrders/services/purchaseOrder.service';
export * as taskService from './task.service';
export * as boardService from './board.service';
export * as teamService from './team.service';
export * as projectService from './project.service';
export * as vendorService from './vendor.service';
