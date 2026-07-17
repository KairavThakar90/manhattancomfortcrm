import apiClient from './api';
import {
  VENDORS_LIST,
  VENDORS_BY_ID,
  VENDORS_CREATE,
  VENDORS_UPDATE,
  VENDORS_DELETE,
} from '../utils/endpoints';

// ==========================================
// Vendor Service
// ==========================================

export interface Vendor {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  country: string;
  performanceScore: number;
  [key: string]: unknown;
}

export interface CreateVendorPayload {
  name: string;
  contact: string;
  email: string;
  phone?: string;
  country?: string;
}

export interface UpdateVendorPayload {
  name?: string;
  contact?: string;
  email?: string;
  phone?: string;
  country?: string;
  [key: string]: unknown;
}

/** Fetch all vendors */
export async function getVendors(): Promise<Vendor[]> {
  const { data } = await apiClient.get<Vendor[]>(VENDORS_LIST);
  return data;
}

/** Fetch a single vendor by ID */
export async function getVendorById(id: string): Promise<Vendor> {
  const { data } = await apiClient.get<Vendor>(VENDORS_BY_ID(id));
  return data;
}

/** Create a new vendor */
export async function createVendor(
  payload: CreateVendorPayload,
): Promise<Vendor> {
  const { data } = await apiClient.post<Vendor>(VENDORS_CREATE, payload);
  return data;
}

/** Update an existing vendor */
export async function updateVendor(
  id: string,
  payload: UpdateVendorPayload,
): Promise<Vendor> {
  const { data } = await apiClient.put<Vendor>(VENDORS_UPDATE(id), payload);
  return data;
}

/** Partially update a vendor */
export async function patchVendor(
  id: string,
  payload: Partial<UpdateVendorPayload>,
): Promise<Vendor> {
  const { data } = await apiClient.patch<Vendor>(VENDORS_UPDATE(id), payload);
  return data;
}

/** Delete a vendor by ID */
export async function deleteVendor(id: string): Promise<void> {
  await apiClient.delete(VENDORS_DELETE(id));
}
