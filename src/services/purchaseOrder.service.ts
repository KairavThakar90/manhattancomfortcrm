import apiClient from './api';
import {
  PO_LIST,
  PO_BY_ID,
  PO_CREATE,
  PO_UPDATE,
  PO_DELETE,
} from '../utils/endpoints';

// ==========================================
// Purchase Order Service
// ==========================================

export interface PurchaseOrderItem {
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
}

export interface PurchaseOrder {
  id: string;
  vendorId: string;
  vendorName: string;
  status: string;
  orderedQty: number;
  receivedQty: number;
  container: string;
  eta: string;
  items: PurchaseOrderItem[];
  [key: string]: unknown;
}

export interface CreatePOPayload {
  vendorId: string;
  items: PurchaseOrderItem[];
  eta: string;
  [key: string]: unknown;
}

export interface UpdatePOPayload {
  status?: string;
  eta?: string;
  container?: string;
  items?: PurchaseOrderItem[];
  [key: string]: unknown;
}

/** Fetch all purchase orders */
export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  const { data } = await apiClient.get<PurchaseOrder[]>(PO_LIST);
  return data;
}

/** Fetch a single purchase order by ID */
export async function getPurchaseOrderById(id: string): Promise<PurchaseOrder> {
  const { data } = await apiClient.get<PurchaseOrder>(PO_BY_ID(id));
  return data;
}

/** Create a new purchase order */
export async function createPurchaseOrder(
  payload: CreatePOPayload,
): Promise<PurchaseOrder> {
  const { data } = await apiClient.post<PurchaseOrder>(PO_CREATE, payload);
  return data;
}

/** Update an existing purchase order */
export async function updatePurchaseOrder(
  id: string,
  payload: UpdatePOPayload,
): Promise<PurchaseOrder> {
  const { data } = await apiClient.put<PurchaseOrder>(PO_UPDATE(id), payload);
  return data;
}

/** Partially update a purchase order */
export async function patchPurchaseOrder(
  id: string,
  payload: Partial<UpdatePOPayload>,
): Promise<PurchaseOrder> {
  const { data } = await apiClient.patch<PurchaseOrder>(PO_UPDATE(id), payload);
  return data;
}

/** Delete a purchase order by ID */
export async function deletePurchaseOrder(id: string): Promise<void> {
  await apiClient.delete(PO_DELETE(id));
}
