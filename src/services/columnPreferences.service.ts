import apiClient from './api';
import { AUTH_COLUMN_PREFERENCES, USERS_UPDATE } from '../utils/endpoints';

// ==========================================
// Column Preferences Service
// ==========================================
// Backend stores per-user column visibility as two flat maps on the user
// record: `po_columns` and `container_columns` ({ [columnKey]: boolean }).

export interface ColumnPreferences {
  po_columns?: Record<string, boolean>;
  container_columns?: Record<string, boolean>;
  [key: string]: unknown;
}

/** Fetch the current user's saved column visibility preferences. */
export async function getColumnPreferences(): Promise<ColumnPreferences> {
  const { data } = await apiClient.get<ColumnPreferences>(
    AUTH_COLUMN_PREFERENCES,
  );
  return data || {};
}

/** Persist Purchase Order column visibility for a user. */
export async function savePOColumnPreferences(
  userId: string,
  po_columns: Record<string, boolean>,
): Promise<void> {
  await apiClient.patch(USERS_UPDATE(userId), { po_columns });
}

/** Persist Container column visibility for a user. */
export async function saveContainerColumnPreferences(
  userId: string,
  container_columns: Record<string, boolean>,
): Promise<void> {
  await apiClient.patch(USERS_UPDATE(userId), { container_columns });
}
