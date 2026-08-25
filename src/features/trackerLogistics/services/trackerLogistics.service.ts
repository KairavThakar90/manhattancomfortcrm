import apiClient from '../../../services/api';
import {
  TRACKER_LOGISTICS_LIST,
  TRACKER_LOGISTICS_BY_ID,
  TRACKER_LOGISTICS_CREATE,
  TRACKER_LOGISTICS_UPDATE,
  TRACKER_LOGISTICS_DELETE,
} from '../../../utils/endpoints';

// ==========================================
// Tracker Logistics Service
// ==========================================

export interface TrackerLogistic {
  id: string | number;
  name: string;
  primary_email: string;
  cc_email: string | string[]; // depending on how it's sent back
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface CreateTrackerLogisticPayload {
  name: string;
  primary_email: string;
  cc_email: string;
}

export interface UpdateTrackerLogisticPayload {
  name?: string;
  primary_email?: string;
  cc_email?: string; // the backend explicitly wants a string
}

export interface TrackerLogisticsListResponse {
  results?: TrackerLogistic[];
  count?: number;
  data?: TrackerLogistic[];
}

/** Fetch all tracker logistics */
export async function getTrackerLogistics(
  params?: Record<string, string>,
): Promise<TrackerLogistic[]> {
  const { data } = await apiClient.get<
    TrackerLogisticsListResponse | TrackerLogistic[]
  >(TRACKER_LOGISTICS_LIST, { params });
  if (Array.isArray(data)) return data;
  return (
    (data as TrackerLogisticsListResponse).results ??
    (data as TrackerLogisticsListResponse).data ??
    []
  );
}

/** Fetch a single tracker logistic by ID */
export async function getTrackerLogisticById(
  id: string | number,
): Promise<TrackerLogistic> {
  const { data } = await apiClient.get<TrackerLogistic>(
    TRACKER_LOGISTICS_BY_ID(String(id)),
  );
  return data;
}

/** Create a new tracker logistic */
export async function createTrackerLogistic(
  payload: CreateTrackerLogisticPayload,
): Promise<TrackerLogistic> {
  const { data } = await apiClient.post<TrackerLogistic>(
    TRACKER_LOGISTICS_CREATE,
    payload,
  );
  return data;
}

/** Update an existing tracker logistic */
export async function updateTrackerLogistic(
  id: string | number,
  payload: UpdateTrackerLogisticPayload,
): Promise<TrackerLogistic> {
  const { data } = await apiClient.put<TrackerLogistic>(
    TRACKER_LOGISTICS_UPDATE(String(id)),
    payload,
  );
  return data;
}

/** Delete a tracker logistic by ID */
export async function deleteTrackerLogistic(
  id: string | number,
): Promise<void> {
  await apiClient.delete(TRACKER_LOGISTICS_DELETE(String(id)));
}
