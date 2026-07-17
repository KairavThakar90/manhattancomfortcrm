import apiClient from './api';
import {
  DASHBOARD_STATS,
  DASHBOARD_SUMMARY,
} from '../utils/endpoints';

// ==========================================
// Dashboard Service
// ==========================================

export interface DashboardStats {
  totalOrders: number;
  activeOrders: number;
  delayedOrders: number;
  totalRevenue: number;
  [key: string]: unknown;
}

export interface DashboardSummary {
  recentActivity: unknown[];
  topVendors: unknown[];
  [key: string]: unknown;
}

/** Fetch dashboard stats */
export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await apiClient.get<DashboardStats>(DASHBOARD_STATS);
  return data;
}

/** Fetch dashboard summary */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummary>(DASHBOARD_SUMMARY);
  return data;
}
