import apiClient from './api';
import {
  PO_LIST,
  PO_BY_ID,
  PO_CREATE,
  PO_UPDATE,
  PO_DELETE,
  PO_FILTERS_ALL,
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
  id: string; // Used for UI display, generated if new
  uuid?: string; // Django DB ID if it exists
  orderId?: string;
  vendorId: string;
  vendorName: string;
  status:
    | 'New'
    | 'Production'
    | 'Ready to Ship'
    | 'In Transit'
    | 'Delivered'
    | 'Delayed'; // UI Specific Status
  orderedQty: number;
  receivedQty: number;
  container: string;
  containerNames?: string[];
  invoiceStatus: 'Pending' | 'Uploaded' | 'Paid' | 'Delayed' | null;
  invoiceFile: string | null;
  invoiceDetails: {
    amount: number;
    invoiceNumber: string;
    date: string;
    ocrExtracted: boolean;
  } | null;
  eta: string;
  expected_delivery_date?: string;
  creationDate: string;
  created_on?: string; // DB raw date
  delayedDays: number; // calculated field
  skus: string[];
  items: PurchaseOrderItem[];
  productionStage: string;
  commentsCount: number;
  emailCount: number;
  containerLeadTimeDays?: number | null;
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

export interface PaginatedResult<T> {
  total: number;
  page: number;
  page_size: number;
  results: T[];
  [key: string]: any;
}

/** Fetch all purchase orders */
export async function getPurchaseOrders(params?: {
  search?: string;
  vendor_id?: string;
  status_label?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
  limit?: number;
}): Promise<PurchaseOrder[] | PaginatedResult<PurchaseOrder> | any> {
  const { data } = await apiClient.get<any>(PO_LIST, { params });
  return data;
}

/** Fetch all purchase orders filters */
export async function getPurchaseOrdersAllFilters(vendorId?: string) {
  const params: any = {};
  if (vendorId) {
    params.vendor_id = vendorId;
  }
  const { data } = await apiClient.get(PO_FILTERS_ALL, { params });
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

/** Update PO Lead Time */
export async function updatePOLeadTime(poId: string, leadTimeDays: number): Promise<any> {
  const { data } = await apiClient.patch(`/purchase-orders/${poId}/lead-time?container_lead_time_days=${leadTimeDays}`);
  return data;
}
